import { useEffect, useState } from "react";

function Search({ api }) {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const authToken = localStorage.getItem("token") || localStorage.getItem("studentToken") || localStorage.getItem("facultyToken");
    fetch(`${api}/api/notes`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => setNotes(data));
  }, []);

  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(query.toLowerCase()) ||
    n.subject?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <input
          placeholder="Search notes by title or subject..."
          value={query}
          onChange={e => setQuery(e.target.value)}
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

      {query === "" ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px 0" }}>🔍</p>
          <p>Start typing to search notes</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px 0" }}>📭</p>
          <p>No results found for "{query}"</p>
        </div>
      ) : (
        <div>
          <p style={{ color: "#F15A29", marginBottom: "16px", fontWeight: "600" }}>{filtered.length} result(s) found</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
            {filtered.map(n => (
              <div key={n._id} style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {n.fileType?.includes("pdf") ? (
                  <div style={{ height: "150px", background: "#fff0ee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>📄</div>
                ) : (
                  <img src={n.fileUrl} alt={n.title} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
                )}
                <div style={{ padding: "12px" }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#1a1a1a" }}>{n.title}</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#F15A29" }}>{n.subject} | Sem {n.semester} | Sec {n.section}</p>
                  <a href={n.fileUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "8px", color: "#2196F3", fontSize: "12px", textDecoration: "none" }}>
                    View
                  </a>
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