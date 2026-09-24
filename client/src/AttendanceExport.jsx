import { useState } from "react";
import * as XLSX from "xlsx";

function AttendanceExport({ api, facultyInfo, isAdmin }) {
  const [branch, setBranch] = useState(facultyInfo?.branch || "");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);

  const token = localStorage.getItem("facultyToken") || localStorage.getItem("token");

  const fetchAttendanceData = async () => {
    if (!branch) {
      setMessage("❌ Select branch!");
      return;
    }

    setLoading(true);
    setMessage("⏳ Fetching attendance records...");

    try {
      const params = new URLSearchParams();
      if (section) params.append("section", section);
      if (subject) params.append("subject", subject);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `${api}/api/attendance/export/${branch}?${params.toString()}`;
      console.log("📤 Fetching:", url);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      console.log("📥 Response:", res.status, data);

      if (res.ok) {
        if (Array.isArray(data) && data.length > 0) {
          setAttendanceData(data);
          setMessage(`✅ Found ${data.length} attendance records!`);
        } else {
          setMessage("⚠️ No attendance records found for selected filters");
          setAttendanceData([]);
        }
      } else {
        setMessage("❌ " + (data.message || "Failed to fetch"));
        setAttendanceData([]);
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("❌ Server error: " + err.message);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadAsExcel = () => {
    if (attendanceData.length === 0) {
      setMessage("❌ No data to download!");
      return;
    }

    try {
      // Prepare data for Excel
      const exportData = attendanceData.map(record => ({
        "Roll No": record.rollNo,
        "Student Name": record.studentName,
        "Section": record.section,
        "Subject": record.subject,
        "Date": record.date,
        "Status": record.status,
        "Marked By": record.markedBy
      }));

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");

      // Format columns
      ws['!cols'] = [
        { wch: 12 }, // Roll No
        { wch: 20 }, // Student Name
        { wch: 10 }, // Section
        { wch: 15 }, // Subject
        { wch: 12 }, // Date
        { wch: 10 }, // Status
        { wch: 15 }  // Marked By
      ];

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Attendance_${branch}${section ? `_Sec${section}` : ""}_${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);
      setMessage(`✅ Downloaded ${attendanceData.length} records as ${filename}`);
    } catch (err) {
      console.error("Download error:", err);
      setMessage("❌ Download failed: " + err.message);
    }
  };

  const deleteRecords = async () => {
    if (attendanceData.length === 0) {
      setMessage("❌ No records to delete!");
      return;
    }

    const confirmDelete = window.confirm(
      `⚠️ This will PERMANENTLY delete ${attendanceData.length} attendance records from database!\n\nMake sure you have downloaded them first!\n\nContinue?`
    );

    if (!confirmDelete) return;

    setLoading(true);
    setMessage("⏳ Deleting records...");

    try {
      const params = new URLSearchParams();
      if (section) params.append("section", section);
      if (subject) params.append("subject", subject);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `${api}/api/attendance/delete/${branch}?${params.toString()}`;
      console.log("🗑️ Deleting:", url);

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      console.log("📥 Response:", res.status, data);

      if (res.ok) {
        setMessage(`✅ Deleted ${data.deletedCount || attendanceData.length} records from database!`);
        setAttendanceData([]);
      } else {
        setMessage("❌ " + (data.message || "Failed to delete"));
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("❌ Server error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    fontSize: "13px",
    boxSizing: "border-box"
  };

  return (
    <div>
      <h2 style={{ color: "#F15A29", marginBottom: "20px", fontSize: "20px", fontWeight: "700" }}>
        📊 Attendance Export & Cleanup
      </h2>

      {message && (
        <p style={{
          color: message.includes("✅") ? "#4CAF50" : message.includes("⚠️") ? "#e0a800" : "#F15A29",
          fontWeight: "600",
          padding: "12px",
          background: message.includes("✅") ? "#e8f5e9" : message.includes("⚠️") ? "#fff8e1" : "#ffebee",
          borderRadius: "8px",
          marginBottom: "20px"
        }}>
          {message}
        </p>
      )}

      {/* Filters */}
      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "#1a1a1a" }}>🔍 Filter Attendance</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#999", display: "block", marginBottom: "4px" }}>BRANCH</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="e.g., CSE"
              style={inputStyle}
              disabled={!isAdmin && facultyInfo?.branch}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#999", display: "block", marginBottom: "4px" }}>SECTION</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g., 1 or A (optional)"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#999", display: "block", marginBottom: "4px" }}>SUBJECT</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., DBMS (optional)"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#999", display: "block", marginBottom: "4px" }}>FROM DATE</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#999", display: "block", marginBottom: "4px" }}>TO DATE</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          onClick={fetchAttendanceData}
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: loading ? "#ccc" : "#F15A29",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontSize: "14px"
          }}
        >
          {loading ? "⏳ Fetching..." : "🔍 Fetch Records"}
        </button>
      </div>

      {/* Results */}
      {attendanceData.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <h3 style={{ margin: 0, color: "#1a1a1a" }}>
              📋 {attendanceData.length} Records Found
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={downloadAsExcel}
                style={{
                  padding: "10px 20px",
                  background: "#4CAF50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                📥 Download Excel
              </button>
              <button
                onClick={deleteRecords}
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  background: loading ? "#ccc" : "#F15A29",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                {loading ? "🗑️ Deleting..." : "🗑️ Delete from DB"}
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#999", borderBottom: "1px solid #e0e0e0" }}>
                  <th style={{ padding: "8px" }}>Roll No</th>
                  <th style={{ padding: "8px" }}>Name</th>
                  <th style={{ padding: "8px" }}>Section</th>
                  <th style={{ padding: "8px" }}>Subject</th>
                  <th style={{ padding: "8px" }}>Date</th>
                  <th style={{ padding: "8px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.slice(0, 20).map((record, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "8px", fontWeight: "600" }}>{record.rollNo}</td>
                    <td style={{ padding: "8px" }}>{record.studentName}</td>
                    <td style={{ padding: "8px" }}>{record.section}</td>
                    <td style={{ padding: "8px" }}>{record.subject}</td>
                    <td style={{ padding: "8px" }}>{record.date}</td>
                    <td style={{ padding: "8px", fontWeight: "700", color: record.status === "present" ? "#4CAF50" : "#F15A29" }}>
                      {record.status.toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {attendanceData.length > 20 && (
              <p style={{ color: "#999", fontSize: "12px", marginTop: "8px" }}>
                ... and {attendanceData.length - 20} more records (all will be exported)
              </p>
            )}
          </div>

          <div style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "12px", marginTop: "16px", fontSize: "12px", color: "#666" }}>
            ✅ <strong>Workflow:</strong> 1) Fetch records → 2) Download Excel → 3) Verify data → 4) Delete from DB → Keep database small!
          </div>
        </div>
      )}

      {attendanceData.length === 0 && (
        <div style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#999" }}>
          <p style={{ fontSize: "14px", margin: 0 }}>No records to display. Click "Fetch Records" to load attendance data.</p>
        </div>
      )}
    </div>
  );
}

export default AttendanceExport;
