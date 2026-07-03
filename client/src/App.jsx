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
    fetch(`${api}/api/timetable/${studentSection}`)
      .then(res => res.json())
      .then(data => {
        console.log("Timetable API Response:", data);
        setTimetable(data);
      });
  }
}, [studentSection]);

  if (!timetable) {
  return <h2>Timetable Loading...</h2>;
}

console.log("Student Section:", studentSection);
console.log("Timetable:", timetable);

  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = days[now.getDay()];
  console.log("Today:", today);
  const current = now.getHours() * 60 + now.getMinutes();

  let currentClass = null, nextClass = null, currentPeriod = null, nextPeriod = null;

  if (timetable.timings) {
    for (let i = 0; i < timetable.timings.length; i++) {
      console.log(
  i,
  t.start,
  t.end,
  timetable.schedule?.[today]?.[i]
);
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
        <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "12px" }}>{now.toLocaleTimeString()} | Section {studentSection}</p>
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

  const fetchNotices = () => {
    fetch(`${API}/api/notices`)
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
  }, []);

  const handleAdminLogout = () => { localStorage.removeItem("token"); setIsAdmin(false); };

  const handleStudentLogin = (user) => {
    setStudentInfo(user);
    if (user.isFirstLogin) {
      setShowChangePassword(true);
    }
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

  const addNotice = (notice) => setNotices([notice, ...notices]);

  const deleteNotice = (id) => {
    const token = localStorage.getItem("token");
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

  if (!studentInfo && !isAdmin) {
    return (
      <div>
        <StudentLogin onLogin={handleStudentLogin} api={API} />
        <p
          onClick={() => setShowAdminLogin(true)}
          style={{ textAlign: "center", color: "#999", fontSize: "12px", cursor: "pointer", marginTop: "-20px" }}
        >
          Admin? Click here
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
      </div>
    );
  }

  if (showChangePassword) {
    return <ChangePassword onSuccess={handlePasswordChanged} api={API} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "Segoe UI, sans-serif" }}>

      <div style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/icon-192.png" alt="NRI" style={{ width: "40px", height: "40px", borderRadius: "8px" }} />
          <div>
            <h1 style={{ margin: 0, color: "#F15A29", fontSize: "16px", fontWeight: "700" }}>NRI Institute of Technology</h1>
            <p style={{ margin: 0, color: "#666", fontSize: "11px" }}>
              {isAdmin ? "Admin Panel" : `${studentInfo?.name} | Roll: ${studentInfo?.rollNo} | Sec: ${studentInfo?.section}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isAdmin ? (
            <button onClick={handleAdminLogout} style={{ background: "#fff", color: "#F15A29", border: "1.5px solid #F15A29", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
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
        <button style={navBtnStyle("notes")} onClick={() => setActivePage("notes")}>📚 Notes</button>
        <button style={navBtnStyle("assignments")} onClick={() => setActivePage("assignments")}>📝 Assignments</button>
        <button style={navBtnStyle("papers")} onClick={() => setActivePage("papers")}>📄 Papers</button>
        <button style={navBtnStyle("materials")} onClick={() => setActivePage("materials")}>📖 Materials</button>
        <button style={navBtnStyle("timetable")} onClick={() => setActivePage("timetable")}>🗓️ Timetable</button>
        <button style={navBtnStyle("chatbot")} onClick={() => setActivePage("chatbot")}>🤖 AI Assistant</button>
        <button style={navBtnStyle("search")} onClick={() => setActivePage("search")}>🔍 Search</button>
        <button style={navBtnStyle("profile")} onClick={() => setActivePage("profile")}>👤 Profile</button>
        {!isAdmin && <button style={navBtnStyle("notifications")} onClick={() => setActivePage("notifications")}>🔔 Notifications</button>}
        {isAdmin && <button style={navBtnStyle("admin")} onClick={() => setActivePage("admin")}>⚙️ Admin</button>}
      </div>

      <div style={{ padding: "24px 32px", maxWidth: "1200px", margin: "0 auto" }}>

        {activePage === "notices" && (
          <div>
            <p style={{ color: "red", fontSize: "20px" }}>
  Section = {studentInfo?.section}
</p>


            <CurrentClassCard studentSection={studentInfo?.section} api={API} />
            {isAdmin && <AddNotice onAdd={addNotice} />}
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
                      <small style={{ color: "#999", fontSize: "12px" }}>{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}</small>
                      {isAdmin && (
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

        {activePage === "notes" && <Notes isAdmin={isAdmin} api={API} studentSection={studentInfo?.section} />}
        {activePage === "assignments" && <Assignments isAdmin={isAdmin} api={API} />}
        {activePage === "papers" && <Papers isAdmin={isAdmin} api={API} />}
        {activePage === "materials" && <StudyMaterials isAdmin={isAdmin} api={API} />}
        {activePage === "timetable" && <Timetable isAdmin={isAdmin} studentSection={studentInfo?.section} api={API} />}
        {activePage === "chatbot" && <Chatbot api={API} />}
        {activePage === "search" && <Search api={API} />}
        {activePage === "profile" && <Profile studentInfo={studentInfo} isAdmin={isAdmin} api={API} />}
        {activePage === "notifications" && !isAdmin && <Notifications studentInfo={studentInfo} />}
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

  const fetchStats = () => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data));
  };

  useEffect(() => {
    fetchStats();
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
              <h4 style={{ margin: "0 0 12px 0", color: "#1a1a1a" }}>Students by Section</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {stats.sectionCounts.map(s => (
                  <div key={s._id} style={{ background: "#fff0ee", color: "#F15A29", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600" }}>
                    Sec {s._id}: {s.count}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px", maxWidth: "500px" }}>
        <h3 style={{ color: "#F15A29", marginTop: 0 }}>Upload Students Excel</h3>
        <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
          Excel format: <strong>rollNo, name, section, year</strong>
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
    </div>
  );
}

export default App;
