import { useState } from "react";

function Profile({ studentInfo, isAdmin, api, onLogout }) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = () => {
    setError("");
    setMessage("");
    if (!newPassword || !confirmPassword) {
      setError("Please fill all fields!");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters!");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("studentToken");

    fetch(`${api}/api/student/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.message === "Password changed!") {
          setMessage("Password changed successfully!");
          setNewPassword("");
          setConfirmPassword("");
          setShowChangePassword(false);
        } else {
          setError(data.message || "Error occurred!");
        }
      })
      .catch(() => { setLoading(false); setError("Server error!"); });
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1.5px solid #e0e0e0",
    background: "#fff",
    color: "#1a1a1a",
    fontSize: "15px",
    marginBottom: "12px",
    outline: "none",
    boxSizing: "border-box"
  };

  if (isAdmin) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "32px", maxWidth: "450px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#F15A29", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "28px", fontWeight: "700" }}>
            A
          </div>
          <div>
            <h2 style={{ margin: 0, color: "#1a1a1a", fontSize: "18px" }}>Administrator</h2>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "13px" }}>NRI Institute of Technology</p>
          </div>
        </div>
        <div style={{ background: "#fff0ee", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
          <p style={{ margin: 0, color: "#F15A29", fontSize: "13px", fontWeight: "600" }}>Role: Admin</p>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "13px" }}>Full access to manage all content</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "32px", maxWidth: "450px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#F15A29", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "24px", fontWeight: "700" }}>
          {studentInfo?.name?.charAt(0)?.toUpperCase() || "S"}
        </div>
        <div>
          <h2 style={{ margin: 0, color: "#1a1a1a", fontSize: "18px" }}>{studentInfo?.name}</h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "13px" }}>NRI Institute of Technology</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#f9f9f9", borderRadius: "10px" }}>
          <span style={{ color: "#666", fontSize: "13px" }}>Roll Number</span>
          <strong style={{ color: "#1a1a1a", fontSize: "13px" }}>{studentInfo?.rollNo}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#f9f9f9", borderRadius: "10px" }}>
          <span style={{ color: "#666", fontSize: "13px" }}>Section</span>
          <strong style={{ color: "#1a1a1a", fontSize: "13px" }}>{studentInfo?.section}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#f9f9f9", borderRadius: "10px" }}>
          <span style={{ color: "#666", fontSize: "13px" }}>Year</span>
          <strong style={{ color: "#1a1a1a", fontSize: "13px" }}>{studentInfo?.year}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#f9f9f9", borderRadius: "10px" }}>
          <span style={{ color: "#666", fontSize: "13px" }}>Branch</span>
          <strong style={{ color: "#1a1a1a", fontSize: "13px" }}>CSE</strong>
        </div>
      </div>

      {message && <p style={{ color: "#4CAF50", background: "#f0fff4", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>{message}</p>}

      {!showChangePassword ? (
        <button
          onClick={() => setShowChangePassword(true)}
          style={{ width: "100%", padding: "12px", background: "transparent", color: "#F15A29", border: "1.5px solid #F15A29", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
        >
          Change Password
        </button>
      ) : (
        <div>
          {error && <p style={{ color: "#F15A29", background: "#fff0ee", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleChangePassword}
              disabled={loading}
              style={{ flex: 1, padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setShowChangePassword(false); setError(""); }}
              style={{ flex: 1, padding: "12px", background: "#f5f5f5", color: "#666", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;