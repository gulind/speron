import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import db from "./database.js";
import { calculateNameSimilarity } from "./matching.js";
import {
  addPersonToIndex,
  findCandidates
} from "./candidateSearch.js";
import { compareNames } from "./matching.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
}));

app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Speron API is running",
  });
});

app.post("/api/people", (req, res) => {
  const {
    name,
    ageGroup,
    shelter,
    notes,
    allowMatching,
  } = req.body || {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 120 ||
    typeof shelter !== "string" ||
    !shelter.trim() ||
    shelter.length > 200
  ) {
    return res.status(400).json({
      error: "A name or alias and check-in location are required.",
    });
  }

  if (
    (ageGroup != null && typeof ageGroup !== "string") ||
    (notes != null && (typeof notes !== "string" || notes.length > 1000)) ||
    typeof allowMatching !== "boolean"
  ) {
    return res.status(400).json({
      error: "Invalid registration details.",
    });
  }

  const person = {
    id: randomUUID(),
    name: name.trim(),
    ageGroup: ageGroup || "",
    shelter: shelter.trim(),
    notes: notes || "",
    allowMatching,
    registeredAt: new Date().toISOString(),
  };

  try {
    const statement = db.prepare(`
      INSERT INTO people (
        id, name, age_group, shelter, notes,
        allow_matching, registered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN");

    try {
    statement.run(
        person.id,
        person.name,
        person.ageGroup,
        person.shelter,
        person.notes,
        person.allowMatching ? 1 : 0,
        person.registeredAt
    );

    addPersonToIndex(person.id, person.name);

    db.exec("COMMIT");
    } catch (error) {
    db.exec("ROLLBACK");
    throw error;
    }


    return res.status(201).json({
      message: "Registration saved",
      person,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      error: "Unable to save registration.",
    });
  }
});

app.post("/api/search-requests", (req, res) => {
  const { name } = req.body || {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 120
  ) {
    return res.status(400).json({
      error: "Please enter a valid name."
    });
  }

  const requestId = randomUUID();
  const createdAt = new Date().toISOString();

  try {
    const candidates = findCandidates(name);

    const matches = candidates
      .map((person) => ({
        personId: person.id,
        ...compareNames(name, person.name)
      }))
      .filter((match) => match.reviewRequired)
      .sort((a, b) => b.score - a.score);

    const insertRequest = db.prepare(`
      INSERT INTO search_requests
        (id, searched_name, status, created_at)
      VALUES (?, ?, 'pending', ?)
    `);

    const insertMatch = db.prepare(`
      INSERT INTO candidate_matches
        (id, request_id, person_id,
         similarity_score, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);

    db.exec("BEGIN");

    try {
      insertRequest.run(
        requestId,
        name.trim(),
        createdAt
      );

      for (const match of matches) {
        insertMatch.run(
          randomUUID(),
          requestId,
          match.personId,
          match.score,
          createdAt
        );
      }

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    // Do not disclose match existence or personal details.
    return res.status(201).json({
      requestId,
      status: "pending",
      message:
        "Search request received. A staff review is required."
    });

  } catch (error) {
    console.error("Search request error:", error);

    return res.status(500).json({
      error: "Unable to create search request."
    });
  }
});

app.get("/api/staff/review", (req, res) => {
  // Development-only prototype.
  // Never expose this route in a public deployment.
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({
      error: "Not found"
    });
  }

  try {
    const rows = db.prepare(`
      SELECT
        sr.id AS request_id,
        sr.searched_name,
        sr.status AS request_status,
        sr.created_at,
        cm.id AS match_id,
        cm.similarity_score,
        cm.status AS match_status,
        p.name AS candidate_name
      FROM search_requests sr
      LEFT JOIN candidate_matches cm
        ON cm.request_id = sr.id
      LEFT JOIN people p
        ON p.id = cm.person_id
       AND p.allow_matching = 1
      ORDER BY sr.created_at DESC,
               cm.similarity_score DESC
    `).all();

    // Exclude candidates whose consent is no longer enabled.
    const result = rows.map((row) => ({
      requestId: row.request_id,
      searchedName: row.searched_name,
      requestStatus: row.request_status,
      createdAt: row.created_at,
      matchId: row.candidate_name ? row.match_id : null,
      candidateName: row.candidate_name || null,
      score: row.candidate_name
        ? row.similarity_score
        : null,
      matchStatus: row.candidate_name
        ? row.match_status
        : null
    }));

    res.json({ requests: result });
  } catch (error) {
    console.error("Review error:", error);
    res.status(500).json({
      error: "Unable to load review queue."
    });
  }
});

app.patch("/api/staff/matches/:id", (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "Not found" });
  }

  const { status } = req.body || {};

  if (!["needs_verification", "dismissed"].includes(status)) {
    return res.status(400).json({
      error: "Invalid review status"
    });
  }

  try {
    const result = db.prepare(`
      UPDATE candidate_matches
      SET status = ?
      WHERE id = ?
        AND EXISTS (
          SELECT 1 FROM people
          WHERE people.id = candidate_matches.person_id
            AND people.allow_matching = 1
        )
    `).run(status, req.params.id);

    if (Number(result.changes) === 0) {
      return res.status(404).json({
        error: "Match not found or consent unavailable"
      });
    }

    res.json({ status });
  } catch (error) {
    console.error("Review update error:", error);
    res.status(500).json({
      error: "Could not update review"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Speron API running on http://localhost:${PORT}`);
});
