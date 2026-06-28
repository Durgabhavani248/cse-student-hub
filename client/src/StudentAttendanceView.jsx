import React, { useState, useEffect } from "react";
import axios from "axios";
import "./StudentAttendanceView.css";

const API = "https://cse-student-hub.onrender.com";

export default function StudentAttendanceView({ studentInfo }) {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const token = localStorage.getItem("studentToken");

  const subjects = ["all", "ADS", "BED", "ENG", "LMS-3", "P&S", "AI-FINANCE", "QP"];

  useEffect(() => {
    if (studentInfo?.rollNo) {
      loadAttendance();
    }
  }, [studentInfo]);

  const loadAttendance = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${API}/api/attendance/student/${studentInfo.rollNo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(res.data);
    } catch (err) {
      setError("Error loading attendance: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (percentage) => {
    const percent = parseFloat(percentage);
    if (percent >= 75) return "green";
    if (percent >= 60) return "orange";
    return "red";
  };

  const getStatusMessage = (percentage) => {
    const percent = parseFloat(percentage);
    if (percent >= 75) return "✅ Good";
    if (percent >= 60) return "⚠️ Warning";
    return "❌ Critical";
  };

  if (loading) return <p className="loading">Loading your attendance...</p>;
  if (error) return <div className="error-box">{error}</div>;
  if (!attendance) return <p>No attendance data available</p>;

  // Filter subjects based on selection
  let displaySubjects = attendance.subjectWise || [];
  if (selectedSubject !== "all") {
    displaySubjects = displaySubjects.filter(s => s.subject === selectedSubject);
  }

  return (
    <div className="student-attendance-container">
      <h2>📊 My Attendance</h2>

      <div className="student-info-header">
        <div className="info-card">
          <span className="label">Roll No</span>
          <span className="value">{studentInfo?.rollNo}</span>
        </div>
        <div className="info-card">
          <span className="label">Name</span>
          <span className="value">{studentInfo?.name}</span>
        </div>
        <div className="info-card">
          <span className="label">Section</span>
          <span className="value">{studentInfo?.section}</span>
        </div>
      </div>

      <div className="overall-stats">
        <div className={`stat-box color-${getStatusColor(attendance.overallPercentage)}`}>
          <span className="label">Overall Attendance</span>
          <div className="percentage-display">
            <div className="circle">
              <span className="percentage">{attendance.overallPercentage}%</span>
            </div>
          </div>
          <span className="status">{getStatusMessage(attendance.overallPercentage)}</span>
        </div>

        <div className="stat-box">
          <span className="label">Total Classes</span>
          <span className="big-number">{attendance.totalClasses}</span>
        </div>

        <div className="stat-box green">
          <span className="label">Present</span>
          <span className="big-number">{attendance.presentCount}</span>
        </div>

        <div className="stat-box red">
          <span className="label">Absent</span>
          <span className="big-number">{attendance.absentCount}</span>
        </div>
      </div>

      <div className="subject-filter">
        <label>FILTER BY SUBJECT:</label>
        <div className="filter-buttons">
          {subjects.map((subj) => (
            <button
              key={subj}
              className={`filter-btn ${selectedSubject === subj ? "active" : ""}`}
              onClick={() => setSelectedSubject(subj)}
            >
              {subj === "all" ? "All Subjects" : subj}
            </button>
          ))}
        </div>
      </div>

      <div className="subjects-grid">
        {displaySubjects.length > 0 ? (
          displaySubjects.map((subject, idx) => {
            const color = getStatusColor(subject.percentage);
            const message = getStatusMessage(subject.percentage);

            return (
              <div key={idx} className={`subject-card color-${color}`}>
                <div className="card-header">
                  <h3>{subject.subject}</h3>
                  <span className={`badge ${color}`}>{message}</span>
                </div>

                <div className="card-stats">
                  <div className="stat">
                    <span>Present</span>
                    <span className="number">{subject.present}</span>
                  </div>
                  <div className="stat">
                    <span>Absent</span>
                    <span className="number">{subject.absent}</span>
                  </div>
                  <div className="stat">
                    <span>Total</span>
                    <span className="number">{subject.total}</span>
                  </div>
                </div>

                <div className="percentage-bar">
                  <div className={`bar color-${color}`} style={{ width: `${subject.percentage}%` }}></div>
                  <span className="percentage-text">{subject.percentage}%</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="no-data">No attendance data for selected subject</p>
        )}
      </div>

      <div className="attendance-tips">
        <h4>💡 Tips to Improve Attendance</h4>
        <ul>
          <li>✅ Target to maintain 75% or above attendance</li>
          <li>✅ Attend classes regularly without bunking</li>
          <li>✅ Inform faculty in advance if you have medical issues</li>
          <li>❌ Low attendance may affect your academic performance</li>
          <li>❌ Don't miss important topics covered in class</li>
        </ul>
      </div>
    </div>
  );
}
