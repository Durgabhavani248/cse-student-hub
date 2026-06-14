import { useEffect, useState } from "react";

function Notes({ isAdmin }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("1");
  const [images, setImages] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  const fetchNotes = () => {
    fetch("https://cse-student-hub.onrender.com/api/notes")
      .then(res => res.json())
      .then(data => setNotes(data));
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const addNotes = async () => {
    if (!subject || images.length === 0) {
      alert("Subject and images select cheyyi!");
      return;
    }

    const token = localStorage.getItem("token");
    setLoading(true);

    for (let i = 0; i < images.length; i++) {
      const formData = new FormData();
      formData.append("title", title || `${subject} - ${i + 1}`);
      formData.append("subject", subject);
      formData.append("semester", semester);
      formData.append("image", images[i]);

      await fetch("https://cse-student-hub.onrender.com/api/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      }).then(res => res.json());
    }

    fetchNotes();
    setTitle("");
    setSubject("");
    setImages([]);
    setLoading(false);
  };

  const deleteNote = (id) => {
    const token = localStorage.getItem("token");
    fetch(`https://cse-student-hub.onrender.com/api/notes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchNotes());
  };

  const subjects = ["All", ...new Set(notes.map(n => n.subject))];
  const filtered = filter === "All" ? notes : notes.filter(n => n.subject === filter);

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #4cc9f0",
    background: "#0f0f0f",
    color: "#fff",
    fontSize: "14px",
    marginBottom: "12px",
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div>
      {isAdmin && (
        <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #4cc9f0", borderRadius: "16px", padding: "24px", maxWidth: "500px", marginBottom: "24px", boxShadow: "0 4px 20px #4cc9f033" }}>
          <h2 style={{ margin: "0 0 16px 0", background: "linear-gradient(90deg, #4361ee, #4cc9f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>📚 Add Notes</h2>
          <input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          <input placeholder="Subject (e.g. DBMS, OS)" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
          <select value={semester} onChange={e => setSemester(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={e => setImages(Array.from(e.target.files))}
            style={{ ...inputStyle, padding: "8px" }}
          />
          {images.length > 0 && (
            <p style={{ color: "#4cc9f0", fontSize: "13px", marginBottom: "12px" }}>
              {images.length} image(s) selected ✅
            </p>
          )}
          <button onClick={addNotes} disabled={loading} style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #4361ee, #4cc9f0)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>
            {loading ? `Uploading... ⏳` : "Upload Notes 📚"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {subjects.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "6px 16px", borderRadius: "20px", border: "none", background: filter === s ? "linear-gradient(90deg, #4361ee, #4cc9f0)" : "#1a1a2e", color: "#fff", cursor: "pointer", fontWeight: filter === s ? "bold" : "normal" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
        {filtered.map(n => (
          <div key={n.id} style={{ background: "#1a1a2e", borderRadius: "16px", overflow: "hidden", border: "1px solid #4361ee", boxShadow: "0 4px 20px #4361ee33" }}>
            <img src={n.imageUrl} alt={n.title} style={{ width: "100%", height: "200px", objectFit: "cover" }} />
            <div style={{ padding: "12px" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#fff" }}>{n.title}</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#4cc9f0" }}>📖 {n.subject} | Sem {n.semester}</p>
              {isAdmin && (
                <button onClick={() => deleteNote(n.id)} style={{ marginTop: "8px", background: "#f72585", color: "#fff", border: "none", padding: "4px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color: "#888" }}>No notes yet!</p>}
      </div>
    </div>
  );
}

export default Notes;