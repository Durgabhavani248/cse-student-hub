import { useState } from "react";

function Login({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    fetch("https://cse-student-hub.onrender.com/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem("token", data.token);
          onLogin();
        } else {
          setError("Invalid username or password!");
        }
      })
      .catch(() => setError("Server error!"));
  };

  return (
    <>
      <p onClick={onBack} className="login-back-link">← Back to Student Login</p>

      <img src="/icon-192.png" alt="NRI Logo" className="login-logo" />
      <h1 className="login-title">Admin Login</h1>
      <p className="login-subtitle">NRI Institute of Technology</p>

      {error && <p className="login-error">{error}</p>}

      <label className="login-label">Username</label>
      <input
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
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

      <button onClick={handleLogin} className="login-button">
        Login →
      </button>
    </>
  );
}

export default Login;
