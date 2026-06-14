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

function Timetable({ isAdmin, studentSection, api }) {
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
      fetch(`${api}/api/timetable/${studentSection}`)
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

    fetch(`${api}/api/timetable/${newSection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ timings, schedule: fullSchedule })
    })
      .then(res => res.json())
      .then(() => {
        alert(`Section ${newSection} timetable saved! ✅`);
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
    padding: "8px 12px", borderRadius: "8px", border: "1px solid #7209b7",
    background: "#0f0f0f", color: "#fff", fontSize: "13px", outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div>
      {isAdmin && (
        <div style={{ marginBottom: "24px" }}>
          <button onClick={() => setShowAdd(!showAdd)} style={{ padding: "10px 24px", background: "linear-gradient(90deg, #7209b7, #f72585)", color: "#fff", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", marginBottom: "16px" }}>
            {showAdd ? "Cancel ✕" : "➕ Add/Edit Timetable"}
          </button>

          {showAdd && (
            <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #7209b7", borderRadius: "16px", padding: "24px" }}>
              <h3 style={{ color: "#f72585", marginTop: 0 }}>📅 Add Timetable</h3>
              <input placeholder="Section (e.g. 7)" value={newSection} onChange={e => setNewSection(e.target.value)} style={{ ...inputStyle, width: "200px", marginBottom: "20px" }} />

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
                          <input type="time"