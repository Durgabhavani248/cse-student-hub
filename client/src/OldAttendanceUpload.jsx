import { useState } from "react";

const BRANCHES = ["CSE", "ECE", "EEE", "MECH", "CIVIL"];

function OldAttendanceUpload({ api, isAdmin, facultyInfo }) {
  const [branch, setBranch] = useState(facultyInfo?.branch || "");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const token =
    localStorage.getItem("facultyToken") ||
    localStorage.getItem("token");

  const upload = async e => {
    e.preventDefault();
    setError("");
    setMessage("");
    setResult(null);

    if (!branch) {
      setError("Please select a branch.");
      return;
    }

    if (!file) {
      setError("Please select an Excel file.");
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(extension)) {
      setError("Only .xlsx and .xls files are supported.");
      return;
    }

    if (!token) {
      setError("Login session expired. Please log in again.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("branch", branch);

    setLoading(true);

    try {
      const response = await fetch(`${api}/api/attendance/import-old`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          (data.message || "Import failed.") +
          (Array.isArray(data.errors) ? "\n" + data.errors.join("\n") : "")
        );
      }

      const inserted = Number(data.inserted || 0);
      const updated = Number(data.updated || 0);
      const skipped = Number(
        data.skippedExisting ??
        Math.max(0, Number(data.rowsProcessed || 0) - inserted - updated)
      );

      setResult({
        rowsProcessed: data.rowsProcessed || 0,
        inserted,
        updated,
        skipped
      });

      setMessage(data.message || "Historical attendance imported.");
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message || "Unable to import attendance.");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e8e8e8",
    borderRadius: 14,
    padding: 18
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    background: "#fff"
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 4px 28px" }}>
      <div style={{ marginBottom: 22 }}>
        <p style={{
          color: "#F15A29",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1.2,
          margin: "0 0 7px"
        }}>
          ATTENDANCE MANAGEMENT
        </p>
        <h2 style={{ margin: 0, color: "#202020", fontSize: 25 }}>
          Import Old Attendance
        </h2>
        <p style={{ color: "#777", fontSize: 14, marginTop: 7 }}>
          Import physical register records into the attendance database.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 12,
        marginBottom: 18
      }}>
        <div style={cardStyle}>
          <div style={{ color: "#999", fontSize: 11, fontWeight: 700 }}>HISTORICAL RECORDS</div>
          <h3 style={{ margin: "8px 0 4px", color: "#202020" }}>Excel Import</h3>
          <p style={{ color: "#777", fontSize: 13, margin: 0 }}>
            Existing attendance is preserved and included in student attendance calculations.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#999", fontSize: 11, fontWeight: 700 }}>DUPLICATE PROTECTION</div>
          <h3 style={{ margin: "8px 0 4px", color: "#202020" }}>Safe Re-upload</h3>
          <p style={{ color: "#777", fontSize: 13, margin: 0 }}>
            Already imported matching records are skipped instead of overwritten.
          </p>
        </div>
      </div>

      <form onSubmit={upload} style={{
        ...cardStyle,
        padding: 22
      }}>
        <h3 style={{ margin: "0 0 18px", color: "#222" }}>Upload register Excel</h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16
        }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 7 }}>
              BRANCH
            </label>

            {isAdmin ? (
              <select
                value={branch}
                onChange={e => setBranch(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select branch</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <input
                value={branch}
                readOnly
                style={{ ...inputStyle, background: "#f7f7f7" }}
              />
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 7 }}>
              EXCEL FILE
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={e => setFile(e.target.files?.[0] || null)}
              style={inputStyle}
            />
          </div>
        </div>

        {file && (
          <div style={{
            marginTop: 14,
            padding: 12,
            background: "#f7faf7",
            border: "1px solid #dcebdd",
            borderRadius: 8,
            fontSize: 13
          }}>
            <strong>Selected file:</strong> {file.name}
            <span style={{ color: "#777", marginLeft: 8 }}>
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
        )}

        <div style={{
          background: "#fff8f3",
          border: "1px solid #f5dfd1",
          borderRadius: 10,
          padding: 15,
          marginTop: 18
        }}>
          <strong style={{ fontSize: 13 }}>Required Excel columns</strong>
          <p style={{ fontSize: 13, color: "#555", margin: "8px 0" }}>
            rollNo, studentName, branch, section, subject, date, status
          </p>
          <p style={{ fontSize: 12, color: "#777", margin: 0, lineHeight: 1.7 }}>
            Date: YYYY-MM-DD. Status: present or absent.
            <br />
            Optional: <strong>period</strong> or <strong>hour</strong>.
            If supplied, the timetable period is preserved. If absent, the record is stored as Historical.
            <br />
            Use one row per student, subject, date and period.
          </p>
        </div>

        {error && (
          <div style={{
            marginTop: 15,
            padding: 12,
            borderRadius: 8,
            background: "#fff0ee",
            color: "#b42318",
            fontSize: 13,
            whiteSpace: "pre-wrap"
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            marginTop: 15,
            padding: 12,
            borderRadius: 8,
            background: "#eef9f0",
            color: "#237a38",
            fontSize: 13
          }}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 18,
            padding: 13,
            border: 0,
            borderRadius: 9,
            background: loading ? "#aaa" : "#F15A29",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? "wait" : "pointer"
          }}
        >
          {loading ? "Importing attendance..." : "Upload Old Attendance"}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ color: "#222", fontSize: 16 }}>Import Summary</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
            gap: 10
          }}>
            {[
              ["Rows Processed", result.rowsProcessed, "#333"],
              ["Inserted", result.inserted, "#237a38"],
              ["Updated", result.updated, "#2563a6"],
              ["Already Existed", result.skipped, "#a16207"]
            ].map(([label, value, color]) => (
              <div key={label} style={cardStyle}>
                <div style={{ color: "#888", fontSize: 11 }}>{label}</div>
                <div style={{ color, fontSize: 25, fontWeight: 800, marginTop: 5 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OldAttendanceUpload;