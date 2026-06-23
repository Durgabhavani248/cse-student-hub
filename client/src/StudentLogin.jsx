import { useState } from "react";

function StudentLogin({ onLogin, api }) {
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
const [fpRollNo, setFpRollNo] = useState("");
const [fpName, setFpName] = useState("");
const [fpSection, setFpSection] = useState("");
const [fpPassword, setFpPassword] = useState("");

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
  const handleForgotPassword = () => {
  if (!fpRollNo || !fpName || !fpSection || !fpPassword) {
    alert("Fill all fields!");
    return;
  }

  fetch(`${api}/api/student/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rollNo: fpRollNo,
      name: fpName,
      section: fpSection,
      newPassword: fpPassword
    })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);

      if (data.message === "Password reset successful!") {
        setShowForgot(false);
        setFpRollNo("");
        setFpName("");
        setFpSection("");
        setFpPassword("");
      }
    })
    .catch(() => alert("Server error!"));
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
  onClick={() => setShowForgot(true)}
  style={{
    color: "#F15A29",
    cursor: "pointer",
    fontSize: "13px",
    marginBottom: "12px"
  }}
>
  Forgot Password?
</p>
       
{showForgot && (
  <div
    style={{
      background: "#fff7f3",
      padding: "15px",
      borderRadius: "10px",
      marginBottom: "15px",
      border: "1px solid #ffd9cc"
    }}
  >
    <h3 style={{ color: "#F15A29", marginBottom: "10px" }}>
      Reset Password
    </h3>

    <input
      placeholder="Roll Number"
      value={fpRollNo}
      onChange={(e) => setFpRollNo(e.target.value.toUpperCase())}
      style={inputStyle}
    />

    <input
      placeholder="Name"
      value={fpName}
      onChange={(e) => setFpName(e.target.value)}
      style={inputStyle}
    />

    <input
      placeholder="Section"
      value={fpSection}
      onChange={(e) => setFpSection(e.target.value)}
      style={inputStyle}
    />

    <input
      type="password"
      placeholder="New Password"
      value={fpPassword}
      onChange={(e) => setFpPassword(e.target.value)}
      style={inputStyle}
    />

    <button
      onClick={handleForgotPassword}
      style={{
        width: "100%",
        padding: "12px",
        background: "#F15A29",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer"
      }}
    >
      Reset Password
    </button>
  </div>
)}
        <p style={{ color: "#999", fontSize: "12px" }}>
          Default password: <strong>nri@2024</strong>
        </p>
      </div>
    </div>
  );
}

export default StudentLogin;