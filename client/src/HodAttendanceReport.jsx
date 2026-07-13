import { useEffect, useState } from "react";

function HodAttendanceReport({ api, facultyInfo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [showOnlyLow, setShowOnlyLow] = useState(false);

  const token = localStorage.getItem("facultyToken");

  useEffect(() => {
    fetch(`${api}/api/attendance/branch-report/${facultyInfo.branch}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(d => {
        setLoading(false);
        if (d.students) setData(d);
        else setError(d.message || "Failed to load report");
      })
      .catch(() => { setLoading(false); setError("Server error!"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p style={{ color: "#666" }}>Loading...</p>;
  if (error) return <p style={{ color: "#F15A29" }}>{error}</p>;
  if (!data) return null;

  const sections = ["all", ...data.sectionSummary.map(s => s.section)];
  let rows = filterSection === "all" ? data.students : data.students.filter(s => s.section === filterSection);
  if (showOnlyLow) rows = rows.filter(s => s.percentage < 75);

  return (
    <div>
      <h2 style={{ color: "#F15A29", marginBottom: "16px" }}>{data.branch} — Attendance Report</h2>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        {data.sectionSummary.map(s => (
          <div key={s.section} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "130px" }}>
            <div style={{ fontSize: "24px", fontWeight: "700", color: s.avgPercentage >= 75 ? "#4CAF50" : "#F15A29" }}>{s.avgPercentage}%</div>
            <div style={{ color: "#999", fontSize: "12px" }}>Section {s.section} avg</div>
            <div style={{ color: "#bbb", fontSize: "10px" }}>{s.studentsTracked} students</div>
          </div>
        ))}
        <div style={{ background: "#fff0ee", border: "1px solid #F15A29", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "130px" }}>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#F15A29" }}>{data.lowAttendance.length}</div>
          <div style={{ color: "#F15A29", fontSize: "12px", fontWeight: "600" }}>Below 75%</div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ margin: 0, color: "#1a1a1a" }}>Students ({rows.length})</h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e0e0e0", fontSize: "13px" }}>
              {sections.map(s => <option key={s} value={s}>{s === "all" ? "All Sections" : `Section ${s}`}</option>)}
            </select>
            <label style={{ fontSize: "13px", color: "#666", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input type="checkbox" checked={showOnlyLow} onChange={e => setShowOnlyLow(e.target.checked)} />
              Below 75% only
            </label>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#999", borderBottom: "1px solid #e0e0e0" }}>
                <th style={{ padding: "8px" }}>Roll No</th>
                <th style={{ padding: "8px" }}>Name</th>
                <th style={{ padding: "8px" }}>Section</th>
                <th style={{ padding: "8px" }}>Present/Total</th>
                <th style={{ padding: "8px" }}>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.rollNo} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px", fontWeight: "600" }}>{r.rollNo}</td>
                  <td style={{ padding: "8px" }}>{r.studentName}</td>
                  <td style={{ padding: "8px" }}>{r.section}</td>
                  <td style={{ padding: "8px" }}>{r.present}/{r.total}</td>
                  <td style={{ padding: "8px", fontWeight: "700", color: r.percentage >= 75 ? "#4CAF50" : "#F15A29" }}>{r.percentage}%</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan="5" style={{ padding: "16px", textAlign: "center", color: "#999" }}>No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default HodAttendanceReport;
