import { useEffect, useState } from "react";

function StudyMaterials({ isAdmin, api }) {
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({
  subject: "",
  title: "",
  fileUrl: ""
});
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = () => {
    fetch(`${api}/api/materials`)
      .then(res => res.json())
      .then(data => setMaterials(data))
      .catch(err => console.error(err));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setMessage("");
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setMessage("❌ Select a file first!");
      return;
    }

    setUploading(true);
    setMessage("⏳ Uploading...");

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${api}/api/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      
      if (res.ok && data.url) {
        setForm({ ...form, fileUrl: data.url });
        setMessage("✅ File uploaded! Ready to add material.");
        setSelectedFile(null);
        document.getElementById("fileInput").value = "";
      } else {
        setMessage("❌ Upload failed: " + (data.message || "Error"));
      }
    } catch (err) {
      setMessage("❌ Upload error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.subject || !form.title || !form.fileUrl) {
  setMessage("❌ Enter subject, title and upload file!");
  return;
}

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${api}/api/materials`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Material added successfully!");
        setForm({
  subject: "",
  title: "",
  fileUrl: ""
});
        fetchMaterials();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ " + (data.message || "Error adding material"));
      }
    } catch (err) {
      setMessage("❌ Server error: " + err.message);
    }
  };

  const deleteMaterial = (id) => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/materials/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    }).then(() => fetchMaterials());
  };

  return (
    <div>
      <h2 style={{ color: "#F15A29", fontSize: "24px", fontWeight: "700", marginBottom: "20px" }}>📖 Study Materials</h2>

      {isAdmin && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
          <h3 style={{ color: "#F15A29", marginTop: 0 }}>Add New Material</h3>
          {message && <p style={{ color: message.includes("✅") ? "#4CAF50" : message.includes("⏳") ? "#FF9800" : "#c0392b", fontWeight: "600", padding: "10px", background: "#f9f9f9", borderRadius: "6px" }}>{message}</p>}
          
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
            
            <input type="text" name="subject" placeholder="Subject (DBMS, OS, CN, etc)" value={form.subject} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "14px" }} />
            <input type="text" name="title" placeholder="Material Title" value={form.title} onChange={handleChange} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "14px" }} />

            {/* FILE UPLOAD SECTION */}
            <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", border: "2px dashed #F15A29" }}>
              <p style={{ margin: "0 0 12px 0", fontWeight: "600", color: "#333" }}>📤 Upload Material (PDF, DOC, DOCX)</p>
              
              <input 
                id="fileInput"
                type="file" 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileChange}
                style={{ 
                  marginBottom: "12px", 
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #e0e0e0",
                  width: "100%",
                  cursor: "pointer"
                }}
              />
              
              {selectedFile && (
                <p style={{ color: "#666", fontSize: "13px", margin: "0 0 12px 0" }}>
                  Selected: <strong>{selectedFile.name}</strong>
                </p>
              )}
              
              <button 
                type="button"
                onClick={uploadFile}
                disabled={uploading || !selectedFile}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: uploading || !selectedFile ? "#ccc" : "#F15A29",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                {uploading ? "⏳ Uploading..." : "📤 Upload File"}
              </button>

              {form.fileUrl && (
                <p style={{ color: "#4CAF50", marginTop: "12px", fontWeight: "600", fontSize: "13px" }}>
                  ✅ File ready! Click "Add Material" below.
                </p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={!form.fileUrl || uploading}
              style={{ 
                padding: "12px", 
                background: !form.fileUrl || uploading ? "#ccc" : "#F15A29", 
                color: "#fff", 
                border: "none", 
                borderRadius: "8px", 
                cursor: !form.fileUrl || uploading ? "not-allowed" : "pointer", 
                fontWeight: "600",
                fontSize: "14px"
              }}>
              ➕ Add Material
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {materials.length === 0 ? (
          <p style={{ color: "#999", gridColumn: "1/-1", textAlign: "center", padding: "40px" }}>No materials available</p>
        ) : (
          materials.map(material => (
            <div key={material._id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#F15A29", fontSize: "16px" }}>{material.title}</h3>
              <p style={{ margin: "0 0 8px 0", color: "#666", fontSize: "13px" }}><strong>Subject:</strong> {material.subject}</p>
              
              
              {material.fileUrl && (
                <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", color: "#fff", background: "#F15A29", textDecoration: "none", fontWeight: "600", fontSize: "13px", padding: "8px 16px", borderRadius: "6px" }}>
                  📥 Download Material
                </a>
              )}

              {isAdmin && (
                <button onClick={() => deleteMaterial(material._id)} style={{ marginLeft: "8px", background: "#fff0ee", color: "#F15A29", border: "1px solid #F15A29", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StudyMaterials;