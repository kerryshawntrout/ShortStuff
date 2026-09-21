const assert = require("assert");

function shouldForceCourseLookup(mode, override) {
  if (override === "home") return false;
  return mode !== "course";
}

assert.strictEqual(shouldForceCourseLookup("course", null), false);
assert.strictEqual(shouldForceCourseLookup("home", null), true);
assert.strictEqual(shouldForceCourseLookup("searching", null), true);
assert.strictEqual(shouldForceCourseLookup("unknown", null), true);
assert.strictEqual(shouldForceCourseLookup("home", "home"), false);
assert.strictEqual(shouldForceCourseLookup("unknown", "home"), false);
assert.strictEqual(shouldForceCourseLookup("searching", "course"), true);
assert.strictEqual(shouldForceCourseLookup("course", "course"), false);

console.log("resume-location tests passed");
