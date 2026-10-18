
import { doubleMetaphone } from "double-metaphone";
import db from "./database.js";

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

function expandNicknames(token) {
  const alternatives = new Set([token]);

  for (const group of NICKNAME_GROUPS) {
    if (group.includes(token)) {
      group.forEach((name) => alternatives.add(name));
    }
  }

  return [...alternatives];
}


function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PLACEHOLDERS = new Set([
  "unknown", "unkown", "anonymous",
  "unnamed", "no name", "n a"
]);

export function getPhoneticEntries(name) {
  const normalized = normalizeName(name);

  if (!normalized || PLACEHOLDERS.has(normalized)) {
    return [];
  }

  const tokens = normalized.split(" ");

  if (tokens.length > 2) {
    return [];
  }

  const entries = new Map();

  for (const token of tokens) {
    const codes = [...new Set(
      doubleMetaphone(token).filter(Boolean)
    )];

    for (const code of codes) {
      entries.set(code, {
        code,
        codeType: "name",
      });
    }
  }

  return [...entries.values()];
}

export function indexPerson(personId, name) {
  const entries = getPhoneticEntries(name);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO person_name_index
      (person_id, code, code_type)
    VALUES (?, ?, ?)
  `);

  const remove = db.prepare(`
    DELETE FROM person_name_index WHERE person_id = ?
  `);

  db.exec("BEGIN");

  try {
    remove.run(personId);

    for (const entry of entries) {
      insert.run(
        personId,
        entry.code,
        entry.codeType
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return entries.length;
}


export function findCandidates(query) {
  const normalized = normalizeName(query);

  if (!normalized || PLACEHOLDERS.has(normalized)) {
    return [];
  }

  const tokens = normalized.split(" ");

  if (tokens.length > 2) {
    return [];
  }

  // Generate phonetic alternatives for nicknames.
  const allCodes = new Set();

  for (const token of tokens) {
    const alternatives = expandNicknames(token);

    for (const alternative of alternatives) {
      const entries = getPhoneticEntries(alternative);

      for (const entry of entries) {
        allCodes.add(entry.code);
      }
    }
  }

  if (allCodes.size === 0) {
    return [];
  }

  const codes = [...allCodes];
  const placeholders = codes.map(() => "?").join(",");

  const statement = db.prepare(`
    SELECT DISTINCT p.id, p.name, p.age_group
    FROM person_name_index AS idx
    JOIN people AS p ON p.id = idx.person_id
    WHERE idx.code IN (${placeholders})
      AND p.allow_matching = 1
    LIMIT 200
  `);

  return statement.all(...codes);
}

export function addPersonToIndex(personId, name) {
  const entries = getPhoneticEntries(name);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO person_name_index
      (person_id, code, code_type)
    VALUES (?, ?, ?)
  `);

  for (const entry of entries) {
    insert.run(
      personId,
      entry.code,
      entry.codeType
    );
  }

  return entries.length;
}