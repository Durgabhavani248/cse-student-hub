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

function StudentLogin({ onLogin, api, onSwitchToAdmin, onSwitchToFaculty }) {
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

  return (
    <>
      <img src="/icon-192.png" alt="NRI Logo" className="login-logo" />
      <h1 className="login-title">Dr. RVR NRI Institute of Technology</h1>
      <p className="login-subtitle">Student Portal — All Branches</p>

      {error && <p className="login-error">{error}</p>}

      <label className="login-label">Branch</label>
      <select
        value={branch}
        onChange={e => setBranch(e.target.value)}
        className="login-select"
      >
        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
      </select>

      <label className="login-label">Roll Number</label>
      <input
        placeholder="e.g. 25KN1A0507"
        value={rollNo}
        onChange={e => setRollNo(e.target.value.toUpperCase())}
        className="login-input"
        onKeyDown={e => e.key === "Enter" && handleLogin()}
      />

      <label className="login-label">Password</label>
      <input
        type="password"
        placeholder="Password (default: nri@2024)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="login-input"
        onKeyDown={e => e.key === "Enter" && handleLogin()}
      />

      <button onClick={handleLogin} disabled={loading} className="login-button">
        {loading ? "Logging in..." : "Login →"}
      </button>

      <p onClick={() => setShowForgot(!showForgot)} className="login-forgot-link">
        Forgot Password?
      </p>

      {showForgot && (
        <div className="login-forgot-box">
          <h3 className="login-forgot-title">Reset Password</h3>
          <input placeholder="Roll Number" value={fpRollNo} onChange={(e) => setFpRollNo(e.target.value.toUpperCase())} className="login-input" />
          <input placeholder="Name" value={fpName} onChange={(e) => setFpName(e.target.value)} className="login-input" />
          <input placeholder="Section" value={fpSection} onChange={(e) => setFpSection(e.target.value)} className="login-input" />
          <input type="password" placeholder="New Password" value={fpPassword} onChange={(e) => setFpPassword(e.target.value)} className="login-input" />
          <button onClick={handleForgotPassword} className="login-button">
            Reset Password
          </button>
        </div>
      )}

      <p className="login-default-hint" style={{ marginBottom: "12px" }}>
        Default password: <strong>nri@2024</strong>
      </p>

      <div className="login-switch-links">
        <p onClick={onSwitchToAdmin} className="login-switch-link">Admin? Click here</p>
        <p onClick={onSwitchToFaculty} className="login-switch-link">Faculty / HOD? Click here</p>
      </div>
    </>
  );
}

export default StudentLogin;
