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
  { label: "Break", start: "15:10", end: "15:25", type: "break" },
  { label: "Period 6", start: "15:25", end: "16:30", type: "class" },
];

function Timetable({ isAdmin, studentSection }) {
  const [now, setNow] = useState(new Date());
  const [activeDay, setActiveDay] = useState(getTodayDay());
  const [timetable, setTimetable] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [timings, setTimings] = useState(DEFAULT_TIMINGS);
  const [scheduleInput, setScheduleInput] = useState(
    Object.fromEntries(DAYS.map(d => [d, Array(6).fill("")]))
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (studentSection) {
      fetch(`http://localhost:3001/api/timetable/${studentSection}`)
        .then(res => res.json())
        .then(data => setTimetable(data));
    }
  }, [studentSection]);

  const saveTimetable = () => {
    if (!newSection) { alert("Section enter cheyyi!"); return; }
    const token = localStorage.getItem("token");

    const classPeriods = timings.filter(t => t.type === "class");
    const fullSchedule = {};
    DAYS.forEach(day => {
      fullSchedule[day] = timings.map((t, i) => {
        if (t.type !== "class") return t.type.toUpperCase();
        const classIndex = classPeriods.indexOf(t);
        return scheduleInput[day][classIndex] || "";
      });
    });

    fetch(`http://localhost:3001/api/timetable/${newSection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ timings, schedule: fullSchedule })
    })
      .then(res => res.json())
      .then(() => {
        alert(`Section ${newSection} timetable saved! ✅`);
        setShowAdd(false);
        if (studentSection === newSection) {
          fetch(`http://localhost:3001/api/timetable/${newSection}`)
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
    padding: "8px 12px", borderRadius: "8px", border: "1px solid #7209b7",
    background: "#0f0f0f", color: "#fff", fontSize: "13px", outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div>
      {/* Admin Panel */}
      {isAdmin && (
        <div style={{ marginBottom: "24px" }}>
          <button onClick={() => setShowAdd(!showAdd)} style={{ padding: "10px 24px", background: "linear-gradient(90deg, #7209b7, #f72585)", color: "#fff", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", marginBottom: "16px" }}>
            {showAdd ? "Cancel ✕" : "➕ Add/Edit Timetable"}
          </button>

          {showAdd && (
            <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #7209b7", borderRadius: "16px", padding: "24px" }}>
              <h3 style={{ color: "#f72585", marginTop: 0 }}>📅 Add Timetable</h3>

              <input placeholder="Section (e.g. 7)" value={newSection} onChange={e => setNewSection(e.target.value)} style={{ ...inputStyle, width: "200px", marginBottom: "20px" }} />

              {/* Timings Editor */}
              <h4 style={{ color: "#4cc9f0", marginBottom: "12px" }}>⏰ Edit Timings:</h4>
              <div style={{ overflowX: "auto", marginBottom: "20px" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "#4cc9f0", padding: "8px", textAlign: "left" }}>Label</th>
                      <th style={{ color: "#4cc9f0", padding: "8px" }}>Start</th>
                      <th style={{ color: "#4cc9f0", padding: "8px" }}>End</th>
                      <th style={{ color: "#4cc9f0", padding: "8px" }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timings.map((t, i) => (
                      <tr key={i}>
                        <td style={{ padding: "4px" }}>
                          <input value={t.label} onChange={e => { const u = [...timings]; u[i] = { ...u[i], label: e.target.value }; setTimings(u); }} style={{ ...inputStyle, width: "100px" }} />
                        </td>
                        <td style={{ padding: "4px" }}>
                          <input type="time" value={t.start} onChange={e => { const u = [...timings]; u[i] = { ...u[i], start: e.target.value }; setTimings(u); }} style={{ ...inputStyle, width: "110px" }} />
                        </td>
                        <td style={{ padding: "4px" }}>
                          <input type="time" value={t.end} onChange={e => { const u = [...timings]; u[i] = { ...u[i], end: e.target.value }; setTimings(u); }} style={{ ...inputStyle, width: "110px" }} />
                        </td>
                        <td style={{ padding: "4px", color: t.type === "class" ? "#06d6a0" : t.type === "break" ? "#f72585" : "#ffd166" }}>
                          {t.type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Schedule */}
              <h4 style={{ color: "#4cc9f0", marginBottom: "12px" }}>📚 Subjects:</h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th style={{ color: "#4cc9f0", padding: "8px", textAlign: "left" }}>Day</th>
                      {["P1","P2","P3","P4","P5","P6"].map(p => (
                        <th key={p} style={{ color: "#4cc9f0", padding: "8px" }}>{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day}>
                        <td style={{ color: "#fff", padding: "4px 8px", fontWeight: "bold" }}>{day}</td>
                        {[0,1,2,3,4,5].map(i => (
                          <td key={i} style={{ padding: "4px" }}>
                            <input
                              value={scheduleInput[day][i]}
                              onChange={e => {
                                const u = { ...scheduleInput };
                                u[day] = [...u[day]];
                                u[day][i] = e.target.value;
                                setScheduleInput(u);
                              }}
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

              <button onClick={saveTimetable} style={{ marginTop: "16px", width: "100%", padding: "12px", background: "linear-gradient(90deg, #7209b7, #f72585)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>
                Save Timetable ✅
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current Class */}
      {timetable ? (
        <>
          <div style={{ background: "linear-gradient(135deg, #f72585, #7209b7)", borderRadius: "20px", padding: "24px", marginBottom: "24px", boxShadow: "0 8px 32px #f7258544" }}>
            <p style={{ margin: "0 0 4px 0", color: "#ffffffaa", fontSize: "13px" }}>🕐 {now.toLocaleTimeString()}</p>
            <h2 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "18px" }}>Section {studentSection} — {DAY_NAMES[today] || "Weekend 😴"}</h2>

            {currentPeriod && currentPeriod.type === "class" ? (
              <div>
                <p style={{ margin: "0 0 4px 0", color: "#ffffffbb", fontSize: "14px" }}>📚 Current Class</p>
                <h1 style={{ margin: "0 0 4px 0", color: "#fff", fontSize: "32px" }}>{todaySchedule[currentIndex] || "—"}</h1>
                <p style={{ margin: 0, color: "#ffffffbb", fontSize: "13px" }}>{currentPeriod.start} - {currentPeriod.end}</p>
              </div>
            ) : currentPeriod?.type === "break" ? (
              <h1 style={{ margin: 0, color: "#fff", fontSize: "28px" }}>☕ Break Time!</h1>
            ) : currentPeriod?.type === "lunch" ? (
              <h1 style={{ margin: 0, color: "#fff", fontSize: "28px" }}>🍱 Lunch Break!</h1>
            ) : (
              <h1 style={{ margin: 0, color: "#fff", fontSize: "28px" }}>No Class Now 😴</h1>
            )}

            {nextPeriod?.type === "class" && nextSubject && (
              <p style={{ margin: "12px 0 0 0", color: "#ffffffbb", fontSize: "13px" }}>
                ⏭️ Next: <strong style={{ color: "#fff" }}>{nextSubject}</strong> at {nextPeriod.start}
              </p>
            )}
          </div>

          {/* Day Tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {DAYS.map(d => (
              <button key={d} onClick={() => setActiveDay(d)} style={{ padding: "6px 16px", borderRadius: "20px", border: today === d ? "2px solid #4cc9f0" : "none", background: activeDay === d ? "linear-gradient(90deg, #f72585, #7209b7)" : "#1a1a2e", color: "#fff", cursor: "pointer", fontWeight: activeDay === d ? "bold" : "normal" }}>
                {d}
              </button>
            ))}
          </div>

          {/* Schedule List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(timetable.timings || []).map((t, i) => {
              const subject = timetable.schedule?.[activeDay]?.[i];
              const isNow = today === activeDay && currentIndex === i;

              if (t.type !== "class") return (
                <div key={i} style={{ background: "#ffffff11", borderRadius: "10px", padding: "8px 16px", textAlign: "center", color: "#888", fontSize: "13px" }}>
                  {t.type === "lunch" ? "🍱 Lunch Break" : "☕ Break"} ({t.start} - {t.end})
                </div>
              );

              return (
                <div key={i} style={{ background: isNow ? "linear-gradient(135deg, #f72585, #7209b7)" : "linear-gradient(135deg, #1a1a2e, #16213e)", border: isNow ? "none" : "1px solid #ffffff22", borderRadius: "12px", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: isNow ? "0 4px 20px #f7258544" : "none" }}>
                  <div>
                    <p style={{ margin: 0, color: isNow ? "#ffffffaa" : "#888", fontSize: "12px" }}>{t.label} • {t.start} - {t.end}</p>
                    <h3 style={{ margin: "4px 0 0 0", color: "#fff", fontSize: "16px" }}>{subject || "—"}</h3>
                  </div>
                  {isNow && <span style={{ background: "#ffffff33", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "12px" }}>NOW ✅</span>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          <p style={{ fontSize: "48px" }}>📅</p>
          <p>Section {studentSection} timetable not added yet!</p>
          {isAdmin && <p style={{ color: "#f72585" }}>Admin panel lo add cheyyi ↑</p>}
        </div>
      )}
    </div>
  );
}

export default Timetable;