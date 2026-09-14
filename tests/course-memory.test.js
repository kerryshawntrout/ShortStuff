const assert = require("assert");
require("../course-memory.js");

const M = globalThis.CaddieCourseMemory;

assert.strictEqual(M.slugCourseName("Totteridge Golf Course"), "totteridge-golf-course");
assert.ok(M.isGenericCourseName("Golf course"));
assert.ok(!M.isGenericCourseName("The Madison Club"));

const totteridge = { lat: 40.358, lng: -79.512 };
const store = {
  "totteridge-golf-course": {
    key: "totteridge-golf-course",
    name: "Totteridge Golf Course",
    lat: totteridge.lat,
    lng: totteridge.lng,
    holes: {
      5: { hole: 5, par: 4, tee: { lat: 40.359, lng: -79.511 }, green: { lat: 40.360, lng: -79.510 } }
    }
  }
};

const foundByName = M.findCourseMemory(store, { lat: 40.1, lng: -79.1 }, "Totteridge Golf Course");
assert.strictEqual(foundByName.name, "Totteridge Golf Course");

const foundByGps = M.findCourseMemory(store, totteridge, "Golf course");
assert.strictEqual(foundByGps.key, "totteridge-golf-course");

const nearby = M.findCourseMemory(store, { lat: 41.0, lng: -80.0 }, "Unmapped course");
assert.strictEqual(nearby, null);

let mem = { key: "totteridge-golf-course", name: "Totteridge Golf Course", holes: {} };
mem = M.upsertHoleMemory(mem, 5, { tee: { lat: 40.359, lng: -79.511 }, par: 4 });
mem = M.upsertHoleMemory(mem, 5, { green: { lat: 40.360, lng: -79.510 }, par: 4 });
assert.ok(mem.holes["5"].tee);
assert.ok(mem.holes["5"].green);
assert.strictEqual(mem.lat, 40.359);

const osm = {
  name: "Totteridge Golf Course",
  holes: [
    { hole: 1, par: 4, tee: { lat: 40.35, lng: -79.50 }, green: { lat: 40.351, lng: -79.501 }, hazards: [] },
    { hole: 18, par: 4, tee: { lat: 40.36, lng: -79.52 }, green: { lat: 40.361, lng: -79.521 }, hazards: [] }
  ]
};
const merged = M.mergeCourseModel(osm, mem);
assert.strictEqual(merged.name, "Totteridge Golf Course");
assert.strictEqual(merged.holes.length, 3);
const hole5 = merged.holes.find((h) => h.hole === 5);
assert.ok(hole5.learned);
assert.strictEqual(hole5.green.lat, 40.360);

const padded = M.padCourseHoles(merged.holes, 1);
assert.strictEqual(padded.length, 18);
assert.strictEqual(padded[4].hole, 5);
assert.ok(padded[4].green);
assert.strictEqual(padded[5].missing, true);
assert.ok(M.holeNeedsGreen(padded[5]));
assert.ok(!M.holeNeedsGreen(padded[4]));

const osmParKept = M.mergeCourseModel(
  { name: "X", holes: [{ hole: 1, par: 5, tee: { lat: 1, lng: 1 }, green: { lat: 1.01, lng: 1.01 } }] },
  { holes: { 1: { hole: 1, par: 3, green: { lat: 9, lng: 9 } } } }
);
assert.strictEqual(osmParKept.holes[0].par, 5, "OSM par stays unless the golfer set par");
assert.strictEqual(osmParKept.holes[0].green.lat, 1.01, "OSM green is not overwritten");

const userPar = M.mergeCourseModel(
  { name: "X", holes: [{ hole: 1, par: 5, tee: { lat: 1, lng: 1 }, green: { lat: 1.01, lng: 1.01 } }] },
  { holes: { 1: { hole: 1, par: 4, parSet: true } } }
);
assert.strictEqual(userPar.holes[0].par, 4);

console.log("course-memory tests passed");
