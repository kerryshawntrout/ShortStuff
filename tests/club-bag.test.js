const assert = require("assert");
require("../club-bag.js");

const Bag = globalThis.CaddieBag;
const stock = Bag.cloneClubs(Bag.DEFAULT_CLUBS);

const wood = Bag.clubDownFromDriver(stock, stock[0]);
assert.strictEqual(wood.name, "5-Wood");
assert.strictEqual(wood.distance, 210);

const added = Bag.addClubToBag(stock, "4-Hybrid", 185);
assert.strictEqual(added.ok, true);
assert.strictEqual(added.added, "4-Hybrid");
assert.ok(added.clubs.some((club) => club.name === "4-Hybrid" && club.distance === 185));
assert.strictEqual(added.clubs[0].name, "Driver");

const dup = Bag.addClubToBag(added.clubs, "4-hybrid", 180);
assert.strictEqual(dup.ok, false);

const renamed = Bag.updateClubInBag(stock, 4, { name: "4-Iron" });
assert.strictEqual(renamed.ok, true);
assert.ok(renamed.clubs.some((club) => club.name === "4-Iron" && club.distance === 180));

const driverUp = Bag.updateClubInBag(stock, 0, { distance: 230 });
assert.strictEqual(driverUp.ok, true);
assert.strictEqual(driverUp.clubs[0].name, "Driver");
assert.strictEqual(driverUp.clubs[0].distance, 230);

const tooFar = Bag.updateClubInBag(stock, 0, { distance: 400 });
assert.strictEqual(tooFar.ok, false);

const ironIndex = stock.findIndex((club) => club.name === "5-Iron");
const removed = Bag.removeClubFromBag(stock, ironIndex);
assert.strictEqual(removed.ok, true);
assert.ok(!removed.clubs.some((club) => club.name === "5-Iron"));
assert.strictEqual(removed.removed, "5-Iron");
assert.ok(removed.bench.some((club) => club.name === "5-Iron" && club.distance === 180));

const restored = Bag.restoreClubFromBench(removed.clubs, removed.bench, "5-Iron");
assert.strictEqual(restored.ok, true);
assert.strictEqual(restored.restored, true);
assert.ok(restored.clubs.some((club) => club.name === "5-Iron" && club.distance === 180));
assert.ok(!restored.bench.some((club) => club.name === "5-Iron"));

const tuned = Bag.cloneClubs(stock);
tuned[ironIndex].distance = 175;
tuned[ironIndex].hits = 4;
const parked = Bag.removeClubFromBag(tuned, ironIndex);
const byName = Bag.addClubToBag(parked.clubs, "5-iron", "", parked.bench);
assert.strictEqual(byName.ok, true);
assert.strictEqual(byName.restored, true);
const five = byName.clubs.find((club) => club.name === "5-Iron");
assert.strictEqual(five.distance, 175);
assert.strictEqual(five.hits, 4);
assert.strictEqual(byName.bench.length, 0);

const parkedAgain = Bag.removeClubFromBag(byName.clubs, byName.clubs.findIndex((club) => club.name === "5-Iron"), byName.bench);
const overrideYards = Bag.addClubToBag(parkedAgain.clubs, "5-Iron", 168, parkedAgain.bench);
assert.strictEqual(overrideYards.ok, true);
assert.strictEqual(overrideYards.clubs.find((club) => club.name === "5-Iron").distance, 168);
assert.ok(!overrideYards.bench.some((club) => club.name === "5-Iron"));

const tiny = [
  { name: "Driver", distance: 220, hits: 0 },
  { name: "7-Iron", distance: 160, hits: 0 },
  { name: "PW", distance: 120, hits: 0 }
];
const tooFew = Bag.removeClubFromBag(tiny, 1);
assert.strictEqual(tooFew.ok, false);
assert.strictEqual(tooFew.clubs.length, 3);

const reset = Bag.resetClubBag([{ name: "5-Iron", distance: 175, hits: 2 }, { name: "4-Hybrid", distance: 185, hits: 1 }]);
assert.strictEqual(reset.clubs.length, 13);
assert.strictEqual(reset.clubs[0].name, "Driver");
assert.strictEqual(reset.clubs[0].distance, 220);
assert.ok(!reset.bench.some((club) => club.name === "5-Iron"));
assert.ok(reset.bench.some((club) => club.name === "4-Hybrid" && club.distance === 185));

const noPw = stock.filter((club) => !/pitching|gap wedge/i.test(club.name));
const wedge = Bag.layupWedgeFrom(noPw);
assert.ok(wedge.distance >= 90 && wedge.distance <= 125);

console.log("club-bag tests passed");
