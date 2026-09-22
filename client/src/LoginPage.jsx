import { useState } from "react";
import StudentLogin from "./StudentLogin";
import FacultyLogin from "./FacultyLogin";
import Login from "./Login";
import LoginStage from "./LoginStage";
import RoleSelect from "./RoleSelect";

function LoginPage({ onStudentLogin, onFacultyLogin, onAdminLogin, api }) {
  const [mode, setMode] = useState("select"); // "select" | "student" | "faculty" | "admin"

  return (
    <LoginStage>
      {mode === "select" && <RoleSelect onSelect={setMode} />}

      {mode === "student" && (
        <StudentLogin
          onLogin={onStudentLogin}
          api={api}
          onSwitchToAdmin={() => setMode("admin")}
          onSwitchToFaculty={() => setMode("faculty")}
          onBack={() => setMode("select")}
        />
      )}

      {(mode === "faculty" || mode === "hod") && (
        <FacultyLogin api={api} onLogin={onFacultyLogin} onBack={() => setMode("select")} />
      )}

      {mode === "admin" && (
        <Login onLogin={onAdminLogin} onBack={() => setMode("select")} />
      )}
    </LoginStage>
  );
}

export default LoginPage;