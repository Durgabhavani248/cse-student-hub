import { useState } from "react";
import StudentLogin from "./StudentLogin";
import FacultyLogin from "./FacultyLogin";
import Login from "./Login";
import LoginStage from "./LoginStage";

function LoginPage({ onStudentLogin, onFacultyLogin, onAdminLogin, api }) {
  const [mode, setMode] = useState("student"); // "student" | "faculty" | "admin"

  return (
    <LoginStage>
      {mode === "student" && (
        <StudentLogin
          onLogin={onStudentLogin}
          api={api}
          onSwitchToAdmin={() => setMode("admin")}
          onSwitchToFaculty={() => setMode("faculty")}
        />
      )}
      {mode === "faculty" && (
        <FacultyLogin api={api} onLogin={onFacultyLogin} onBack={() => setMode("student")} />
      )}
      {mode === "admin" && (
        <Login onLogin={onAdminLogin} onBack={() => setMode("student")} />
      )}
    </LoginStage>
  );
}

export default LoginPage;
