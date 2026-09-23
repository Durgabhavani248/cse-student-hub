import { useEffect, useState } from "react";
import XLSX from "xlsx";

// Admin has no facultyInfo/branch of their own, so admin picks a branch
// manually and clicks Load; HOD's branch comes from their own account and
// loads automatically. Both get an Excel download of the report on screen.
function HodAttendanceReport({ api, facultyInfo, isAdmin }) {
  const [branch, setBranch] = useState(isAdmin ? "" : (facultyInfo?.branch || ""));
  const [data, setData] = useState(null);
  const [allSections, setAllSections] = useState([]);
  const [loading, setLoading] = useState(!isAdmin);
  const [error, setError] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [showOnlyLow, setShowOnlyLow] = useState(false);

  const token = localStorage.getItem("facultyToken") || localStorage.getItem("token");

  const loadReport = (branchToLoad) => {
    if (!branchToLoad) { setError("Enter a branch first!"); return; }
    setLoading(true);
    setError("");
    setData(null);

    Promise.all([
      fetch(`${api}/api/attendance/branch-report/${branchToLoad}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()),
      fetch(`${api}/api/hod/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json())
    ])
      .then(([reportData, statsData]) => {
        setLoading(false);
        if (reportData.students) setData(reportData);
        else setError(reportData.message || "Failed to load report");

        if (Array.isArray(statsData.sectionCounts)) {
          setAllSections(statsData.sectionCounts.map(s => s._id || s.section).filter(Boolean).sort());
        }
      })
      .catch(() => { setLoading(false); setError("Server error!"); });
  };

  // HOD: auto-load their own branch on mount. Admin: waits for manual "Load".
  useEffect(() => {
    if (!isAdmin && facultyInfo?.branch) {
      loadReport(facultyInfo.branch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadAsExcel = () => {
    if (!data || rows.length === 0) return;

    const exportData = rows.map(r => ({
      "Roll No": r.rollNo,
      "Student Name": r.studentName,
      "Section": r.section,
      "Present": r.present,
      "Total": r.total,
      "Percentage": r.percentage
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `AttendanceReport_${data.branch}${filterSection !== "all" ? `_Sec${filterSection}` : ""}_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const inputStyle = { padding: "10px 14px", borderRadius: "8px", border: "1.5px solid #e0e0e0", fontSize: "14px" };

  // Admin branch-picker screen (shown before any report is loaded)
  if (isAdmin && !data && !loading) {
    return (
      <div>
        <h2 style={{ color: "#F15A29", marginBottom: "16px" }}>Attendance Report</h2>
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>BRANCH</label>
            <input placeholder="e.g. CSE" value={branch} onChange={e => setBranch(e.target.value)} style={inputStyle} />
          </div>
          <button
            onClick={() => loadReport(branch)}
            style={{ padding: "10px 20px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
          >
            Load Report
          </button>
        </div>
        {error && <p style={{ color: "#F15A29", marginTop: "12px" }}>{error}</p>}
      </div>
    );
  }

  if (loading) return <p style={{ color: "#666" }}>Loading...</p>;
  if (error) return <p style={{ color: "#F15A29" }}>{error}</p>;
  if (!data) return null;

  const reportSections = data.sectionSummary.map(s => s.section);
  const sections = ["all", ...Array.from(new Set([...allSections, ...reportSections])).sort()];
  let rows = filterSection === "all" ? data.students : data.students.filter(s => s.section === filterSection);
  if (showOnlyLow) rows = rows.filter(s => s.percentage < 75);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
        <h2 style={{ color: "#F15A29", margin: 0 }}>{data.branch} — Attendance Report</h2>
        {isAdmin && (
          <button
            onClick={() => { setData(null); setBranch(""); }}
            style={{ padding: "8px 16px", background: "#fff", color: "#F15A29", border: "1px solid #F15A29", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
          >
            ← Change Branch
          </button>
        )}
      </div>

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
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e0e0e0", fontSize: "13px" }}>
              {sections.map(s => <option key={s} value={s}>{s === "all" ? "All Sections" : `Section ${s}`}</option>)}
            </select>
            <label style={{ fontSize: "13px", color: "#666", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input type="checkbox" checked={showOnlyLow} onChange={e => setShowOnlyLow(e.target.checked)} />
              Below 75% only
            </label>
            <button
              onClick={downloadAsExcel}
              disabled={rows.length === 0}
              style={{ padding: "8px 16px", background: rows.length === 0 ? "#ccc" : "#4CAF50", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: rows.length === 0 ? "not-allowed" : "pointer" }}
            >
              📥 Download Excel
            </button>
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