const assert = require("assert");

const DEFAULT_CLUBS = [
  { name: "Driver", distance: 220 },
  { name: "5-Wood", distance: 210 },
  { name: "7-Wood", distance: 200 },
  { name: "3-Hybrid", distance: 190 }
];

function clubDownFromDriver(clubs, driver) {
  const list = clubs || [];
  const driverName = driver?.name;
  const named = list.find((club) =>
    club.name !== driverName && /wood|hybrid/i.test(club.name || "")
  );
  if (named) return named;
  const shorter = list
    .filter((club) => club.name !== driverName && club.distance < (driver?.distance || Infinity))
    .sort((a, b) => b.distance - a.distance)[0];
  return shorter || { name: "5-Wood", distance: Math.round((driver?.distance || 220) * 0.95) };
}

const wood = clubDownFromDriver(DEFAULT_CLUBS, DEFAULT_CLUBS[0]);
assert.strictEqual(wood.name, "5-Wood");
assert.strictEqual(wood.distance, 210);

console.log("club-bag tests passed");
