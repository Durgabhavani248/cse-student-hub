import { useState, useEffect } from "react";
import Login from "./Login";
import StudentLogin from "./StudentLogin";
import RoleSelector from "./RoleSelector";
import ChangePassword from "./ChangePassword";
import FacultyChangePassword from "./FacultyChangePassword";
import AddNotice from "./AddNotice";
import Notes from "./Notes";
import Assignments from "./Assignments";
import Papers from "./Papers";
import StudyMaterials from "./StudyMaterials";
import Timetable from "./Timetable";
import Attendance from "./Attendance";
import MyAttendance from "./MyAttendance";
import HodAttendanceReport from "./HodAttendanceReport";
import AttendanceExport from "./AttendanceExport";  // ✅ NEW IMPORT
import Chatbot from "./Chatbot";
import Search from "./Search";
import Profile from "./Profile";
import Notifications from "./Notifications";
import ManageCR from "./ManageCR";
import LoginPage from "./LoginPage";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function App() {
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem("token"));
  const [studentLoggedIn, setStudentLoggedIn] = useState(!!localStorage.getItem("studentToken"));
  const [facultyLoggedIn, setFacultyLoggedIn] = useState(!!localStorage.getItem("facultyToken"));
  const [activePage, setActivePage] = useState("notices");
 const [studentData, setStudentData] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("studentInfo"));
  } catch {
    return null;
  }
});
  const [facultyInfo, setFacultyInfo] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);


  useEffect(() => {
    const storedFacultyInfo = localStorage.getItem("facultyInfo");
    if (storedFacultyInfo) {
      setFacultyInfo(JSON.parse(storedFacultyInfo));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("studentToken");
    localStorage.removeItem("facultyToken");
    localStorage.removeItem("studentRollNo");
    localStorage.removeItem("studentSection");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentInfo");
    localStorage.removeItem("studentInfo");
    setIsAdmin(false);
    setStudentLoggedIn(false);
    setFacultyLoggedIn(false);
    setFacultyInfo(null);
        setActivePage("notices");
  };

  if (!isAdmin && !studentLoggedIn && !facultyLoggedIn) {
  return (
    <LoginPage
      api={API}
      onStudentLogin={() => window.location.reload()}
      onFacultyLogin={() => window.location.reload()}
      onAdminLogin={() => window.location.reload()}
    />
  );
}

 const navBtnClass = (page) =>
  `nav-btn ${activePage === page ? "active" : ""}`;

  return (
  <div className="app">

    {/* HEADER */}
    <header className="top-header">

      <div className="brand-section">

       <div className="nri-logo">
  <img src="/icon-192.png" alt="DR RVR NRI UNIVERSTY" />
</div>

        <div className="college-info">
          <h1>NRI Institute of Technology</h1>

          {studentData && (
            <p>
              {studentData.name || "Student"} | Roll:{" "}
              {studentData.rollNo || "-"} | Sec:{" "}
              {studentData.section || "-"}
            </p>
          )}

          {facultyInfo && (
            <p>
              {facultyInfo.name || "Faculty"} |{" "}
              {facultyInfo.role || "Faculty"}
            </p>
          )}
        </div>

      </div>

      <button className="header-logout" onClick={handleLogout}>
        Logout
      </button>

    </header>


    {/* NAVIGATION */}
    <nav className="main-nav">

      <button
        className={navBtnClass("notices")}
        onClick={() => setActivePage("notices")}
      >
        📢 Notices
      </button>

      <button
        className={navBtnClass("notes")}
        onClick={() => setActivePage("notes")}
      >
        📚 Notes
      </button>

      <button
        className={navBtnClass("assignments")}
        onClick={() => setActivePage("assignments")}
      >
        📝 Assignments
      </button>

      <button
        className={navBtnClass("papers")}
        onClick={() => setActivePage("papers")}
      >
        📄 Papers
      </button>

      <button
        className={navBtnClass("materials")}
        onClick={() => setActivePage("materials")}
      >
        📖 Materials
      </button>

      <button
        className={navBtnClass("timetable")}
        onClick={() => setActivePage("timetable")}
      >
        📅 Timetable
      </button>


      {isAdmin && (
        <button
          className={navBtnClass("attendance")}
          onClick={() => setActivePage("attendance")}
        >
          👥 Attendance
        </button>
      )}


      {facultyLoggedIn && (
        <button
          className={navBtnClass("my-attendance")}
          onClick={() => setActivePage("my-attendance")}
        >
          ✅ My Attendance
        </button>
      )}


      {(isAdmin || facultyInfo?.role === "hod") && (
        <button
          className={navBtnClass("hod-report")}
          onClick={() => setActivePage("hod-report")}
        >
          📊 Report
        </button>
      )}


      {(isAdmin || facultyInfo?.role === "hod") && (
        <button
          className={navBtnClass("attendance-export")}
          onClick={() => setActivePage("attendance-export")}
        >
          📤 Export
        </button>
      )}


      {facultyInfo?.role === "hod" && (
        <button
          className={navBtnClass("manage-cr")}
          onClick={() => setActivePage("manage-cr")}
        >
          ⭐ Manage CR
        </button>
      )}


      <button
        className={navBtnClass("search")}
        onClick={() => setActivePage("search")}
      >
        🔍 Search
      </button>


      <button
        className={navBtnClass("chatbot")}
        onClick={() => setActivePage("chatbot")}
      >
        🤖 AI Assistant
      </button>


      <button
        className={navBtnClass("profile")}
        onClick={() => setActivePage("profile")}
      >
        👤 Profile
      </button>


      <button
        className="notification-btn"
        onClick={() => setActivePage("notifications")}
      >
        🔔 Notifications
        {unreadNotifications > 0 && (
          <span className="notification-badge">
            {unreadNotifications}
          </span>
        )}
      </button>

    </nav>


    {/* MAIN CONTENT */}
    <main className="main-content">

      {activePage === "notices" && isAdmin && (
        <AddNotice api={API} />
      )}

      {activePage === "notes" && (
        <Notes
          isAdmin={isAdmin}
          api={API}
          studentSection={studentData?.section}
        />
      )}

      {activePage === "assignments" && (
        <Assignments
          isAdmin={isAdmin}
          api={API}
        />
      )}

      {activePage === "papers" && (
        <Papers
          isAdmin={isAdmin}
          api={API}
        />
      )}

      {activePage === "materials" && (
        <StudyMaterials
          isAdmin={isAdmin}
          api={API}
        />
      )}

      {activePage === "timetable" && (
        <Timetable
          api={API}
          isAdmin={isAdmin}
          facultyInfo={facultyInfo}
          studentSection={studentData?.section}
        />
      )}

      {activePage === "attendance" && isAdmin && (
        <Attendance api={API} />
      )}

      {activePage === "my-attendance" && facultyInfo && (
        <MyAttendance
          api={API}
          facultyInfo={facultyInfo}
        />
      )}

      {activePage === "hod-report" &&
        (isAdmin || facultyInfo?.role === "hod") && (
          <HodAttendanceReport
            api={API}
            isAdmin={isAdmin}
            facultyInfo={facultyInfo}
          />
        )}

      {activePage === "attendance-export" &&
        (facultyInfo?.role === "hod" || isAdmin) && (
          <AttendanceExport
            api={API}
            isAdmin={isAdmin}
            facultyInfo={facultyInfo}
          />
        )}

      {activePage === "manage-cr" &&
        facultyInfo?.role === "hod" && (
          <ManageCR
            api={API}
            facultyInfo={facultyInfo}
          />
        )}

      {activePage === "chatbot" && (
        <Chatbot api={API} />
      )}

      {activePage === "search" && (
        <Search api={API} />
      )}

      {activePage === "profile" && (
        isAdmin
          ? <Profile api={API} isAdmin={isAdmin} />
          : <Profile api={API} studentData={studentData} />
      )}

      {activePage === "notifications" && (
        <Notifications
          api={API}
          onUnreadCountChange={setUnreadNotifications}
        />
      )}

    </main>


    {/* FOOTER */}
    <footer className="footer">
      © 2026 NRI Institute of Technology | CS-Allied Portal
    </footer>

  </div>
);
}

export default App;