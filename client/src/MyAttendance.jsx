import { useEffect, useState } from "react";

function MyAttendance({ api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("studentToken");
    fetch(`${api}/api/attendance/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(d => {
        setLoading(false);
        if (d.summary) setData(d);
        else setError(d.message || "Failed to load attendance");
      })
      .catch(() => { setLoading(false); setError("Server error!"); });
  }, [api]);

  if (loading) return <p style={{ color: "#666" }}>Loading...</p>;
  if (error) return <p style={{ color: "#F15A29" }}>{error}</p>;
  if (!data) return null;

  const pct = parseFloat(data.summary.percentage);
  const pctColor = pct >= 75 ? "#4CAF50" : pct >= 60 ? "#e0a800" : "#F15A29";

  return (
    <div>
      <h2 style={{ color: "#F15A29", marginBottom: "16px" }}>My Attendance</h2>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <div style={{ background: "#fff", border: `2px solid ${pctColor}`, borderRadius: "16px", padding: "24px 32px", textAlign: "center", minWidth: "160px" }}>
          <div style={{ fontSize: "40px", fontWeight: "800", color: pctColor }}>{data.summary.percentage}%</div>
          <div style={{ color: "#999", fontSize: "12px", marginTop: "4px" }}>Overall Attendance</div>
          {pct < 75 && <div style={{ color: "#F15A29", fontSize: "11px", marginTop: "6px", fontWeight: "600" }}>⚠️ Below 75%</div>}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "24px 32px", textAlign: "center", minWidth: "140px" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#1a1a1a" }}>{data.summary.present}</div>
          <div style={{ color: "#999", fontSize: "12px", marginTop: "4px" }}>Classes Attended</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "24px 32px", textAlign: "center", minWidth: "140px" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#1a1a1a" }}>{data.summary.totalClasses}</div>
          <div style={{ color: "#999", fontSize: "12px", marginTop: "4px" }}>Total Classes</div>
        </div>
      </div>

      {data.subjectSummary?.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <h3 style={{ marginTop: 0, color: "#1a1a1a" }}>Subject-wise</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.subjectSummary.map(s => {
              const sPct = parseFloat(s.percentage);
              const sColor = sPct >= 75 ? "#4CAF50" : sPct >= 60 ? "#e0a800" : "#F15A29";
              return (
                <div key={s.subject} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "120px", fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>{s.subject}</div>
                  <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
                    <div style={{ width: `${sPct}%`, background: sColor, height: "100%" }} />
                  </div>
                  <div style={{ width: "50px", textAlign: "right", fontSize: "13px", fontWeight: "700", color: sColor }}>{s.percentage}%</div>
                  <div style={{ width: "50px", textAlign: "right", fontSize: "11px", color: "#999" }}>{s.present}/{s.total}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.records?.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ marginTop: 0, color: "#1a1a1a" }}>Recent Records</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#999", borderBottom: "1px solid #e0e0e0" }}>
                  <th style={{ padding: "8px" }}>Date</th>
                  <th style={{ padding: "8px" }}>Subject</th>
                  <th style={{ padding: "8px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.records.slice(0, 30).map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "8px" }}>{r.date}</td>
                    <td style={{ padding: "8px" }}>{r.subject}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ color: r.status === "present" ? "#4CAF50" : "#F15A29", fontWeight: "700", fontSize: "11px" }}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.records?.length === 0 && (
        <p style={{ color: "#999" }}>No attendance records yet.</p>
      )}
    </div>
  );
}

export default MyAttendance;
