import React, { useState, useEffect } from "react";
import axios from "axios";
import "./HODReport.css";

const API = "http://localhost:3001";

export default function HODReport() {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [subject, setSubject] = useState("ADS");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const subjects = ["ADS", "BED", "ENG", "LMS-3", "P&S", "AI-FINANCE", "QP"];

  // Fetch sections
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await axios.get(`${API}/api/sections`);
        setSections(res.data);
        if (res.data.length > 0) {
          setSelectedSection(res.data[0]);
        }
      } catch (err) {
        console.error("Error fetching sections:", err);
      }
    };
    fetchSections();
  }, []);

  // Fetch attendance when section/date/subject changes
  useEffect(() => {
    if (selectedSection && date && subject) {
      loadAttendance();
    }
  }, [selectedSection, date, subject]);

  const loadAttendance = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${API}/api/attendance/section/${selectedSection}/date/${date}?subject=${subject}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(res.data.records);
    } catch (err) {
      setError("Error loading attendance: " + err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const getAttendancePercentage = (rollNo) => {
    // Get percentage from AttendanceSummary if available
    // For now, calculate from current records
    const presentCount = students.filter(
      (s) => s.rollNo === rollNo && s.status === "present"
    ).length;
    const totalCount = students.filter((s) => s.rollNo === rollNo).length;
    return totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;
  };

  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.filter((s) => s.status === "absent").length;
  const totalCount = students.length;

  const getStatusColor = (status) => {
    return status === "present" ? "#27ae60" : "#e74c3c";
  };

  const getPercentageColor = (percentage) => {
    const percent = parseFloat(percentage);
    if (percent >= 75) return "green";
    if (percent >= 60) return "orange";
    return "red";
  };

  return (
    <div className="hod-report-container">
      <h2>📊 HOD - Attendance View</h2>

      <div className="hod-filters">
        <div className="filter-group">
          <label>SECTION</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="">-- Select Section --</option>
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                Section {sec}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>SUBJECT</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>DATE</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {selectedSection && (
        <div className="hod-stats">
          <div className="stat-card">
            <span className="label">Total Students</span>
            <span className="value">{totalCount}</span>
          </div>
          <div className="stat-card present">
            <span className="label">Present</span>
            <span className="value">{presentCount}</span>
          </div>
          <div className="stat-card absent">
            <span className="label">Absent</span>
            <span className="value">{absentCount}</span>
          </div>
          <div className="stat-card">
            <span className="label">Attendance %</span>
            <span className="value">
              {totalCount > 0
                ? ((presentCount / totalCount) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {loading && <p className="loading">Loading attendance...</p>}

      {!loading && selectedSection && students.length > 0 && (
        <div className="attendance-table-container">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Status</th>
                <th>Overall %</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => {
                const percentage = getAttendancePercentage(student.rollNo);
                const percentColor = getPercentageColor(percentage);

                return (
                  <tr key={idx} className={`status-${student.status}`}>
                    <td className="roll-no">{student.rollNo}</td>
                    <td className="name">{student.name}</td>
                    <td className="status">
                      <span
                        className="status-badge"
                        style={{
                          background: getStatusColor(student.status),
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {student.status === "present" ? "✓ Present" : "✗ Absent"}
                      </span>
                    </td>
                    <td className="percentage">
                      <div className="percentage-bar">
                        <div
                          className={`bar-fill color-${percentColor}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                        <span className="percent-text">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && selectedSection && students.length === 0 && !error && (
        <p className="no-data">No attendance records for this date and subject</p>
      )}
    </div>
  );
}
