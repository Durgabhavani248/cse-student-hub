import { useEffect, useState } from "react";

function Attendance({ api, facultyInfo }) {
  const isHod = facultyInfo?.role === "hod";
  const sectionOptions = isHod ? [] : (facultyInfo?.assignedSections || []);

  const [section, setSection] = useState(sectionOptions[0] || "");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // rollNo -> "present" | "absent"
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [existingRecords, setExistingRecords] = useState([]);

  const token = localStorage.getItem("facultyToken");

  const loadStudents = () => {
    if (!section) { alert("Section enter cheyyi!"); return; }
    setLoading(true);
    setMessage("⏳ Requesting: " + `${api}/api/students/${facultyInfo.branch}/${section}`);

    fetch(`${api}/api/students/${facultyInfo.branch}/${section}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        const status = res.status;
        let data;
        try {
          data = await res.json();
        } catch {
          data = null;
        }
        setLoading(false);

        if (!res.ok) {
          setMessage(`❌ Status ${status}: ${data?.message || "Unknown error (response was not JSON)"}`);
          return;
        }

        if (Array.isArray(data)) {
          setStudents(data);
          const initial = {};
          data.forEach(s => { initial[s.rollNo] = "present"; });
          setAttendance(initial);
          if (data.length === 0) {
            setMessage(`⚠️ Status 200 OK, but 0 students found in ${facultyInfo.branch} - Section ${section}.`);
          } else {
            setMessage(`✅ Loaded ${data.length} students`);
          }
        } else {
          setMessage(`❌ Unexpected response: ${JSON.stringify(data)}`);
        }
      })
      .catch(err => {
        setLoading(false);
        setMessage(`❌ Network/fetch error: ${err.message}`);
      });
  };

  const loadExisting = () => {
    if (!section || !subject || !date) return;
    fetch(`${api}/api/attendance/section/${facultyInfo.branch}/${section}?subject=${encodeURIComponent(subject)}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setExistingRecords(data);
          if (data.length > 0) {
            const marked = {};
            data.forEach(r => { marked[r.rollNo] = r.status; });
            setAttendance(prev => ({ ...prev, ...marked }));
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (students.length > 0) loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, date]);

  const toggle = (rollNo) => {
    setAttendance(prev => ({
      ...prev,
      [rollNo]: prev[rollNo] === "present" ? "absent" : "present"
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(s => { updated[s.rollNo] = status; });
    setAttendance(updated);
  };

  const submitAttendance = () => {
    if (!subject || !date) { alert("Subject and date required!"); return; }
    if (students.length === 0) { alert("Load students first!"); return; }

    const records = students.map(s => ({ rollNo: s.rollNo, status: attendance[s.rollNo] || "present" }));

    setLoading(true);
    fetch(`${api}/api/attendance/mark`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ branch: facultyInfo.branch, section, subject, date, records })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        setMessage(data.message?.startsWith("Attendance") ? `✅ ${data.message}` : `❌ ${data.message}`);
      })
      .catch(() => { setLoading(false); setMessage("❌ Server error!"); });
  };

  const inputStyle = {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1.5px solid #e0e0e0",
    fontSize: "14px",
    boxSizing: "border-box"
  };

  const presentCount = Object.values(attendance).filter(s => s === "present").length;

  return (
    <div>
      <h2 style={{ color: "#F15A29", marginBottom: "16px" }}>Mark Attendance</h2>

      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>SECTION</label>
          {isHod ? (
            <input placeholder="e.g. A" value={section} onChange={e => setSection(e.target.value.toUpperCase())} style={inputStyle} />
          ) : (
            <select value={section} onChange={e => setSection(e.target.value)} style={inputStyle}>
              {sectionOptions.length === 0 && <option value="">No sections assigned</option>}
              {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>SUBJECT</label>
          <input placeholder="e.g. DBMS" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>DATE</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
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
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <h3 style={{ margin: 0, color: "#1a1a1a" }}>
              {students.length} Students — <span style={{ color: "#4CAF50" }}>{presentCount} Present</span>, <span style={{ color: "#F15A29" }}>{students.length - presentCount} Absent</span>
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => markAll("present")} style={{ padding: "6px 14px", background: "#e8f8ec", color: "#4CAF50", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Mark All Present</button>
              <button onClick={() => markAll("absent")} style={{ padding: "6px 14px", background: "#fff0ee", color: "#F15A29", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Mark All Absent</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px", marginBottom: "20px" }}>
            {students.map(s => {
              const status = attendance[s.rollNo] || "present";
              const isPresent = status === "present";
              return (
                <div
                  key={s.rollNo}
                  onClick={() => toggle(s.rollNo)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                    background: isPresent ? "#e8f8ec" : "#fff0ee",
                    border: `1.5px solid ${isPresent ? "#4CAF50" : "#F15A29"}`
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "13px", color: "#1a1a1a" }}>{s.name}{s.isCR ? " ⭐" : ""}</div>
                    <div style={{ fontSize: "11px", color: "#999" }}>{s.rollNo}</div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: isPresent ? "#4CAF50" : "#F15A29" }}>
                    {isPresent ? "PRESENT" : "ABSENT"}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={submitAttendance}
            disabled={loading}
            style={{ width: "100%", padding: "14px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
          >
            {loading ? "Saving..." : existingRecords.length > 0 ? "Update Attendance →" : "Save Attendance →"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Attendance;
