
import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

const scenarios = [
  { id: "nickname", label: "Nickname variation", description: "Mike / Michael" },
  { id: "spelling", label: "Spelling variation", description: "Katherine / Catherine" },
  { id: "privacy", label: "Privacy protection", description: "No matching consent" },
];

export default function Demo({ onBack }) {
  const [scenario, setScenario] = useState("nickname");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runDemo() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/demo/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });

      if (!response.ok) {
        throw new Error("The demo could not be completed.");
      }

      setResult(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-page">
      <button className="back-button" onClick={onBack}>
        ← Back to home
      </button>

      <p className="eyebrow">INTERACTIVE DEMO</p>
      <h2>Explore how Speron works.</h2>
      <p className="subtitle">
        Try three fictional scenarios using our real name-matching
        algorithm. No personal information is collected.
      </p>

      <div className="demo-scenarios">
        {scenarios.map((item) => (
          <label className="demo-option" key={item.id}>
            <input
              type="radio"
              name="scenario"
              value={item.id}
              checked={scenario === item.id}
              onChange={() => {
                setScenario(item.id);
                setResult(null);
              }}
            />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </label>
        ))}
      </div>

      <button
        className="primary-button"
        onClick={runDemo}
        disabled={loading}
      >
        {loading ? "Running..." : "Run demo"}
      </button>

      {error && <p role="alert">{error}</p>}

      {result && (
        <div className="demo-result" role="status">
          <p className="eyebrow">DEMO RESULT</p>

          {result.outcome === "not_eligible" ? (
            <>
              <h3>Privacy protected</h3>
              <p>
                Matching was not performed because the fictional
                person did not consent. No candidate information
                was disclosed.
              </p>
            </>
          ) : (
            <>
              <h3>
                {result.outcome === "needs_review"
                  ? "Potential connection found"
                  : "No suggested connection"}
              </h3>

              <p>
                <strong>Searched:</strong> {result.searchedName}
              </p>
              <p>
                <strong>Candidate:</strong> {result.candidateName}
              </p>
              <p>
                <strong>Name similarity:</strong> {result.score}/100
              </p>
              <p>
                This is a fictional example. A name match is
                not proof of identity or permission to contact.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}