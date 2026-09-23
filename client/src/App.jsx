import { useState, useEffect, useRef } from "react";
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
const thStyle = {
  padding: "12px 10px",
  textAlign: "left",
  color: "#999",
  fontSize: "13px",
  fontWeight: "600"
};

const tdStyle = {
  padding: "12px 10px",
  fontSize: "14px",
  color: "#333"
};
function AdminPanel({ api, onOpenManageCR }) {
  const [stats, setStats] = useState(null);

  const [studentFile, setStudentFile] = useState(null);
  const [facultyFile, setFacultyFile] = useState(null);

  const [studentMessage, setStudentMessage] = useState("");
  const [facultyMessage, setFacultyMessage] = useState("");

  const [facultyList, setFacultyList] = useState([]);
  const studentFileInputRef = useRef(null);
const facultyFileInputRef = useRef(null);

  const token = localStorage.getItem("token");

  const authHeaders = {
    Authorization: `Bearer ${token}`
  };

  // =========================
  // LOAD ADMIN DATA
  // =========================

  const fetchAdminData = async () => {
    try {
      const [statsRes, facultyRes] = await Promise.all([
        fetch(`${api}/api/admin/stats`, {
          headers: authHeaders
        }),

        fetch(`${api}/api/faculty`, {
          headers: authHeaders
        })
      ]);

      const statsData = await statsRes.json();
      const facultyData = await facultyRes.json();

      if (statsRes.ok) {
        setStats(statsData);
      } else {
        console.error("Stats error:", statsData);
      }

      if (facultyRes.ok) {
        setFacultyList(
          Array.isArray(facultyData)
            ? facultyData
            : []
        );
      } else {
        console.error("Faculty list error:", facultyData);
      }

    } catch (error) {
      console.error("Admin data error:", error);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // =========================
  // UPLOAD STUDENTS
  // =========================

  const uploadStudents = async () => {
  if (!studentFile) {
    alert("Please select Students Excel file!");
    return;
  }

  setStudentMessage("Uploading...");

  try {
    const formData = new FormData();

    // Backend expects req.files.file
    formData.append("file", studentFile);

    const response = await fetch(
      `${api}/api/admin/upload-students`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setStudentMessage(
        `❌ ${data.message || "Upload failed"}`
      );
      return;
    }

    setStudentMessage(
      data.message || "Students uploaded successfully!"
    );

    // Clear selected file after successful upload
    setStudentFile(null);

    if (studentFileInputRef.current) {
      studentFileInputRef.current.value = "";
    }

    // Refresh admin data
    await fetchAdminData();

  } catch (error) {
    console.error("Student upload error:", error);
    setStudentMessage("❌ Server error during upload");
  }
};

  // =========================
  // UPLOAD FACULTY / HOD
  // =========================
const uploadFaculty = async () => {
  if (!facultyFile) {
    alert("Please select Faculty/HOD Excel file!");
    return;
  }

  setFacultyMessage("Uploading...");

  try {
    const formData = new FormData();

    // Backend expects req.files.file
    formData.append("file", facultyFile);

    const response = await fetch(
      `${api}/api/admin/upload-faculty`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setFacultyMessage(
        `❌ ${data.message || "Upload failed"}`
      );
      return;
    }

    setFacultyMessage(
      data.message || "Faculty uploaded successfully!"
    );

    if (data.skippedReasons?.length) {
      console.log(
        "Skipped faculty rows:",
        data.skippedReasons
      );
    }

    // Clear selected file after successful upload
    setFacultyFile(null);

    if (facultyFileInputRef.current) {
      facultyFileInputRef.current.value = "";
    }

    // Refresh faculty list + stats
    await fetchAdminData();

  } catch (error) {
    console.error("Faculty upload error:", error);
    setFacultyMessage("❌ Server error during upload");
  }
};

  // =========================
  // RESET FACULTY PASSWORD
  // =========================

  const resetFacultyPassword = async (facultyId) => {
    const confirmReset = window.confirm(
      `Reset password for ${facultyId}?`
    );

    if (!confirmReset) return;

    try {
      const response = await fetch(
        `${api}/api/admin/reset-faculty-password/${encodeURIComponent(
          facultyId
        )}`,
        {
          method: "POST",
          headers: authHeaders
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          `❌ ${data.message || "Password reset failed"}`
        );
        return;
      }

      alert(
        data.message ||
        "Faculty password reset successfully!"
      );

    } catch (error) {
      console.error("Reset password error:", error);
      alert("❌ Server error");
    }
  };

  // =========================
  // STAT CARD
  // =========================

  const statCard = (label, value, color) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        padding: "20px 24px",
        flex: 1,
        minWidth: "180px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#999",
          fontSize: "13px"
        }}
      >
        {label}
      </p>

      <h2
        style={{
          margin: "5px 0 0",
          color: color || "#1a1a1a",
          fontSize: "30px",
          fontWeight: "700"
        }}
      >
        {value ?? 0}
      </h2>
    </div>
  );

  // =========================
  // GROUP BRANCH + SECTION
  // =========================

  const branchGroups = {};

  (stats?.sectionCounts || []).forEach((item) => {
    const branch = item.branch || "UNKNOWN";

    if (!branchGroups[branch]) {
      branchGroups[branch] = [];
    }

    branchGroups[branch].push({
      section: item.section,
      count: item.count
    });
  });

  return (
    <div>

      {/* ================= OVERVIEW ================= */}

      {stats && (
        <>
          <h3
            style={{
              color: "#1a1a1a",
              marginBottom: "12px"
            }}
          >
            Overview
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "12px"
            }}
          >
            {statCard(
              "Total Students",
              stats.totalStudents,
              "#F15A29"
            )}

            {statCard(
              "Logged In (Ever)",
              stats.everLoggedIn,
              "#2196F3"
            )}

            {statCard(
              "Active Today",
              stats.activeToday,
              "#4CAF50"
            )}

            {statCard(
              "Active This Week",
              stats.activeThisWeek,
              "#9C27B0"
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px"
            }}
          >
            {statCard(
              "Notices",
              stats.totalNotices
            )}

            {statCard(
              "Notes",
              stats.totalNotes
            )}

            {statCard(
              "Assignments",
              stats.totalAssignments
            )}

            {statCard(
              "Papers",
              stats.totalPapers
            )}

            {statCard(
              "Study Materials",
              stats.totalMaterials
            )}
          </div>

          {/* ================= BRANCH + SECTION ================= */}

          <div
            style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}
          >
            <h3
              style={{
                margin: "0 0 18px",
                color: "#1a1a1a"
              }}
            >
              Students by Branch & Section
            </h3>

            {Object.keys(branchGroups).length === 0 ? (
              <p style={{ color: "#999" }}>
                No student data available.
              </p>
            ) : (
              Object.entries(branchGroups).map(
                ([branch, sections]) => (
                  <div
                    key={branch}
                    style={{
                      marginBottom: "18px"
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 8px",
                        color: "#2196F3",
                        fontSize: "15px"
                      }}
                    >
                      {branch}
                    </h4>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px"
                      }}
                    >
                      {sections.map((s) => (
                        <span
                          key={`${branch}-${s.section}`}
                          style={{
                            background: "#fff0ee",
                            color: "#F15A29",
                            padding: "8px 16px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: "600"
                          }}
                        >
                          Sec {s.section}: {s.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </>
      )}

      {/* ================= UPLOAD CARDS ================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "24px",
          marginBottom: "24px"
        }}
      >


       {/* FACULTY / HOD */}

<div
  style={{
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "28px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
  }}
>
  <h3
    style={{
      color: "#F15A29",
      marginTop: 0,
      fontSize: "20px"
    }}
  >
    Upload Faculty / HOD Excel
  </h3>

  <p
    style={{
      color: "#666",
      fontSize: "14px",
      lineHeight: "1.5",
      marginBottom: "4px"
    }}
  >
    Excel format:{" "}
    <strong>
      facultyId, name, branch, role, sections
    </strong>
  </p>

  <p
    style={{
      color: "#999",
      fontSize: "14px",
      marginTop: 0
    }}
  >
    role = faculty / hod (default faculty) | sections = comma-separated, e.g. "A,B" (ignored for hod)
  </p>

  <p
    style={{
      color: "#999",
      fontSize: "14px",
      marginTop: 0
    }}
  >
    Default password for everyone:{" "}
    <strong>nri@2024</strong>{" "}
    (forced change on first login)
  </p>

  <input
    ref={facultyFileInputRef}
    type="file"
    accept=".xlsx,.xls"
    onChange={(e) =>
      setFacultyFile(
        e.target.files?.[0] || null
      )
    }
    style={{
      margin: "10px 0 16px"
    }}
  />

  <button
    onClick={uploadFaculty}
    style={{
      width: "100%",
      padding: "12px",
      background: "#F15A29",
      color: "#fff",
      border: "none",
      borderRadius: "10px",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer"
    }}
  >
    Upload Faculty
  </button>

  {facultyMessage && (
    <p
      style={{
        color: facultyMessage.startsWith("❌")
          ? "#d32f2f"
          : "#4CAF50",
        marginTop: "12px",
        fontWeight: "600"
      }}
    >
      {facultyMessage}
    </p>
  )}
</div>
</div>

      {/* ================= MANAGE CR ================= */}

      <div
        style={{
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          padding: "22px",
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: "#1a1a1a"
          }}
        >
          ⭐ Class Representatives
        </h3>

        <p style={{ color: "#777" }}>
          Assign or remove CRs across branches and sections.
        </p>

        <button
          onClick={onOpenManageCR}
          style={{
            background: "#F15A29",
            color: "#fff",
            border: "none",
            padding: "11px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          ⭐ Manage CRs
        </button>
      </div>

      {/* ================= FACULTY TABLE ================= */}

      <div
        style={{
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: "#1a1a1a"
          }}
        >
          Faculty & HOD Accounts ({facultyList.length})
        </h3>

        {facultyList.length === 0 ? (
          <p style={{ color: "#999" }}>
            No Faculty/HOD accounts found.
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
                <tr
                  style={{
                    borderBottom: "1px solid #ddd"
                  }}
                >
                  <th style={thStyle}>Faculty ID</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Branch</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Sections</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {facultyList.map((faculty) => (
                  <tr
                    key={faculty.facultyId}
                    style={{
                      borderBottom:
                        "1px solid #eee"
                    }}
                  >
                    <td style={tdStyle}>
                      <strong>
                        {faculty.facultyId}
                      </strong>
                    </td>

                    <td style={tdStyle}>
                      {faculty.name}
                    </td>

                    <td style={tdStyle}>
                      {faculty.branch}
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          background:
                            faculty.role === "hod"
                              ? "#fff0ee"
                              : "#eef6ff",
                          color:
                            faculty.role === "hod"
                              ? "#F15A29"
                              : "#2196F3",
                          padding: "6px 12px",
                          borderRadius: "15px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        {faculty.role === "hod"
                          ? "HOD"
                          : "FACULTY"}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      {faculty.role === "hod"
                        ? "All"
                        : (
                          faculty.assignedSections || []
                        ).join(", ") || "-"}
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() =>
                          resetFacultyPassword(
                            faculty.facultyId
                          )
                        }
                        style={{
                          background: "#fff",
                          color: "#F15A29",
                          border:
                            "1px solid #F15A29",
                          padding: "7px 14px",
                          borderRadius: "7px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "12px"
                        }}
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
export default App;