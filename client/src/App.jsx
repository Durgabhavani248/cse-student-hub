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

 const navBtnStyle = (page) => ({
  padding: "14px 4px",
  background: "transparent",
  color: activePage === page ? "#F15A29" : "#555",
  border: "none",
  borderBottom: activePage === page ? "3px solid #F15A29" : "3px solid transparent",
  cursor: "pointer",
  fontWeight: activePage === page ? "700" : "500",
  fontSize: "15px",
  whiteSpace: "nowrap",
  transition: "all 0.2s"
});

  return (
    <div style={{ fontFamily: "Segoe UI, sans-serif", background: "#f5f5f5", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ background: "#F15A29", color: "#fff", padding: "20px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "800" }}>🏛️ NRI Hub</h1>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>Student Portal & Resource Management</p>
      </div>

           {/* NAVIGATION */}
<div style={{ background: "#fff", padding: "0 20px", display: "flex", gap: "28px", justifyContent: "flex-start", borderBottom: "1px solid #e0e0e0", overflowX: "auto", whiteSpace: "nowrap" }}>
  <button style={navBtnStyle("notices")} onClick={() => setActivePage("notices")}>📢 Notices</button>
  <button style={navBtnStyle("notes")} onClick={() => setActivePage("notes")}>📚 Notes</button>
  <button style={navBtnStyle("assignments")} onClick={() => setActivePage("assignments")}>📝 Assignments</button>
  <button style={navBtnStyle("papers")} onClick={() => setActivePage("papers")}>📄 Papers</button>
  <button style={navBtnStyle("materials")} onClick={() => setActivePage("materials")}>📖 Materials</button>
  <button style={navBtnStyle("timetable")} onClick={() => setActivePage("timetable")}>📅 Timetable</button>

  {isAdmin && <button style={navBtnStyle("attendance")} onClick={() => setActivePage("attendance")}>👥 Attendance</button>}
  {facultyLoggedIn && <button style={navBtnStyle("my-attendance")} onClick={() => setActivePage("my-attendance")}>✅ My Attendance</button>}
  {(isAdmin || facultyInfo?.role === "hod") && <button style={navBtnStyle("hod-report")} onClick={() => setActivePage("hod-report")}>📊 Report</button>}
  {(isAdmin || facultyInfo?.role === "hod") && <button style={navBtnStyle("attendance-export")} onClick={() => setActivePage("attendance-export")}>📤 Export</button>}
  {facultyInfo?.role === "hod" && <button style={navBtnStyle("manage-cr")} onClick={() => setActivePage("manage-cr")}>⭐ Manage CR</button>}

  <button style={navBtnStyle("search")} onClick={() => setActivePage("search")}>🔍 Search</button>
  <button style={navBtnStyle("chatbot")} onClick={() => setActivePage("chatbot")}>🤖 Chatbot</button>
  <button style={navBtnStyle("profile")} onClick={() => setActivePage("profile")}>👤 Profile</button>
  <button onClick={handleLogout} style={{ ...navBtnStyle("logout"), color: "#F15A29" }}>🔓 Logout</button>
</div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        {/* Notices */}
        {activePage === "notices" && isAdmin && <AddNotice api={API} />}

        {activePage === "notes" && <Notes isAdmin={isAdmin} api={API} studentSection={studentData?.section} />}
{activePage === "assignments" && <Assignments isAdmin={isAdmin} api={API} />}
{activePage === "papers" && <Papers isAdmin={isAdmin} api={API} />}
{activePage === "materials" && <StudyMaterials isAdmin={isAdmin} api={API} />}

        {/* Timetable */}
    {activePage === "timetable" && <Timetable api={API} isAdmin={isAdmin} facultyInfo={facultyInfo} studentSection={studentData?.section} />}

        {/* Attendance */}
        {activePage === "attendance" && isAdmin && <Attendance api={API} />}
        {activePage === "my-attendance" && facultyInfo && <MyAttendance api={API} facultyInfo={facultyInfo} />}
        {activePage === "hod-report" && (isAdmin || facultyInfo?.role === "hod") && <HodAttendanceReport api={API} isAdmin={isAdmin} facultyInfo={facultyInfo} />}
        {activePage === "attendance-export" && (facultyInfo?.role === "hod" || isAdmin) && <AttendanceExport api={API} isAdmin={isAdmin} facultyInfo={facultyInfo} />}

        {/* Manage CR */}
        {activePage === "manage-cr" && facultyInfo?.role === "hod" && <ManageCR api={API} facultyInfo={facultyInfo} />}

        {/* Chatbot */}
        {activePage === "chatbot" && <Chatbot api={API} />}

        {/* Search */}
        {activePage === "search" && <Search api={API} />}

        {/* Profile */}
        {activePage === "profile" && (isAdmin ? <Profile api={API} isAdmin={isAdmin} /> : <Profile api={API} studentData={studentData} />)}
      </div>

      {/* Footer */}
      <div style={{ background: "#f5f5f5", borderTop: "1px solid #e0e0e0", padding: "20px", textAlign: "center", color: "#999", fontSize: "12px", marginTop: "40px" }}>
        <p style={{ margin: 0 }}>© 2026 NRI Institute of Technology | CS-Allied Portal</p>
      </div>
    </div>
  );
}

export default App;