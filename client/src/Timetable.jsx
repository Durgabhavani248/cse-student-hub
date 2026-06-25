import { useEffect, useState } from "react";
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_NAMES = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday" };

function getTodayDay() {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date().getDay()];
}

function getCurrentPeriod(timings) {
  if (!timings) return { index: -1, period: null };
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    const [sh, sm] = t.start.split(":").map(Number);
    const [eh, em] = t.end.split(":").map(Number);
    if (current >= sh * 60 + sm && current < eh * 60 + em) return { index: i, period: t };
  }
  return { index: -1, period: null };
}

const DEFAULT_TIMINGS = [
  { label: "Period 1", start: "09:20", end: "10:10", type: "class" },
  { label: "Period 2", start: "10:10", end: "11:00", type: "class" },
  { label: "Break", start: "11:00", end: "11:10", type: "break" },
  { label: "Period 3", start: "11:10", end: "12:00", type: "class" },
  { label: "Lunch", start: "12:00", end: "13:10", type: "lunch" },
  { label: "Period 4", start: "13:10", end: "14:10", type: "class" },
  { label: "Period 5", start: "14:10", end: "15:10", type: "class" },
  { label: "Break 2", start: "15:10", end: "15:25", type: "break" },
  { label: "Period 6", start: "15:25", end: "16:30", type: "class" },
];

function Timetable({ isAdmin, studentSection, api }) {
  const [editingItem, setEditingItem] = useState(null);
  const [now, setNow] = useState(new Date());
  const [activeDay, setActiveDay] = useState(getTodayDay());
  const [timetable, setTimetable] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [timings, setTimings] = useState(DEFAULT_TIMINGS);
  const [scheduleInput, setScheduleInput] = useState(
    Object.fromEntries(DAYS.map(d => [d, Array(6).fill("")]))
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
  const section = isAdmin ? selectedSection : studentSection;

  if (section) {
    fetch(`${api}/api/timetable/${section}`)
      .then(res => res.json())
      .then(data => setTimetable(data));
  }
}, [studentSection, selectedSection, isAdmin]);
  const updateTiming = (i, field, value) => {
    const updated = [...timings];
    updated[i] = { ...updated[i], [field]: value };
    setTimings(updated);
  };

  const updateSchedule = (day, i, value) => {
    const updated = { ...scheduleInput };
    updated[day] = [...updated[day]];
    updated[day][i] = value;
    setScheduleInput(updated);
  };

  const saveTimetable = () => {
    if (!newSection) { alert("Please enter section!"); return; }
    const token = localStorage.getItem("token");

    const classPeriods = timings.filter(t => t.type === "class");
    const fullSchedule = {};
    DAYS.forEach(day => {
      fullSchedule[day] = timings.map((t) => {
        if (t.type !== "class") return t.type.toUpperCase();
        const classIndex = classPeriods.indexOf(t);
        return scheduleInput[day][classIndex] || "";
      });
    });

    fetch(`${api}/api/timetable/${newSection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ timings, schedule: fullSchedule })
    })
      .then(res => res.json())
      .then(() => {
        alert(`Section ${newSection} timetable saved!`);
        setShowAdd(false);
        if (studentSection === newSection) {
          fetch(`${api}/api/timetable/${newSection}`)
            .then(res => res.json())
            .then(data => setTimetable(data));
        }
      });
  };

  const today = getTodayDay();
  const { index: currentIndex, period: currentPeriod } = timetable
    ? getCurrentPeriod(timetable.timings)
    : { index: -1, period: null };
  const todaySchedule = timetable?.schedule?.[today] || [];
  const nextPeriod = currentIndex >= 0 && timetable ? timetable.timings[currentIndex + 1] : null;
  const nextSubject = nextPeriod && todaySchedule[currentIndex + 1];

  const inputStyle = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1.5px solid #e0e0e0",
    background: "#fff",
    color: "#1a1a1a",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: "24px" }}>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{ padding: "10px 24px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", marginBottom: "16px" }}
          >
            {showAdd ? "Cancel" : "+ Add/Edit Timetable"}
          </button>

          {showAdd && (
            <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h3 style={{ color: "#F15A29", marginTop: 0 }}>Add Timetable</h3>

              <select
  value={selectedSection}
  onChange={(e) => {
    setSelectedSection(e.target.value);
    setNewSection(e.target.value);
  }}
  style={{ ...inputStyle, width: "200px", marginBottom: "20px" }}
>
  <option value="">Select Section</option>

  {Array.from({ length: 24 }, (_, i) => (
    <option key={i + 1} value={String(i + 1)}>
      Section {i + 1}
    </option>
  ))}
</select>

              <h4 style={{ color: "#1a1a1a", marginBottom: "12px" }}>Edit Timings:</h4>
              <div style={{ overflowX: "auto", marginBottom: "20px" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "#666", padding: "8px", textAlign: "left" }}>Label</th>
                      <th style={{ color: "#666", padding: "8px" }}>Start</th>
                      <th style={{ color: "#666", padding: "8px" }}>End</th>
                      <th style={{ color: "#666", padding: "8px" }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timings.map((t, i) => (
                      <tr key={i}>
                        <td style={{ padding: "4px" }}>
                          <input
                            value={t.label}
                            onChange={e => updateTiming(i, "label", e.target.value)}
                            style={{ ...inputStyle, width: "100px" }}
                          />
                        </td>
                        <td style={{ padding: "4px" }}>
                          <input
                            type="text"
                            placeholder="09:20"
                            value={t.start}
                            onChange={e => updateTiming(i, "start", e.target.value)}
                            style={{ ...inputStyle, width: "80px" }}
                          />
                        </td>
                        <td style={{ padding: "4px" }}>
                          <input
                            type="text"
                            placeholder="10:10"
                            value={t.end}
                            onChange={e => updateTiming(i, "end", e.target.value)}
                            style={{ ...inputStyle, width: "80px" }}
                          />
                        </td>
                        <td style={{ padding: "4px", color: t.type === "class" ? "#4CAF50" : t.type === "break" ? "#F15A29" : "#FF9800" }}>
                          {t.type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 style={{ color: "#1a1a1a", marginBottom: "12px" }}>Subjects:</h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "#666", padding: "8px", textAlign: "left" }}>Day</th>
                      {["P1","P2","P3","P4","P5","P6"].map(p => (
                        <th key={p} style={{ color: "#666", padding: "8px" }}>{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day}>
                        <td style={{ color: "#1a1a1a", padding: "4px 8px", fontWeight: "600" }}>{day}</td>
                        {[0,1,2,3,4,5].map(i => (
                          <td key={i} style={{ padding: "4px" }}>
                            <input
                              value={scheduleInput[day][i]}
                              onChange={e => updateSchedule(day, i, e.target.value)}
                              style={{ ...inputStyle, width: "80px" }}
                              placeholder="Subject"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={saveTimetable}
                style={{ marginTop: "16px", width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
              >
                Save Timetable
              </button>
            </div>
          )}
        </div>
      )}

      {timetable ? (
        <>
          <div style={{ background: "linear-gradient(135deg, #F15A29, #d44a1e)", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 4px 20px rgba(241,90,41,0.3)" }}>
            <p style={{ margin: "0 0 4px 0", color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>{now.toLocaleTimeString()}</p>
            <h2 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "18px" }}>
              Section {studentSection} — {DAY_NAMES[today] || "Weekend"}
            </h2>

            {currentPeriod && currentPeriod.type === "class" ? (
              <div>
                <p style={{ margin: "0 0 4px 0", color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>Current Class</p>
                <h1 style={{ margin: "0 0 4px 0", color: "#fff", fontSize: "32px" }}>{todaySchedule[currentIndex] || "—"}</h1>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>{currentPeriod.start} - {currentPeriod.end}</p>
              </div>
            ) : currentPeriod?.type === "break" ? (
              <h1 style={{ margin: 0, color: "#fff", fontSize: "28px" }}>Break Time</h1>
            ) : currentPeriod?.type === "lunch" ? (
              <h1 style={{ margin: 0, color: "#fff", fontSize: "28px" }}>Lunch Break</h1>
            ) : (
              <h1 style={{ margin: 0, color: "#fff", fontSize: "28px" }}>No Class Now</h1>
            )}

            {nextPeriod?.type === "class" && nextSubject && (
              <p style={{ margin: "12px 0 0 0", color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>
                Next: <strong style={{ color: "#fff" }}>{nextSubject}</strong> at {nextPeriod.start}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                style={{ padding: "6px 16px", borderRadius: "8px", border: today === d ? "2px solid #F15A29" : "1px solid #e0e0e0", background: activeDay === d ? "#F15A29" : "#fff", color: activeDay === d ? "#fff" : "#666", cursor: "pointer", fontWeight: activeDay === d ? "600" : "400" }}
              >
                {d}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(timetable.timings || []).map((t, i) => {
              const subject = timetable.schedule?.[activeDay]?.[i];
              const isNow = today === activeDay && currentIndex === i;

              if (t.type !== "class") return (
                <div key={i} style={{ background: "#f5f5f5", borderRadius: "10px", padding: "8px 16px", textAlign: "center", color: "#999", fontSize: "13px" }}>
                  {t.type === "lunch" ? "Lunch Break" : "Break"} ({t.start} - {t.end})
                </div>
              );

              return (
                <div
                  key={i}
                  style={{ background: isNow ? "linear-gradient(135deg, #F15A29, #d44a1e)" : "#fff", border: isNow ? "none" : "1px solid #e0e0e0", borderRadius: "12px", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: isNow ? "0 4px 20px rgba(241,90,41,0.3)" : "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div>
                    <p style={{ margin: 0, color: isNow ? "rgba(255,255,255,0.8)" : "#999", fontSize: "12px" }}>{t.label} • {t.start} - {t.end}</p>
                    <h3 style={{ margin: "4px 0 0 0", color: isNow ? "#fff" : "#1a1a1a", fontSize: "16px" }}>{subject || "—"}</h3>
                    {isAdmin && (
  <button
    onClick={() => setEditingItem({ day: activeDay, index: i, subject })}
    style={{
      marginLeft: "10px",
      padding: "4px 10px",
      fontSize: "12px",
      borderRadius: "6px",
      border: "1px solid #F15A29",
      background: "#fff",
      color: "#F15A29",
      cursor: "pointer"
    }}
  >
    Edit
  </button>
)}
                  </div>
                  {isNow && <span style={{ background: "rgba(255,255,255,0.3)", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "12px" }}>NOW</span>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
          <p style={{ fontSize: "48px", margin: "0 0 12px 0" }}>📅</p>
          <p>Section {studentSection} timetable not added yet!</p>
          {isAdmin && <p style={{ color: "#F15A29" }}>Add it from the admin panel above</p>}
        </div>
      )}
      {editingItem && (
  <div style={{
    position: "fixed",
    top: "30%",
    left: "35%",
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    zIndex: 9999
  }}>
    <h3>Edit Subject</h3>

    <input
      value={editingItem.subject}
      onChange={(e) =>
        setEditingItem({ ...editingItem, subject: e.target.value })
      }
      style={{
        padding: "8px",
        marginBottom: "10px",
        width: "100%"
      }}
    />

    <div style={{ display: "flex", gap: "10px" }}>
      <button
     onClick={() => {
  const updated = { ...timetable };

  const day = editingItem.day;
  const index = editingItem.index;
  const subject = editingItem.subject;

  if (updated.schedule?.[day]) {
    const daySchedule = [...updated.schedule[day]];

    daySchedule[index] = subject;

    updated.schedule = {
      ...updated.schedule,
      [day]: daySchedule,
    };
  }

  setTimetable(updated);
  setEditingItem(null);
}}  
  

  
        style={{
          background: "#F15A29",
          color: "#fff",
          padding: "8px 12px",
          border: "none",
          borderRadius: "6px"
        }}
      >
        Save
      </button>

      <button
        onClick={() => setEditingItem(null)}
        style={{
          background: "#ccc",
          padding: "8px 12px",
          border: "none",
          borderRadius: "6px"
        }}
      >
        Cancel
      </button>
    </div>
  </div>
)}
    </div>
  );
}

export default Timetable;