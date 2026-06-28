import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminAttendance.css";

const API = "http://localhost:3001";

export default function AdminAttendance() {
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("ADS");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sections, setSections] = useState([]);
  const token = localStorage.getItem("adminToken");

  const subjects = ["ADS", "BED", "ENG", "LMS-3", "P&S", "AI-FINANCE", "QP"];

  // Fetch sections from API
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await axios.get(`${API}/api/sections`);
        setSections(res.data);
      } catch (err) {
        console.error("Error fetching sections:", err);
        setSections([]);
      }
    };
    fetchSections();
  }, []);

  // Load students when section/subject/date changes
  useEffect(() => {
    if (section && subject && date) {
      loadStudents();
    }
  }, [section, subject, date]);

  const loadStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${API}/api/attendance/section/${section}/date/${date}?subject=${subject}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(res.data.records);
    } catch (err) {
      setError("Error loading data: " + err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (index) => {
    const updated = [...students];
    updated[index].status = updated[index].status === "present" ? "absent" : "present";
    setStudents(updated);
  };

  const markAllPresent = () => {
    setStudents(students.map(s => ({ ...s, status: "present" })));
  };

  const markAllAbsent = () => {
    setStudents(students.map(s => ({ ...s, status: "absent" })));
  };

  const saveAttendance = async () => {
    try {
      await axios.post(
        `${API}/api/attendance/mark`,
        { section, subject, date, records: students },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Attendance saved successfully!");
    } catch (err) {
      alert("❌ Error saving attendance: " + err.message);
    }
  };

  const presentCount = students.filter(s => s.status === "present").length;
  const absentCount = students.filter(s => s.status === "absent").length;

  return (
    <div className="admin-attendance-container">
      <h2>📋 Mark Attendance</h2>

      <div className="filters">
        <div className="filter-group">
          <label>SECTION</label>
          <select value={section} onChange={(e) => setSection(e.target.value)}>
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

      <div className="action-buttons">
        <button className="btn-present" onClick={markAllPresent}>
          ✓ All Present
        </button>
        <button className="btn-absent" onClick={markAllAbsent}>
          ✗ All Absent
        </button>
      </div>

      <div className="counter">
        <span>Total: {students.length}</span>
        <span className="present-count">{presentCount} Present</span>
        <span className="absent-count">{absentCount} Absent</span>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <p>Loading students...</p>
      ) : students.length === 0 ? (
        <p className="no-students">No students found for this section</p>
      ) : (
        <div className="students-list">
          {students.map((student, index) => (
            <div key={index} className="student-row">
              <div className="student-info">
                <span className="roll-no">{student.rollNo}</span>
                <span className="student-name">{student.name}</span>
              </div>
              <div className="attendance-buttons">
                <button
                  className={`btn-mark ${student.status === "present" ? "active-present" : ""}`}
                  onClick={() => toggleStatus(index)}
                >
                  ✓ Present
                </button>
                <button
                  className={`btn-mark ${student.status === "absent" ? "active-absent" : ""}`}
                  onClick={() => toggleStatus(index)}
                >
                  ✗ Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="save-section">
        <button className="btn-save" onClick={saveAttendance} disabled={students.length === 0}>
          💾 Save Attendance
        </button>
      </div>
    </div>
  );
}
