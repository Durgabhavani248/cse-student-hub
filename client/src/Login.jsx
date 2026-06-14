import { useState } from "react";

function Login({ onLogin }) {
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

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #7209b7",
    background: "#0f0f0f",
    color: "#fff",
    fontSize: "15px",
    marginBottom: "14px",
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #7209b7", borderRadius: "16px", padding: "28px", maxWidth: "400px", marginBottom: "24px", boxShadow: "0 4px 20px #7209b733" }}>
      <h2 style={{ margin: "0 0 20px 0", background: "linear-gradient(90deg, #f72585, #7209b7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>🔐 Admin Login</h2>
      {error && <p style={{ color: "#ff6b6b", background: "#2a0a0a", padding: "8px 12px", borderRadius: "8px" }}>{error}</p>}
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
      />
      <button onClick={handleLogin} style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #f72585, #7209b7)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>
        Login 🚀
      </button>
    </div>
  );
}

export default Login;