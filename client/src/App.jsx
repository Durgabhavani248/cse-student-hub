import { useEffect, useState } from "react";
import AddNotice from "./AddNotice";
import Login from "./Login";
import Notes from "./Notes";
import Timetable from "./Timetable";
import Search from "./Search";
import { requestPermission } from "./firebase";

const API = "https://cse-student-hub.onrender.com";

function CurrentClassCard({ studentSection, api }) {
  const [timetable, setTimetable] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (studentSection) {
      fetch(`${api}/api/timetable/${studentSection}`)
        .then(res => res.json())
        .then(data => setTimetable(data));
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
        <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "12px" }}>🕐 {now.toLocaleTimeString()} | Section {studentSection}</p>
        {currentPeriod?.type === "class" && currentClass ? (
          <>
            <h2 style={{ margin: "6px 0 4px 0", color: "#fff", fontSize: "22px", fontWeight: "700" }}>📚 {currentClass}</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>{currentPeriod.start} - {currentPeriod.end}</p>
          </>
        ) : currentPeriod?.type === "break" ? (
          <h2 style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "22px" }}>☕ Break Time!</h2>
        ) : currentPeriod?.type === "lunch" ? (
          <h2 style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "22px" }}>🍱 Lunch Break!</h2>
        ) : (
          <h2 style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "22px" }}>No Class Now 😴</h2>
        )}
      </div>
      {nextPeriod?.type === "class" && nextClass && (
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "12px", padding: "12px 20px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>⏭️ Next Class</p>
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
  const [showLogin, setShowLogin] = useState(false);
  const [activePage, setActivePage] = useState("notices");
  const [studentInfo, setStudentInfo] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [sectionInput, setSectionInput] = useState("");

  const fetchNotices = () => {
    fetch(`${API}/api/notices`)
      .then(res => res.json())
      .then(data => setNotices(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchNotices();
    const token = localStorage.getItem("token");
    if (token) setIsAdmin(true);
    const savedInfo = localStorage.getItem("studentInfo");
    if (savedInfo) setStudentInfo(JSON.parse(savedInfo));
    requestPermission(API);
  }, []);

  const handleLogin = () => { setIsAdmin(true); setShowLogin(false); };
  const handleLogout = () => { localStorage.removeItem("token"); setIsAdmin(false); };

  const saveStudentInfo = () => {
    if (!nameInput || !sectionInput) { alert("Name and section enter cheyyi!"); return; }
    const info = { name: nameInput, section: sectionInput };
    localStorage.setItem("studentInfo", JSON.stringify(info));
    setStudentInfo(info);
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
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: activePage === page ? "#F15A29" : "transparent",
    color: activePage === page ? "#fff" : "#666",
    cursor: "pointer",
    fontWeight: activePage === page ? "600" : "400",
    fontSize: "14px",
    whiteSpace: "nowrap",
    transition: "all 0.2s"
  });

  if (!studentInfo && !isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Segoe UI, sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: "20px", padding: "40px", maxWidth: "420px", width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", textAlign: "center" }}>
          <img src="/icon-192.png" alt="NRI Logo" style={{ width: "80px", marginBottom: "16px" }} />
          <h1 style={{ color: "#F15A29", fontSize: "18px", fontWeight: "700", margin: "0 0 4px 0" }}>Dr. RVR & DR. CS Raju</h1>
          <h2 style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: "600", margin: "0 0 4px 0" }}>NRI Institute of Technology</h2>
          <p style={{ color: "#666", fontSize: "13px", marginBottom: "32px" }}>CSE Student Hub</p>

          <input
            placeholder="Your Name"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1.5px solid #e0e0e0", background: "#fff", color: "#1a1a1a", fontSize: "15px", marginBottom: "12px", outline: "none", boxSizing: "border-box" }}
          />
          <select
            value={sectionInput}
            onChange={e => setSectionInput(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1.5px solid #e0e0e0", background: "#fff", color: sectionInput ? "#1a1a1a" : "#999", fontSize: "15px", marginBottom: "24px", outline: "none", boxSizing: "border-box", cursor: "pointer" }}
          >
            <option value="">Select Your Section</option>
            {["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"].map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>
          <button onClick={saveStudentInfo} style={{ width: "100%", padding: "14px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
            Get Started →
          </button>
          <p onClick={() => { setStudentInfo({ name: "Admin", section: "7" }); setShowLogin(true); }} style={{ color: "#999", fontSize: "12px", marginTop: "16px", cursor: "pointer" }}>
            Admin Login
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "Segoe UI, sans-serif" }}>

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/icon-192.png" alt="NRI" style={{ width: "40px", height: "40px", borderRadius: "8px" }} />
          <div>
            <h1 style={{ margin: 0, color: "#F15A29", fontSize: "16px", fontWeight: "700" }}>NRI Institute of Technology</h1>
            <p style={{ margin: 0, color: "#666", fontSize: "11px" }}>Hi {studentInfo?.name} | Section {studentInfo?.section}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isAdmin ? (
            <button onClick={handleLogout} style={{ background: "#fff", color: "#F15A29", border: "1.5px solid #F15A29", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
              Logout
            </button>
          ) : (
            <button onClick={() => setShowLogin(!showLogin)} style={{ background: "#F15A29", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
              Admin Login
            </button>
          )}
          <button onClick={() => { localStorage.removeItem("studentInfo"); setStudentInfo(null); }} style={{ background: "transparent", color: "#999", border: "1px solid #e0e0e0", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>
            Switch
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", padding: "0 32px", display: "flex", gap: "4px", overflowX: "auto" }}>
        <button style={navBtnStyle("notices")} onClick={() => setActivePage("notices")}>📢 Notices</button>
        <button style={navBtnStyle("notes")} onClick={() => setActivePage("notes")}>📚 Notes</button>
        <button style={navBtnStyle("timetable")} onClick={() => setActivePage("timetable")}>🗓️ Timetable</button>
        <button style={navBtnStyle("search")} onClick={() => setActivePage("search")}>🔍 Search</button>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: "1200px", margin: "0 auto" }}>
        {showLogin && <Login onLogin={handleLogin} />}

        {activePage === "notices" && (
          <div>
            <CurrentClassCard studentSection={studentInfo?.section} api={API} />
            {isAdmin && <AddNotice onAdd={addNotice} />}
            <h2 style={{ color: "#1a1a1a", fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>📢 Notices</h2>
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
                      <small style={{ color: "#999", fontSize: "12px" }}>📅 {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}</small>
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

        {activePage === "notes" && <Notes isAdmin={isAdmin} api={API} />}
        {activePage === "timetable" && <Timetable isAdmin={isAdmin} studentSection={studentInfo?.section} api={API} />}
        {activePage === "search" && <Search api={API} />}
      </div>
    </div>
  );
}

export default App;