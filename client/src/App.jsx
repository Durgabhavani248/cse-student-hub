import { useEffect, useState } from "react";
import AddNotice from "./AddNotice";
import Login from "./Login";
import Notes from "./Notes";
import Doubts from "./Doubts";
import Timetable from "./Timetable";
import Search from "./Search";

function App() {
  const [notices, setNotices] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [activePage, setActivePage] = useState("notices");
  const [studentInfo, setStudentInfo] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [sectionInput, setSectionInput] = useState("");

  const fetchNotices = () => {
    fetch("https://cse-student-hub.onrender.com/api/notices")
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
    fetch(`https://cse-student-hub.onrender.com/api/notices/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchNotices());
  };

  const navBtnStyle = (page) => ({
    padding: "10px 24px",
    borderRadius: "20px",
    border: "none",
    background: activePage === page ? "linear-gradient(90deg, #f72585, #7209b7)" : "transparent",
    color: "#fff",
    cursor: "pointer",
    fontWeight: activePage === page ? "bold" : "normal",
    fontSize: "15px",
    whiteSpace: "nowrap"
  });

  if (!studentInfo && !isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Segoe UI, sans-serif" }}>
        <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #f72585", borderRadius: "20px", padding: "40px", maxWidth: "400px", width: "90%", boxShadow: "0 8px 32px #f7258544", textAlign: "center" }}>
          <img src="/icon-192.png" alt="logo" style={{ width: "80px", marginBottom: "16px", borderRadius: "16px" }} />
          <h1 style={{ background: "linear-gradient(90deg, #f72585, #4cc9f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 8px 0", fontSize: "20px" }}>Dr. RVR NRI Institute of Technology</h1>
          <p style={{ color: "#aaa", marginBottom: "32px", fontSize: "14px" }}>CSE Student Hub 🚀</p>
          <input
            placeholder="Your Name"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #f72585", background: "#0f0f0f", color: "#fff", fontSize: "15px", marginBottom: "14px", outline: "none", boxSizing: "border-box" }}
          />
          <select
            value={sectionInput}
            onChange={e => setSectionInput(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #f72585", background: "#0f0f0f", color: sectionInput ? "#fff" : "#888", fontSize: "15px", marginBottom: "24px", outline: "none", boxSizing: "border-box", cursor: "pointer" }}
          >
            <option value="">Select Section</option>
            {["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"].map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </select>
          <button onClick={saveStudentInfo} style={{ width: "100%", padding: "14px", background: "linear-gradient(90deg, #f72585, #7209b7)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>
            Get Started 🚀
          </button>
          <p onClick={() => { setStudentInfo({ name: "Admin", section: "7" }); setShowLogin(true); }} style={{ color: "#555", fontSize: "12px", marginTop: "16px", cursor: "pointer" }}>
            Admin? Click here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", color: "#fff", fontFamily: "Segoe UI, sans-serif" }}>

      {/* Navbar */}
      <div style={{ background: "linear-gradient(90deg, #f72585, #7209b7, #3a0ca3, #4361ee, #4cc9f0)", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
        <div>
          <h1 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "bold" }}>🎓 NRI University</h1>
          <p style={{ margin: 0, color: "#ffffffcc", fontSize: "12px" }}>Hi {studentInfo?.name}! Section {studentInfo?.section}</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isAdmin ? (
            <button onClick={handleLogout} style={{ background: "#fff", color: "#f72585", border: "none", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}>
              Logout
            </button>
          ) : (
            <button onClick={() => setShowLogin(!showLogin)} style={{ background: "transparent", color: "#fff", border: "2px solid #fff", padding: "8px 20px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}>
              Admin Login
            </button>
          )}
          <button onClick={() => { localStorage.removeItem("studentInfo"); setStudentInfo(null); }} style={{ background: "transparent", color: "#ffffff88", border: "1px solid #ffffff44", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "12px" }}>
            Switch
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div style={{ display: "flex", gap: "4px", padding: "12px 32px", background: "#0f0f0f88", borderBottom: "1px solid #ffffff22", overflowX: "auto" }}>
        <button style={navBtnStyle("notices")} onClick={() => setActivePage("notices")}>📢 Notices</button>
        <button style={navBtnStyle("notes")} onClick={() => setActivePage("notes")}>📚 Notes</button>
        <button style={navBtnStyle("doubts")} onClick={() => setActivePage("doubts")}>❓ Doubts</button>
        <button style={navBtnStyle("timetable")} onClick={() => setActivePage("timetable")}>🗓️ Timetable</button>
        <button style={navBtnStyle("search")} onClick={() => setActivePage("search")}>🔍 Search</button>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {showLogin && <Login onLogin={handleLogin} />}

        {activePage === "notices" && (
          <div>
            {isAdmin && <AddNotice onAdd={addNotice} />}
            <h2 style={{ color: "#4cc9f0", borderBottom: "2px solid #4cc9f0", paddingBottom: "8px", display: "inline-block" }}>📢 Notices</h2>
            {notices.length === 0 && <p style={{ color: "#888" }}>No notices yet!</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", marginTop: "16px" }}>
              {notices.map((n, index) => {
                const colors = ["#f72585", "#7209b7", "#4361ee", "#4cc9f0", "#06d6a0"];
                const color = colors[index % colors.length];
                return (
                  <div key={n.id} style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: `1px solid ${color}`, borderRadius: "16px", padding: "20px", boxShadow: `0 4px 20px ${color}33`, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: color }} />
                    <h3 style={{ margin: "8px 0", color: "#fff" }}>{n.title}</h3>
                    <p style={{ color: "#aaa", fontSize: "14px", margin: "0 0 12px 0" }}>{n.description}</p>
                    <small style={{ color: "#555" }}>📅 {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}</small>
                    {isAdmin && (
                      <button onClick={() => deleteNotice(n.id)} style={{ float: "right", background: "#f72585", color: "#fff", border: "none", padding: "4px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px" }}>
                        Delete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activePage === "notes" && <Notes isAdmin={isAdmin} />}
        {activePage === "doubts" && <Doubts isAdmin={isAdmin} />}
        {activePage === "timetable" && <Timetable isAdmin={isAdmin} studentSection={studentInfo?.section} />}
        {activePage === "search" && <Search />}
      </div>
    </div>
  );
}

export default App;