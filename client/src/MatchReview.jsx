
import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

const isEvaluation = import.meta.env.PROD;

export default function MatchReview({ onBack, evaluationCaseId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function loadReviews() {
    setLoading(true);
    setError("");

    try {
      if (isEvaluation && !evaluationCaseId) {
        setRequests([]);
        return;
      }

      const url = isEvaluation
        ? `${API_URL}/api/evaluation/review/${evaluationCaseId}`
        : `${API_URL}/api/staff/review`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Unable to load review queue.");
      }

      const data = await response.json();

      if (isEvaluation) {
        setRequests([{
          requestId: data.requestId,
          searchedName: data.searchedName,
          candidateName: data.candidateName,
          score: data.score,
          matchId: data.canReview ? data.requestId : null,
          matchStatus: data.status,
          requestStatus: data.status,
        }]);
      } else {
        setRequests(data.requests || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [evaluationCaseId]);

  async function updateStatus(id, status) {
    if (!id || updatingId) return;

    setUpdatingId(id);
    setError("");

    try {
      const url = isEvaluation
        ? `${API_URL}/api/evaluation/review/${id}`
        : `${API_URL}/api/staff/matches/${id}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Could not update review.");
      }

      await loadReviews();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="form-page">
      <button className="back-button" onClick={onBack}>
        ← Back to home
      </button>

      <p className="eyebrow">
        {isEvaluation
          ? "EVALUATION MODE — FICTIONAL CASE"
          : "STAFF REVIEW — LOCAL PROTOTYPE"}
      </p>

      <h2>Review possible connections.</h2>

      <p className="subtitle">
        Review potential family connections.
        Name similarity is not proof of identity.
      </p>

      {isEvaluation && !evaluationCaseId && (
        <div className="privacy-message">
          <strong>No active case</strong>
          <p>
            First register a fictional person, then create
            a search request to see the review process.
          </p>
        </div>
      )}

      {loading && <p>Loading review requests...</p>}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && requests.length === 0 && !error && (
        <div className="search-results">
          <h3>No requests yet</h3>
          <p>Create a search request to get started.</p>
        </div>
      )}

      <div className="review-list">
        {requests.map((item, index) => (
          <article
            className="review-card"
            key={item.matchId || `${item.requestId}-${index}`}
          >
            <div className="review-heading">
              <span className="step-label">
                CASE {item.requestId.slice(0, 8).toUpperCase()}
              </span>

              <span className="review-status">
                {(item.matchStatus || item.requestStatus || "pending")
                  .replaceAll("_", " ")}
              </span>
            </div>

            <h3>
              {item.searchedName}

              {item.candidateName && (
                <>
                  <span className="review-separator"> ↔ </span>
                  {item.candidateName}
                </>
              )}
            </h3>

            {item.matchId ? (
              <>
                <p className="review-label">
                  Name similarity: {item.score}/100
                </p>

                <div className="privacy-message">
                  <strong>Verification required</strong>
                  <p>
                    This is only a possible connection.
                    Identity and consent must be verified
                    before any contact or location is shared.
                  </p>
                </div>

                <div className="review-actions">
                  <button
                    className="cancel-button"
                    disabled={updatingId !== null}
                    onClick={() =>
                      updateStatus(item.matchId, "needs_verification")
                    }
                  >
                    Needs verification
                  </button>

                  <button
                    className="primary-button"
                    disabled={updatingId !== null}
                    onClick={() =>
                      updateStatus(item.matchId, "dismissed")
                    }
                  >
                    Dismiss suggestion
                  </button>
                </div>
              </>
            ) : (
              <p>
                {item.matchStatus === "registered"
                  ? "Create a search request to continue."
                  : item.matchStatus === "privacy_protected"
                    ? "Matching is unavailable because consent was not given."
                    : "No eligible candidate is available for review."}
              </p>
            )}
          </article>
        ))}
      </div>

      <p className="demo-label">
        {isEvaluation
          ? "Public evaluation environment · Fictional cases only."
          : "Local prototype · Staff authentication not implemented."}
      </p>
    </section>
  );
}
