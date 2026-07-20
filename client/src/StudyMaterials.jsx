import { useEffect, useState } from "react";

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("studentToken") || localStorage.getItem("facultyToken");
}

const BRANCHES = ["CSE", "CSE (AI & ML)", "CSE (Data Science)", "IT", "ECE", "EEE", "MECH", "CIVIL"];

function StudyMaterials({ canUpload, isAdmin, api, facultyInfo }) {
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({ subject: "", title: "", branch: "CSE" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchMaterials = () => {
    fetch(`${api}/api/materials`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then(res => res.json())
      .then(data => setMaterials(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addMaterial = async () => {
    setMessage("");
    if (!form.subject || !form.title) {
      setMessage("❌ Subject and Title are required!");
      return;
    }
    if (!file) {
      setMessage("❌ Please select a file!");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch(`${api}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: fd
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        setSaving(false);
        setMessage(`❌ File upload failed: ${uploadData.message || "unknown error"}`);
        return;
      }

      const branch = facultyInfo?.branch || form.branch || "CSE";
      const saveRes = await fetch(`${api}/api/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ ...form, branch, fileUrl: uploadData.url })
      });
      const saveData = await saveRes.json();
      setSaving(false);

      if (!saveRes.ok) {
        setMessage(`❌ ${saveData.message || "Failed to save material"}`);
        return;
      }

      setMessage("✅ Material added successfully!");
      setForm({ subject: "", title: "", branch: form.branch });
      setFile(null);
      fetchMaterials();
    } catch (err) {
      setSaving(false);
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  const deleteMaterial = async (id) => {
    if (!confirm("Delete this material?")) return;
    const res = await fetch(`${api}/api/materials/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    const data = await res.json();
    if (res.ok) fetchMaterials();
    else alert(data.message || "Failed to delete");
  };

  const inputStyle = { padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "14px", boxSizing: "border-box" };

  return (
    <div>
      <h2 style={{ color: "#F15A29", fontSize: "24px", fontWeight: "700", marginBottom: "20px" }}>📖 Study Materials</h2>

      {canUpload && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
          <h3 style={{ color: "#F15A29", marginTop: 0 }}>Add New Material</h3>
          {message && <p style={{ color: message.startsWith("✅") ? "#4CAF50" : "#F15A29", fontWeight: "600" }}>{message}</p>}

          <div style={{ display: "grid", gap: "12px" }}>
            {isAdmin && !facultyInfo && (
              <select name="branch" value={form.branch} onChange={handleChange} style={inputStyle}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <input type="text" name="subject" placeholder="Subject" value={form.subject} onChange={handleChange} style={inputStyle} />
            <input type="text" name="title" placeholder="Title (e.g. Lab Manual, Syllabus)" value={form.title} onChange={handleChange} style={inputStyle} />

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#666", fontWeight: "600" }}>PDF File</label>
              <input type="file" onChange={e => setFile(e.target.files[0])} style={{ width: "100%" }} />
              {file && <p style={{ fontSize: "12px", color: "#4CAF50", marginTop: "4px" }}>Selected: {file.name}</p>}
            </div>

            <button
              onClick={addMaterial}
              disabled={saving}
              style={{ padding: "14px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "600", fontSize: "15px", cursor: "pointer" }}
            >
              {saving ? "Saving..." : "➕ Add Material"}
            </button>
          </div>
        </div>
      )}

      {materials.length === 0 && <p style={{ color: "#999" }}>No materials yet.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {materials.map(m => (
          <div key={m._id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ color: "#F15A29", margin: "0 0 8px 0", fontSize: "17px" }}>{m.title}</h3>
            {isAdmin && !facultyInfo && m.branch && (
              <span style={{ display: "inline-block", background: "#f0f7ff", color: "#2196F3", padding: "2px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", marginBottom: "6px" }}>{m.branch}</span>
            )}
            <p style={{ margin: "4px 0", fontSize: "13px", color: "#666" }}><strong>Subject:</strong> {m.subject}</p>

            {m.fileUrl ? (
              <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: "10px", padding: "8px 16px", background: "#fff0ee", color: "#F15A29", borderRadius: "8px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
                📄 View File
              </a>
            ) : (
              <p style={{ marginTop: "10px", fontSize: "12px", color: "#bbb", fontStyle: "italic" }}>No file attached</p>
            )}

            {canUpload && (
              <button
                onClick={() => deleteMaterial(m._id)}
                style={{ display: "block", marginTop: "12px", padding: "6px 14px", background: "#fff", color: "#F15A29", border: "1px solid #F15A29", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudyMaterials;
