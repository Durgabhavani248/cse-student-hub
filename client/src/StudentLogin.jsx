import { useState } from "react";

// Edit this list to match your college's actual branches.
const BRANCHES = [
  "CSE",
  "CSE (AI & ML)",
  "CSE (Data Science)",
  "IT",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL"
];

function StudentLogin({ onLogin, api }) {
  const [branch, setBranch] = useState("CSE");
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
    fetch(`${api}/api/student-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNo, password, branch })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.token) {
          localStorage.setItem("studentToken", data.token);
          localStorage.setItem("studentInfo", JSON.stringify(data.student));
          onLogin(data.student);
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
      headers: { "Content-Type": "application/json" },
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

  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23F15A29' stroke-width='3'><path d='M6 9l6 6 6-6'/></svg>\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    cursor: "pointer",
    fontWeight: "600",
    color: "#F15A29"
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #fff3ef 0%, #f5f5f5 55%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Segoe UI, sans-serif", padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "40px", maxWidth: "420px", width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", textAlign: "center" }}>
        <img src="/icon-192.png" alt="NRI Logo" style={{ width: "80px", marginBottom: "16px" }} />
        <h1 style={{ color: "#F15A29", fontSize: "18px", fontWeight: "700", margin: "0 0 4px 0" }}>Dr. RVR NRI Institute of Technology</h1>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "28px" }}>Student Portal — All Branches</p>

        {error && <p style={{ color: "#F15A29", background: "#fff0ee", padding: "8px 12px", borderRadius: "8px", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}

        <label style={{ display: "block", textAlign: "left", color: "#999", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "6px", textTransform: "uppercase" }}>
          Branch
        </label>
        <select
          value={branch}
          onChange={e => setBranch(e.target.value)}
          style={selectStyle}
        >
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <label style={{ display: "block", textAlign: "left", color: "#999", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "6px", textTransform: "uppercase" }}>
          Roll Number
        </label>
        <input
          placeholder="e.g. 25KN1A0507"
          value={rollNo}
          onChange={e => setRollNo(e.target.value.toUpperCase())}
          style={inputStyle}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

        <label style={{ display: "block", textAlign: "left", color: "#999", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "6px", textTransform: "uppercase" }}>
          Password
        </label>
        <input
          type="password"
          placeholder="Password (default: nri@2024)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: "14px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer", marginBottom: "16px", marginTop: "4px" }}
        >
          {loading ? "Logging in..." : "Login →"}
        </button>

        <p
          onClick={() => setShowForgot(!showForgot)}
          style={{ color: "#F15A29", cursor: "pointer", fontSize: "13px", marginBottom: "12px" }}
        >
          Forgot Password?
        </p>

        {showForgot && (
          <div style={{ background: "#fff7f3", padding: "15px", borderRadius: "10px", marginBottom: "15px", border: "1px solid #ffd9cc", textAlign: "left" }}>
            <h3 style={{ color: "#F15A29", marginBottom: "10px", fontSize: "15px" }}>Reset Password</h3>

            <input placeholder="Roll Number" value={fpRollNo} onChange={(e) => setFpRollNo(e.target.value.toUpperCase())} style={inputStyle} />
            <input placeholder="Name" value={fpName} onChange={(e) => setFpName(e.target.value)} style={inputStyle} />
            <input placeholder="Section" value={fpSection} onChange={(e) => setFpSection(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="New Password" value={fpPassword} onChange={(e) => setFpPassword(e.target.value)} style={inputStyle} />

            <button
              onClick={handleForgotPassword}
              style={{ width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}
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
