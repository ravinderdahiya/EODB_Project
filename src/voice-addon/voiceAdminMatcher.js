import { normalizeVoiceTranscript } from "@/voice-addon/voiceCommandRegistry";

// Voice matching helpers extracted from App so voice/chatbot logic stays modular and easier to maintain.

export const DISTRICT_VOICE_STOPWORDS = new Set([
  "zoom",
  "zomm",
  "zom",
  "to",
  "in",
  "show",
  "focus",
  "select",
  "go",
  "goto",
  "district",
  "districts",
  "zila",
  "jila",
  "dikhao",
  "dikha",
  "dikhado",
  "do",
  "lagao",
  "karo",
  "par",
  "pe",
  "me",
  "mai",
  "main",
  "mein",
  "mn",
  "map",
  "boundary",
  "boundry",
  "seema",
  "layer",
  "jile",
  "जिला",
  "जिले",
  "डिस्ट्रिक्ट",
  "दिखाओ",
  "ज़ूम",
  "जूम",
  "पर",
  "पे",
  "सीमा",
  "बाउंड्री",
  "लेयर",
  "करो",
]);

export const TEHSIL_VOICE_STOPWORDS = new Set([
  "zoom",
  "zomm",
  "zom",
  "to",
  "in",
  "show",
  "focus",
  "select",
  "go",
  "goto",
  "tehsil",
  "tehsils",
  "tahsil",
  "thsil",
  "dikhao",
  "dikha",
  "dikhado",
  "do",
  "lagao",
  "karo",
  "par",
  "pe",
  "me",
  "mai",
  "main",
  "mein",
  "mn",
  "or",
  "aur",
  "ya",
  "district",
  "districts",
  "distric",
  "disctrict",
  "zila",
  "jila",
  "jile",
  "map",
  "boundary",
  "boundry",
  "seema",
  "layer",
  "तहसील",
  "दिखाओ",
  "ज़ूम",
  "जूम",
  "पर",
  "पे",
  "सीमा",
  "बाउंड्री",
  "लेयर",
  "करो",
]);

export const VILLAGE_VOICE_STOPWORDS = new Set([
  "zoom",
  "zomm",
  "zom",
  "to",
  "in",
  "show",
  "focus",
  "select",
  "go",
  "goto",
  "village",
  "villages",
  "villag",
  "villagee",
  "vilege",
  "vilage",
  "vllage",
  "gaon",
  "gram",
  "dikhao",
  "dikha",
  "dikhado",
  "do",
  "lagao",
  "karo",
  "par",
  "pe",
  "me",
  "mai",
  "main",
  "mein",
  "mn",
  "district",
  "districts",
  "distric",
  "disctrict",
  "zila",
  "jila",
  "jile",
  "tehsil",
  "tehsils",
  "tahsil",
  "thsil",
  "map",
  "boundary",
  "boundry",
  "seema",
  "layer",
  "गांव",
  "गाँव",
  "विलेज",
  "विलेज़",
  "विलेज्",
  "दिखाओ",
  "ज़ूम",
  "जूम",
  "पर",
  "पे",
  "सीमा",
  "बाउंड्री",
  "लेयर",
  "करो",
]);

// Voice intent hints used when one sentence contains district + tehsil/village.
// Example: "Jhajjar district me Beri tehsil dikhao" should highlight tehsil, not district.
export const TEHSIL_INTENT_TOKENS = [
  "tehsil",
  "tehsils",
  "tahsil",
  "thsil",
  "teshil",
  "teshsil",
  "teshsi",
  "tehsi",
  "tahseel",
  "taseel",
  "tehseel",
  "tahsheel",
  "tesil",
  "tasil",
  "तहसील",
];

export const VILLAGE_INTENT_TOKENS = [
  "village",
  "villages",
  "villag",
  "villagee",
  "vilege",
  "vilage",
  "vllage",
  "gaon",
  "gram",
  "गांव",
  "गाँव",
  "विलेज",
  "ग्राम",
];

// Detect explicit tehsil/village intent words in transcript, with fuzzy fallback for STT typos.
export function hasVoiceIntentToken(normalizedText, tokens = []) {
  const baseText = normalizeVoiceTranscript(normalizedText);
  if (!baseText) {
    return false;
  }

  const normalizedTokens = Array.from(
    new Set(tokens.map((token) => normalizeVoiceTranscript(token)).filter(Boolean)),
  );
  if (!normalizedTokens.length) {
    return false;
  }

  // Fast path: exact token present in transcript.
  if (normalizedTokens.some((token) => baseText.includes(token))) {
    return true;
  }

  // Fuzzy path: catch STT near spellings like "teshil/teshll/tehsil".
  const textWords = Array.from(new Set(baseText.split(" ").filter(Boolean)));
  const transliteratedTextWords = Array.from(
    new Set(
      textWords
        .map((word) => normalizeVoiceTranscript(transliterateDevanagariToLatin(word)))
        .filter(Boolean),
    ),
  );
  const candidateWords = Array.from(new Set([...textWords, ...transliteratedTextWords]));

  const tokenVariants = Array.from(new Set(
    normalizedTokens.flatMap((token) => {
      const transliteratedToken = normalizeVoiceTranscript(transliterateDevanagariToLatin(token));
      return [token, transliteratedToken].filter(Boolean);
    }),
  ));

  for (const word of candidateWords) {
    if (word.length < 4) continue;

    for (const token of tokenVariants) {
      if (token.length < 4) continue;

      if (buildVoicePhoneticKey(word) === buildVoicePhoneticKey(token)) {
        return true;
      }

      if (voiceSimilarityScore(word, token) >= 0.74) {
        return true;
      }
    }
  }

  return false;
}

// Build multiple candidate phrases from one token stream (helps for "x or y" style speech).
export function buildVoiceCandidatePhrases(tokens = []) {
  const cleanTokens = tokens.filter(Boolean);
  if (!cleanTokens.length) {
    return [];
  }

  const splitWords = new Set(["or", "aur", "ya", "|", "/", "&", "and"]);
  const phrases = [cleanTokens.join(" ")];
  let segmentStart = 0;

  for (let index = 0; index < cleanTokens.length; index += 1) {
    if (!splitWords.has(cleanTokens[index])) {
      continue;
    }
    const segment = cleanTokens.slice(segmentStart, index).join(" ").trim();
    if (segment) {
      phrases.push(segment);
    }
    segmentStart = index + 1;
  }

  const tailSegment = cleanTokens.slice(segmentStart).join(" ").trim();
  if (tailSegment) {
    phrases.push(tailSegment);
  }

  return Array.from(new Set(phrases));
}

// Remove district name words from transcript tokens to isolate tehsil/village targets.
export function stripDistrictNameTokens(tokens = [], districtName = "") {
  if (!tokens.length) {
    return [];
  }

  const districtTokens = normalizeVoiceTranscript(districtName)
    .split(" ")
    .filter(Boolean);
  if (!districtTokens.length) {
    return tokens;
  }

  return tokens.filter((token) => !districtTokens.includes(token));
}

// Voice language bridge: convert Hindi/Devanagari speech text to a Latin approximation
// so we can match English master names from HSAC (e.g., "रोहतक" -> "rohatak").
function transliterateDevanagariToLatin(value) {
  const input = `${value ?? ""}`;
  if (!input) return "";

  const vowels = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऋ": "ri",
  };
  const matras = {
    "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ृ": "ri",
  };
  const consonants = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f", "य़": "y",
  };

  const halant = "्";
  const nukta = "़";
  const marks = { "ं": "n", "ँ": "n", "ः": "h" };
  let out = "";

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === halant || char === nukta) continue;

    if (vowels[char]) {
      out += vowels[char];
      continue;
    }

    if (marks[char]) {
      out += marks[char];
      continue;
    }

    if (matras[char]) {
      out += matras[char];
      continue;
    }

    let baseChar = char;
    if (input[i + 1] === nukta) {
      const combined = `${char}${nukta}`;
      if (consonants[combined]) {
        baseChar = combined;
        i += 1;
      }
    }

    if (consonants[baseChar]) {
      let chunk = consonants[baseChar];
      const next = input[i + 1];

      if (next === halant) {
        out += chunk;
        i += 1;
        continue;
      }

      if (matras[next]) {
        chunk += matras[next];
        out += chunk;
        i += 1;
        continue;
      }

      // Inherent "a" for bare consonants.
      out += `${chunk}a`;
      continue;
    }

    // Keep ascii/space/punctuation to avoid losing already-Latin tokens.
    out += char;
  }

  // Simple schwa cleanup helps match common names closer to English spellings.
  return out
    .split(/\s+/)
    .map((token) => (token.length > 3 ? token.replace(/a$/g, "") : token))
    .join(" ");
}

// Voice fuzzy matching: build a compact sound-like key (badli ~ badali -> bdl).
function buildVoicePhoneticKey(value) {
  const normalized = normalizeVoiceTranscript(value).replace(/\s+/g, "");
  if (!normalized) return "";
  const withoutVowels = normalized.replace(/[aeiou]/g, "");
  const deduped = withoutVowels.replace(/(.)\1+/g, "$1");
  return deduped || normalized;
}

// Voice fuzzy matching: simple edit-distance score for near spellings.
function levenshteinDistance(a, b) {
  const x = a ?? "";
  const y = b ?? "";
  if (!x.length) return y.length;
  if (!y.length) return x.length;

  const prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  const curr = new Array(y.length + 1).fill(0);

  for (let i = 1; i <= x.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= y.length; j += 1) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= y.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[y.length];
}

// Convert edit distance into a normalized 0..1 similarity score.
function voiceSimilarityScore(a, b) {
  const left = normalizeVoiceTranscript(a);
  const right = normalizeVoiceTranscript(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const maxLen = Math.max(left.length, right.length);
  if (!maxLen) return 0;
  const distance = levenshteinDistance(left, right);
  return Math.max(0, 1 - (distance / maxLen));
}

// Shared matcher for voice-admin names (district/tehsil) with exact + fuzzy + phonetic.
export function pickBestVoiceNameMatch(inputText, list, getName, options = {}) {
  const normalizedInput = normalizeVoiceTranscript(inputText);
  if (!normalizedInput || !Array.isArray(list) || !list.length) {
    return null;
  }

  const minSimilarity = Number.isFinite(options.minSimilarity) ? options.minSimilarity : 0.72;
  // Compare both raw normalized text and its Hindi->Latin transliteration.
  const transliteratedInput = normalizeVoiceTranscript(transliterateDevanagariToLatin(inputText));
  const inputVariants = Array.from(
    new Set([normalizedInput, transliteratedInput].filter(Boolean)),
  );
  let best = null;

  for (const item of list) {
    const rawName = getName(item);
    const normalizedName = normalizeVoiceTranscript(rawName);
    if (!normalizedName) continue;

    const transliteratedName = normalizeVoiceTranscript(transliterateDevanagariToLatin(rawName));
    const nameVariants = Array.from(
      new Set([normalizedName, transliteratedName].filter(Boolean)),
    );

    let score = -1;
    for (const inputVariant of inputVariants) {
      for (const nameVariant of nameVariants) {
        let pairScore = -1;
        if (inputVariant === nameVariant) {
          pairScore = 1;
        } else if (inputVariant.includes(nameVariant) || nameVariant.includes(inputVariant)) {
          pairScore = 0.94;
        } else {
          const inputSoundKey = buildVoicePhoneticKey(inputVariant);
          const nameSoundKey = buildVoicePhoneticKey(nameVariant);
          if (inputSoundKey && nameSoundKey && inputSoundKey === nameSoundKey) {
            pairScore = 0.9;
          } else if (inputVariant.length >= 4 || nameVariant.length >= 4) {
            pairScore = voiceSimilarityScore(inputVariant, nameVariant);
          }
        }

        if (pairScore > score) {
          score = pairScore;
        }
      }
    }

    if (score < minSimilarity) continue;

    if (
      !best
      || score > best.score
      || (score === best.score && normalizedName.length > best.normalizedName.length)
    ) {
      best = { item, score, normalizedName };
    }
  }

  return best?.item ?? null;
}
