import React, { useEffect, useMemo, useState } from "react";

const ORANGE = "#ff6b35";
const DARK = "#1f2937";
const GREEN = "#16a34a";
const RED = "#dc2626";
const BG = "#f7f8fa";

function getApiBase(api) {
  return (api || "").replace(/\/$/, "");
}

function getToken() {
  return (
    localStorage.getItem("studentToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);

  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
}

function normalizeOutput(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export default function DailyChallenge({ api = "" }) {
  const API_BASE = useMemo(
    () => getApiBase(api),
    [api]
  );

  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [challenge, setChallenge] = useState(null);
  const [problem, setProblem] = useState(null);
  const [attempt, setAttempt] = useState(null);

  const [selectedLanguage, setSelectedLanguage] =
    useState("Python");

  const [code, setCode] = useState("");

  const [started, setStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitStage, setSubmitStage] = useState("idle");
  const [showConfetti, setShowConfetti] = useState(false);

  // --------------------------------------------------
  // LOAD TODAY'S CHALLENGE
  // --------------------------------------------------

  useEffect(() => {
    loadChallenge();
  }, [API_BASE]);

  async function loadChallenge() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/lms/coding/daily-challenge`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load today's challenge."
        );
      }

      setChallenge(data);
      setProblem(data.problem || null);
      setAttempt(data.attempt || null);

      const attemptStartValue =
        data.attempt?.startedAt ||
        data.attempt?.createdAt ||
        null;

      if (attemptStartValue) {
        const startTime = new Date(
          attemptStartValue
        ).getTime();

        if (Number.isFinite(startTime)) {
          setStarted(!data.attempt?.completed);

          if (data.attempt?.completed) {
            setElapsedSeconds(
              Math.floor(
                Number(data.attempt?.completionTimeMs || 0) / 1000
              )
            );
          } else {
            setElapsedSeconds(
              Math.max(
                0,
                Math.floor((Date.now() - startTime) / 1000)
              )
            );
          }
        }
      }

      if (data.attempt?.completed) {
        setStarted(false);
      }

      const starter =
        data.problem?.starterCode?.Python || "";

      setCode(starter);
    } catch (err) {
      console.error(
        "Daily challenge load error:",
        err
      );

      setError(
        err.message ||
          "Failed to load today's challenge."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // TIMER
  // --------------------------------------------------

  useEffect(() => {
    if (!started || attempt?.completed) {
      return undefined;
    }

    const calculateElapsed = () => {
      const startValue =
        attempt?.startedAt ||
        attempt?.createdAt;

      if (!startValue) {
        return;
      }

      const startTime = new Date(startValue).getTime();

      if (!Number.isFinite(startTime)) {
        return;
      }

      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - startTime) / 1000)
        )
      );
    };

    calculateElapsed();

    const timer = setInterval(calculateElapsed, 1000);

    return () => clearInterval(timer);
  }, [
    started,
    attempt?.startedAt,
    attempt?.createdAt,
    attempt?.completed
  ]);

  // --------------------------------------------------
  // START CHALLENGE
  // --------------------------------------------------

  async function startChallenge() {
    setStarting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/lms/coding/daily-challenge/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to start challenge."
        );
      }

      const startedAttempt = {
        ...(data.attempt || {}),
        startedAt:
          data.attempt?.startedAt ||
          data.startedAt ||
          new Date().toISOString()
      };

      setAttempt(startedAttempt);
      setStarted(true);
      setElapsedSeconds(0);
      setResult(null);
      setSubmitStage("idle");
      setShowConfetti(false);

      const starter =
        problem?.starterCode?.[selectedLanguage] ||
        "";

      setCode(starter);
    } catch (err) {
      console.error(
        "Daily challenge start error:",
        err
      );

      setError(
        err.message ||
          "Unable to start challenge."
      );
    } finally {
      setStarting(false);
    }
  }

  // --------------------------------------------------
  // LANGUAGE CHANGE
  // --------------------------------------------------

  function changeLanguage(language) {
    setSelectedLanguage(language);

    const starter =
      problem?.starterCode?.[language] || "";

    setCode(starter);

    setResult(null);
    setError("");
  }

  // --------------------------------------------------
  // BLOCK PASTE
  // --------------------------------------------------

  function blockPaste(event) {
    event.preventDefault();

    setError(
      "Paste is disabled during the Daily Challenge."
    );
  }

  function blockContextMenu(event) {
    event.preventDefault();
  }

  // --------------------------------------------------
  // SUBMIT
  // --------------------------------------------------

  async function submitChallenge() {
    if (!started) {
      setError(
        "Start today's challenge before submitting."
      );
      return;
    }

    if (!code.trim()) {
      setError("Please write your code first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setResult(null);
    setSubmitStage("submitting");
    setShowConfetti(false);

    const executionStageTimer = setTimeout(() => {
      setSubmitStage("executing");
    }, 450);

    try {
      const response = await fetch(
        `${API_BASE}/api/lms/coding/daily-challenge/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            language: selectedLanguage,
            code
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Submission failed."
        );
      }

      setResult(data);

      if (data.verdict === "Accepted") {
        setSubmitStage("accepted");
        setShowConfetti(true);
        setStarted(false);

        setAttempt((previous) => ({
          ...(previous || {}),
          completed: true,
          verdict: "Accepted",
          submittedAt:
            data.submittedAt ||
            new Date().toISOString(),
          completionTimeMs:
            data.completionTimeMs ||
            previous?.completionTimeMs ||
            elapsedSeconds * 1000
        }));

        window.setTimeout(() => {
          setShowConfetti(false);
        }, 4500);
      } else {
        setSubmitStage("failed");

        setAttempt((previous) => ({
          ...(previous || {}),
          verdict: data.verdict
        }));
      }
    } catch (err) {
      console.error(
        "Daily challenge submit error:",
        err
      );

      setSubmitStage("failed");
      setError(
        err.message ||
          "Submission failed."
      );
    } finally {
      clearTimeout(executionStageTimer);
      setSubmitting(false);
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingCircle}>
          ⏳
        </div>

        <h3 style={{ margin: "10px 0 0" }}>
          Loading Daily Challenge...
        </h3>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error && !problem) {
    return (
      <div style={styles.page}>
        <div style={styles.errorCard}>
          <h2 style={{ marginTop: 0 }}>
            Daily Challenge
          </h2>

          <p>{error}</p>

          <button
            onClick={loadChallenge}
            style={styles.primaryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>No Daily Challenge</h2>

          <p style={styles.muted}>
            Today's challenge is not available yet.
          </p>
        </div>
      </div>
    );
  }

  const firstExample =
    Array.isArray(problem.examples) &&
    problem.examples.length > 0
      ? problem.examples[0]
      : null;

  const completed =
    attempt?.completed === true ||
    result?.verdict === "Accepted";

  return (
    <div
      style={styles.page}
      onContextMenu={blockContextMenu}
    >
      <style>{`
        @keyframes dailyConfettiFall {
          0% {
            opacity: 1;
            transform: translateY(-20px) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(105vh) rotate(720deg);
          }
        }

        @keyframes dailyAcceptedPulse {
          0% { transform: scale(0.96); }
          60% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>

      {showConfetti && (
        <div style={styles.confettiLayer} aria-hidden="true">
          {Array.from({ length: 28 }).map((_, index) => (
            <span
              key={index}
              style={{
                ...styles.confetti,
                left: `${(index * 37) % 100}%`,
                animationDelay: `${(index % 7) * 0.08}s`,
                transform: `rotate(${index * 17}deg)`
              }}
            />
          ))}
        </div>
      )}

      {/* HEADER */}

      <div style={styles.header}>
        <div>
          <div style={styles.badge}>
            ⚡ DAILY CHALLENGE
          </div>

          <h1 style={styles.title}>
            Today's Coding Challenge
          </h1>

          <p style={styles.subtitle}>
            Solve today's problem and build your
            coding streak.
          </p>
        </div>

        <div style={styles.timerCard}>
          <span style={styles.timerLabel}>
            ⏱ TIME
          </span>

          <strong style={styles.timer}>
            {formatTime(elapsedSeconds)}
          </strong>
        </div>
      </div>

      {/* STATS */}

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>
            🔥
          </span>

          <div>
            <small>Streak</small>
            <strong>
              {result?.currentStreak ??
                attempt?.currentStreak ??
                0}
              days
            </strong>
          </div>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statIcon}>
            ⭐
          </span>

          <div>
            <small>XP</small>
            <strong>
              {result?.xpEarned ??
                attempt?.xpEarned ??
                0}
            </strong>
          </div>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statIcon}>
            🏆
          </span>

          <div>
            <small>Level</small>
            <strong>
              {result?.level ?? 1}
            </strong>
          </div>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statIcon}>
            🎯
          </span>

          <div>
            <small>Status</small>
            <strong>
              {completed
                ? "Completed"
                : "Pending"}
            </strong>
          </div>
        </div>
      </div>

      {/* STREAK WARNING */}

      {!completed && !started && (
        <div style={styles.streakWarning}>
          🔥{" "}
          <strong>
            Don't break your streak!
          </strong>

          <span>
            Complete today's challenge before
            11:59 PM.
          </span>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* MAIN GRID */}

      <div style={styles.mainGrid}>
        {/* PROBLEM */}

        <div style={styles.problemCard}>
          <div style={styles.problemHeader}>
            <div>
              <span style={styles.problemNumber}>
                DAILY PROBLEM
              </span>

              <h2 style={styles.problemTitle}>
                {problem.title}
              </h2>
            </div>

            <span
              style={{
                ...styles.difficulty,
                background:
                  problem.difficulty ===
                  "Easy"
                    ? "#dcfce7"
                    : problem.difficulty ===
                      "Hard"
                    ? "#fee2e2"
                    : "#fef3c7",
                color:
                  problem.difficulty ===
                  "Easy"
                    ? "#166534"
                    : problem.difficulty ===
                      "Hard"
                    ? "#991b1b"
                    : "#92400e"
              }}
            >
              {problem.difficulty || "Medium"}
            </span>
          </div>

          {problem.description && (
            <section style={styles.section}>
              <h3>Description</h3>

              <p style={styles.description}>
                {problem.description}
              </p>
            </section>
          )}

          {problem.inputFormat && (
            <section style={styles.section}>
              <h3>Input Format</h3>

              <pre style={styles.pre}>
                {problem.inputFormat}
              </pre>
            </section>
          )}

          {problem.outputFormat && (
            <section style={styles.section}>
              <h3>Output Format</h3>

              <pre style={styles.pre}>
                {problem.outputFormat}
              </pre>
            </section>
          )}

          {problem.constraints && (
            <section style={styles.section}>
              <h3>Constraints</h3>

              <pre style={styles.pre}>
                {problem.constraints}
              </pre>
            </section>
          )}

          {firstExample && (
            <section style={styles.section}>
              <h3>Example</h3>

              <div style={styles.example}>
                <div>
                  <strong>Input</strong>

                  <pre style={styles.examplePre}>
                    {firstExample.input}
                  </pre>
                </div>

                <div>
                  <strong>Output</strong>

                  <pre style={styles.examplePre}>
                    {firstExample.output}
                  </pre>
                </div>

                {firstExample.explanation && (
                  <div>
                    <strong>
                      Explanation
                    </strong>

                    <p style={styles.muted}>
                      {
                        firstExample.explanation
                      }
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* EDITOR */}

        <div style={styles.editorCard}>
          <div style={styles.editorHeader}>
            <div>
              <span style={styles.problemNumber}>
                YOUR SOLUTION
              </span>

              <h2 style={styles.editorTitle}>
                Coding Editor
              </h2>
            </div>

            <select
              value={selectedLanguage}
              onChange={(event) =>
                changeLanguage(
                  event.target.value
                )
              }
              disabled={
                submitting || completed
              }
              style={styles.languageSelect}
            >
              <option value="Python">
                Python
              </option>

              <option value="Cpp">
                C++
              </option>

              <option value="Java">
                Java
              </option>
            </select>
          </div>

          <textarea
            value={code}
            onChange={(event) =>
              setCode(event.target.value)
            }
            onPaste={blockPaste}
            onContextMenu={blockContextMenu}
            spellCheck={false}
            disabled={
              !started ||
              submitting ||
              completed
            }
            style={{
              ...styles.editor,
              opacity:
                !started || completed
                  ? 0.7
                  : 1
            }}
          />

          {!started && !completed && (
            <button
              onClick={startChallenge}
              disabled={starting}
              style={styles.startButton}
            >
              {starting
                ? "Starting..."
                : "🚀 Start Challenge"}
            </button>
          )}

          {started && !completed && (
            <button
              onClick={submitChallenge}
              disabled={submitting}
              style={{
                ...styles.submitButton,
                opacity: submitting
                  ? 0.7
                  : 1
              }}
            >
              {submitting
                ? "⏳ Evaluating..."
                : "✓ Submit Challenge"}
            </button>
          )}

          {submitStage !== "idle" && (
            <div
              style={{
                ...styles.submitStatus,
                ...(submitStage === "accepted"
                  ? styles.submitStatusAccepted
                  : submitStage === "failed"
                  ? styles.submitStatusFailed
                  : styles.submitStatusRunning)
              }}
            >
              <span style={styles.submitStatusIcon}>
                {submitStage === "submitting"
                  ? "📤"
                  : submitStage === "executing"
                  ? "⚙️"
                  : submitStage === "accepted"
                  ? "✓"
                  : "!"}
              </span>
              <div>
                <strong>
                  {submitStage === "submitting"
                    ? "Submission Queued"
                    : submitStage === "executing"
                    ? "Executing Test Cases..."
                    : submitStage === "accepted"
                    ? "Accepted!"
                    : "Submission Needs Fixes"}
                </strong>
                <span>
                  {submitStage === "submitting"
                    ? "Sending your solution to the judge."
                    : submitStage === "executing"
                    ? "Running your code against hidden test cases."
                    : submitStage === "accepted"
                    ? "Great job! Your Daily Challenge is complete."
                    : "Check the failed test details below."}
                </span>
              </div>
            </div>
          )}

          {completed && (
            <div style={styles.acceptedBox}>
              <div style={styles.acceptedIcon}>
                ✓
              </div>

              <div>
                <strong>
                  Challenge Completed!
                </strong>

                <span>
                  Your solution was accepted.
                </span>
              </div>
            </div>
          )}

          {/* RESULT */}

          {result && (
            <div
              style={{
                ...styles.resultBox,
                borderColor:
                  result.verdict ===
                  "Accepted"
                    ? "#86efac"
                    : "#fecaca",
                background:
                  result.verdict ===
                  "Accepted"
                    ? "#f0fdf4"
                    : "#fef2f2"
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color:
                    result.verdict ===
                    "Accepted"
                      ? GREEN
                      : RED
                }}
              >
                {result.verdict ===
                "Accepted"
                  ? "🎉 Accepted"
                  : `❌ ${result.verdict}`}
              </div>

              {result.error && (
                <div style={styles.topLevelError}>
                  <strong>Execution Error</strong>
                  <pre style={styles.outputPre}>
                    {result.error}
                  </pre>
                </div>
              )}

              {result.xpEarned !==
                undefined && (
                <p>
                  XP Earned:{" "}
                  <strong>
                    +{result.xpEarned}
                  </strong>
                </p>
              )}

              {result.completionTimeMs && (
                <p>
                  Completion Time:{" "}
                  <strong>
                    {formatTime(
                      Math.floor(
                        result.completionTimeMs /
                          1000
                      )
                    )}
                  </strong>
                </p>
              )}

              {Array.isArray(
                result.testCases
              ) &&
                result.testCases.length > 0 && (
                  <div style={styles.tests}>
                    {result.testCases.map(
                      (test, index) => (
                        <div
                          key={index}
                          style={
                            test.passed
                              ? styles.testPassed
                              : styles.testFailed
                          }
                        >
                          <div style={styles.testHeader}>
                            <strong>
                              Test Case{" "}
                              {test.testCase ||
                                index + 1}
                            </strong>
                            <span>
                              {test.passed
                                ? "✓ Passed"
                                : "✕ Failed"}
                            </span>
                          </div>

                          {!test.passed && (
                            <div style={styles.testDetails}>
                              {test.expectedOutput !==
                                undefined && (
                                <div>
                                  <small>
                                    Expected Output
                                  </small>
                                  <pre
                                    style={
                                      styles.outputPre
                                    }
                                  >
                                    {normalizeOutput(
                                      test.expectedOutput
                                    ) || "(empty)"}
                                  </pre>
                                </div>
                              )}

                              {test.actualOutput !==
                                undefined && (
                                <div>
                                  <small>
                                    Your Output
                                  </small>
                                  <pre
                                    style={
                                      styles.outputPre
                                    }
                                  >
                                    {normalizeOutput(
                                      test.actualOutput
                                    ) || "(empty)"}
                                  </pre>
                                </div>
                              )}

                              {test.error && (
                                <div>
                                  <small>
                                    Error
                                  </small>
                                  <pre
                                    style={{
                                      ...styles.outputPre,
                                      color: RED
                                    }}
                                  >
                                    {test.error}
                                  </pre>
                                </div>
                              )}

                              {!test.error &&
                                test.expectedOutput !==
                                  undefined && (
                                  <div
                                    style={
                                      styles.mismatchHint
                                    }
                                  >
                                    ⚠️ Output mismatch.
                                    Check spelling,
                                    capitalization,
                                    spacing, and the
                                    required output format.
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* BADGES */}

      {Array.isArray(result?.badges) &&
        result.badges.length > 0 && (
          <div style={styles.badgesCard}>
            <h3>🏅 Badges</h3>

            <div style={styles.badges}>
              {result.badges.map(
                (badge, index) => (
                  <span
                    key={index}
                    style={styles.badgeItem}
                  >
                    🏆 {badge}
                  </span>
                )
              )}
            </div>
          </div>
        )}
    </div>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = {
  page: {
    minHeight: "100%",
    background: BG,
    padding: "24px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, Arial, sans-serif",
    color: DARK
  },

  center: {
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },

  loadingCircle: {
    fontSize: "40px"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap"
  },

  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fff1eb",
    color: ORANGE,
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.5px",
    marginBottom: "8px"
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "800"
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#6b7280"
  },

  timerCard: {
    minWidth: "145px",
    padding: "14px 20px",
    background: "#111827",
    color: "#fff",
    borderRadius: "14px",
    textAlign: "center",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.12)"
  },

  timerLabel: {
    display: "block",
    fontSize: "11px",
    opacity: 0.7,
    marginBottom: "3px"
  },

  timer: {
    fontSize: "28px",
    letterSpacing: "1px"
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginBottom: "18px"
  },

  statCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },

  statIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#fff7f3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px"
  },

  statCardLabel: {
    display: "block",
    color: "#6b7280",
    fontSize: "12px"
  },

  statValue: {
    display: "block",
    fontSize: "17px",
    marginTop: "2px"
  },

  streakWarning: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "12px",
    padding: "13px 16px",
    marginBottom: "18px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },

  errorBanner: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    padding: "12px 15px",
    borderRadius: "10px",
    marginBottom: "18px"
  },

  errorCard: {
    maxWidth: "600px",
    margin: "50px auto",
    padding: "24px",
    background: "#fff",
    border: "1px solid #fecaca",
    borderRadius: "14px"
  },

  card: {
    maxWidth: "700px",
    margin: "50px auto",
    padding: "24px",
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #e5e7eb"
  },

  primaryButton: {
    border: "none",
    borderRadius: "9px",
    padding: "10px 18px",
    background: ORANGE,
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer"
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) minmax(360px, 0.9fr)",
    gap: "18px",
    alignItems: "start"
  },

  problemCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "22px"
  },

  problemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "20px"
  },

  problemNumber: {
    color: ORANGE,
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.7px"
  },

  problemTitle: {
    margin: "6px 0 0",
    fontSize: "23px",
    lineHeight: 1.3
  },

  difficulty: {
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
    whiteSpace: "nowrap"
  },

  section: {
    marginTop: "20px"
  },

  sectionTitle: {
    marginBottom: "8px"
  },

  description: {
    color: "#4b5563",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap"
  },

  pre: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "9px",
    padding: "12px",
    whiteSpace: "pre-wrap",
    overflowX: "auto",
    color: "#374151",
    fontFamily:
      "Consolas, Monaco, monospace",
    fontSize: "13px"
  },

  example: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "14px",
    display: "grid",
    gap: "12px"
  },

  examplePre: {
    margin: "6px 0 0",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "7px",
    padding: "9px",
    whiteSpace: "pre-wrap",
    fontFamily:
      "Consolas, Monaco, monospace"
  },

  editorCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px",
    position: "sticky",
    top: "15px"
  },

  editorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px"
  },

  editorTitle: {
    margin: "5px 0 0",
    fontSize: "20px"
  },

  languageSelect: {
    padding: "9px 11px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#fff",
    fontWeight: "700",
    cursor: "pointer"
  },

  editor: {
    width: "100%",
    minHeight: "390px",
    boxSizing: "border-box",
    resize: "vertical",
    borderRadius: "10px",
    border: "1px solid #374151",
    background: "#111827",
    color: "#f9fafb",
    padding: "15px",
    fontFamily:
      "Consolas, Monaco, monospace",
    fontSize: "14px",
    lineHeight: 1.6,
    outline: "none"
  },

  startButton: {
    width: "100%",
    marginTop: "12px",
    border: "none",
    borderRadius: "10px",
    padding: "13px",
    background: ORANGE,
    color: "#fff",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer"
  },

  submitButton: {
    width: "100%",
    marginTop: "12px",
    border: "none",
    borderRadius: "10px",
    padding: "13px",
    background: GREEN,
    color: "#fff",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer"
  },

  acceptedBox: {
    marginTop: "12px",
    padding: "14px",
    borderRadius: "10px",
    background: "#f0fdf4",
    border: "1px solid #86efac",
    display: "flex",
    gap: "12px",
    alignItems: "center"
  },

  acceptedIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: GREEN,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "20px"
  },

  submitStatus: {
    marginTop: "12px",
    padding: "13px 14px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    border: "1px solid"
  },

  submitStatusRunning: {
    background: "#eff6ff",
    borderColor: "#bfdbfe",
    color: "#1d4ed8"
  },

  submitStatusAccepted: {
    background: "#f0fdf4",
    borderColor: "#86efac",
    color: "#166534",
    animation: "dailyAcceptedPulse 0.7s ease"
  },

  submitStatusFailed: {
    background: "#fff7ed",
    borderColor: "#fed7aa",
    color: "#9a3412"
  },

  submitStatusIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    flexShrink: 0
  },

  testHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px"
  },

  testDetails: {
    display: "grid",
    gap: "10px",
    marginTop: "11px",
    paddingTop: "10px",
    borderTop: "1px solid rgba(153,27,27,0.16)"
  },

  outputPre: {
    margin: "5px 0 0",
    padding: "9px",
    background: "#fff",
    border: "1px solid #fecaca",
    borderRadius: "7px",
    whiteSpace: "pre-wrap",
    overflowX: "auto",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "12px",
    color: DARK
  },

  mismatchHint: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    padding: "9px",
    borderRadius: "7px",
    fontSize: "12px",
    lineHeight: 1.5
  },

  confettiLayer: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: 9999
  },

  confetti: {
    position: "absolute",
    top: "-14px",
    width: "9px",
    height: "15px",
    borderRadius: "2px",
    background: ORANGE,
    animation: "dailyConfettiFall 1.8s ease-out forwards"
  },

  topLevelError: {
    marginTop: "10px",
    padding: "10px",
    background: "#fff",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#991b1b"
  },

  resultBox: {
    marginTop: "15px",
    border: "1px solid",
    borderRadius: "12px",
    padding: "15px"
  },

  tests: {
    display: "grid",
    gap: "7px",
    marginTop: "12px"
  },

  testPassed: {
    background: "#dcfce7",
    color: "#166534",
    padding: "8px 10px",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "700"
  },

  testFailed: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "8px 10px",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "700"
  },

  badgesCard: {
    marginTop: "18px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px"
  },

  badges: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },

  badgeItem: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    borderRadius: "999px",
    padding: "7px 11px",
    fontSize: "13px",
    fontWeight: "700"
  },

  muted: {
    color: "#6b7280"
  }
};