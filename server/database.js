import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const databasePath =
  process.env.DATABASE_PATH ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), "speron.db");

const db = new DatabaseSync(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age_group TEXT,
    shelter TEXT NOT NULL,
    notes TEXT,
    allow_matching INTEGER NOT NULL DEFAULT 0,
    registered_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS person_name_index (
    person_id TEXT NOT NULL,
    code TEXT NOT NULL,
    code_type TEXT NOT NULL,

    FOREIGN KEY (person_id)
      REFERENCES people(id),

    PRIMARY KEY (person_id, code, code_type)
  );

  CREATE INDEX IF NOT EXISTS idx_person_name_code
    ON person_name_index(code);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS search_requests (
    id TEXT PRIMARY KEY,
    searched_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_search_requests_status
    ON search_requests(status);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS candidate_matches (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    person_id TEXT NOT NULL,
    similarity_score INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,

    FOREIGN KEY (request_id)
      REFERENCES search_requests(id),

    FOREIGN KEY (person_id)
      REFERENCES people(id),

    UNIQUE(request_id, person_id),

    CHECK(similarity_score BETWEEN 0 AND 100),

    CHECK(status IN (
      'pending',
      'needs_verification',
      'dismissed'
    ))
  );

  CREATE INDEX IF NOT EXISTS idx_candidate_request
    ON candidate_matches(request_id);

  CREATE INDEX IF NOT EXISTS idx_candidate_status
    ON candidate_matches(status);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS demo_scenarios (
    id TEXT PRIMARY KEY,
    searched_name TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    matching_allowed INTEGER NOT NULL
      CHECK (matching_allowed IN (0, 1))
  );
`);

const insertDemo = db.prepare(`
  INSERT OR IGNORE INTO demo_scenarios
    (id, searched_name, candidate_name, matching_allowed)
  VALUES (?, ?, ?, ?)
`);

insertDemo.run(
  "nickname",
  "Mike Johnson",
  "Michael Johnson",
  1
);

insertDemo.run(
  "spelling",
  "Katherine Morgan",
  "Catherine Morgan",
  1
);

insertDemo.run(
  "privacy",
  "Alex Carter",
  "Alexander Carter",
  0
);

export default db;
