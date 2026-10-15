// Picks a male voice, preferring Irish English, and keeps a woman's voice from winning.
(function (root) {
  const FEMALE_NAME = /\b(female|karen|catherine|natasha|nicole|moira|emily|orla|niamh|siobhan|aoife|maeve|roisin|sinead|aisling|samantha|zira|hazel|susan|fiona|tessa|serena|martha|heather|allison|ava|siri|victoria|veena|woman)\b/;
  const MALE_NAME = /\b(male|connor|liam|sean|niall|ciaran|colm|oisin|declan|fergus|diarmuid|padraig|donal|eoin|cillian|ronan|ryan|lee|james|russell|gordon|william|daniel|david|mark|thomas|oliver|jack|ken|nathan|steve|alex|tom|fred|bruce|george|arthur|malcolm|aaron)\b/;

  function voiceText(voice) {
    return `${voice?.name || ""} ${voice?.voiceURI || ""}`.toLowerCase();
  }

  function voiceLang(voice) {
    return String(voice?.lang || "").toLowerCase().replace(/_/g, "-");
  }

  function isEnglishVoice(voice) {
    const lang = voiceLang(voice);
    const text = voiceText(voice);
    const otherLanguage = /\b(assamese|bengali|hindi|urdu|tamil|telugu|marathi|gujarati|kannada|malayalam|punjabi|odia|oriya|nepali|chinese|mandarin|cantonese|japanese|korean|arabic|french|german|spanish|portuguese|russian|italian|dutch|polish|turkish|thai|vietnamese|indonesian|swahili)\b/;
    if (otherLanguage.test(text) && !/\benglish\b/.test(text)) return false;
    if (lang.startsWith("en")) return true;
    return /\benglish\b/.test(text);
  }

  function isIrishVoice(voice) {
    if (!isEnglishVoice(voice)) return false;
    const lang = voiceLang(voice);
    const text = voiceText(voice);
    return lang.startsWith("en-ie") || text.includes("irish") || text.includes("ireland") || text.includes("en-ie");
  }

  function isBritishVoice(voice) {
    const lang = voiceLang(voice);
    const text = voiceText(voice);
    return lang.startsWith("en-gb") || text.includes("uk english") || text.includes("british") || text.includes("united kingdom");
  }

  function voiceGenderScore(voice) {
    const text = voiceText(voice);
    if (/en-au-x-au[bf]/.test(text)) return -40;
    if (/en-au-x-au[acd]/.test(text)) return 40;
    // Android labels these by id. rjs is the UK male pack; fis is the UK female pack.
    // A #female or #male variant on the same id wins over the pack default.
    if (/en-gb-x-fis/.test(text) && !/male/.test(text)) return -40;
    if (/en-gb-x-rjs/.test(text) && !/female/.test(text)) return 40;
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
    // Phones list every installed language. A tie used to pick Assamese
    // because it sorts before English and none of them say "male".
    if (!isEnglishVoice(voice)) return -800;
    const gender = voiceGenderScore(voice);
    const male = gender > 0;
    const female = gender < 0;
    const irish = isIrishVoice(voice);
    const lang = voiceLang(voice);
    let score = gender;

    if (male) score += 100;
    else if (female) score -= 80;

    if (irish && male) score += 80;
    else if (irish && !female) score += 6;
    else if (irish) score += 4;

    if (male && isBritishVoice(voice)) score += 28;
    else if (!female && isBritishVoice(voice)) score += 20;
    else if (male && lang.startsWith("en")) score += 8;

    if (/\bconnor\b/.test(voiceText(voice))) score += 16;
    if (voice.localService) score += 2;
    const text = voiceText(voice);
    if (text.includes("natural") || text.includes("enhanced") || text.includes("premium")) score += 4;
    return score;
  }

  function pickCaddieVoice(voices) {
    if (!Array.isArray(voices) || voices.length === 0) return null;
    const english = voices.filter(isEnglishVoice);
    if (!english.length) return null;
    const ranked = english
      .map((voice) => ({ voice, score: scoreCaddieVoice(voice) }))
      .sort((a, b) => b.score - a.score || voiceLang(b.voice).localeCompare(voiceLang(a.voice)));
    const male = ranked.find((entry) => voiceGenderScore(entry.voice) > 0);
    return (male || ranked[0]).voice;
  }

  function speechSettings(voice) {
    // iPhone drops the utterance when pitch or rate is not 1.
    return {
      lang: voice?.lang || "en-GB",
      pitch: 1,
      rate: 1
    };
  }

  function describeCaddieVoice(voice) {
    if (!voice || !isEnglishVoice(voice)) {
      return "No English voice yet. Install English (Ireland) and Connor, or English (UK) and Daniel.";
    }
    const gender = voiceGenderScore(voice);
    const irish = isIrishVoice(voice);
    const british = isBritishVoice(voice);
    let kind = "English, Irish phrasing";
    if (irish && gender > 0) kind = "Irish male";
    else if (gender > 0 && british) kind = "UK male, Irish phrasing";
    else if (gender > 0) kind = "male, Irish phrasing";
    else if (irish && gender < 0) kind = "Irish, not a male voice";
    else if (gender < 0) kind = "not a male voice";
    else if (british) kind = "UK English, Irish phrasing";
    else if (irish) kind = "Irish English";
    return `Voice: ${voice.name} · ${kind}`;
  }

  root.CaddieVoice = {
    isEnglishVoice,
    isIrishVoice,
    isBritishVoice,
    voiceGenderScore,
    scoreCaddieVoice,
    pickCaddieVoice,
    speechSettings,
    describeCaddieVoice
  };
})(typeof window !== "undefined" ? window : globalThis);
