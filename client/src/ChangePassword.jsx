import { useState } from "react";

function ChangePassword({ onSuccess, api }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = () => {
    if (!newPassword || !confirmPassword) {
      setError("Anni fields fill cheyyi!");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password minimum 6 characters undāli!");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords match avvatledhu!");
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
          onSuccess();
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

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "40px", maxWidth: "420px", width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", textAlign: "center" }}>
        <img src="/icon-192.png" alt="NRI Logo" style={{ width: "80px", marginBottom: "16px" }} />
        <h1 style={{ color: "#F15A29", fontSize: "18px", fontWeight: "700", margin: "0 0 8px 0" }}>Change Password</h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "32px" }}>First time login — please set your new password!</p>

        {error && <p style={{ color: "#F15A29", background: "#fff0ee", padding: "8px 12px", borderRadius: "8px", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}

        <input
          type="password"
          placeholder="New Password (min 6 characters)"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={handleChange}
          disabled={loading}
          style={{ width: "100%", padding: "14px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
        >
          {loading ? "Saving..." : "Set Password →"}
        </button>
      </div>
    </div>
  );
}

export default ChangePassword;