// client/src/LoginPage.jsx
// Role choice is remembered per-device via localStorage, so once a user
// picks their role, the app skips straight to their role's login form
// on every future open (including after PWA install) — role-select only
// shows once, or when explicitly changed via "Not you? Change role".
import { useState } from "react";
import StudentLogin from "./StudentLogin";
import FacultyLogin from "./FacultyLogin";
import Login from "./Login";
import LoginStage from "./LoginStage";
import RoleSelect from "./RoleSelect";
import { triggerInstallPrompt } from "./App";

function LoginPage({ onStudentLogin, onFacultyLogin, onAdminLogin, api }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem("preferredRole") || "select"
  );

  const selectRole = (role) => {
    localStorage.setItem("preferredRole", role);
    triggerInstallPrompt();
    setMode(role);
  };

  const changeRole = () => {
    localStorage.removeItem("preferredRole");
    setMode("select");
  };

  return (
    <LoginStage>
      {mode === "select" && <RoleSelect onSelect={selectRole} />}

      {mode === "student" && (
        <StudentLogin
          onLogin={onStudentLogin}
          api={api}
          onBack={changeRole}
        />
      )}

      {(mode === "faculty" || mode === "hod") && (
        <FacultyLogin api={api} onLogin={onFacultyLogin} onBack={changeRole} />
      )}

      {mode === "admin" && (
        <Login onLogin={onAdminLogin} onBack={changeRole} />
      )}
    </LoginStage>
  );
}

export default LoginPage;