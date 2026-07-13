import { useEffect, useState } from "react";

function Notes({ isAdmin, canUpload, api, studentSection }) {
  const [notes, setNotes] = useState([]);

const [form, setForm] = useState({
  section: "",
  subject: "",
  title: "",
  description: "",
  fileUrl: "",
});

const [file, setFile] = useState(null);

const [message, setMessage] = useState("");
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = () => {
    const authToken = localStorage.getItem("token") || localStorage.getItem("studentToken") || localStorage.getItem("facultyToken");
    fetch(`${api}/api/notes`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => setNotes(data))
      .catch(err => console.error(err));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const uploadFile = async () => {
  if (!file) {
    setMessage("❌ Select a file first!");
    return;
  }

  const token = localStorage.getItem("token") || localStorage.getItem("studentToken") || localStorage.getItem("facultyToken");

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch(`${api}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: fd,
    });

    const data = await res.json();

    if (res.ok) {
      setForm((prev) => ({
        ...prev,
        fileUrl: data.url,
      }));

      setMessage("✅ File uploaded successfully!");
    } else {
      setMessage("❌ " + data.message);
    }
  } catch (err) {
    setMessage(err.message);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.section || !form.subject || !form.title || !form.description) {
      setMessage("❌ All fields required!");
      return;
    }

    const token = localStorage.getItem("token") || localStorage.getItem("studentToken") || localStorage.getItem("facultyToken");
try {
  const res = await fetch(`${api}/api/notes`, {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
},

body: JSON.stringify(form),
  });

      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Note added successfully!");
      setForm({
  section: "",
  subject: "",
  title: "",
  description: "",
  fileUrl: "",
});

setFile(null);
        fetchNotes();
      } else {
        setMessage("❌ " + (data.message || "Error adding note"));
      }
    } catch (err) {
      setMessage("❌ Server error: " + err.message);
    }
  };

  const deleteNote = async (id) => {

  const token = localStorage.getItem("token") || localStorage.getItem("studentToken") || localStorage.getItem("facultyToken");

  const res = await fetch(`${api}/api/notes/${id}`,{
    method:"DELETE",
    headers:{
      Authorization:`Bearer ${token}`
    }
  });

  const data = await res.json();

  console.log(data);

  if(res.ok){
      fetchNotes();
  }else{
      alert(data.message);
  }
}

  const filteredNotes = studentSection 
    ? notes.filter(n => n.section === studentSection)
    : notes;

  return (
    <div>
      <h2 style={{ color: "#F15A29", fontSize: "24px", fontWeight: "700", marginBottom: "20px" }}>📚 Notes</h2>

      {canUpload && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
          <h3 style={{ color: "#F15A29", marginTop: 0 }}>Add New Note</h3>
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
            <div>
  <label
    style={{
      display: "block",
      marginBottom: "8px",
      fontWeight: "600",
      color: "#555",
    }}
  >
    Upload File
  </label>

  <input
    type="file"
    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
    onChange={(e) => setFile(e.target.files[0])}
    style={{
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid #e0e0e0",
      width: "100%",
    }}
  />
  <button
  type="button"
  onClick={uploadFile}
  disabled={!file}
  style={{
    marginTop: "10px",
    padding: "10px 16px",
    background: !file ? "#ccc" : "#F15A29",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: !file ? "not-allowed" : "pointer",
  }}
>
  📤 Upload File
</button>

  {file && (
    <p
      style={{
        color: "#4CAF50",
        marginTop: "8px",
        fontSize: "13px",
      }}
    >
      ✅ {file.name}
    </p>
  )}
</div>

            <button type="submit" style={{ padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>
              ➕ Add Note
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {filteredNotes.map(note => (
          <div key={note._id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#F15A29", fontSize: "16px" }}>{note.title}</h3>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "13px" }}><strong>Subject:</strong> {note.subject}</p>
            <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "13px" }}><strong>Section:</strong> {note.section}</p>
            <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "14px" }}>{note.description}</p>
            
            {/* Image Preview */}
{note.fileUrl &&
  (note.fileUrl.toLowerCase().endsWith(".jpg") ||
    note.fileUrl.toLowerCase().endsWith(".jpeg") ||
    note.fileUrl.toLowerCase().endsWith(".png")) && (
    <img
      src={note.fileUrl}
      alt={note.title}
      style={{
        width: "100%",
        borderRadius: "8px",
        marginBottom: "10px",
      }}
    />
)}

{/* PDF Preview */}
{note.fileUrl &&
  note.fileUrl.toLowerCase().endsWith(".pdf") && (
    <iframe
      src={note.fileUrl}
      title={note.title}
      width="100%"
      height="350"
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        marginBottom: "10px",
      }}
    />
)}

{note.fileUrl && (
  <a
    href={note.fileUrl}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: "#F15A29",
      textDecoration: "none",
      fontWeight: "600",
      fontSize: "13px",
    }}
  >
    📄 View File
  </a>
)}

            {canUpload && (
              <button onClick={() => deleteNote(note._id)} style={{ marginLeft: "auto", display: "block", marginTop: "12px", background: "#fff0ee", color: "#F15A29", border: "1px solid #F15A29", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {filteredNotes.length === 0 && <p style={{ color: "#999", textAlign: "center", padding: "40px" }}>No notes available</p>}
    </div>
  );
}

export default Notes;
