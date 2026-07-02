import { useEffect, useState } from "react";

function Assignments({ isAdmin, api }) {
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({
  section: "",
  subject: "",
  title: "",
  description: "",
});
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = () => {
    fetch(`${api}/api/assignments`)
      .then(res => res.json())
      .then(data => setAssignments(data.assignments || []))
      .catch(err => console.error(err));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.section || !form.subject || !form.title || !form.description) {
      setMessage("❌ All fields required!");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const formData = new FormData();

formData.append("section", form.section);
formData.append("subject", form.subject);
formData.append("title", form.title);
formData.append("description", form.description);

if (file) {
  formData.append("file", file);
}

const res = await fetch(`${api}/api/assignments`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Assignment added successfully!");
        setForm({
  section: "",
  subject: "",
  title: "",
  description: "",
});
setFile(null);
        fetchAssignments();
      } else {
        setMessage("❌ " + (data.message || "Error adding assignment"));
      }
    } catch (err) {
      setMessage("❌ Server error: " + err.message);
    }
  };

  const deleteAssignment = (id) => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/assignments/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    }).then(() => fetchAssignments());
  };

  return (
    <div>
      <h2 style={{ color: "#F15A29", fontSize: "24px", fontWeight: "700", marginBottom: "20px" }}>📝 Assignments</h2>

      {isAdmin && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
          <h3 style={{ color: "#F15A29", marginTop: 0 }}>Add New Assignment</h3>
          {message && <p style={{ color: message.includes("✅") ? "#4CAF50" : "#c0392b", fontWeight: "600" }}>{message}</p>}
          
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <select name="section" value={form.section} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
              <option value="">-- Select Section --</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={String(i + 1)}>Section {i + 1}</option>
              ))}
            </select>

            <input type="text" name="subject" placeholder="Subject" value={form.subject} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0" }} />
            <input type="text" name="title" placeholder="Title" value={form.title} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0" }} />
            <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0", minHeight: "100px" }} />
            
<input
  type="file"
  accept=".pdf"
  onChange={(e) => setFile(e.target.files[0])}
  style={{
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  }}
/>
            <button type="submit" style={{ padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
              ➕ Add Assignment
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {assignments.map(assignment => (
          <div key={assignment._id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#F15A29", fontSize: "16px" }}>{assignment.title}</h3>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "13px" }}><strong>Subject:</strong> {assignment.subject}</p>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "13px" }}><strong>Section:</strong> {assignment.section}</p>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "14px" }}>{assignment.description}</p>
            {assignment.fileUrl && (
  <a
    href={assignment.fileUrl}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "inline-block",
      color: "#F15A29",
      textDecoration: "none",
      fontWeight: "600",
      marginBottom: "10px",
    }}
  >
    📄 View PDF
  </a>
)}
            
            

            {isAdmin && (
              <button onClick={() => deleteAssignment(assignment._id)} style={{ marginLeft: "auto", display: "block", marginTop: "12px", background: "#fff0ee", color: "#F15A29", border: "1px solid #F15A29", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {assignments.length === 0 && <p style={{ color: "#999", textAlign: "center", padding: "40px" }}>No assignments available</p>}
    </div>
  );
}

export default Assignments;
