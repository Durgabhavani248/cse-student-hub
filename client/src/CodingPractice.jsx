import { useEffect, useState } from "react";

const ORANGE = "#F15A29";

export default function CodingPractice({
  api,
  token
}) {
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

  const loadProblems = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(page));
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
  `http://localhost:3001/api/lms/coding/problems/${problemId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load coding problems"
        );
      }

      setProblems(
        Array.isArray(data.problems)
          ? data.problems
          : []
      );

      setPagination(
        data.pagination || {
          page: 1,
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, [page, topic, difficulty]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    loadProblems();
  };

  const clearFilters = () => {
    setSearch("");
    setTopic("");
    setDifficulty("");
    setPage(1);
  };

  const openProblem = async (problemId) => {
    try {
      setDetailLoading(true);
      setError("");

      const response = await fetch(
        `${api}/api/lms/coding/problems/${problemId}`,
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
            "Failed to load problem"
        );
      }

      setSelectedProblem(data.problem);
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

  const difficultyStyle = (difficulty) => {
    if (difficulty === "Easy") {
      return {
        background: "#eaf7ef",
        color: "#18864b"
      };
    }

    if (difficulty === "Medium") {
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

  if (selectedProblem) {
    return (
      <div>
        <button
          onClick={() =>
            setSelectedProblem(null)
          }
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
                            margin:
                              "8px 0 4px",
                            whiteSpace:
                              "pre-wrap"
                          }}
                        >
                          <b>Input:</b>{" "}
                          {example.input}
                        </p>

                        <p
                          style={{
                            margin:
                              "4px 0",
                            whiteSpace:
                              "pre-wrap"
                          }}
                        >
                          <b>Output:</b>{" "}
                          {example.output}
                        </p>

                        {example.explanation && (
                          <p
                            style={{
                              margin:
                                "4px 0",
                              color:
                                "#777"
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

          <div
            style={{
              marginTop: "22px",
              padding: "16px",
              borderRadius: "10px",
              background: "#fff8f4",
              border: `1px solid ${ORANGE}`
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: ORANGE
              }}
            >
              Coding Editor
            </h3>

            <p
              style={{
                marginBottom: 0,
                color: "#666"
              }}
            >
              Code editor and secure test-case
              execution will be added in the next
              Coding Platform phase.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              color: "#999",
              fontSize: "14px"
            }}
          >
            {pagination.total} problems available
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
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
                  cursor: "pointer",
                  fontWeight: "600"
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
          <button
            disabled={
              !pagination.hasPreviousPage
            }
            onClick={() =>
              setPage((prev) => prev - 1)
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

          <span
            style={{
              color: "#666",
              fontSize: "14px"
            }}
          >
            Page {pagination.page} of{" "}
            {pagination.totalPages}
          </span>

          <button
            disabled={!pagination.hasNextPage}
            onClick={() =>
              setPage((prev) => prev + 1)
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