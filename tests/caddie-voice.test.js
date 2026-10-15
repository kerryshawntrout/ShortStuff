const assert = require("assert");
require("../caddie-voice.js");

const Voice = globalThis.CaddieVoice;

function voice(name, lang, extra) {
  return Object.assign({ name, lang, localService: true, voiceURI: name }, extra);
}

const connor = voice("Microsoft Connor Online (Natural) - English (Ireland)", "en-IE");
const daniel = voice("Daniel", "en-GB");
const lee = voice("Lee", "en-AU");
const moira = voice("Moira", "en-IE");
const emily = voice("Microsoft Emily - English (Ireland)", "en-IE");
const samantha = voice("Samantha", "en-US");
const ukMale = voice("Google UK English Male", "en-GB");
const unlabeledIrish = voice("English (Ireland)", "en-IE");
const unlabeledUk = voice("English (United Kingdom)", "en-GB");
const unlabeledUs = voice("English (United States)", "en-US");
const assamese = voice("Assamese India", "as-IN");
const hindi = voice("Hindi India", "hi-IN");

assert.ok(Voice.scoreCaddieVoice(connor) > Voice.scoreCaddieVoice(daniel));
assert.ok(Voice.scoreCaddieVoice(daniel) > Voice.scoreCaddieVoice(lee));
assert.ok(Voice.scoreCaddieVoice(daniel) > Voice.scoreCaddieVoice(moira));
assert.ok(Voice.scoreCaddieVoice(lee) > Voice.scoreCaddieVoice(moira));
assert.ok(Voice.scoreCaddieVoice(ukMale) > Voice.scoreCaddieVoice(unlabeledIrish));
assert.ok(Voice.scoreCaddieVoice(ukMale) > Voice.scoreCaddieVoice(emily));

assert.strictEqual(
  Voice.pickCaddieVoice([samantha, moira, lee, daniel, connor]).name,
  connor.name
);
assert.strictEqual(
  Voice.pickCaddieVoice([moira, emily, samantha, daniel]).name,
  "Daniel"
);
assert.strictEqual(
  Voice.pickCaddieVoice([moira, ukMale, unlabeledIrish]).name,
  "Google UK English Male"
);
assert.strictEqual(
  Voice.pickCaddieVoice([moira, voice("Siri Male", "en-GB")]).name,
  "Siri Male"
);
assert.ok(Voice.scoreCaddieVoice(unlabeledUk) > Voice.scoreCaddieVoice(assamese));
assert.ok(Voice.scoreCaddieVoice(unlabeledUs) > Voice.scoreCaddieVoice(assamese));
assert.ok(Voice.scoreCaddieVoice(unlabeledUk) > Voice.scoreCaddieVoice(unlabeledIrish));
assert.strictEqual(Voice.isEnglishVoice(assamese), false);
assert.strictEqual(Voice.isEnglishVoice(unlabeledUk), true);
assert.strictEqual(
  Voice.pickCaddieVoice([assamese, hindi, unlabeledUs, moira]).name,
  "English (United States)"
);
assert.strictEqual(
  Voice.pickCaddieVoice([assamese, unlabeledUs, daniel]).name,
  "Daniel"
);
assert.strictEqual(Voice.pickCaddieVoice([assamese, hindi]), null);
assert.strictEqual(Voice.describeCaddieVoice(assamese).includes("Assamese"), false);

const danielSpeech = Voice.speechSettings(daniel);
assert.strictEqual(danielSpeech.lang, "en-GB");
assert.strictEqual(danielSpeech.pitch, 1);
assert.strictEqual(danielSpeech.rate, 1);

const moiraSpeech = Voice.speechSettings(moira);
assert.strictEqual(moiraSpeech.lang, "en-IE");
assert.strictEqual(moiraSpeech.pitch, 1);

assert.strictEqual(Voice.describeCaddieVoice(connor).includes("Irish male"), true);
assert.strictEqual(Voice.describeCaddieVoice(daniel).includes("Irish phrasing"), true);
assert.strictEqual(Voice.isIrishVoice(moira), true);
assert.strictEqual(Voice.isBritishVoice(daniel), true);

console.log("caddie-voice tests passed");
