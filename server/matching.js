
import natural from "natural";
import { doubleMetaphone } from "double-metaphone";

// Common English nickname groups.
// These are possible name relationships, not proof of identity.
const NICKNAME_GROUPS = [
  ["alexander", "alexandra", "alex", "sasha"],
  ["michael", "mike", "mikey"],
  ["robert", "rob", "robbie", "bob", "bobby"],
  ["william", "will", "bill", "billy", "liam"],
  ["elizabeth", "liz", "lizzie", "beth", "betty"],
  ["katherine", "catherine", "kate", "katie", "kathy"],
  ["jennifer", "jen", "jenny"],
  ["jonathan", "jon", "johnny"],
  ["john", "johnny", "jack"],
  ["james", "jim", "jimmy", "jamie"],
  ["margaret", "maggie", "meg", "peggy"],
  ["richard", "rich", "rick", "dick"],
  ["christopher", "chris", "topher"],
  ["daniel", "dan", "danny"],
  ["samantha", "sam", "sammy"],
  ["samuel", "sam", "sammy"],
  ["anthony", "tony"],
  ["rebecca", "becca", "becky"],
  ["patricia", "pat", "patty", "trish"],
];

const PLACEHOLDERS = new Set([
  "unknown",
  "unkown",
  "anonymous",
  "unnamed",
  "no name",
  "n a",
]);

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(name) {
  return normalizeName(name).split(" ").filter(Boolean);
}

function isPlaceholder(name) {
  return PLACEHOLDERS.has(name);
}

function nicknameMatch(a, b) {
  if (a === b) return false;

  return NICKNAME_GROUPS.some(
    (group) => group.includes(a) && group.includes(b)
  );
}

function phoneticSimilarity(a, b) {
  const codesA = doubleMetaphone(a).filter(Boolean);
  const codesB = doubleMetaphone(b).filter(Boolean);

  if (codesA.length === 0 || codesB.length === 0) {
    return 0;
  }

  return codesA.some((code) => codesB.includes(code)) ? 1 : 0;
}

function compareTokens(a, b, allowNicknames = false) {
  if (a === b) {
    return {
      score: 100,
      reason: "Exact spelling",
    };
  }

  if (allowNicknames && nicknameMatch(a, b)) {
    return {
      score: 92,
      reason: "Known nickname relationship",
    };
  }

  const spelling = natural.JaroWinklerDistance(a, b);

  const distance = natural.LevenshteinDistance(a, b);
  const editSimilarity =
    1 - distance / Math.max(a.length, b.length);

  const phonetic = phoneticSimilarity(a, b);

  const score = Math.round(
    100 * (
      0.45 * spelling +
      0.25 * editSimilarity +
      0.30 * phonetic
    )
  );

  return {
    score,
    reason:
      phonetic === 1
        ? "Similar pronunciation and spelling"
        : "Similar spelling",
  };
}

export function compareNames(firstName, secondName) {
  const a = normalizeName(firstName);
  const b = normalizeName(secondName);

  const emptyResult = {
    score: 0,
    firstNameScore: 0,
    lastNameScore: null,
    reasons: [],
    reviewRequired: false,
  };

  if (!a || !b || isPlaceholder(a) || isPlaceholder(b)) {
    return emptyResult;
  }

  const partsA = tokenize(a);
  const partsB = tokenize(b);

  // v2 supports one or two name tokens.
  // A one-token record may be incomplete.
  if (
    partsA.length > 2 ||
    partsB.length > 2
  ) {
    return {
      ...emptyResult,
      reasons: [
        "Complex name requires additional review",
      ],
    };
  }

  let firstA = partsA[0];
  let firstB = partsB[0];

  let lastA = partsA[1] || null;
  let lastB = partsB[1] || null;

  // Compare conventional and reversed word order.
  if (partsA.length === 2 && partsB.length === 2) {
    const direct =
      compareTokens(firstA, firstB, true).score +
      compareTokens(lastA, lastB).score;

    const reversed =
      compareTokens(firstA, lastB, true).score +
      compareTokens(lastA, firstB).score;

    if (reversed > direct) {
      [firstB, lastB] = [lastB, firstB];
    }
  }

  const firstResult = compareTokens(
    firstA,
    firstB,
    true
  );

  const reasons = [
    `First name: ${firstResult.reason}`,
  ];

  let lastNameScore = null;
  let overallScore = firstResult.score;

  if (lastA && lastB) {
    const lastResult = compareTokens(lastA, lastB);
    lastNameScore = lastResult.score;

    // First and last names contribute separately.
    overallScore = Math.round(
      firstResult.score * 0.55 +
      lastNameScore * 0.45
    );

    reasons.push(
      `Last name: ${lastResult.reason}`
    );
  } else if (lastA || lastB) {
    // Missing surnames introduce uncertainty.
    overallScore = Math.min(firstResult.score, 65);

    reasons.push("One surname is missing");
  }

  return {
    score: overallScore,
    firstNameScore: firstResult.score,
    lastNameScore,
    reasons,
    reviewRequired: overallScore >= 60,
  };
}

// Compatibility with the existing Express endpoint.
export function calculateNameSimilarity(firstName, secondName) {
  return compareNames(firstName, secondName).score;
}
