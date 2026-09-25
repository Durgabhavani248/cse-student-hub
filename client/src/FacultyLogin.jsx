import { useState } from "react";

function FacultyLogin({ onLogin, api, onBack }) {
  const [facultyId, setFacultyId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [fpFacultyId, setFpFacultyId] = useState("");
  const [fpName, setFpName] = useState("");
  const [fpPassword, setFpPassword] = useState("");
  const [fpLoading, setFpLoading] = useState(false);

  const handleLogin = () => {
    if (!facultyId || !password) {
      alert("Faculty ID and password enter cheyyi!");
      return;
    }

    setLoading(true);
    setError("");

    fetch(`${api}/api/faculty-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facultyId,
        password
      })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);

        if (data.token) {
          localStorage.setItem(
            "facultyToken",
            data.token
          );

          localStorage.setItem(
            "facultyInfo",
            JSON.stringify(data.faculty)
          );

          onLogin(data.faculty);
        } else {
          setError(
            data.message || "Login failed!"
          );
        }
      })
      .catch(() => {
        setLoading(false);
        setError("Server error!");
      });
  };


  // =========================
  // FACULTY FORGOT PASSWORD
  // =========================

  const handleForgotPassword = () => {
    if (!fpFacultyId || !fpName || !fpPassword) {
      alert(
        "Faculty ID, Name and New Password fill cheyyi!"
      );
      return;
    }

    if (fpPassword.length < 6) {
      alert(
        "Password minimum 6 characters undāli!"
      );
      return;
    }

    setFpLoading(true);

    fetch(`${api}/api/faculty/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facultyId: fpFacultyId.trim(),
        name: fpName.trim(),
        newPassword: fpPassword
      })
    })
      .then(res => res.json())
      .then(data => {
        setFpLoading(false);

        alert(data.message);

        if (
          data.message ===
          "Password reset successful!"
        ) {
          setShowForgot(false);

          setFpFacultyId("");
          setFpName("");
          setFpPassword("");
        }
      })
      .catch(() => {
        setFpLoading(false);
        alert("Server error!");
      });
  };


  return (
    <>
      <p
        onClick={onBack}
        className="login-back-link"
      >
        ← Not you? Change role
      </p>

      <img
        src="/icon-192.png"
        alt="NRI Logo"
        className="login-logo"
      />

      <h1 className="login-title">
        Faculty / HOD Login
      </h1>

      <p className="login-subtitle">
        NRI Institute of Technology
      </p>

      {error && (
        <p className="login-error">
          {error}
        </p>
      )}

      <label className="login-label">
        Faculty ID
      </label>

      <input
        placeholder="Faculty ID"
        value={facultyId}
        onChange={e =>
          setFacultyId(e.target.value)
        }
        className="login-input"
        onKeyDown={e =>
          e.key === "Enter" &&
          handleLogin()
        }
      />

      <label className="login-label">
        Password
      </label>

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e =>
          setPassword(e.target.value)
        }
        className="login-input"
        onKeyDown={e =>
          e.key === "Enter" &&
          handleLogin()
        }
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className="login-button"
      >
        {loading
          ? "Logging in..."
          : "Login →"}
      </button>


      {/* FORGOT PASSWORD */}

      <p
        onClick={() =>
          setShowForgot(!showForgot)
        }
        className="login-forgot-link"
      >
        Forgot Password?
      </p>


      {showForgot && (
        <div className="login-forgot-box">

          <h3 className="login-forgot-title">
            Reset Faculty Password
          </h3>

          <input
            placeholder="Faculty ID"
            value={fpFacultyId}
            onChange={e =>
              setFpFacultyId(
                e.target.value.toUpperCase()
              )
            }
            className="login-input"
          />

          <input
            placeholder="Name"
            value={fpName}
            onChange={e =>
              setFpName(e.target.value)
            }
            className="login-input"
          />

          <input
            type="password"
            placeholder="New Password"
            value={fpPassword}
            onChange={e =>
              setFpPassword(e.target.value)
            }
            className="login-input"
          />

          <button
            onClick={handleForgotPassword}
            disabled={fpLoading}
            className="login-button"
          >
            {fpLoading
              ? "Resetting..."
              : "Reset Password"}
          </button>

        </div>
      )}

      <p className="login-default-hint">
        Default password:{" "}
        <strong>nri@2024</strong>
      </p>
    </>
  );
}

export default FacultyLogin;