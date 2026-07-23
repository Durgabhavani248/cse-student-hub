import { useState } from "react";

const BRANCHES = ["CSE", "CSE (AI & ML)", "CSE (Data Science)", "IT", "ECE", "EEE", "MECH", "CIVIL"];

function ManageCR({ api, isAdmin, facultyInfo }) {
  const [branch, setBranch] = useState(facultyInfo?.branch || "CSE");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token") || localStorage.getItem("facultyToken");

  const loadStudents = () => {
    if (!section) { alert("Section enter cheyyi!"); return; }
    setLoading(true);
    setMessage("");
    fetch(`${api}/api/students/${branch}/${section}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (Array.isArray(data)) {
          setStudents(data);
          if (data.length === 0) setMessage(`⚠️ No students found in ${branch} - Section ${section}`);
        } else {
          setMessage(`❌ ${data.message || "Failed to load students"}`);
        }
      })
      .catch(() => { setLoading(false); setMessage("❌ Server error!"); });
  };

  const toggleCR = (rollNo, currentIsCR) => {
    fetch(`${api}/api/admin/set-cr`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rollNo, isCR: !currentIsCR })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message?.includes(rollNo) || data.message?.includes("CR")) {
          setStudents(prev => prev.map(s => s.rollNo === rollNo ? { ...s, isCR: !currentIsCR } : s));
          setMessage(`✅ ${data.message}`);
        } else {
          setMessage(`❌ ${data.message}`);
        }
      })
      .catch(() => setMessage("❌ Server error!"));
  };

  const inputStyle = { padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e0e0e0", fontSize: "14px" };

  return (
    <div>
      <h2 style={{ color: "#F15A29", marginBottom: "16px" }}>Manage Class Representatives</h2>
      <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px", maxWidth: "500px" }}>
        CRs can upload Notes and Assignments for their own section, just like faculty.
      </p>

      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
        {isAdmin && (
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>BRANCH</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} style={inputStyle}>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>SECTION</label>
          <input placeholder="e.g. 7" value={section} onChange={e => setSection(e.target.value)} style={inputStyle} />
        </div>
        <button
          onClick={loadStudents}
          disabled={loading}
          style={{ padding: "10px 20px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
        >
          {loading ? "Loading..." : "Load Students"}
        </button>
      </div>

      {message && (
        <p style={{ color: message.startsWith("❌") ? "#F15A29" : message.startsWith("⚠️") ? "#e0a800" : "#4CAF50", fontWeight: "600", marginBottom: "16px" }}>{message}</p>
      )}

      {students.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
          {students.map(s => (
            <div
              key={s.rollNo}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderRadius: "8px",
                background: s.isCR ? "#fff9e6" : "#fff",
                border: `1.5px solid ${s.isCR ? "#e0a800" : "#e0e0e0"}`
              }}
            >
              <div>
                <div style={{ fontWeight: "600", fontSize: "13px", color: "#1a1a1a" }}>{s.name}{s.isCR ? " ⭐" : ""}</div>
                <div style={{ fontSize: "11px", color: "#999" }}>{s.rollNo}</div>
              </div>
              <button
                onClick={() => toggleCR(s.rollNo, s.isCR)}
                style={{
                  padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer",
                  background: s.isCR ? "#fff" : "#F15A29",
                  color: s.isCR ? "#e0a800" : "#fff",
                  border: s.isCR ? "1px solid #e0a800" : "none"
                }}
              >
                {s.isCR ? "Remove CR" : "Make CR"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManageCR;
