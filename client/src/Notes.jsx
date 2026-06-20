import { useEffect, useState } from "react";

function Notes({ isAdmin, api, studentSection }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("1");
  const [section, setSection] = useState("7");
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  const fetchNotes = () => {
    const url = isAdmin ? `${api}/api/notes` : `${api}/api/notes?section=${studentSection}`;
    fetch(url)
      .then(res => res.json())
      .then(data => setNotes(data));
  };

  useEffect(() => {
    fetchNotes();
  }, [studentSection]);

  const addNotes = async () => {
    if (!subject || !section || files.length === 0) {
      alert("Subject, section and files select cheyyi!");
      return;
    }

    const token = localStorage.getItem("token");
    setLoading(true);

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("title", title || `${subject} - ${i + 1}`);
      formData.append("subject", subject);
      formData.append("semester", semester);
      formData.append("section", section);
      formData.append("file", files[i]);

      await fetch(`${api}/api/notes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      }).then(res => res.json());
    }

    fetchNotes();
    setTitle("");
    setSubject("");
    setFiles([]);
    setLoading(false);
  };

  const deleteNote = (id) => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/notes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchNotes());
  };

  const getViewUrl = (fileUrl, fileType) => {
    if (fileType?.includes("pdf")) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    return fileUrl;
  };

  const subjects = ["All", ...new Set(notes.map(n => n.subject))];
  const filtered = filter === "All" ? notes : notes.filter(n => n.subject === filter);

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid #e0e0e0",
    background: "#fff",
    color: "#1a1a1a",
    fontSize: "14px",
    marginBottom: "12px",
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div>
      {isAdmin && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "24px", maxWidth: "500px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 16px 0", color: "#F15A29", fontSize: "18px", fontWeight: "700" }}>📚 Add Notes</h2>
          <input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          <input placeholder="Subject (e.g. DBMS, OS)" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
          <select value={section} onChange={e => setSection(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"].map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>
          <select value={semester} onChange={e => setSemester(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <input type="file" accept="image/*,.pdf" multiple onChange={e => setFiles(Array.from(e.target.files))} style={{ ...inputStyle, padding: "8px" }} />
          {files.length > 0 && (
            <p style={{ color: "#F15A29", fontSize: "13px", marginBottom: "12px" }}>{files.length} file(s) selected ✅</p>
          )}
          <button onClick={addNotes} disabled={loading} style={{ width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
            {loading ? "Uploading... ⏳" : "Upload Notes 📚"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {subjects.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "6px 16px", borderRadius: "20px", border: filter === s ? "none" : "1px solid #e0e0e0", background: filter === s ? "#F15A29" : "#fff", color: filter === s ? "#fff" : "#666", cursor: "pointer", fontWeight: filter === s ? "600" : "400" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
        {filtered.map(n => (
          <div key={n._id} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            {n.fileType?.includes("pdf") ? (
              <div style={{ height: "160px", background: "#fff0ee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>📄</div>
            ) : (
              <img src={n.fileUrl} alt={n.title} style={{ width: "100%", height: "160px", objectFit: "cover" }} />
            )}
            <div style={{ padding: "12px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#1a1a1a" }}>{n.title}</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#F15A29" }}>📖 {n.subject} | Sem {n.semester} | Sec {n.section}</p>
              <a href={getViewUrl(n.fileUrl, n.fileType)} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "8px", color: "#2196F3", fontSize: "12px", textDecoration: "none" }}>
                {n.fileType?.includes("pdf") ? "📥 View PDF" : "🔍 View Image"}
              </a>
              {isAdmin && (
                <button onClick={() => deleteNote(n._id)} style={{ marginTop: "8px", marginLeft: "8px", background: "#fff0ee", color: "#F15A29", border: "1px solid #F15A29", padding: "4px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color: "#999" }}>No notes yet!</p>}
      </div>
    </div>
  );
}

export default Notes;