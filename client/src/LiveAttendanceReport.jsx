import { useEffect, useState } from "react";

function LiveAttendanceReport({ api, isAdmin, facultyInfo }) {
  const [branches, setBranches] = useState(["CSE", "ECE", "EEE", "MECH", "CIVIL"]);
  const [sections, setSections] = useState([]);
  const [branch, setBranch] = useState(facultyInfo?.branch || "");
  const [section, setSection] = useState("");
  const [date, setDate] = useState(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date())
  );

  const [report, setReport] = useState(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token =
    localStorage.getItem("facultyToken") ||
    localStorage.getItem("token");

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (isAdmin) {
      setBranches(["CSE", "ECE", "EEE", "MECH", "CIVIL"]);
      if (!branch) setBranch("CSE");
    } else {
      setBranch(facultyInfo?.branch || "");
    }
  }, [isAdmin, facultyInfo?.branch]);

  useEffect(() => {
    let active = true;

    setSection("");
    setSections([]);
    setReport(null);
    setSelectedPeriodId("");

    if (!branch) return undefined;

    const loadSections = async () => {
      try {
        const res = await fetch(
          `${api}/api/attendance/live-sections/${encodeURIComponent(branch)}`,
          { headers: authHeaders }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load sections");

        if (active) setSections(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(err.message);
      }
    };

    loadSections();

    return () => { active = false; };
  }, [api, branch]);

  useEffect(() => {
    let active = true;

    setReport(null);
    setSelectedPeriodId("");

    if (!branch || !section || !date) return undefined;

    const loadReport = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${api}/api/attendance/live-report/${encodeURIComponent(branch)}/${encodeURIComponent(section)}/${date}`,
          { headers: authHeaders }
        );

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Unable to load attendance report");

        if (active) {
          setReport(data);
          setError("");
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReport();
    const timer = setInterval(loadReport, 15000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, branch, section, date]);

  const selectedPeriod = report?.periods?.find(
    p => p.periodId === selectedPeriodId
  );

  const styles = {
    card: {
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "16px"
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      border: "1px solid #ddd",
      borderRadius: "8px",
      background: "#fff"
    },
    badge: {
      display: "inline-block",
      padding: "5px 9px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: 700
    }
  };

  const statusColor = {
    LIVE: { background: "#dcfce7", color: "#15803d" },
    COMPLETED: { background: "#dcfce7", color: "#15803d" },
    IN_PROCESS: { background: "#fef3c7", color: "#92400e" },
    NEXT: { background: "#f1f5f9", color: "#475569" },
    NOT_MARKED: { background: "#fee2e2", color: "#b91c1c" }
  };

  const statusLabel = {
    LIVE: "LIVE",
    COMPLETED: "Completed",
    IN_PROCESS: "In Process",
    NEXT: "Next",
    NOT_MARKED: "Not Marked"
  };

  const studentList = (title, students, color) => (
    <div style={{ ...styles.card, flex: "1 1 280px", minWidth: 0 }}>
      <h3 style={{ marginTop: 0, color }}>{title} ({students.length})</h3>
      {students.length === 0 ? (
        <p style={{ color: "#888", fontSize: "13px" }}>No students in this list.</p>
      ) : (
        <div style={{ maxHeight: "340px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#888" }}>
                <th style={{ padding: "8px 5px" }}>Roll No</th>
                <th style={{ padding: "8px 5px" }}>Student Name</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={`${s.rollNo}-${i}`} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "9px 5px", fontWeight: 600 }}>{s.rollNo}</td>
                  <td style={{ padding: "9px 5px" }}>{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 0" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 18
      }}>
        <div>
          <h2 style={{ margin: 0, color: "#F15A29" }}>Live Attendance Report</h2>
          <p style={{ margin: "5px 0 0", color: "#777", fontSize: 13 }}>
            Timetable-wise section attendance monitoring
          </p>
        </div>
        <span style={{ ...styles.badge, background: "#dcfce7", color: "#15803d" }}>
          Auto refresh: 15 sec
        </span>
      </div>

      <div style={{
        ...styles.card,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: 14,
        marginBottom: 18
      }}>
        {isAdmin && (
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              BRANCH
            </label>
            <select
              value={branch}
              onChange={e => setBranch(e.target.value)}
              style={styles.input}
            >
              <option value="">Select branch</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            DATE
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            SECTION
          </label>
          <select
            value={section}
            onChange={e => setSection(e.target.value)}
            style={styles.input}
            disabled={!branch || sections.length === 0}
          >
            <option value="">Select section</option>
            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <p style={{ color: "#b91c1c", background: "#fee2e2", padding: 12, borderRadius: 8 }}>
          {error}
        </p>
      )}

      {loading && !report && <p style={{ color: "#777" }}>Loading attendance...</p>}

      {report && !selectedPeriod && (
        <>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12
          }}>
            <h3 style={{ margin: 0 }}>{report.branch} — Section {report.section}</h3>
            <span style={{ color: "#777", fontSize: 13 }}>
              {report.date} | {report.dayKey} | {report.totalStudents} students
            </span>
          </div>

          {report.periods.length === 0 ? (
            <div style={styles.card}>
              No classes found in the timetable for this date.
            </div>
          ) : (
            <div style={{ ...styles.card, padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
                <thead>
                  <tr style={{ background: "#fff7f2", textAlign: "left" }}>
                    <th style={{ padding: 13 }}>Hour</th>
                    <th style={{ padding: 13 }}>Subject</th>
                    <th style={{ padding: 13 }}>Present</th>
                    <th style={{ padding: 13 }}>Absent</th>
                    <th style={{ padding: 13 }}>Total</th>
                    <th style={{ padding: 13 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.periods.map(p => (
                    <tr
                      key={p.periodId}
                      onClick={() => setSelectedPeriodId(p.periodId)}
                      style={{
                        borderTop: "1px solid #eee",
                        cursor: "pointer"
                      }}
                    >
                      <td style={{ padding: 13, fontWeight: 700 }}>{p.label}</td>
                      <td style={{ padding: 13, fontWeight: 600 }}>{p.subject}</td>
                      <td style={{ padding: 13, color: "#15803d", fontWeight: 700 }}>{p.presentCount}</td>
                      <td style={{ padding: 13, color: "#b91c1c", fontWeight: 700 }}>{p.absentCount}</td>
                      <td style={{ padding: 13 }}>{p.totalStudents}</td>
                      <td style={{ padding: 13 }}>
                        <span style={{ ...styles.badge, ...(statusColor[p.status] || {}) }}>
                          {statusLabel[p.status] || p.status}
                        </span>
                        {p.status === "LIVE" && (
                          <span style={{
                            ...styles.badge,
                            background: "#fef3c7",
                            color: "#92400e",
                            marginLeft: 5
                          }}>
                            {p.attendanceStatus}
                          </span>
                        )}
                        {!p.timingConfigured && (
                          <div style={{ color: "#b45309", fontSize: 10, marginTop: 4 }}>
                            Timings unavailable
                          </div>
                        )}
                        <div style={{ color: "#888", fontSize: 10, marginTop: 4 }}>
                          Click to view students
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedPeriod && (
        <>
          <button
            onClick={() => setSelectedPeriodId("")}
            style={{
              background: "#fff",
              border: "1px solid #F15A29",
              color: "#F15A29",
              borderRadius: 8,
              padding: "9px 15px",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 16
            }}
          >
            ← Back to Daily Report
          </button>

          <h3 style={{ marginTop: 0 }}>
            {selectedPeriod.label} — {selectedPeriod.subject}
          </h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            marginBottom: 16
          }}>
            <div style={styles.card}>
              <h2 style={{ color: "#15803d", margin: 0 }}>{selectedPeriod.presentCount}</h2>
              <span>Present</span>
            </div>
            <div style={styles.card}>
              <h2 style={{ color: "#b91c1c", margin: 0 }}>{selectedPeriod.absentCount}</h2>
              <span>Absent</span>
            </div>
            <div style={styles.card}>
              <h2 style={{ margin: 0 }}>{selectedPeriod.totalStudents}</h2>
              <span>Total Students</span>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {studentList("Present Students", selectedPeriod.presentStudents, "#15803d")}
            {studentList("Absent Students", selectedPeriod.absentStudents, "#b91c1c")}
            {studentList("Not Marked", selectedPeriod.notMarkedStudents, "#92400e")}
          </div>
        </>
      )}
    </div>
  );
}

export default LiveAttendanceReport;