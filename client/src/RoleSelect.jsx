import "./StudentLogin.css";

function RoleSelect({ onSelect }) {
  const roles = [
    { key: "student", label: "Student", icon: "🎓", desc: "View notes, timetable, attendance" },
    { key: "faculty", label: "Faculty", icon: "🧑‍🏫", desc: "Mark attendance, upload content" },
    { key: "hod", label: "HOD", icon: "📋", desc: "Manage branch & faculty" },
    { key: "admin", label: "Admin", icon: "⚙️", desc: "Institute-wide management" },
  ];

  return (
    <>
      <img src="/icon-192.png" alt="NRI Logo" className="login-logo" />
      <h1 className="login-title">Welcome</h1>
      <p className="login-subtitle">NRI Institute of Technology</p>
      <p className="login-subtitle" style={{ marginTop: 4 }}>Who are you?</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginTop: "20px",
          width: "100%",
        }}
      >
        {roles.map((r) => (
          <button
            key={r.key}
            onClick={() => onSelect(r.key)}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "14px",
              padding: "18px 10px",
              color: "#fff",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(241,90,41,0.25)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          >
            <div style={{ fontSize: "26px", marginBottom: "6px" }}>{r.icon}</div>
            <div style={{ fontWeight: "700", fontSize: "15px" }}>{r.label}</div>
            <div style={{ fontSize: "11px", opacity: 0.75, marginTop: "4px" }}>{r.desc}</div>
          </button>
        ))}
      </div>
    </>
  );
}

export default RoleSelect;