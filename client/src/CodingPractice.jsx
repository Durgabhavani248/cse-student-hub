import { useEffect, useState } from "react";

const ORANGE = "#F15A29";

export default function CodingPractice({ api, token }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });

  const [selectedProblem, setSelectedProblem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] =
  useState("Python");

const [code, setCode] = useState("");

const [customInput, setCustomInput] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [runningCode, setRunningCode] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submittingCode, setSubmittingCode] = useState(false);

  const topics = [
    "Arrays",
    "Strings",
    "Searching",
    "Sorting",
    "Linked List",
    "Stack",
    "Queue",
    "Recursion",
    "Hashing",
    "Trees",
    "Graphs",
    "Dynamic Programming"
  ];

  // Remove trailing slash from API URL
  const API_BASE = (api || "").replace(/\/$/, "");

  // Student authentication token
  const authToken =
    token || localStorage.getItem("studentToken");

  // =========================
  // LOAD CODING PROBLEMS
  // =========================

  const loadProblems = async (requestedPage = page) => {
    if (!authToken) {
      setError("Student authentication token not found.");
      setProblems([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(requestedPage));
      params.set("limit", "12");

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (topic) {
        params.set("topic", topic);
      }

      if (difficulty) {
        params.set("difficulty", difficulty);
      }

      const response = await fetch(
        `${API_BASE}/api/lms/coding/problems?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load coding problems"
        );
      }

      setProblems(
        Array.isArray(data.problems)
          ? data.problems
          : []
      );

      setPagination(
        data.pagination || {
          page: requestedPage,
          limit: 12,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      );
    } catch (err) {
      console.error(
        "Coding problems load error:",
        err
      );

      setError(
        err.message ||
          "Failed to load coding problems"
      );

      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD WHEN PAGE/FILTER CHANGES
  // =========================

  useEffect(() => {
    loadProblems();
  }, [page, topic, difficulty]);

  // =========================
  // SEARCH
  // =========================

  const handleSearch = async (event) => {
    event.preventDefault();
    setPage(1);
    await loadProblems(1);
  };

  // =========================
  // CLEAR FILTERS
  // =========================

  const clearFilters = () => {
    setSearch("");
    setTopic("");
    setDifficulty("");
    setPage(1);
  };

  // =========================
  // OPEN PROBLEM DETAILS
  // =========================

  const openProblem = async (problemId) => {
    if (!problemId) {
      setError("Invalid coding problem.");
      return;
    }

    if (!authToken) {
      setError(
        "Student authentication token not found."
      );
      return;
    }

    try {
      setDetailLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/lms/coding/problems/${problemId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load problem"
        );
      }

      if (!data.problem) {
        throw new Error(
          "Problem details not found"
        );
      }

      const problem = data.problem;

const firstExample =
  Array.isArray(problem.examples) &&
  problem.examples.length > 0
    ? problem.examples[0]
    : null;

const sampleInput =
  firstExample?.input || "";

const starterCode =
  problem.starterCode?.Python ||
  `# ${problem.inputFormat || "Read input according to the problem statement"}

# Write your Python solution here
`;

setSelectedLanguage("Python");
setCode(starterCode);
setCustomInput(sampleInput);
setCodeOutput("");
setCodeError("");
setSubmissionResult(null);

setSelectedProblem(problem);
    } catch (err) {
      console.error(
        "Coding problem details error:",
        err
      );

      setError(
        err.message ||
          "Failed to load problem"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // =========================
  // RUN CODE
  // =========================

  const runCode = async () => {
    if (!authToken) {
      setCodeError(
        "Student authentication token not found."
      );
      return;
    }

    if (!code.trim()) {
      setCodeError(
        "Please enter some code before running."
      );
      return;
    }

    try {
      setRunningCode(true);
      setCodeOutput("");
      setCodeError("");

      const response = await fetch(
        `${API_BASE}/api/lms/coding/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            language: selectedLanguage,
            code,
            stdin: customInput
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to execute code"
        );
      }

      if (data.output) {
        setCodeOutput(data.output);
      } else {
        setCodeOutput(
          data.success
            ? "Program executed successfully with no output."
            : ""
        );
      }

      if (data.error) {
        setCodeError(data.error);
      }

      if (data.signal && !data.error) {
        setCodeError(
          `Program stopped by signal: ${data.signal}`
        );
      }
    } catch (err) {
      console.error("Run code error:", err);

      setCodeError(
        err.message ||
          "Unable to run code."
      );
    } finally {
      setRunningCode(false);
    }
  };

  // =========================
  // SUBMIT CODE
  // =========================

  const submitCode = async () => {
    if (!authToken) {
      setCodeError(
        "Student authentication token not found."
      );
      return;
    }

    if (!selectedProblem?._id) {
      setCodeError(
        "Please select a coding problem first."
      );
      return;
    }

    if (!code.trim()) {
      setCodeError(
        "Please enter some code before submitting."
      );
      return;
    }

    try {
      setSubmittingCode(true);
      setSubmissionResult(null);
      setCodeError("");
      setCodeOutput("");

      const response = await fetch(
        `${API_BASE}/api/lms/coding/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            problemId: selectedProblem._id,
            language: selectedLanguage,
            code
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to submit code"
        );
      }

      setSubmissionResult(data);
    } catch (err) {
      console.error(
        "Submit code error:",
        err
      );

      setCodeError(
        err.message ||
          "Unable to submit code."
      );
    } finally {
      setSubmittingCode(false);
    }
  };

  // =========================
  // DIFFICULTY STYLE
  // =========================

  const difficultyStyle = (difficultyValue) => {
    if (difficultyValue === "Easy") {
      return {
        background: "#eaf7ef",
        color: "#18864b"
      };
    }

    if (difficultyValue === "Medium") {
      return {
        background: "#fff7e6",
        color: "#b26a00"
      };
    }

    return {
      background: "#fff0f0",
      color: "#d33"
    };
  };

  // =========================
  // PROBLEM DETAILS PAGE
  // =========================

  if (selectedProblem) {
    return (
      <div>
        <button
          onClick={() => {
            setSelectedProblem(null);
            setError("");
          }}
          style={{
            border: "1px solid #ddd",
            borderRadius: "7px",
            padding: "9px 14px",
            background: "#fff",
            color: "#444",
            cursor: "pointer",
            fontWeight: "600",
            marginBottom: "15px"
          }}
        >
          ← Back to Problems
        </button>

        {error && (
          <div
            style={{
              marginBottom: "14px",
              padding: "11px 13px",
              borderRadius: "8px",
              background: "#fff0f0",
              color: "#d33",
              fontSize: "14px"
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "12px",
            padding: "22px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.06)"
          }}
        >
          {/* TITLE + DIFFICULTY */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
              flexWrap: "wrap"
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: ORANGE
                }}
              >
                {selectedProblem.title}
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#777"
                }}
              >
                {selectedProblem.topic}
              </p>
            </div>

            <span
              style={{
                ...difficultyStyle(
                  selectedProblem.difficulty
                ),
                padding: "6px 10px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "700"
              }}
            >
              {selectedProblem.difficulty}
            </span>
          </div>

          <hr
            style={{
              border: 0,
              borderTop: "1px solid #eee",
              margin: "18px 0"
            }}
          />

          {/* DESCRIPTION */}

          <h3>Description</h3>

          <p
            style={{
              color: "#555",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap"
            }}
          >
            {selectedProblem.description}
          </p>

          {/* INPUT FORMAT */}

          {selectedProblem.inputFormat && (
            <>
              <h3>Input Format</h3>

              <p
                style={{
                  color: "#555",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6
                }}
              >
                {selectedProblem.inputFormat}
              </p>
            </>
          )}

          {/* OUTPUT FORMAT */}

          {selectedProblem.outputFormat && (
            <>
              <h3>Output Format</h3>

              <p
                style={{
                  color: "#555",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6
                }}
              >
                {selectedProblem.outputFormat}
              </p>
            </>
          )}

          {/* CONSTRAINTS */}

          {selectedProblem.constraints && (
            <>
              <h3>Constraints</h3>

              <p
                style={{
                  color: "#555",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6
                }}
              >
                {selectedProblem.constraints}
              </p>
            </>
          )}

          {/* EXAMPLES */}

          {Array.isArray(
            selectedProblem.examples
          ) &&
            selectedProblem.examples.length > 0 && (
              <>
                <h3>Examples</h3>

                <div
                  style={{
                    display: "grid",
                    gap: "12px"
                  }}
                >
                  {selectedProblem.examples.map(
                    (example, index) => (
                      <div
                        key={index}
                        style={{
                          background: "#fafafa",
                          border: "1px solid #eee",
                          borderRadius: "8px",
                          padding: "14px"
                        }}
                      >
                        <strong>
                          Example {index + 1}
                        </strong>

                        <p
                          style={{
                            margin: "8px 0 4px",
                            whiteSpace: "pre-wrap"
                          }}
                        >
                          <b>Input:</b>{" "}
                          {example.input}
                        </p>

                        <p
                          style={{
                            margin: "4px 0",
                            whiteSpace: "pre-wrap"
                          }}
                        >
                          <b>Output:</b>{" "}
                          {example.output}
                        </p>

                        {example.explanation && (
                          <p
                            style={{
                              margin: "4px 0",
                              color: "#777"
                            }}
                          >
                            {example.explanation}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </>
            )}

          {/* CODING EDITOR */}

          <div
            style={{
              marginTop: "22px",
              padding: "18px",
              borderRadius: "10px",
              background: "#fff8f4",
              border: `1px solid ${ORANGE}`
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "14px"
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: ORANGE
                  }}
                >
                  Coding Editor
                </h3>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#777",
                    fontSize: "13px"
                  }}
                >
                  Write your code and run it online.
                </p>
              </div>

             <select
  value={selectedLanguage}
  onChange={(e) => {
    const newLanguage = e.target.value;

    setSelectedLanguage(newLanguage);

    const firstExample =
      Array.isArray(selectedProblem?.examples) &&
      selectedProblem.examples.length > 0
        ? selectedProblem.examples[0]
        : null;

    const sampleInput =
      firstExample?.input || "";

    const newStarterCode =
      selectedProblem?.starterCode?.[newLanguage] ||
      "";

    setCode(newStarterCode);
    setCustomInput(sampleInput);

    setCodeOutput("");
    setCodeError("");
    setSubmissionResult(null);
  }}
                style={{
                  padding: "9px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "7px",
                  background: "#fff",
                  color: "#333",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
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
              onChange={(e) =>
                setCode(e.target.value)
              }
              spellCheck={false}
              placeholder="Write your code here..."
              style={{
                width: "100%",
                minHeight: "280px",
                boxSizing: "border-box",
                resize: "vertical",
                padding: "15px",
                border: "1px solid #333",
                borderRadius: "8px",
                background: "#1e1e1e",
                color: "#f5f5f5",
                fontFamily:
                  "Consolas, Monaco, monospace",
                fontSize: "14px",
                lineHeight: "1.6",
                outline: "none"
              }}
            />

            <div style={{ marginTop: "14px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "7px",
                  fontWeight: "600",
                  color: "#444"
                }}
              >
                Custom Input
              </label>

              <textarea
                value={customInput}
                onChange={(e) =>
                  setCustomInput(
                    e.target.value
                  )
                }
                placeholder="Example 1 input is loaded automatically. You can edit it to test custom cases."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  padding: "11px",
                  border: "1px solid #ddd",
                  borderRadius: "7px",
                  fontFamily:
                    "Consolas, Monaco, monospace",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>

            <div
              style={{
                marginTop: "14px",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap"
              }}
            >
              {/* RUN BUTTON */}

              <button
                type="button"
                onClick={runCode}
                disabled={runningCode}
                style={{
                  border: "none",
                  borderRadius: "7px",
                  padding: "11px 20px",
                  background:
                    runningCode
                      ? "#aaa"
                      : ORANGE,
                  color: "#fff",
                  cursor:
                    runningCode
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "700"
                }}
              >
                {runningCode
                  ? "Running..."
                  : "▶ Run Code"}
              </button>

              {/* SUBMIT BUTTON */}

              <button
                type="button"
                onClick={submitCode}
                disabled={
                  submittingCode ||
                  runningCode
                }
                style={{
                  border: "none",
                  borderRadius: "7px",
                  padding: "11px 20px",
                  background:
                    submittingCode
                      ? "#aaa"
                      : "#18864b",
                  color: "#fff",
                  cursor:
                    submittingCode ||
                    runningCode
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "700"
                }}
              >
                {submittingCode
                  ? "Submitting..."
                  : "✓ Submit Code"}
              </button>

              {/* RESET BUTTON */}

              <button
                type="button"
                onClick={() => {
                  setCode(
                    '# Write your Python code here\nprint("Hello World")'
                  );
                const firstExample =
  Array.isArray(selectedProblem?.examples) &&
  selectedProblem.examples.length > 0
    ? selectedProblem.examples[0]
    : null;

const sampleInput =
  firstExample?.input || "";

const starterCode =
  selectedProblem?.starterCode?.[
    selectedLanguage
  ] || "";

setCode(starterCode);
setCustomInput(sampleInput);
setCodeOutput("");
setCodeError("");
setSubmissionResult(null);
                }}
                disabled={runningCode}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "7px",
                  padding: "11px 18px",
                  background: "#fff",
                  color: "#444",
                  cursor:
                    runningCode
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "600"
                }}
              >
                Reset
              </button>
            </div>

            {/* OUTPUT */}

            <div style={{ marginTop: "18px" }}>
              <h4
                style={{
                  margin: "0 0 8px",
                  color: "#333"
                }}
              >
                Output
              </h4>

              <div
                style={{
                  minHeight: "80px",
                  padding: "13px",
                  borderRadius: "8px",
                  background: "#111",
                  color: "#eee",
                  fontFamily:
                    "Consolas, Monaco, monospace",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  overflowX: "auto"
                }}
              >
                {codeOutput ||
                  (runningCode
                    ? "Executing your code..."
                    : "Output will appear here.")}
              </div>
            </div>

            {/* ERROR */}

            {codeError && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#fff0f0",
                  border: "1px solid #f3caca",
                  color: "#c62828",
                  fontFamily:
                    "Consolas, Monaco, monospace",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap"
                }}
              >
                <strong>Error</strong>

                <div
                  style={{
                    marginTop: "5px"
                  }}
                >
                  {codeError}
                </div>
              </div>
            )}

            {/* SUBMISSION RESULT */}

            {submissionResult && (
              <div
                style={{
                  marginTop: "18px",
                  padding: "15px",
                  borderRadius: "8px",
                  background:
                    submissionResult.success
                      ? "#eaf7ef"
                      : "#fff0f0",
                  border:
                    submissionResult.success
                      ? "1px solid #b7dfc5"
                      : "1px solid #f3caca"
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px",
                    color:
                      submissionResult.success
                        ? "#18864b"
                        : "#c62828"
                  }}
                >
                  {submissionResult.success
                    ? "✅ Accepted"
                    : submissionResult.verdict ===
                      "Wrong Answer"
                    ? "❌ Wrong Answer"
                    : submissionResult.verdict ===
                      "Runtime Error"
                    ? "⚠️ Runtime Error"
                    : submissionResult.verdict ===
                      "Compilation Error"
                    ? "🔴 Compilation Error"
                    : submissionResult.verdict}
                </h4>
{submissionResult.verdict ===
  "Wrong Answer" && (
  <div
    style={{
      marginBottom: "12px",
      padding: "11px",
      borderRadius: "7px",
      background: "#fff8e6",
      border: "1px solid #f0d58a",
      color: "#7a5700",
      fontSize: "13px",
      lineHeight: "1.5"
    }}
  >
    💡 <strong>Tip:</strong> Check whether your
    code follows the Input Format given in the
    problem statement. Also test different edge
    cases.
  </div>
)}
                {submissionResult.error && (
                  <div
                    style={{
                      marginBottom: "12px",
                      padding: "10px",
                      background: "#fff",
                      borderRadius: "6px",
                      color: "#c62828",
                      whiteSpace: "pre-wrap",
                      fontFamily:
                        "Consolas, Monaco, monospace",
                      fontSize: "13px"
                    }}
                  >
                    {submissionResult.error}
                  </div>
                )}

                {Array.isArray(
                  submissionResult.testCases
                ) &&
                  submissionResult.testCases.length >
                    0 && (
                    <div>
                      <strong>
                        Test Cases
                      </strong>

                      <div
                        style={{
                          marginTop: "10px",
                          display: "grid",
                          gap: "7px"
                        }}
                      >
                        {submissionResult.testCases.map(
                          (testCase) => (
                            <div
                              key={
                                testCase.testCase
                              }
                              style={{
                                padding:
                                  "9px 11px",
                                borderRadius:
                                  "6px",
                                background:
                                  "#fff",
                                border:
                                  "1px solid #eee",
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between"
                              }}
                            >
                              <span>
                                Test Case{" "}
                                {
                                  testCase.testCase
                                }
                              </span>

                              <strong
                                style={{
                                  color:
                                    testCase.passed
                                      ? "#18864b"
                                      : "#c62828"
                                }}
                              >
                                {testCase.passed
                                  ? "✓ Passed"
                                  : "✗ Failed"}
                              </strong>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {!submissionResult.success &&
                  Array.isArray(
                    submissionResult.testCases
                  ) &&
                  submissionResult.testCases.length >
                    0 &&
                  submissionResult.testCases[
                    submissionResult.testCases.length -
                      1
                  ].actualOutput !==
                    undefined && (
                    <div
                      style={{
                        marginTop: "12px"
                      }}
                    >
                      <strong>
                        Your Output
                      </strong>

                      <pre
                        style={{
                          marginTop: "7px",
                          padding: "10px",
                          background: "#111",
                          color: "#eee",
                          borderRadius: "6px",
                          whiteSpace: "pre-wrap",
                          overflowX: "auto"
                        }}
                      >
                        {
                          submissionResult
                            .testCases[
                            submissionResult
                              .testCases.length -
                              1
                          ].actualOutput
                        }
                      </pre>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // PROBLEM LIST PAGE
  // =========================

  return (
    <div>
      {/* FILTERS */}

      <form
        onSubmit={handleSearch}
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "18px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.05)"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(200px, 1.5fr) repeat(2, minmax(150px, 1fr)) auto auto",
            gap: "10px"
          }}
        >
          {/* SEARCH */}

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search problems..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "7px",
              outline: "none"
            }}
          />

          {/* TOPIC */}

          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "7px",
              background: "#fff"
            }}
          >
            <option value="">
              All Topics
            </option>

            {topics.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          {/* DIFFICULTY */}

          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: "7px",
              background: "#fff"
            }}
          >
            <option value="">
              All Difficulties
            </option>

            <option value="Easy">
              Easy
            </option>

            <option value="Medium">
              Medium
            </option>

            <option value="Hard">
              Hard
            </option>
          </select>

          {/* SEARCH BUTTON */}

          <button
            type="submit"
            style={{
              border: "none",
              borderRadius: "7px",
              padding: "10px 16px",
              background: ORANGE,
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Search
          </button>

          {/* CLEAR BUTTON */}

          <button
            type="button"
            onClick={clearFilters}
            style={{
              border: "1px solid #ddd",
              borderRadius: "7px",
              padding: "10px 16px",
              background: "#fff",
              color: "#444",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {/* ERROR */}

      {error && (
        <div
          style={{
            marginBottom: "14px",
            padding: "11px 13px",
            borderRadius: "8px",
            background: "#fff0f0",
            color: "#d33",
            fontSize: "14px"
          }}
        >
          {error}
        </div>
      )}

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
          gap: "10px",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: "#333"
            }}
          >
            Coding Problems
          </h3>

          <p
  style={{
    margin: "5px 0 0",
    color: "#777",
    fontSize: "13px"
  }}
>
  Write your code according to the Input Format and run it online.
</p>
        </div>
      </div>

      {/* PROBLEMS */}

      {loading ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "12px",
            padding: "35px",
            textAlign: "center",
            color: "#999"
          }}
        >
          Loading coding problems...
        </div>
      ) : problems.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "12px",
            padding: "35px",
            textAlign: "center",
            color: "#999"
          }}
        >
          No coding problems found.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px"
          }}
        >
          {problems.map((problem) => (
            <div
              key={problem._id}
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: "12px",
                padding: "18px",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* TITLE + DIFFICULTY */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "8px",
                  alignItems: "flex-start"
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: "#333",
                    fontSize: "17px",
                    lineHeight: 1.4
                  }}
                >
                  {problem.title}
                </h3>

                <span
                  style={{
                    ...difficultyStyle(
                      problem.difficulty
                    ),
                    padding: "5px 8px",
                    borderRadius: "15px",
                    fontSize: "11px",
                    fontWeight: "700",
                    whiteSpace: "nowrap"
                  }}
                >
                  {problem.difficulty}
                </span>
              </div>

              {/* TOPIC */}

              <p
                style={{
                  color: ORANGE,
                  fontSize: "13px",
                  fontWeight: "600",
                  margin: "9px 0"
                }}
              >
                {problem.topic}
              </p>

              {/* DESCRIPTION */}

              <p
                style={{
                  color: "#777",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  flex: 1
                }}
              >
                {problem.description}
              </p>

              {/* PRACTICE */}

              <button
                onClick={() =>
                  openProblem(problem._id)
                }
                disabled={detailLoading}
                style={{
                  border: "none",
                  borderRadius: "7px",
                  padding: "10px 14px",
                  background: ORANGE,
                  color: "#fff",
                  cursor: detailLoading
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "600",
                  opacity: detailLoading
                    ? 0.7
                    : 1
                }}
              >
                {detailLoading
                  ? "Loading..."
                  : "Practice"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}

      {pagination.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            marginTop: "20px"
          }}
        >
          {/* PREVIOUS */}

          <button
            disabled={
              !pagination.hasPreviousPage
            }
            onClick={() =>
              setPage(
                (prev) => prev - 1
              )
            }
            style={{
              border: "1px solid #ddd",
              borderRadius: "7px",
              padding: "9px 14px",
              background:
                pagination.hasPreviousPage
                  ? "#fff"
                  : "#f5f5f5",
              cursor:
                pagination.hasPreviousPage
                  ? "pointer"
                  : "not-allowed"
            }}
          >
            ← Previous
          </button>

          {/* PAGE NUMBER */}

          <span
            style={{
              color: "#666",
              fontSize: "14px"
            }}
          >
            Page {pagination.page} of{" "}
            {pagination.totalPages}
          </span>

          {/* NEXT */}

          <button
            disabled={
              !pagination.hasNextPage
            }
            onClick={() =>
              setPage(
                (prev) => prev + 1
              )
            }
            style={{
              border: "1px solid #ddd",
              borderRadius: "7px",
              padding: "9px 14px",
              background:
                pagination.hasNextPage
                  ? "#fff"
                  : "#f5f5f5",
              cursor:
                pagination.hasNextPage
                  ? "pointer"
                  : "not-allowed"
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}