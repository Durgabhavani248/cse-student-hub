import { useState } from "react";

function FacultyLogin({ onLogin, api }) {
  const [facultyId, setFacultyId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!facultyId || !password) {
      alert("Faculty ID and password enter cheyyi!");
      return;
    }
    setLoading(true);
    fetch(`${api}/api/faculty-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facultyId, password })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.token) {
          localStorage.setItem("facultyToken", data.token);
          localStorage.setItem("facultyInfo", JSON.stringify(data.faculty));
          onLogin(data.faculty);
        } else {
          setError(data.message || "Login failed!");
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
        <h1 style={{ color: "#F15A29", fontSize: "18px", fontWeight: "700", margin: "0 0 8px 0" }}>Faculty / HOD Login</h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "24px" }}>NRI Institute of Technology</p>

        {error && <p style={{ color: "#F15A29", background: "#fff0ee", padding: "8px 12px", borderRadius: "8px", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}

        <input
          placeholder="Faculty ID"
          value={facultyId}
          onChange={e => setFacultyId(e.target.value)}
          style={inputStyle}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: "14px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
        >
          {loading ? "Logging in..." : "Login →"}
        </button>
      </div>
    </div>
  );
}

export default FacultyLogin;
