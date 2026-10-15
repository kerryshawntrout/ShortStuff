const assert = require("assert");
require("../golf-course-api.js");

const Api = globalThis.GolfCourseApi;

const course = {
  id: "7k2m9qb4",
  club_name: "Murray Golf Club",
  course_name: "Course No. 1",
  location: { latitude: 36.6103, longitude: -88.3148, city: "Murray", state: "KY" },
  tees: {
    male: [
      {
        tee_name: "Blue",
        total_yards: 6800,
        holes: [
          { par: 4, yardage: 410, handicap: 3 },
          { par: 3, yardage: 168, handicap: 17 },
          { par: 5, yardage: 530, handicap: 7 }
        ]
      },
      {
        tee_name: "White",
        total_yards: 6400,
        holes: [
          { par: 4, yardage: 384, handicap: 3 },
          { par: 3, yardage: 155, handicap: 17 },
          { par: 5, yardage: 505, handicap: 7 }
        ]
      },
      {
        tee_name: "Red",
        total_yards: 5600,
        holes: [
          { par: 4, yardage: 340, handicap: 3 },
          { par: 3, yardage: 120, handicap: 17 },
          { par: 5, yardage: 470, handicap: 7 }
        ]
      }
    ],
    female: [
      {
        tee_name: "Forward",
        total_yards: 5200,
        holes: [{ par: 4, yardage: 300, handicap: 1 }]
      }
    ]
  }
};

assert.strictEqual(Api.courseDisplayName(course), "Murray Golf Club, Course No. 1");
assert.strictEqual(Api.courseDisplayName({ club_name: "Pebble Beach", course_name: "Pebble Beach" }), "Pebble Beach");
assert.deepStrictEqual(Api.listTeeNames(course), ["Blue", "White", "Red", "Forward"]);
assert.strictEqual(Api.pickTee(course).tee_name, "White");
assert.strictEqual(Api.pickTee(course, "Blue").tee_name, "Blue");
assert.strictEqual(Api.pickTee(course, "forward").tee_name, "Forward");

const model = Api.courseToModel(course);
assert.strictEqual(model.id, "7k2m9qb4");
assert.strictEqual(model.teeName, "White");
assert.strictEqual(model.holes.length, 3);
assert.strictEqual(model.holes[0].hole, 1);
assert.strictEqual(model.holes[0].par, 4);
assert.strictEqual(model.holes[0].yardage, 384);
assert.strictEqual(model.holes[1].par, 3);
assert.strictEqual(model.holes[0].green, null);
assert.strictEqual(model.holes[0].tee, null);
assert.strictEqual(model.course.lat, 36.6103);
assert.strictEqual(model.course.lng, -88.3148);

const summary = { id: "7k2m9qb4", club_name: "Murray Golf Club", tees: { male: 4, female: 3 } };
assert.strictEqual(Api.courseToModel(summary).holes.length, 0);
assert.strictEqual(Api.unwrapCourse({ course }).id, "7k2m9qb4");
assert.strictEqual(Api.unwrapCourse(course).id, "7k2m9qb4");
assert.strictEqual(Api.withinOnCourse({ distance: 1.42 }), true);
assert.strictEqual(Api.withinOnCourse({ distance: 2 }), true);
assert.strictEqual(Api.withinOnCourse({ distance: 2.01 }), false);
assert.strictEqual(Api.withinOnCourse({}), false);

console.log("golf-course-api tests passed");
