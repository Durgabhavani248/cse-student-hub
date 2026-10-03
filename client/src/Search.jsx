import { useEffect, useState } from "react";

function Search({ api }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authToken =
      localStorage.getItem("token") ||
      localStorage.getItem("studentToken") ||
      localStorage.getItem("facultyToken");

    const headers = {
      Authorization: `Bearer ${authToken}`
    };

    const fetchData = async (url, type) => {
      try {
        const res = await fetch(`${api}${url}`, {
          headers
        });

        if (!res.ok) {
          throw new Error(`${type} request failed`);
        }

        const data = await res.json();

        let list = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (Array.isArray(data?.notes)) {
          list = data.notes;
        } else if (Array.isArray(data?.assignments)) {
          list = data.assignments;
        } else if (Array.isArray(data?.papers)) {
          list = data.papers;
        } else if (Array.isArray(data?.materials)) {
          list = data.materials;
        }

        return list.map((item) => ({
          ...item,
          _searchType: type
        }));
      } catch (error) {
        console.error(`${type} search error:`, error);
        return [];
      }
    };

    const loadAllData = async () => {
      setLoading(true);

      const results = await Promise.all([
        fetchData("/api/notes", "Note"),
        fetchData("/api/assignments", "Assignment"),
        fetchData("/api/papers", "Paper"),
        fetchData("/api/materials", "Study Material")
      ]);

      setItems(results.flat());
      setLoading(false);
    };

    loadAllData();
  }, [api]);

  // Collect all searchable fields from an item
  const getSearchText = (item) => {
    const ignoredFields = [
      "_id",
      "__v",
      "_searchType",
      "fileUrl",
      "fileType",
      "createdAt",
      "updatedAt"
    ];

    const values = [];

    const collectValues = (value, key = "") => {
      if (ignoredFields.includes(key)) return;

      if (value === null || value === undefined) return;

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        values.push(String(value));
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          collectValues(item);
        });
        return;
      }

      if (typeof value === "object") {
        Object.entries(value).forEach(
          ([childKey, childValue]) => {
            collectValues(childValue, childKey);
          }
        );
      }
    };

    collectValues(item);

    return values.join(" ").toLowerCase();
  };

  const searchQuery = query.trim().toLowerCase();

  const filtered = searchQuery
    ? items.filter((item) =>
        getSearchText(item).includes(searchQuery)
      )
    : [];

  const getIcon = (type) => {
    switch (type) {
      case "Note":
        return "📚";
      case "Assignment":
        return "📝";
      case "Paper":
        return "📄";
      case "Study Material":
        return "📖";
      default:
        return "🔍";
    }
  };

  const getTitle = (item) => {
    return (
      item.title ||
      item.name ||
      item.subject ||
      "Untitled"
    );
  };

  const getDetails = (item) => {
    const details = [];

    if (item.subject) {
      details.push(`Subject: ${item.subject}`);
    }

    if (item.branch) {
      details.push(`Branch: ${item.branch}`);
    }

    if (item.section) {
      details.push(`Section: ${item.section}`);
    }

    if (item.semester) {
      details.push(`Sem: ${item.semester}`);
    }

    if (item.year) {
      details.push(`Year: ${item.year}`);
    }

    if (item.dueDate) {
      details.push(`Due: ${item.dueDate}`);
    }

    return details;
  };

  return (
    <div>
      {/* SEARCH INPUT */}
      <div style={{ marginBottom: "24px" }}>
        <input
          placeholder="Search notes, assignments, papers, materials..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: "10px",
            border: "1.5px solid #e0e0e0",
            background: "#fff",
            color: "#1a1a1a",
            fontSize: "15px",
            outline: "none",
            boxSizing: "border-box"
          }}
        />
      </div>

      {/* LOADING */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#999"
          }}
        >
          <p
            style={{
              fontSize: "40px",
              margin: "0 0 12px"
            }}
          >
            🔄
          </p>

          <p>Loading search data...</p>
        </div>
      ) : query === "" ? (
        /* EMPTY SEARCH */
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#999"
          }}
        >
          <p
            style={{
              fontSize: "48px",
              margin: "0 0 12px"
            }}
          >
            🔍
          </p>

          <p>
            Search across notes, assignments, papers
            and study materials
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* NO RESULTS */
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#999"
          }}
        >
          <p
            style={{
              fontSize: "48px",
              margin: "0 0 12px"
            }}
          >
            📭
          </p>

          <p>
            No results found for "{query}"
          </p>
        </div>
      ) : (
        /* RESULTS */
        <div>
          <p
            style={{
              color: "#F15A29",
              marginBottom: "16px",
              fontWeight: "600"
            }}
          >
            {filtered.length} result(s) found
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "16px"
            }}
          >
            {filtered.map((item) => {
              const details = getDetails(item);

              return (
                <div
                  key={`${item._searchType}-${item._id}`}
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #e0e0e0",
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.06)"
                  }}
                >
                  {/* ICON */}
                  <div
                    style={{
                      height: "120px",
                      background: "#fff0ee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "48px"
                    }}
                  >
                    {getIcon(item._searchType)}
                  </div>

                  <div style={{ padding: "14px" }}>
                    {/* TYPE */}
                    <div
                      style={{
                        display: "inline-block",
                        background: "#fff0ee",
                        color: "#F15A29",
                        padding: "4px 9px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "700",
                        marginBottom: "8px"
                      }}
                    >
                      {item._searchType}
                    </div>

                    {/* TITLE */}
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "15px",
                        color: "#1a1a1a"
                      }}
                    >
                      {getTitle(item)}
                    </h3>

                    {/* DETAILS */}
                    {details.length > 0 && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          lineHeight: "1.6"
                        }}
                      >
                        {details.map((detail, index) => (
                          <div key={index}>
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* DESCRIPTION */}
                    {item.description && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: "12px",
                          color: "#666",
                          lineHeight: "1.5"
                        }}
                      >
                        {item.description}
                      </p>
                    )}

                    {/* VIEW FILE */}
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          marginTop: "10px",
                          color: "#2196F3",
                          fontSize: "12px",
                          fontWeight: "600",
                          textDecoration: "none"
                        }}
                      >
                        View File →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Search;