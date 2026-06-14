import { useEffect, useState } from "react";

function Search() {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("https://cse-student-hub.onrender.com/api/notes")
      .then(res => res.json())
      .then(data => setNotes(data));
  }, []);

  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(query.toLowerCase()) ||
    n.subject?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      {/* Search Bar */}
      <div style={{ marginBottom: "24px" }}>
        <input
          placeholder="🔍 Search notes by title or subject..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: "50px",
            border: "2px solid #4361ee",
            background: "#0f0f0f",
            color: "#fff",
            fontSize: "16px",
            outline: "none",
            boxSizing: "border-box"
          }}
        />
      </div>

      {/* Results */}
      {query === "" ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          <p style={{ fontSize: "48px" }}>🔍</p>
          <p>Search cheyyi — notes kanipistāyi!</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          <p style={{ fontSize: "48px" }}>😕</p>
          <p>"{query}" ki results levu!</p>
        </div>
      ) : (
        <div>
          <p style={{ color: "#4cc9f0", marginBottom: "16px" }}>{filtered.length} results found!</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
            {filtered.map(n => (
              <div key={n.id} style={{ background: "#1a1a2e", borderRadius: "16px", overflow: "hidden", border: "1px solid #4361ee", boxShadow: "0 4px 20px #4361ee33" }}>
                <img src={n.imageUrl} alt={n.title} style={{ width: "100%", height: "200px", objectFit: "cover" }} />
                <div style={{ padding: "12px" }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#fff" }}>{n.title}</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#4cc9f0" }}>📖 {n.subject} | Sem {n.semester}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Search;