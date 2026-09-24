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

const tiny = [
  { name: "Driver", distance: 220, hits: 0 },
  { name: "7-Iron", distance: 160, hits: 0 },
  { name: "PW", distance: 120, hits: 0 }
];
const tooFew = Bag.removeClubFromBag(tiny, 1);
assert.strictEqual(tooFew.ok, false);
assert.strictEqual(tooFew.clubs.length, 3);

const reset = Bag.resetClubBag();
assert.strictEqual(reset.clubs.length, 13);
assert.strictEqual(reset.clubs[0].name, "Driver");
assert.strictEqual(reset.clubs[0].distance, 220);

const noPw = stock.filter((club) => !/pitching|gap wedge/i.test(club.name));
const wedge = Bag.layupWedgeFrom(noPw);
assert.ok(wedge.distance >= 90 && wedge.distance <= 125);

console.log("club-bag tests passed");
