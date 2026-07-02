import { useEffect, useState } from "react";

function Papers({ isAdmin, api }) {
  const [papers, setPapers] = useState([]);
  const [form, setForm] = useState({
  section: "",
  subject: "",
  title: "",
});

const [message, setMessage] = useState("");
const [file, setFile] = useState(null);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = () => {
    fetch(`${api}/api/papers`)
      .then(res => res.json())
      .then(data => setPapers(data))
      .catch(err => console.error(err));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.section || !form.subject || !form.title) {
      setMessage("❌ All fields required!");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const formData = new FormData();

formData.append("section", form.section);
formData.append("subject", form.subject);
formData.append("title", form.title);

if (file) {
  formData.append("file", file);
}

const res = await fetch(`${api}/api/papers`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Paper added successfully!");
        setForm({
  section: "",
  subject: "",
  title: "",
});

setFile(null);
        fetchPapers();
      } else {
        setMessage("❌ " + (data.message || "Error adding paper"));
      }
    } catch (err) {
      setMessage("❌ Server error: " + err.message);
    }
  };

  const deletePaper = (id) => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/papers/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    }).then(() => fetchPapers());
  };

  return (
    <div>
      <h2 style={{ color: "#F15A29", fontSize: "24px", fontWeight: "700", marginBottom: "20px" }}>📄 Papers</h2>

      {isAdmin && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
          <h3 style={{ color: "#F15A29", marginTop: 0 }}>Add New Paper</h3>
          {message && <p style={{ color: message.includes("✅") ? "#4CAF50" : "#c0392b", fontWeight: "600" }}>{message}</p>}
          
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            <select name="section" value={form.section} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
              <option value="">-- Select Section --</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={String(i + 1)}>Section {i + 1}</option>
              ))}
            </select>

            <input type="text" name="subject" placeholder="Subject" value={form.subject} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0" }} />
            <input type="text" name="title" placeholder="Paper Title" value={form.title} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0" }} />
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
              ➕ Add Paper
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {papers.map(paper => (
          <div key={paper._id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#F15A29", fontSize: "16px" }}>{paper.title}</h3>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "13px" }}><strong>Subject:</strong> {paper.subject}</p>
            <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "13px" }}><strong>Section:</strong> {paper.section}</p>
            
            {paper.fileUrl && (
              <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#F15A29", textDecoration: "none", fontWeight: "600", fontSize: "13px" }}>
              📄 View PDF
              </a>
            )}

            {isAdmin && (
              <button onClick={() => deletePaper(paper._id)} style={{ marginLeft: "auto", display: "block", marginTop: "12px", background: "#fff0ee", color: "#F15A29", border: "1px solid #F15A29", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {papers.length === 0 && <p style={{ color: "#999", textAlign: "center", padding: "40px" }}>No papers available</p>}
    </div>
  );
}

export default Papers;
