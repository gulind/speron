
import { useState } from "react";
import "./App.css";
import MatchReview from "./MatchReview";
import Demo from "./Demo";
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

function App() {
  const [activePage, setActivePage] = useState("home");
  const isEvaluation = import.meta.env.PROD;
  const [demoScenario, setDemoScenario] = useState("nickname");
  const [evaluationCaseId, setEvaluationCaseId] = useState(
    () => localStorage.getItem("speronEvaluationCaseId") || ""
  );
  const [people, setPeople] = useState([]);
  const [savedPerson, setSavedPerson] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const emptyForm = {
    name: "",
    ageGroup: "",
    shelter: "",
    notes: "",
    allowMatching: false,
  };

  const [form, setForm] = useState(emptyForm);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function goHome() {
    setActivePage("home");
    setError("");
  }

  function openRegistration() {
    setForm(emptyForm);
    setError("");
    setSavedPerson(null);
    setActivePage("register");
  }


  async function handleRegistration(event) {
    event.preventDefault();
    if (isEvaluation) {
      setIsSaving(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/api/evaluation/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: demoScenario }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Registration failed.");
        }

        localStorage.setItem("speronEvaluationCaseId", data.person.id);
        setEvaluationCaseId(data.person.id);
        setSavedPerson(data.person);
        setPeople((previous) => [...previous, data.person]);
        setSearchName(
          demoScenario === "nickname"
            ? "Mike Johnson"
            : demoScenario === "spelling"
              ? "Katherine Morgan"
              : "Alex Carter"
        );
        setActivePage("success");
      } catch (err) {
        setError(err.message);
      } finally {
        setIsSaving(false);
      }

      return;
    }

    if (isSaving) return;

    if (!form.name.trim()) {
      setError("Please enter a name, alias, or 'Unknown'.");
      return;
    }

    if (!form.shelter.trim()) {
      setError("Please enter the shelter or check-in location.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/people`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setPeople((previous) => [...previous, data.person]);
      setSavedPerson(data.person);
      setActivePage("success");

    } catch (error) {
      setError("Could not save registration: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    if (isEvaluation) {
      if (!evaluationCaseId) {
        setError("Register a fictional person first.");
        return;
      }

      setIsSearching(true);
      setError("");
      setSearchResult(null);

      try {
        const response = await fetch(`${API_URL}/api/evaluation/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: evaluationCaseId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Search failed.");
        }

        setSearchResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsSearching(false);
      }

      return;
    }

    if (isSearching) return;

    if (!searchName.trim()) {
      setError("Please enter a name to search.");
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/search-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: searchName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed.");
      }

      setSearchResult(data);
    } catch (error) {
      setError("Could not complete search: " + error.message);
    } finally {
      setIsSearching(false);
    }
  }


  return (
    <div className="app">
      <header className="header">
        <div onClick={goHome} className="brand">
          <h1 className="logo">
            speron<span>.</span>
          </h1>
          <p className="tagline">
            A safe way back to each other.
          </p>
        </div>

        <span className="portal-badge">Shelter Portal</span>
      </header>

      <main className="main">
        {activePage === "home" && (
          <>
            <p className="eyebrow">WELCOME TO SPERON</p>
            <h2>How can we help today?</h2>
            <p className="subtitle">
              Every connection matters.
              Choose what you need to do.
            </p>

            <div className="action-grid">
              <button
                className="action-card"
                onClick={() => setActivePage("demo")}
              >
                <span className="card-icon">✦</span>
                <h3>Try interactive demo</h3>
                <p>Explore Speron with fictional scenarios.</p>
                <span className="arrow">↗</span>
              </button>
              <button
                className="action-card"
                onClick={openRegistration}
              >
                <span className="card-icon">＋</span>
                <h3>Register a person</h3>
                <p>Help someone check in safely.</p>
                <span className="arrow">↗</span>
              </button>

              <button
                className="action-card"
                onClick={() => setActivePage("search")}
              >
                <span className="card-icon">⌕</span>
                <h3>Find someone</h3>
                <p>Search for a separated family member.</p>
                <span className="arrow">↗</span>
              </button>

              <button
                className="action-card"
                onClick={() => setActivePage("matches")}
              >
                <span className="card-icon">♡</span>
                <h3>Review possible matches</h3>
                <p>
                  Review connections while protecting privacy.
                </p>
                <span className="arrow">↗</span>
              </button>
            </div>

            <div className="safety-note">
              <strong>Privacy comes first.</strong>
              <p>
                No ID or personal phone is required.
                Information is never shared automatically.
              </p>
            </div>

            <p className="demo-label">
              Prototype mode · {people.length} registered
              in this session
            </p>
          </>
        )}

        {activePage === "register" && (
          <section className="form-page">
            <button className="back-button" onClick={goHome}>
              ← Back to home
            </button>

            <p className="eyebrow">PERSON REGISTRATION</p>
            <h2>Let's start with what we know.</h2>
            <p className="subtitle">
              It's okay if some details are missing.
              No phone or identification is needed.
            </p>

            {isEvaluation && (
              <div className="privacy-message">
                <strong>Evaluation Mode — Fictional Records Only</strong>
                <p>
                  Choose a fictional person below. The registration will be
                  saved to the evaluation database. Other form details are
                  illustrative and will not be submitted.
                </p>

                <label htmlFor="demo-person">Choose a person</label>
                <select
                  id="demo-person"
                  value={demoScenario}
                  onChange={(e) => setDemoScenario(e.target.value)}
                >
                  <option value="nickname">Michael Johnson — Northside Shelter</option>
                  <option value="spelling">Catherine Morgan — Riverside Shelter</option>
                  <option value="privacy">Privacy-protected person</option>
                </select>
              </div>
            )}

            <form
              className="registration-form"
              onSubmit={handleRegistration}
            >
              <div className="form-section">
                <span className="step-label">01 / BASIC DETAILS</span>
                <h3>About this person</h3>

                <label htmlFor="person-name">
                  Name or preferred alias
                </label>
                <input
                  id="person-name"
                  type="text"
                  placeholder="Name, nickname, or Unknown"
                  value={form.name}
                  onChange={(e) =>
                    updateField("name", e.target.value)
                  }
                />
                <p className="field-help">
                  A real name is not required.
                  Use "Unknown" if they prefer.
                </p>

                <label htmlFor="age-group">
                  Approximate age (optional)
                </label>
                <select
                  id="age-group"
                  value={form.ageGroup}
                  onChange={(e) =>
                    updateField("ageGroup", e.target.value)
                  }
                >
                  <option value="">Prefer not to say / Unknown</option>
                  <option value="0-12">Child (0–12)</option>
                  <option value="13-17">Teen (13–17)</option>
                  <option value="18-35">Adult (18–35)</option>
                  <option value="36-64">Adult (36–64)</option>
                  <option value="65+">Older adult (65+)</option>
                </select>

                <label htmlFor="shelter">
                  Check-in location
                </label>
                <input
                  id="shelter"
                  type="text"
                  placeholder="e.g. Northside Community Shelter"
                  value={form.shelter}
                  onChange={(e) =>
                    updateField("shelter", e.target.value)
                  }
                />

                <label htmlFor="notes">
                  Additional details (optional)
                </label>
                <textarea
                  id="notes"
                  rows="3"
                  placeholder="Only details relevant to helping identify a possible connection."
                  value={form.notes}
                  onChange={(e) =>
                    updateField("notes", e.target.value)
                  }
                />
                <p className="field-help">
                  Avoid sensitive information and unnecessary
                  personal details.
                </p>
              </div>

              <div className="form-section">
                <span className="step-label">02 / PRIVACY</span>
                <h3>Respect their choice</h3>

                <div className="privacy-option">
                  <input
                    id="allow-matching"
                    type="checkbox"
                    checked={form.allowMatching}
                    onChange={(e) =>
                      updateField(
                        "allowMatching",
                        e.target.checked
                      )
                    }
                  />

                  <label htmlFor="allow-matching">
                    <strong>
                      Allow this record to be considered
                      for family matching
                    </strong>
                    <span>
                      This does not share their location
                      or contact details. Permission can
                      be changed later in the full system.
                    </span>
                  </label>
                </div>

                <div className="privacy-message">
                  <strong>Privacy by default</strong>
                  <p>
                    Matching is optional and turned off
                    by default. Records are never
                    automatically disclosed to searchers.
                  </p>
                </div>
              </div>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={goHome}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save registration "}
                </button>
              </div>
            </form>
          </section>
        )}

        {activePage === "success" && savedPerson && (
          <section className="success-page">
            <div className="success-icon">✓</div>

            <p className="eyebrow">REGISTRATION COMPLETE</p>
            <h2>You're all set.</h2>

            <p className="subtitle">
              This person has been registered
              in the current demo session.
            </p>

            <div className="confirmation-card">
              <span className="step-label">REGISTRATION SUMMARY</span>

              <h3>{savedPerson.name}</h3>

              <p>
                <strong>Location:</strong>{" "}
                {savedPerson.shelter}
              </p>

              <p>
                <strong>Family matching:</strong>{" "}
                {savedPerson.allowMatching
                  ? "Allowed"
                  : "Not allowed"}
              </p>

              <p>
                <strong>Reference:</strong>{" "}
                {savedPerson.id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <button
              className="primary-button"
              onClick={openRegistration}
            >
              Register another person →
            </button>

            <button
              className="text-button"
              onClick={goHome}
            >
              Return to home
            </button>
          </section>
        )}

                
        {activePage === "search" && (
          <section className="form-page">
            <button
              className="back-button"
              onClick={goHome}
            >
              ← Back to home
            </button>

            <p className="eyebrow">FIND SOMEONE</p>
            <h2>Every connection starts somewhere.</h2>

            <p className="subtitle">
              Enter the name of the person you're looking for.
              Spelling doesn't have to be perfect.
            </p>

            <form
              className="registration-form"
              onSubmit={handleSearch}
            >
              <div className="form-section">
                <span className="step-label">
                  SEARCH FOR A PERSON
                </span>

                <label htmlFor="search-name">
                  Name or known nickname
                </label>

                <input
                  id="search-name"
                  type="text"
                  placeholder="e.g. Katherine Morgan"
                  value={searchName}
                  onChange={(event) => {
                    setSearchName(event.target.value);
                    setSearchResult(null);
                  }}
                />

                <p className="field-help">
                  Try the name you remember, even if you're
                  unsure about its spelling.
                </p>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={isSearching}
                >
                  {isSearching
                    ? "Searching..."
                    : "Find possible connections →"}
                </button>
              </div>
            </form>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            
            {searchResult && (
              <div className="search-results" role="status">
                <span className="step-label">REQUEST RECEIVED</span>

                <div className="result-icon">✓</div>

                <h3>Your search request has been created.</h3>

                <p>
                  A review request has been recorded.
                  Shelter staff can evaluate possible
                  connections through the review process.
                </p>

                <div className="confirmation-card">
                  <span className="step-label">REFERENCE NUMBER</span>

                  <h3>
                    {searchResult.requestId.slice(0, 8).toUpperCase()}
                  </h3>

                  <p>
                    Keep this reference number for
                    follow-up with shelter staff.
                  </p>
                </div>

                <div className="privacy-message">
                  <strong>Privacy comes first</strong>
                  <p>
                    We don't reveal whether a person is registered,
                    where they are staying, or their contact details.
                    Any connection requires further verification
                    and consent.
                  </p>
                </div>
              </div>
            )}

          </section>
        )}

        {activePage === "matches" && (
          <MatchReview
            onBack={goHome}
            evaluationCaseId={evaluationCaseId}
          />
        )}
        {activePage === "demo" && (
          <Demo onBack={goHome} />
        )}


      </main>

      <footer>
        Speron · Built to reconnect, designed to protect.
        <p>Demo only · Do not enter real personal information.</p>
      </footer>
    </div>
  );
}

export default App;
