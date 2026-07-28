import { useState } from "react";

function FacultyLogin({ onLogin, api, onBack }) {
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

  return (
    <>
      <p onClick={onBack} className="login-back-link">← Back to Student Login</p>

      <img src="/icon-192.png" alt="NRI Logo" className="login-logo" />
      <h1 className="login-title">Faculty / HOD Login</h1>
      <p className="login-subtitle">NRI Institute of Technology</p>

      {error && <p className="login-error">{error}</p>}

      <label className="login-label">Faculty ID</label>
      <input
        placeholder="Faculty ID"
        value={facultyId}
        onChange={e => setFacultyId(e.target.value)}
        className="login-input"
        onKeyDown={e => e.key === "Enter" && handleLogin()}
      />

      <label className="login-label">Password</label>
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="login-input"
        onKeyDown={e => e.key === "Enter" && handleLogin()}
      />

      <button onClick={handleLogin} disabled={loading} className="login-button">
        {loading ? "Logging in..." : "Login →"}
      </button>
    </>
  );
}

export default FacultyLogin;
