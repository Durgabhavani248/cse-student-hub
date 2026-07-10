import { useState } from "react";
import api from "../services/api";

function Login() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const res = await api.post("/login", {
        id,
        password,
      });

      console.log(res.data);

    } catch (err) {
      setError(err.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div>
      <h2>Student Connect</h2>

      {error && <p>{error}</p>}

      <input
        placeholder="College ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>
        Login
      </button>

    </div>
  );
}

export default Login;