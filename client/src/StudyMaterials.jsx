import { useEffect, useState } from "react";

function StudyMaterials({ isAdmin, api }) {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("1");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");

  const fetchItems = () => {
    fetch(`${api}/api/materials`)
      .then(res => res.json())
      .then(data => setItems(data));
  };

  useEffect(() => { fetchItems(); }, []);

  const addItem = async () => {
    if (!title || !subject || !file) { alert("Title, subject and file select cheyyi!"); return; }
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject);
    formData.append("semester", semester);
    formData.append("file", file);

    setLoading(true);
    await fetch(`${api}/api/materials`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }).then(res => res.json());

    fetchItems();
    setTitle(""); setSubject(""); setFile(null);
    setLoading(false);
  };

  const deleteItem = (id) => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/materials/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchItems());
  };

  const getViewUrl = (fileUrl) => `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  const subjects = ["All", ...new Set(items.map(i => i.subject))];
  const filtered = filter === "All" ? items : items.filter(i => i.subject === filter);

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1.5px solid #e0e0e0", background: "#fff", color: "#1a1a1a",
    fontSize: "14px", marginBottom: "12px", outline: "none", boxSizing: "border-box"
  };

  return (
    <div>
      {isAdmin && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "24px", maxWidth: "500px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 16px 0", color: "#F15A29", fontSize: "18px", fontWeight: "700" }}>📖 Add Study Material</h2>
          <input placeholder="Title (e.g. Unit 1 Notes)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
          <select value={semester} onChange={e => setSemester(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} style={{ ...inputStyle, padding: "8px" }} />
          <button onClick={addItem} disabled={loading} style={{ width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
            {loading ? "Uploading..." : "Add Material 📤"}
          </button>
        </div>
      )}

      <h2 style={{ color: "#1a1a1a", fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>📖 Study Materials</h2>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {subjects.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "6px 16px", borderRadius: "20px", border: filter === s ? "none" : "1px solid #e0e0e0", background: filter === s ? "#F15A29" : "#fff", color: filter === s ? "#fff" : "#666", cursor: "pointer", fontWeight: filter === s ? "600" : "400" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {filtered.map(m => (
          <div key={m._id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 4px 0", color: "#1a1a1a", fontSize: "16px" }}>📖 {m.title}</h3>
            <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "13px" }}>{m.subject} | Sem {m.semester}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <a href={getViewUrl(m.fileUrl)} target="_blank" rel="noreferrer" style={{ color: "#2196F3", fontSize: "13px", textDecoration: "none" }}>📥 View PDF</a>
              {isAdmin && (
                <button onClick={() => deleteItem(m._id)} style={{ marginLeft: "auto", background: "#fff0ee", color: "#F15A29", border: "1px solid #F15A29", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color: "#999" }}>No materials yet!</p>}
      </div>
    </div>
  );
}

export default StudyMaterials;