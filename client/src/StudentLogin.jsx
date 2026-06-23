import { useState } from "react";

function StudentLogin({ onLogin, api }) {
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!rollNo || !password) { alert("Roll number and password enter cheyyi!"); return; }
    setLoading(true);
    fetch(`${api}/api/student/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNo, password })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.token) {
          localStorage.setItem("studentToken", data.token);
          localStorage.setItem("studentInfo", JSON.stringify(data.user));
          onLogin(data.user);
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
        <h1 style={{ color: "#F15A29", fontSize: "18px", fontWeight: "700", margin: "0 0 4px 0" }}>Dr. RVR NRI Institute of Technology</h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "32px" }}>CSE Student Hub</p>

        {error && <p style={{ color: "#F15A29", background: "#fff0ee", padding: "8px 12px", borderRadius: "8px", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}

        <input
          placeholder="Roll Number (e.g. 25KN1A0507)"
          value={rollNo}
          onChange={e => setRollNo(e.target.value.toUpperCase())}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password (default: nri@2024)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: "14px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer", marginBottom: "16px" }}
        >
          {loading ? "Logging in..." : "Login →"}
        </button>
        <p
  style={{
    color: "#F15A29",
    cursor: "pointer",
    fontSize: "13px",
    marginBottom: "12px"
  }}
>
  Forgot Password?
</p>

        <p style={{ color: "#999", fontSize: "12px" }}>
          Default password: <strong>nri@2024</strong>
        </p>
      </div>
    </div>
  );
}

export default StudentLogin;