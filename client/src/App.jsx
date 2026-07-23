import { useEffect, useState } from "react";
import AddNotice from "./AddNotice";
import Login from "./Login";
import Notes from "./Notes";
import Timetable from "./Timetable";
import Search from "./Search";
import StudentLogin from "./StudentLogin";
import ChangePassword from "./ChangePassword";
import Chatbot from "./Chatbot";
import Assignments from "./Assignments";
import Papers from "./Papers";
import StudyMaterials from "./StudyMaterials";
import Profile from "./Profile";
import Notifications from "./Notifications";
import FacultyLogin from "./FacultyLogin";
import FacultyChangePassword from "./FacultyChangePassword";
import Attendance from "./Attendance";
import MyAttendance from "./MyAttendance";
import HodAttendanceReport from "./HodAttendanceReport";
import ManageCR from "./ManageCR";


const API = "https://cse-student-hub.onrender.com";

function CurrentClassCard({ studentSection, api }) {
  const [timetable, setTimetable] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
  console.log("Student Section:", studentSection);

  if (studentSection) {
    const authToken = localStorage.getItem("studentToken") || localStorage.getItem("facultyToken") || localStorage.getItem("token");
    fetch(`${api}/api/timetable/${studentSection}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => {
        
        setTimetable(data);
      });
  }
}, [studentSection]);
if (!timetable) return null;




  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = days[now.getDay()];
  
  const current = now.getHours() * 60 + now.getMinutes();

  let currentClass = null, nextClass = null, currentPeriod = null, nextPeriod = null;

  if (timetable.timings) {
  for (let i = 0; i < timetable.timings.length; i++) {
    const t = timetable.timings[i];

    const [sh, sm] = t.start.split(":").map(Number);
    const [eh, em] = t.end.split(":").map(Number);

    if (current >= sh * 60 + sm && current < eh * 60 + em) {
      currentPeriod = t;
      currentClass = timetable.schedule?.[today]?.[i];

      if (i + 1 < timetable.timings.length) {
        nextPeriod = timetable.timings[i + 1];
        nextClass = timetable.schedule?.[today]?.[i + 1];
      }

      break;
    }
  }
}
  return (
    <div style={{ background: "linear-gradient(135deg, #F15A29, #d44a1e)", borderRadius: "16px", padding: "20px 24px", marginBottom: "24px", boxShadow: "0 4px 20px rgba(241,90,41,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
      <div>
        <p style={{
  margin:0,
  color:"rgba(255,255,255,.8)",
  fontSize:"12px"
}}>
{now.toLocaleTimeString()}
</p>
        {currentPeriod?.type === "class" && currentClass ? (
          <>
            <h2 style={{ margin: "6px 0 4px 0", color: "#fff", fontSize: "22px", fontWeight: "700" }}>{currentClass}</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>{currentPeriod.start} - {currentPeriod.end}</p>
          </>
        ) : currentPeriod?.type === "break" ? (
          <h2 style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "22px" }}>Break Time</h2>
        ) : currentPeriod?.type === "lunch" ? (
          <h2 style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "22px" }}>Lunch Break</h2>
        ) : (
          <h2 style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "22px" }}>No Class Now</h2>
        )}
      </div>
      {nextPeriod?.type === "class" && nextClass && (
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "12px", padding: "12px 20px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>Next Class</p>
          <p style={{ margin: "4px 0 2px 0", color: "#fff", fontSize: "18px", fontWeight: "700" }}>{nextClass}</p>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>{nextPeriod.start}</p>
        </div>
      )}
    </div>
  );
}

function App() {
  const [notices, setNotices] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [activePage, setActivePage] = useState("notices");
  const [studentInfo, setStudentInfo] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [facultyInfo, setFacultyInfo] = useState(null);
  const [showFacultyLogin, setShowFacultyLogin] = useState(false);
  const [showFacultyChangePassword, setShowFacultyChangePassword] = useState(false);

  const fetchNotices = () => {
    const authToken = localStorage.getItem("token") || localStorage.getItem("studentToken") || localStorage.getItem("facultyToken");
    fetch(`${API}/api/notices`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    })
      .then(res => res.json())
      .then(data => setNotices(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchNotices();
    const adminToken = localStorage.getItem("token");
    if (adminToken) setIsAdmin(true);
    const savedInfo = localStorage.getItem("studentInfo");
    const studentToken = localStorage.getItem("studentToken");
    if (savedInfo && studentToken) {
      const info = JSON.parse(savedInfo);
      setStudentInfo(info);
      if (info.isFirstLogin) setShowChangePassword(true);
    }
    const savedFacultyInfo = localStorage.getItem("facultyInfo");
    const facultyToken = localStorage.getItem("facultyToken");
    if (savedFacultyInfo && facultyToken) {
      const info = JSON.parse(savedFacultyInfo);
      setFacultyInfo(info);
      if (info.isFirstLogin) setShowFacultyChangePassword(true);
    }
  }, []);

  const handleAdminLogout = () => { localStorage.removeItem("token"); setIsAdmin(false); };

  const handleStudentLogin = (user) => {
    setStudentInfo(user);
    if (user.isFirstLogin) {
      setShowChangePassword(true);
    }
    fetchNotices();
  };

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    const info = JSON.parse(localStorage.getItem("studentInfo"));
    info.isFirstLogin = false;
    localStorage.setItem("studentInfo", JSON.stringify(info));
    setStudentInfo({ ...info, isFirstLogin: false });
  };

  const handleStudentLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("studentInfo");
    setStudentInfo(null);
  };

  const handleFacultyLogin = (faculty) => {
    setFacultyInfo(faculty);
    setShowFacultyLogin(false);
    if (faculty.isFirstLogin) {
      setShowFacultyChangePassword(true);
    }
    fetchNotices();
  };

  const handleFacultyPasswordChanged = () => {
    setShowFacultyChangePassword(false);
    const info = JSON.parse(localStorage.getItem("facultyInfo"));
    info.isFirstLogin = false;
    localStorage.setItem("facultyInfo", JSON.stringify(info));
    setFacultyInfo({ ...info, isFirstLogin: false });
  };

  const handleFacultyLogout = () => {
    localStorage.removeItem("facultyToken");
    localStorage.removeItem("facultyInfo");
    setFacultyInfo(null);
  };

  // Who can add Notes/Assignments/Papers/Materials: Admin, Faculty, HOD, or a CR student
  const canUpload = isAdmin || facultyInfo?.role === "faculty" || facultyInfo?.role === "hod" || studentInfo?.isCR;

  const addNotice = (notice) => setNotices([notice, ...notices]);

  const deleteNotice = (id) => {
    const token = localStorage.getItem("token") || localStorage.getItem("facultyToken");
    fetch(`${API}/api/notices/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchNotices());
  };

  const navBtnStyle = (page) => ({
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: activePage === page ? "#F15A29" : "transparent",
    color: activePage === page ? "#fff" : "#666",
    cursor: "pointer",
    fontWeight: activePage === page ? "600" : "400",
    fontSize: "13px",
    whiteSpace: "nowrap",
    transition: "all 0.2s"
  });

  if (!studentInfo && !isAdmin && !facultyInfo) {
    return (
      <div>
        <StudentLogin onLogin={handleStudentLogin} api={API} />
        <p
          onClick={() => setShowAdminLogin(true)}
          style={{ textAlign: "center", color: "#999", fontSize: "12px", cursor: "pointer", marginTop: "-20px" }}
        >
          Admin? Click here
        </p>
        <p
          onClick={() => setShowFacultyLogin(true)}
          style={{ textAlign: "center", color: "#999", fontSize: "12px", cursor: "pointer", marginTop: "8px" }}
        >
          Faculty / HOD? Click here
        </p>
        {showAdminLogin && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%" }}>
              <Login onLogin={() => {
                setIsAdmin(true);
                setShowAdminLogin(false);
                setStudentInfo({ name: "Admin", section: "" });
              }} />
              <button onClick={() => setShowAdminLogin(false)} style={{ width: "100%", padding: "10px", background: "#f5f5f5", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "8px" }}>Cancel</button>
            </div>
          </div>
        )}
        {showFacultyLogin && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#fff", borderRadius: "16px", padding: "0", maxWidth: "420px", width: "90%", overflow: "hidden" }}>
              <FacultyLogin api={API} onLogin={handleFacultyLogin} />
              <button onClick={() => setShowFacultyLogin(false)} style={{ width: "100%", padding: "12px", background: "#f5f5f5", border: "none", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showChangePassword) {
    return <ChangePassword onSuccess={handlePasswordChanged} api={API} />;
  }

  if (showFacultyChangePassword) {
    return <FacultyChangePassword onSuccess={handleFacultyPasswordChanged} api={API} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "Segoe UI, sans-serif" }}>

      <div style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/icon-192.png" alt="NRI" style={{ width: "40px", height: "40px", borderRadius: "8px" }} />
          <div>
            <h1 style={{ margin: 0, color: "#F15A29", fontSize: "16px", fontWeight: "700" }}>NRI Institute of Technology</h1>
            <p style={{ margin: 0, color: "#666", fontSize: "11px" }}>
              {isAdmin
                ? "Admin Panel"
                : facultyInfo
                ? `${facultyInfo.name} | ${facultyInfo.role === "hod" ? "HOD" : "Faculty"} | ${facultyInfo.branch}`
                : `${studentInfo?.name} | Roll: ${studentInfo?.rollNo} | Sec: ${studentInfo?.section}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isAdmin ? (
            <button onClick={handleAdminLogout} style={{ background: "#fff", color: "#F15A29", border: "1.5px solid #F15A29", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
              Logout
            </button>
          ) : facultyInfo ? (
            <button onClick={handleFacultyLogout} style={{ background: "#fff", color: "#F15A29", border: "1.5px solid #F15A29", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
              Logout
            </button>
          ) : (
            <button onClick={handleStudentLogout} style={{ background: "#fff", color: "#F15A29", border: "1.5px solid #F15A29", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
              Logout
            </button>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "0 16px", display: "flex", gap: "2px", overflowX: "auto" }}>
        <button style={navBtnStyle("notices")} onClick={() => setActivePage("notices")}>📢 Notices</button>
        {facultyInfo?.role !== "hod" && <button style={navBtnStyle("notes")} onClick={() => setActivePage("notes")}>📚 Notes</button>}
        {facultyInfo?.role !== "hod" && <button style={navBtnStyle("assignments")} onClick={() => setActivePage("assignments")}>📝 Assignments</button>}
        <button style={navBtnStyle("papers")} onClick={() => setActivePage("papers")}>📄 Papers</button>
        <button style={navBtnStyle("materials")} onClick={() => setActivePage("materials")}>📖 Materials</button>
        <button style={navBtnStyle("timetable")} onClick={() => setActivePage("timetable")}>🗓️ Timetable</button>
        {!facultyInfo && <button style={navBtnStyle("chatbot")} onClick={() => setActivePage("chatbot")}>🤖 AI Assistant</button>}
        {!facultyInfo && <button style={navBtnStyle("search")} onClick={() => setActivePage("search")}>🔍 Search</button>}
        <button style={navBtnStyle("profile")} onClick={() => setActivePage("profile")}>👤 Profile</button>
        {facultyInfo?.role === "faculty" && <button style={navBtnStyle("attendance")} onClick={() => setActivePage("attendance")}>📋 Attendance</button>}
        {facultyInfo?.role === "hod" && <button style={navBtnStyle("hodreport")} onClick={() => setActivePage("hodreport")}>📊 Branch Report</button>}
        {(facultyInfo?.role === "hod" || isAdmin) && <button style={navBtnStyle("managecr")} onClick={() => setActivePage("managecr")}>⭐ Manage CRs</button>}
        {!isAdmin && !facultyInfo && studentInfo && <button style={navBtnStyle("myattendance")} onClick={() => setActivePage("myattendance")}>📊 My Attendance</button>}
        {!isAdmin && !facultyInfo && <button style={navBtnStyle("notifications")} onClick={() => setActivePage("notifications")}>🔔 Notifications</button>}
        {isAdmin && <button style={navBtnStyle("admin")} onClick={() => setActivePage("admin")}>⚙️ Admin</button>}
      </div>

      <div style={{ padding: "24px 32px", maxWidth: "1200px", margin: "0 auto" }}>

        {activePage === "notices" && (
          <div>
            


            {!isAdmin && (
  <CurrentClassCard
    studentSection={studentInfo?.section}
    api={API}
  />
)}
            {isAdmin || facultyInfo?.role === "hod" ? (
              <AddNotice onAdd={addNotice} api={API} facultyInfo={facultyInfo} />
            ) : null}
            <h2 style={{ color: "#1a1a1a", fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Notices</h2>
            {notices.length === 0 && <p style={{ color: "#999" }}>No notices yet!</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {notices.map((n, index) => {
                const colors = ["#F15A29", "#2196F3", "#4CAF50", "#9C27B0", "#FF9800"];
                const color = colors[index % colors.length];
                return (
                  <div key={n._id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}` }}>
                    <h3 style={{ margin: "0 0 8px 0", color: "#1a1a1a", fontSize: "16px" }}>{n.title}</h3>
                    <p style={{ color: "#666", fontSize: "14px", margin: "0 0 12px 0" }}>{n.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <small style={{ color: "#999", fontSize: "12px" }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                        {n.branch ? ` · ${n.branch} only` : ""}
                      </small>
                      {(isAdmin || facultyInfo?.role === "hod") && (
                        <button onClick={() => deleteNotice(n._id)} style={{ background: "#fff0ee", color: "#F15A29", border: "1px solid #F15A29", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activePage === "notes" && facultyInfo?.role !== "hod" && <Notes isAdmin={isAdmin} canUpload={canUpload} api={API} studentSection={studentInfo?.section} facultyInfo={facultyInfo} />}
        {activePage === "assignments" && facultyInfo?.role !== "hod" && <Assignments isAdmin={isAdmin} canUpload={canUpload} api={API} facultyInfo={facultyInfo} />}
        {activePage === "papers" && <Papers isAdmin={isAdmin} canUpload={canUpload} api={API} facultyInfo={facultyInfo} />}
        {activePage === "materials" && <StudyMaterials isAdmin={isAdmin} canUpload={canUpload} api={API} facultyInfo={facultyInfo} />}
        {activePage === "timetable" && <Timetable isAdmin={isAdmin} studentSection={studentInfo?.section} facultyInfo={facultyInfo} api={API} />}
        {activePage === "attendance" && facultyInfo?.role === "faculty" && <Attendance api={API} facultyInfo={facultyInfo} />}
        {activePage === "hodreport" && facultyInfo?.role === "hod" && <HodAttendanceReport api={API} facultyInfo={facultyInfo} />}
        {activePage === "managecr" && (facultyInfo?.role === "hod" || isAdmin) && <ManageCR api={API} isAdmin={isAdmin} facultyInfo={facultyInfo} />}
        {activePage === "myattendance" && !isAdmin && !facultyInfo && <MyAttendance api={API} />}
        {activePage === "chatbot" && <Chatbot api={API} />}
        {activePage === "search" && <Search api={API} />}
        {activePage === "profile" && facultyInfo && (
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", maxWidth: "480px" }}>
            <h2 style={{ color: "#F15A29", fontSize: "20px", fontWeight: "700", marginTop: 0 }}>Faculty Profile</h2>
            <p style={{ color: "#1a1a1a", margin: "8px 0" }}><strong>Name:</strong> {facultyInfo.name}</p>
            <p style={{ color: "#1a1a1a", margin: "8px 0" }}><strong>Faculty ID:</strong> {facultyInfo.facultyId}</p>
            <p style={{ color: "#1a1a1a", margin: "8px 0" }}><strong>Branch:</strong> {facultyInfo.branch}</p>
            <p style={{ color: "#1a1a1a", margin: "8px 0" }}><strong>Role:</strong> {facultyInfo.role === "hod" ? "HOD" : "Faculty"}</p>
            {facultyInfo.role === "faculty" && (
              <p style={{ color: "#1a1a1a", margin: "8px 0" }}><strong>Sections:</strong> {(facultyInfo.assignedSections || []).join(", ") || "—"}</p>
            )}
          </div>
        )}
        {activePage === "profile" && !facultyInfo && <Profile studentInfo={studentInfo} isAdmin={isAdmin} api={API} />}
        {activePage === "notifications" && !isAdmin && !facultyInfo && <Notifications studentInfo={studentInfo} />}
        {activePage === "admin" && isAdmin && (
          <div>
            <h2 style={{ color: "#1a1a1a", fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Admin Panel</h2>
            <AdminPanel api={API} />
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ api }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState(null);

  const [facultyList, setFacultyList] = useState([]);
  const [facultyFile, setFacultyFile] = useState(null);
  const [fMessage, setFMessage] = useState("");
  const [fSkipped, setFSkipped] = useState([]);

  const fetchStats = () => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data));
  };

  const fetchFaculty = () => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/faculty`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setFacultyList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchStats();
    fetchFaculty();
  }, []);

  const uploadStudents = () => {
    if (!file) { alert("Please select an Excel file!"); return; }
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    fetch(`${api}/api/admin/upload-students`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        setMessage(data.message);
        fetchStats();
      });
  };

  const resetFacultyPassword = (facultyId) => {
    if (!confirm(`Reset password for ${facultyId} to default (nri@2024)?`)) return;
    const token = localStorage.getItem("token");
    fetch(`${api}/api/admin/reset-faculty-password/${facultyId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => alert(data.message))
      .catch(() => alert("❌ Server error!"));
  };

  const uploadFaculty = () => {
    if (!facultyFile) { alert("Please select an Excel file!"); return; }
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", facultyFile);
    setFMessage("Uploading...");
    setFSkipped([]);

    fetch(`${api}/api/admin/upload-faculty`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        setFMessage(data.message || "Done");
        setFSkipped(data.skippedReasons || []);
        fetchFaculty();
      })
      .catch(() => setFMessage("❌ Server error!"));
  };

  const statCard = (label, value, color) => (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "16px 20px", flex: 1, minWidth: "140px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <p style={{ margin: 0, color: "#999", fontSize: "12px" }}>{label}</p>
      <h2 style={{ margin: "4px 0 0 0", color: color || "#1a1a1a", fontSize: "28px", fontWeight: "700" }}>{value ?? "—"}</h2>
    </div>
  );

  return (
    <div>
      {stats && (
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: "#1a1a1a", marginBottom: "12px" }}>Overview</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
            {statCard("Total Students", stats.totalStudents, "#F15A29")}
            {statCard("Logged In (Ever)", stats.everLoggedIn, "#2196F3")}
            {statCard("Active Today", stats.activeToday, "#4CAF50")}
            {statCard("Active This Week", stats.activeThisWeek, "#9C27B0")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
            {statCard("Notices", stats.totalNotices)}
            {statCard("Notes", stats.totalNotes)}
            {statCard("Assignments", stats.totalAssignments)}
            {statCard("Papers", stats.totalPapers)}
            {statCard("Study Materials", stats.totalMaterials)}
          </div>

          {stats.sectionCounts?.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#1a1a1a" }}>Students by Branch & Section</h4>
              {Object.entries(
                stats.sectionCounts.reduce((acc, s) => {
                  (acc[s.branch] = acc[s.branch] || []).push(s);
                  return acc;
                }, {})
              ).map(([branch, rows]) => (
                <div key={branch} style={{ marginBottom: "14px" }}>
                  <p style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: "700", color: "#2196F3" }}>{branch}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {rows.map(s => (
                      <div key={`${s.branch}-${s.section}`} style={{ background: "#fff0ee", color: "#F15A29", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600" }}>
                        Sec {s.section}: {s.count}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "24px" }}>
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", maxWidth: "500px", flex: 1, minWidth: "320px" }}>
          <h3 style={{ color: "#F15A29", marginTop: 0 }}>Upload Students Excel</h3>
          <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
            Excel format: <strong>rollNo, name, section, branch, year</strong>
            <br />
            <span style={{ color: "#999" }}>(branch column optional — defaults to CSE if left blank)</span>
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={e => setFile(e.target.files[0])}
            style={{ marginBottom: "12px", width: "100%" }}
          />
          <button onClick={uploadStudents} style={{ width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
            Upload Students
          </button>
          {message && <p style={{ color: "#4CAF50", marginTop: "12px", fontWeight: "600" }}>{message}</p>}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", maxWidth: "500px", flex: 1, minWidth: "320px" }}>
          <h3 style={{ color: "#F15A29", marginTop: 0 }}>Upload Faculty / HOD Excel</h3>
          <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
            Excel format: <strong>facultyId, name, branch, role, sections</strong>
            <br />
            <span style={{ color: "#999" }}>
              role = faculty / hod (default faculty) &nbsp;|&nbsp; sections = comma-separated, e.g. "A,B" (ignored for hod)
              <br />
              Default password for everyone: <strong>nri@2024</strong> (forced change on first login)
            </span>
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={e => setFacultyFile(e.target.files[0])}
            style={{ marginBottom: "12px", width: "100%" }}
          />
          <button onClick={uploadFaculty} style={{ width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
            Upload Faculty
          </button>
          {fMessage && <p style={{ color: fMessage.startsWith("❌") ? "#F15A29" : "#4CAF50", marginTop: "12px", fontWeight: "600", fontSize: "13px" }}>{fMessage}</p>}
          {fSkipped.length > 0 && (
            <ul style={{ color: "#999", fontSize: "12px", marginTop: "8px", paddingLeft: "18px" }}>
              {fSkipped.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </div>
      </div>

      {facultyList.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ color: "#1a1a1a", marginTop: 0 }}>Faculty & HOD Accounts ({facultyList.length})</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#999", borderBottom: "1px solid #e0e0e0" }}>
                  <th style={{ padding: "8px" }}>Faculty ID</th>
                  <th style={{ padding: "8px" }}>Name</th>
                  <th style={{ padding: "8px" }}>Branch</th>
                  <th style={{ padding: "8px" }}>Role</th>
                  <th style={{ padding: "8px" }}>Sections</th>
                  <th style={{ padding: "8px" }}></th>
                </tr>
              </thead>
              <tbody>
                {facultyList.map(f => (
                  <tr key={f._id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "8px", fontWeight: "600" }}>{f.facultyId}</td>
                    <td style={{ padding: "8px" }}>{f.name}</td>
                    <td style={{ padding: "8px" }}>{f.branch}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{ background: f.role === "hod" ? "#fff0ee" : "#f0f7ff", color: f.role === "hod" ? "#F15A29" : "#2196F3", padding: "3px 10px", borderRadius: "12px", fontWeight: "600", fontSize: "11px" }}>
                        {f.role === "hod" ? "HOD" : "FACULTY"}
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>{(f.assignedSections || []).join(", ") || (f.role === "hod" ? "All" : "—")}</td>
                    <td style={{ padding: "8px" }}>
                      <button
                        onClick={() => resetFacultyPassword(f.facultyId)}
                        style={{ background: "#fff", color: "#F15A29", border: "1px solid #F15A29", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
