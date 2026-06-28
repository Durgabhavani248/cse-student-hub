import { useState } from "react";
import axios from "axios";
import "./StudentAttendancePublic.css";

const API = "https://cse-student-hub.onrender.com";

export default function StudentAttendancePublic() {
  const [rollNo, setRollNo] = useState("");
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!rollNo.trim()) {
      setError("Please enter roll number");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAttendance(null);

      const response = await axios.get(
        `${API}/api/attendance/student/${rollNo.toUpperCase().trim()}`
      );

      setAttendance(response.data);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching attendance");
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentage) => {
    const per = parseFloat(percentage);
    if (per >= 75) return "#27ae60"; // Green
    if (per >= 60) return "#f39c12"; // Orange
    return "#e74c3c"; // Red
  };

  const getPercentageStatus = (percentage) => {
    const per = parseFloat(percentage);
    if (per >= 75) return "Excellent";
    if (per >= 60) return "Good";
    return "Needs Improvement";
  };

  return (
    <div className="student-attendance-public">
      <div className="attendance-container">
        {/* Header */}
        <div className="attendance-header">
          <h1>📊 Your Attendance</h1>
          <p className="subtitle">Enter your roll number to check your attendance percentage</p>
        </div>

        {/* Search Form */}
        <form className="search-form" onSubmit={handleSearch}>
          <div className="form-group">
            <label>Roll Number</label>
            <input
              type="text"
              placeholder="Enter your roll number (e.g., CSE001)"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value.toUpperCase())}
              className="roll-input"
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn-search" disabled={loading}>
            {loading ? "Checking..." : "🔍 Check Attendance"}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Attendance Data */}
        {attendance && (
          <div className="attendance-result">
            {/* Student Info */}
            <div className="student-header">
              <div className="student-details">
                <h2>{attendance.rollNo}</h2>
                {attendance.name && <p className="student-name">{attendance.name}</p>}
                {attendance.section && <p className="student-section">Section {attendance.section}</p>}
              </div>
            </div>

            {/* Main Percentage Card */}
            <div className="percentage-card">
              <div className="percentage-display">
                <svg className="percentage-circle" viewBox="0 0 140 140">
                  <circle
                    className="circle-background"
                    cx="70"
                    cy="70"
                    r="60"
                  />
                  <circle
                    className="circle-progress"
                    cx="70"
                    cy="70"
                    r="60"
                    style={{
                      strokeDasharray: `${(parseFloat(attendance.percentage) / 100) * 376.99} 376.99`,
                      stroke: getPercentageColor(attendance.percentage)
                    }}
                  />
                </svg>
                <div className="percentage-text">
                  <span className="percentage-value" style={{ color: getPercentageColor(attendance.percentage) }}>
                    {attendance.percentage}%
                  </span>
                  <span className="percentage-status">
                    {getPercentageStatus(attendance.percentage)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <p className="stat-label">Total Classes</p>
                  <p className="stat-value">{attendance.totalClasses}</p>
                </div>
              </div>

              <div className="stat-card present">
                <div className="stat-icon">✓</div>
                <div className="stat-content">
                  <p className="stat-label">Present</p>
                  <p className="stat-value">{attendance.presentCount}</p>
                </div>
              </div>

              <div className="stat-card absent">
                <div className="stat-icon">✗</div>
                <div className="stat-content">
                  <p className="stat-label">Absent</p>
                  <p className="stat-value">{attendance.absentCount}</p>
                </div>
              </div>
            </div>

            {/* Status Message */}
            <div className={`status-message ${
              parseFloat(attendance.percentage) >= 75 ? 'good' :
              parseFloat(attendance.percentage) >= 60 ? 'warning' : 'danger'
            }`}>
              {parseFloat(attendance.percentage) >= 75 ? (
                <>
                  <span>✅ Great attendance! Keep it up!</span>
                </>
              ) : parseFloat(attendance.percentage) >= 60 ? (
                <>
                  <span>⚠️ Your attendance is good but can be improved. Attend more classes!</span>
                </>
              ) : (
                <>
                  <span>🚨 Your attendance is below acceptable. Please attend classes regularly!</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {searched && !attendance && !error && (
          <div className="empty-state">
            <p>No attendance data found for this roll number</p>
            <p className="hint">Check your roll number and try again</p>
          </div>
        )}

        {/* Initial State */}
        {!searched && !error && (
          <div className="initial-state">
            <div className="icon">📋</div>
            <p className="message">Enter your roll number above to view your attendance</p>
            <p className="hint">Your roll number is printed on your student ID card</p>
          </div>
        )}
      </div>
    </div>
  );
}
