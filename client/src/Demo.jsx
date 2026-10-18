
import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

const scenarios = [
  {
    id: "nickname",
    title: "A child searching for her father",
    subtitle: "Different names, same possible person",
    story:
      "After the hurricane, a daughter arrives at a shelter looking for her father, whom everyone calls Mike. Another shelter has registered someone named Michael Johnson.",
    searched: "Mike Johnson",
    registered: "Michael Johnson",
    explanation:
      "Speron considers common nicknames alongside spelling and phonetic similarity.",
  },
  {
    id: "spelling",
    title: "A name recorded differently",
    subtitle: "Imperfect records shouldn't end a search",
    story:
      "A volunteer writes down Katherine Morgan's name from memory. Another shelter recorded Catherine Morgan. A small spelling difference could prevent a simple exact-match search.",
    searched: "Katherine Morgan",
    registered: "Catherine Morgan",
    explanation:
      "Speron combines spelling similarity with phonetic matching to identify potential connections.",
  },
  {
    id: "privacy",
    title: "Someone who needs privacy",
    subtitle: "Not everyone wants to be found",
    story:
      "A person arrives at a shelter but chooses not to participate in family matching. Their choice must be respected, regardless of how closely a search resembles their name.",
    searched: "Alex Carter",
    registered: "Hidden",
    explanation:
      "Consent takes priority over the matching algorithm. No candidate details should be disclosed.",
  },
];

export default function Demo({ onBack }) {
  const [selected, setSelected] = useState("nickname");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState("");

  const current = scenarios.find((item) => item.id === selected);
  const protectedCase = result?.outcome === "not_eligible";
  const hasSuggestion = result?.outcome === "needs_review";

  function chooseScenario(id) {
    setSelected(id);
    setStep(0);
    setResult(null);
    setError("");
    setReview("");
  }

  async function runMatching() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/demo/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: selected }),
      });

      if (!response.ok) {
        throw new Error("Could not connect to the matching service.");
      }

      const data = await response.json();
      setResult(data);
      setStep(2);
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

      <p className="eyebrow">SPERON / GUIDED EXPERIENCE</p>
      <h2>Finding family, without compromising safety.</h2>
      <p className="subtitle">
        Follow a fictional shelter case to see how Speron helps
        volunteers handle uncertain information and potential connections.
      </p>

      <div className="demo-progress">
        {["Choose a case", "Shelter records", "Matching", "Review"].map(
          (label, index) => (
            <div
              key={label}
              className={`demo-progress-item ${step === index ? "active" : ""}`}
            >
              <strong>0{index + 1}</strong>
              <span>{label}</span>
            </div>
          )
        )}
      </div>

      {step === 0 && (
        <>
          <p className="step-label">01 / CHOOSE A SCENARIO</p>
          <h3>Every family has a different story.</h3>

          <div className="demo-scenarios">
            {scenarios.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`demo-option ${selected === item.id ? "selected" : ""}`}
                onClick={() => chooseScenario(item.id)}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
                <span aria-hidden="true">
                  {selected === item.id ? "●" : "○"}
                </span>
              </button>
            ))}
          </div>

          <button
            className="primary-button"
            onClick={() => setStep(1)}
          >
            Start this story →
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <p className="step-label">02 / AT THE SHELTER</p>
          <h3>{current.title}</h3>
          <p className="subtitle">{current.story}</p>

          <div className="demo-data-grid">
            <div className="demo-info-card">
              <span className="step-label">FAMILY SEARCH REQUEST</span>
              <h3>{current.searched}</h3>
              <p>A family member asks a shelter volunteer for help.</p>
            </div>

            <div className="demo-info-card">
              <span className="step-label">SHELTER RECORD</span>
              <h3>{current.registered}</h3>
              <p>
                {selected === "privacy"
                  ? "Matching consent was not given."
                  : "Fictional check-in record at another shelter."}
              </p>
            </div>
          </div>

          <div className="privacy-message">
            <strong>Designed for real shelter conditions</strong>
            <p>
              Volunteers can work with incomplete names. A phone or ID
              isn't required in the prototype's registration flow.
              A potential match never authorizes automatic contact.
            </p>
          </div>

          <div className="demo-navigation">
            <button
              className="cancel-button"
              onClick={() => setStep(0)}
            >
              ← Back
            </button>
            <button
              className="primary-button"
              disabled={loading}
              onClick={runMatching}
            >
              {loading ? "Checking..." : "Check for a connection →"}
            </button>
          </div>
        </>
      )}

      {step === 2 && result && (
        <>
          <p className="step-label">03 / MATCHING ENGINE</p>

          {protectedCase ? (
            <>
              <h3>Privacy comes before matching.</h3>
              <div className="demo-info-card">
                <p className="step-label">MATCHING BLOCKED</p>
                <h3>No consent. No disclosure.</h3>
                <p>
                  Even when a family is searching, someone who has not
                  agreed to matching must not be exposed.
                  No candidate name, score, or location is returned.
                </p>
              </div>
            </>
          ) : (
            <>
              <h3>
                {hasSuggestion
                  ? "Speron identified a possible connection."
                  : "No connection suggested."}
              </h3>

              <div className="demo-info-card">
                <p className="step-label">ALGORITHM OUTPUT</p>
                <h3>
                  {result.searchedName} ↔ {result.candidateName}
                </h3>
                <div className="demo-score">
                  <strong>{result.score}/100</strong>
                  <span>Name similarity score</span>
                </div>
                <p>{current.explanation}</p>
              </div>

              <div className="privacy-message">
                <strong>A score is not an identity verification.</strong>
                <p>
                  Similar names could belong to different people.
                  The system suggests a review, not a reunion.
                  Shelter locations and contact information are
                  not disclosed to the searcher.
                </p>
              </div>
            </>
          )}

          <div className="demo-navigation">
            <button
              className="cancel-button"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <button
              className="primary-button"
              onClick={() => setStep(3)}
            >
              Continue to review →
            </button>
          </div>
        </>
      )}

      {step === 3 && result && (
        <>
          <p className="step-label">04 / HUMAN REVIEW</p>

          {protectedCase ? (
            <>
              <h3>The privacy boundary worked.</h3>
              <p>
                This search stops without revealing the protected
                person's record. A volunteer should not try to
                bypass their decision.
              </p>
            </>
          ) : hasSuggestion ? (
            <>
              <h3>A human must make the next decision.</h3>
              <p>
                The matching algorithm can flag a possible connection,
                but staff must verify identity and consent before
                any contact is considered.
              </p>

              <div className="demo-info-card">
                <p className="step-label">ILLUSTRATIVE STAFF DECISION</p>
                <h3>
                  {result.searchedName} ↔ {result.candidateName}
                </h3>

                <div className="review-actions">
                  <button
                    className="cancel-button"
                    onClick={() => setReview("needs_verification")}
                  >
                    Needs verification
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => setReview("dismissed")}
                  >
                    Dismiss suggestion
                  </button>
                </div>

                {review && (
                  <p role="status">
                    {review === "needs_verification"
                      ? "Marked for further verification."
                      : "Suggestion dismissed."}
                  </p>
                )}
              </div>

              <p className="field-help">
                This walkthrough simulates the review decision.
                The local fullstack prototype stores actual staff
                review statuses in SQLite.
              </p>
            </>
          ) : (
            <>
              <h3>No candidate to review.</h3>
              <p>
                A missing suggestion does not mean the person cannot
                be found. Shelter records may be incomplete or delayed.
              </p>
            </>
          )}

          <div className="privacy-message">
            <strong>What Speron does not do</strong>
            <p>
              It does not automatically reunite people, disclose
              shelter locations, or prove anyone's identity.
              Those steps require additional safeguards.
            </p>
          </div>

          <div className="demo-navigation">
            <button
              className="cancel-button"
              onClick={() => setStep(2)}
            >
              ← Back
            </button>
            <button
              className="primary-button"
              onClick={() => chooseScenario("nickname")}
            >
              Explore another case →
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <p className="demo-label">
        Fictional demonstration · Matching runs on the Express API
        using SQLite demo records · No real personal information
        should be entered.
      </p>
    </section>
  );
}
