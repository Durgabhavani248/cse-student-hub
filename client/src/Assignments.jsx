import { useEffect, useState } from "react";

function Assignments({ isAdmin, api }) {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchItems = () => {
  fetch(`${api}/api/assignments`)
    .then(res => res.json())
    .then(data => {
      console.log("Assignments API:", data);
      setItems(Array.isArray(data) ? data : data.assignments || []);
    })
    .catch(err => console.error(err));
};

  useEffect(() => { fetchItems(); }, []);

  const addItem = async () => {
    if (!title || !subject) { alert("Title and subject enter cheyyi!"); return; }
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject);
    formData.append("semester", semester);
    formData.append("dueDate", dueDate);
    if (file) formData.append("file", file);

    setLoading(true);
    await fetch(`${api}/api/assignments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }).then(res => res.json());

    fetchItems();
    setTitle(""); setSubject(""); setDueDate(""); setFile(null);
    setLoading(false);
  };

  const deleteItem = (id) => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/assignments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchItems());
  };

  const getViewUrl = (fileUrl) => `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1.5px solid #e0e0e0", background: "#fff", color: "#1a1a1a",
    fontSize: "14px", marginBottom: "12px", outline: "none", boxSizing: "border-box"
  };

  const isOverdue = (date) => date && new Date(date) < new Date();

  return (
    <div>
      {isAdmin && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "24px", maxWidth: "500px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 16px 0", color: "#F15A29", fontSize: "18px", fontWeight: "700" }}>📝 Add Assignment</h2>
          <input placeholder="Assignment Title" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
          <select value={semester} onChange={e => setSemester(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
          <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} style={{ ...inputStyle, padding: "8px" }} />
          <button onClick={addItem} disabled={loading} style={{ width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
            {loading ? "Uploading..." : "Add Assignment 📤"}
          </button>
        </div>
      )}

      <h2 style={{ color: "#1a1a1a", fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>📝 Assignments</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {items.map(a => (
          <div key={a._id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${isOverdue(a.dueDate) ? "#999" : "#F15A29"}` }}>
            <h3 style={{ margin: "0 0 4px 0", color: "#1a1a1a", fontSize: "16px" }}>{a.title}</h3>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "13px" }}>📖 {a.subject} | Sem {a.semester}</p>
            {a.dueDate && (
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: isOverdue(a.dueDate) ? "#999" : "#F15A29", fontWeight: "600" }}>
                ⏰ Due: {new Date(a.dueDate).toLocaleDateString()} {isOverdue(a.dueDate) && "(Overdue)"}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              {a.fileUrl && (
                <a href={a.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#2196F3", fontSize: "13px", textDecoration: "none" }}>📥 View PDF</a>
              )}
              {isAdmin && (
                <button onClick={() => deleteItem(a._id)} style={{ marginLeft: "auto", background: "#fff0ee", color: "#F15A29", border: "1px solid #F15A29", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: "#999" }}>No assignments yet!</p>}
      </div>
    </div>
  );
}

export default Assignments;