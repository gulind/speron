
import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function MatchReview({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function loadReviews() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/staff/review`);
      if (!response.ok) {
        throw new Error("Unable to load review queue");
      }

      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function updateStatus(id, status) {
    if (!id || updatingId) return;

    setUpdatingId(id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/staff/matches/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error("Could not update review");
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

      <p className="eyebrow">STAFF REVIEW — LOCAL DEMO</p>
      <h2>Review possible connections.</h2>

      <p className="subtitle">
        Review requests from the demo database.
        Name similarity is not proof of identity.
      </p>

      {loading && <p>Loading review requests...</p>}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && requests.length === 0 && (
        <div className="search-results">
          <h3>No requests yet</h3>
          <p>
            Create a search request to see it here.
          </p>
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
                {(item.matchStatus || item.requestStatus)
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
                    This is a possible name connection only.
                    No identity, location, or contact information
                    may be disclosed without independent
                    verification and explicit consent.
                  </p>
                </div>

                <div className="review-actions">
                  <button
                    className="cancel-button"
                    disabled={updatingId !== null}
                    onClick={() =>
                      updateStatus(
                        item.matchId,
                        "needs_verification"
                      )
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
                No eligible candidate is currently
                available for review.
              </p>
            )}
          </article>
        ))}
      </div>

      <p className="demo-label">
        Local development demo using fictional records.
        Staff authentication is not yet implemented.
      </p>
    </section>
  );
}