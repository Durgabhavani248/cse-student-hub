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
  const adminToken = localStorage.getItem("token");
const facultyToken = localStorage.getItem("facultyToken");
const studentToken = localStorage.getItem("studentToken");

const [isAdmin, setIsAdmin] = useState(!!adminToken);
const [studentLoggedIn, setStudentLoggedIn] = useState(
  !adminToken && !facultyToken && !!studentToken
);
const [facultyLoggedIn, setFacultyLoggedIn] = useState(
  !adminToken && !!facultyToken
);
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
  const [notices, setNotices] = useState([]);
const canUploadContent =
  isAdmin ||
  facultyInfo?.role === "faculty" ||
  facultyInfo?.role === "hod" ||
  studentData?.isCR === true;

  useEffect(() => {
  const adminToken = localStorage.getItem("token");
  const facultyToken = localStorage.getItem("facultyToken");
  const studentToken = localStorage.getItem("studentToken");

  // Admin session is the highest priority
  if (adminToken) {
    setIsAdmin(true);
    setFacultyLoggedIn(false);
    setStudentLoggedIn(false);
    setFacultyInfo(null);
    setStudentData(null);
    return;
  }

  if (facultyToken) {
    setIsAdmin(false);
    setFacultyLoggedIn(true);
    setStudentLoggedIn(false);

    const storedFacultyInfo = localStorage.getItem("facultyInfo");

    if (storedFacultyInfo) {
      try {
        setFacultyInfo(JSON.parse(storedFacultyInfo));
      } catch {
        setFacultyInfo(null);
      }
    }

    return;
  }
   if (studentToken) {
    setIsAdmin(false);
    setFacultyLoggedIn(false);
    setStudentLoggedIn(true);
  }

  fetch(`${API}/api/notices`)
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to load notices");
      }
      return res.json();
    })
    .then((data) => {
      setNotices(Array.isArray(data) ? data : []);
    })
    .catch((err) => {
      console.error("Error loading notices:", err);
    });
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


    {facultyLoggedIn && facultyInfo?.role === "faculty" && (
  <button
    className={navBtnClass("attendance")}
    onClick={() => setActivePage("attendance")}
  >
    👥 Mark Attendance
  </button>
)}


    {studentLoggedIn && (
  <button
    className={navBtnClass("my-attendance")}
    onClick={() => setActivePage("my-attendance")}
  >
    ✅ My Attendance
  </button>
)}

{facultyInfo?.role === "hod" && (
  <button
    className={navBtnClass("hod-report")}
    onClick={() => setActivePage("hod-report")}
  >
    📊 Branch Report
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


   {(isAdmin || facultyInfo?.role === "hod") && (
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
{isAdmin && (
  <button
    className={navBtnClass("admin")}
    onClick={() => setActivePage("admin")}
  >
    ⚙️ Admin
  </button>
)}
    </nav>


    {/* MAIN CONTENT */}
    <main className="main-content">
{activePage === "admin" && isAdmin && (
  <AdminPanel
    api={API}
    onOpenManageCR={() => setActivePage("manage-cr")}
  />
)}
{activePage === "notices" && (
  <div style={{ marginTop: "24px" }}>

    <h2
      style={{
        color: "#F15A29",
        fontSize: "22px",
        marginBottom: "16px"
      }}
    >
      📢 Notices
    </h2>

    {notices.length === 0 ? (
      <p style={{ color: "#999" }}>
        No notices yet!
      </p>
    ) : (
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px"
        }}
      >
        {notices.map((notice) => (
          <div
            key={notice._id}
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderLeft: "4px solid #F15A29",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}
          >
            <h3
              style={{
                margin: "0 0 8px",
                color: "#222"
              }}
            >
              {notice.title}
            </h3>

            <p
              style={{
                margin: "0 0 10px",
                color: "#666"
              }}
            >
              {notice.description}
            </p>

            <small style={{ color: "#999" }}>
              {notice.createdAt
                ? new Date(notice.createdAt).toLocaleDateString()
                : ""}
            </small>
          </div>
        ))}
      </div>
    )}

  </div>
)}

      {activePage === "notes" && (
  <Notes
    canUpload={canUploadContent}
    isAdmin={isAdmin}
    api={API}
    studentSection={studentData?.section}
    facultyInfo={facultyInfo}
  />
)}

{activePage === "assignments" && (
  <Assignments
    canUpload={canUploadContent}
    isAdmin={isAdmin}
    api={API}
    studentSection={studentData?.section}
    facultyInfo={facultyInfo}
  />
)}

      {activePage === "papers" && (
  <Papers
    canUpload={canUploadContent}
    isAdmin={isAdmin}
    api={API}
    facultyInfo={facultyInfo}
  />
)}

    {activePage === "materials" && (
  <StudyMaterials
    canUpload={canUploadContent}
    isAdmin={isAdmin}
    api={API}
    facultyInfo={facultyInfo}
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

      {activePage === "attendance" && facultyLoggedIn && (
  <Attendance
    api={API}
    facultyInfo={facultyInfo}
  />
)}

    {activePage === "my-attendance" && studentLoggedIn && (
  <MyAttendance
    api={API}
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
  (isAdmin || facultyInfo?.role === "hod") && (
    <ManageCR
      api={API}
      facultyInfo={facultyInfo}
      isAdmin={isAdmin}
    />
)}

      {activePage === "chatbot" && (
        <Chatbot api={API} />
      )}

      {activePage === "search" && (
        <Search api={API} />
      )}

     {activePage === "profile" && (
  isAdmin ? (
    <Profile
      api={API}
      isAdmin={true}
    />
  ) : facultyLoggedIn ? (
    <Profile
      api={API}
      facultyInfo={facultyInfo}
      isFaculty={true}
    />
  ) : (
    <Profile
      api={API}
      studentInfo={studentData}
      isFaculty={false}
    />
  )
)}

 {activePage === "notifications" && (
  <Notifications
    api={API}
    studentInfo={studentData}
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
function AdminPanel({ api, onOpenManageCR }) {
  const [stats, setStats] = useState(null);
  const [faculty, setFaculty] = useState([]);

  const [studentFile, setStudentFile] = useState(null);
  const [facultyFile, setFacultyFile] = useState(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const loadAdminData = async () => {
    try {
      const token = getToken();

      const [statsRes, facultyRes] = await Promise.all([
        fetch(`${api}/api/admin/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        fetch(`${api}/api/faculty`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ]);

      const statsData = await statsRes.json();
      const facultyData = await facultyRes.json();

      if (statsRes.ok) {
        setStats(statsData);
      }

      if (facultyRes.ok) {
        setFaculty(facultyData);
      }
    } catch (err) {
      console.error("Admin data error:", err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const uploadStudents = async () => {
    if (!studentFile) {
      alert("Please select Students Excel file!");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", studentFile);

      const response = await fetch(
        `${api}/api/admin/upload-students`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`
          },
          body: formData
        }
      );

      const data = await response.json();

      setMessage(data.message || "Student upload completed");

      if (response.ok) {
        setStudentFile(null);
        loadAdminData();
      }
    } catch (err) {
      setMessage("Student upload failed");
    } finally {
      setLoading(false);
    }
  };

  const uploadFaculty = async () => {
    if (!facultyFile) {
      alert("Please select Faculty/HOD Excel file!");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", facultyFile);

      const response = await fetch(
        `${api}/api/admin/upload-faculty`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`
          },
          body: formData
        }
      );

      const data = await response.json();

      setMessage(data.message || "Faculty upload completed");

      if (response.ok) {
        setFacultyFile(null);
        loadAdminData();
      }
    } catch (err) {
      setMessage("Faculty upload failed");
    } finally {
      setLoading(false);
    }
  };

  const resetFacultyPassword = async (facultyId) => {
    const confirmReset = window.confirm(
      `Reset password for ${facultyId}?`
    );

    if (!confirmReset) return;

    try {
      const response = await fetch(
        `${api}/api/admin/reset-faculty-password/${facultyId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      const data = await response.json();

      alert(data.message || "Password reset completed");
    } catch (err) {
      alert("Password reset failed");
    }
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
  };

  const buttonStyle = {
    background: "#F15A29",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600"
  };

  return (
    <div>

      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            color: "#F15A29",
            marginBottom: "6px"
          }}
        >
          ⚙️ Admin Panel
        </h2>

        <p style={{ color: "#777", marginTop: 0 }}>
          Central management of students, faculty, HODs and academic data.
        </p>
      </div>

      {/* STATS */}

      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(150px,1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}
        >
          {[
            ["Students", stats.totalStudents],
            ["Notices", stats.totalNotices],
            ["Notes", stats.totalNotes],
            ["Assignments", stats.totalAssignments],
            ["Papers", stats.totalPapers],
            ["Materials", stats.totalMaterials]
          ].map(([label, value]) => (
            <div key={label} style={cardStyle}>
              <div
                style={{
                  color: "#888",
                  fontSize: "13px"
                }}
              >
                {label}
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#F15A29",
                  marginTop: "5px"
                }}
              >
                {value ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STUDENT UPLOAD */}

      <div style={{ ...cardStyle, marginBottom: "20px" }}>
        <h3>👨‍🎓 Student Management</h3>

        <p style={{ color: "#777" }}>
          Upload or update student accounts using Excel.
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) =>
            setStudentFile(e.target.files?.[0] || null)
          }
        />

        <button
          style={{ ...buttonStyle, marginLeft: "10px" }}
          onClick={uploadStudents}
          disabled={loading}
        >
          📤 Upload Students
        </button>
      </div>

      {/* FACULTY UPLOAD */}

      <div style={{ ...cardStyle, marginBottom: "20px" }}>
        <h3>👨‍🏫 Faculty & HOD Management</h3>

        <p style={{ color: "#777" }}>
          Upload Faculty/HOD accounts using Excel.
        </p>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) =>
            setFacultyFile(e.target.files?.[0] || null)
          }
        />

        <button
          style={{ ...buttonStyle, marginLeft: "10px" }}
          onClick={uploadFaculty}
          disabled={loading}
        >
          📤 Upload Faculty / HOD
        </button>
      </div>

      {/* MANAGE CR */}

      <div style={{ ...cardStyle, marginBottom: "20px" }}>
        <h3>⭐ Class Representatives</h3>

        <p style={{ color: "#777" }}>
          Assign or remove CRs across branches and sections.
        </p>

        <button
          style={buttonStyle}
          onClick={onOpenManageCR}
        >
          ⭐ Manage CRs
        </button>
      </div>

      {/* FACULTY TABLE */}

      <div style={cardStyle}>
        <h3>👥 Faculty & HOD Accounts</h3>

        {faculty.length === 0 ? (
          <p style={{ color: "#999" }}>
            No faculty accounts found.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse"
              }}
            >
              <thead>
                <tr>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    Faculty ID
                  </th>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    Name
                  </th>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    Branch
                  </th>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    Role
                  </th>
                  <th style={{ padding: "10px" }}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {faculty.map((f) => (
                  <tr key={f.facultyId}>
                    <td style={{ padding: "10px" }}>
                      {f.facultyId}
                    </td>

                    <td style={{ padding: "10px" }}>
                      {f.name}
                    </td>

                    <td style={{ padding: "10px" }}>
                      {f.branch}
                    </td>

                    <td style={{ padding: "10px" }}>
                      {f.role === "hod"
                        ? "HOD"
                        : "Faculty"}
                    </td>

                    <td style={{ padding: "10px" }}>
                      <button
                        style={{
                          ...buttonStyle,
                          padding: "7px 12px",
                          fontSize: "12px"
                        }}
                        onClick={() =>
                          resetFacultyPassword(
                            f.facultyId
                          )
                        }
                      >
                        🔑 Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {message && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "#fff7f3",
            border: "1px solid #F15A29",
            borderRadius: "8px"
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
export default App;