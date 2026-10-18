
import { Router } from "express";
import { randomUUID } from "node:crypto";
import db from "./database.js";
import { compareNames } from "./matching.js";

const router = Router();

const fictionalPeople = {
  nickname: {
    name: "Michael Johnson",
    searchedName: "Mike Johnson",
    shelter: "Northside Shelter",
    allowMatching: true,
    ageGroup: "36-64"
  },
  spelling: {
    name: "Catherine Morgan",
    searchedName: "Katherine Morgan",
    shelter: "Riverside Shelter",
    allowMatching: true,
    ageGroup: "18-35"
  },
  privacy: {
    name: "Alexander Carter",
    searchedName: "Alex Carter",
    shelter: "Undisclosed",
    allowMatching: false,
    ageGroup: "18-35"
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS evaluation_cases (
    id TEXT PRIMARY KEY,
    scenario TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'registered',
    created_at TEXT NOT NULL
  );
`);

// Existing evaluation databases were created before age filtering.
if (!db.prepare("PRAGMA table_info(evaluation_cases)").all()
  .some((column) => column.name === "searched_age_group")) {
  db.exec("ALTER TABLE evaluation_cases ADD COLUMN searched_age_group TEXT NOT NULL DEFAULT ''");
}

router.post("/register", (req, res) => {
  const { scenario } = req.body || {};

  if (
    typeof scenario !== "string" ||
    !Object.hasOwn(fictionalPeople, scenario)
  ) {
    return res.status(400).json({
      error: "Select a valid fictional person."
    });
  }

  const id = randomUUID();
  const person = fictionalPeople[scenario];

  db.prepare(`
    INSERT INTO evaluation_cases
      (id, scenario, status, created_at)
    VALUES (?, ?, 'registered', ?)
  `).run(id, scenario, new Date().toISOString());

  res.status(201).json({
    person: {
      id,
      name: person.name,
      shelter: person.allowMatching
        ? person.shelter
        : "Withheld",
      allowMatching: person.allowMatching,
      ageGroup: person.ageGroup
    }
  });
});

router.post("/search", (req, res) => {
  const { caseId, ageGroup = "" } = req.body || {};
  const validAgeGroups = ["", "0-12", "13-17", "18-35", "36-64", "65+"];
  if (typeof ageGroup !== "string" || !validAgeGroups.includes(ageGroup)) {
    return res.status(400).json({ error: "Invalid age group." });
  }

  if (typeof caseId !== "string") {
    return res.status(400).json({ error: "Invalid case ID." });
  }

  const record = db.prepare(`
    SELECT * FROM evaluation_cases WHERE id = ?
  `).get(caseId);

  if (!record) {
    return res.status(404).json({
      error: "Case not found."
    });
  }

  const person = fictionalPeople[record.scenario];

  let status = person.allowMatching ? "no_suggestion" : "privacy_protected";

  const ageCompatible = !ageGroup || !person.ageGroup || ageGroup === person.ageGroup;

  if (person.allowMatching && ageCompatible) {
    const comparison = compareNames(
      person.searchedName,
      person.name
    );

    status = comparison.reviewRequired
      ? "pending"
      : "no_suggestion";
  }

  db.prepare(`
    UPDATE evaluation_cases SET status = ?, searched_age_group = ? WHERE id = ?
  `).run(status, ageGroup, caseId);

  res.json({
    requestId: caseId,
    status: "received",
    message: "Fictional search request created."
  });
});

router.get("/review/:caseId", (req, res) => {
  const record = db.prepare(`
    SELECT * FROM evaluation_cases WHERE id = ?
  `).get(req.params.caseId);

  if (!record) {
    return res.status(404).json({
      error: "Case not found."
    });
  }

  const person = fictionalPeople[record.scenario];

  const canReview =
    person.allowMatching &&
    !["registered", "no_suggestion"].includes(record.status);

  const comparison = canReview
    ? compareNames(person.searchedName, person.name)
    : null;

  res.json({
    requestId: record.id,
    searchedName: person.searchedName,
    candidateName: canReview ? person.name : null,
    score: canReview ? comparison.score : null,
    status: record.status,
    ageGroup: person.ageGroup,
    searchedAgeGroup: record.searched_age_group || "",
    canReview
  });
});

router.patch("/review/:caseId", (req, res) => {
  const { status } = req.body || {};

  if (!["needs_verification", "dismissed"].includes(status)) {
    return res.status(400).json({
      error: "Invalid decision."
    });
  }

  const result = db.prepare(`
    UPDATE evaluation_cases
    SET status = ?
    WHERE id = ?
      AND scenario IN ('nickname', 'spelling')
      AND status IN (
        'pending',
        'needs_verification',
        'dismissed'
      )
  `).run(status, req.params.caseId);

  if (Number(result.changes) === 0) {
    return res.status(404).json({
      error: "Case unavailable for review."
    });
  }

  res.json({ status });
});

export default router;
