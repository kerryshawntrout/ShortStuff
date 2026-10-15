// Picks a male voice, preferring Irish English, and keeps a woman's voice from winning.
(function (root) {
  const FEMALE_NAME = /\b(female|karen|catherine|natasha|nicole|moira|emily|orla|niamh|siobhan|aoife|maeve|roisin|sinead|aisling|samantha|zira|hazel|susan|fiona|tessa|serena|martha|heather|allison|ava|siri|victoria|veena|woman)\b/;
  const MALE_NAME = /\b(male|connor|liam|sean|niall|ciaran|colm|oisin|declan|fergus|diarmuid|padraig|donal|eoin|cillian|ronan|ryan|lee|james|russell|gordon|william|daniel|david|mark|thomas|oliver|jack|ken|nathan|steve|alex|tom|fred|bruce|george|arthur|malcolm|aaron)\b/;

  function voiceText(voice) {
    return `${voice?.name || ""} ${voice?.voiceURI || ""}`.toLowerCase();
  }

  function isIrishVoice(voice) {
    const lang = String(voice?.lang || "").toLowerCase().replace(/_/g, "-");
    const text = voiceText(voice);
    return lang.startsWith("en-ie") || text.includes("irish") || text.includes("ireland") || text.includes("en-ie");
  }

  function isBritishVoice(voice) {
    const lang = String(voice?.lang || "").toLowerCase().replace(/_/g, "-");
    const text = voiceText(voice);
    return lang.startsWith("en-gb") || text.includes("uk english") || text.includes("british") || text.includes("united kingdom");
  }

  function voiceGenderScore(voice) {
    const text = voiceText(voice);
    if (/en-au-x-au[bf]/.test(text)) return -40;
    if (/en-au-x-au[acd]/.test(text)) return 40;
    const female = FEMALE_NAME.test(text);
    const male = MALE_NAME.test(text);
    if (male && female) {
      if (/\bmale\b/.test(text) && !/\bfemale\b/.test(text)) return 40;
      if (/\bfemale\b/.test(text) && !/\bmale\b/.test(text)) return -40;
    } else if (male) {
      return 40;
    } else if (female) {
      return -40;
    }
    const declared = String(voice?.gender || "").toLowerCase();
    if (declared === "male") return 40;
    if (declared === "female") return -40;
    return 0;
  }

  function scoreCaddieVoice(voice) {
    if (!voice) return -1000;
    const gender = voiceGenderScore(voice);
    const male = gender > 0;
    const female = gender < 0;
    const irish = isIrishVoice(voice);
    const lang = String(voice.lang || "").toLowerCase();
    let score = gender;

    if (male) score += 100;
    else if (female) score -= 80;

    if (irish && male) score += 80;
    else if (irish && !female) score += 24;
    else if (irish) score += 4;

    if (male && isBritishVoice(voice)) score += 28;
    else if (male && lang.startsWith("en")) score += 8;

    if (/\bconnor\b/.test(voiceText(voice))) score += 16;
    if (voice.localService) score += 2;
    const text = voiceText(voice);
    if (text.includes("natural") || text.includes("enhanced") || text.includes("premium")) score += 4;
    return score;
  }

  function pickCaddieVoice(voices) {
    if (!Array.isArray(voices) || voices.length === 0) return null;
    const ranked = voices
      .map((voice) => ({ voice, score: scoreCaddieVoice(voice) }))
      .sort((a, b) => b.score - a.score);
    return ranked[0].voice;
  }

  function speechSettings(voice) {
    const gender = voiceGenderScore(voice);
    return {
      lang: voice?.lang || "en-GB",
      pitch: gender < 0 ? 0.64 : 0.86,
      rate: 0.94
    };
  }

  function describeCaddieVoice(voice) {
    if (!voice) {
      return "Voice: Irish phrasing. Install Connor (English, Ireland) or a UK male voice.";
    }
    const gender = voiceGenderScore(voice);
    const irish = isIrishVoice(voice);
    let kind = "closest available";
    if (irish && gender > 0) kind = "Irish male";
    else if (gender > 0) kind = "male, Irish phrasing";
    else if (irish) kind = "Irish, not a male voice";
    return `Voice: ${voice.name} · ${kind}`;
  }

  root.CaddieVoice = {
    isIrishVoice,
    isBritishVoice,
    voiceGenderScore,
    scoreCaddieVoice,
    pickCaddieVoice,
    speechSettings,
    describeCaddieVoice
  };
})(typeof window !== "undefined" ? window : globalThis);
