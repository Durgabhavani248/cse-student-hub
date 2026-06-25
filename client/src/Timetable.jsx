import { useEffect, useState } from "react";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

const DAY_NAMES = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

function getTodayDay() {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date().getDay()];
}

function Timetable({ isAdmin, studentSection, api }) {
  const [mode, setMode] = useState("select");
  const [selectedSection, setSelectedSection] = useState("");
  const [timetable, setTimetable] = useState(null);
  const [activeDay, setActiveDay] = useState(getTodayDay());
  const [editing, setEditing] = useState(null);

  // fetch timetable
  useEffect(() => {
    const section = isAdmin ? selectedSection : studentSection;

    if (!section) return;

    fetch(`${api}/api/timetable/${section}`)
      .then((res) => res.json())
      .then((data) => {
        setTimetable(data);
        setMode("view");
      });
  }, [selectedSection, studentSection, isAdmin]);

  const containerStyle = {
    fontFamily: "Arial",
    padding: "20px",
    background: "#f6f7fb",
    minHeight: "100vh",
  };

  const card = {
    background: "#fff",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "10px",
    border: "1px solid #eee",
  };

  const header = {
    background: "linear-gradient(135deg,#F15A29,#d94b1f)",
    padding: "16px",
    borderRadius: "12px",
    color: "#fff",
    marginBottom: "15px",
  };

  const selectSection = (
    <div style={{ maxWidth: "300px", margin: "0 auto" }}>
      <h2>Select Section</h2>

      <select
        style={{ width: "100%", padding: "10px" }}
        value={selectedSection}
        onChange={(e) => setSelectedSection(e.target.value)}
      >
        <option value="">Select</option>
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={String(i + 1)}>
            Section {i + 1}
          </option>
        ))}
      </select>
    </div>
  );

  if (mode === "select") {
    return <div style={containerStyle}>{selectSection}</div>;
  }

  if (!timetable) {
    return (
      <div style={containerStyle}>
        <h3>No timetable found</h3>
      </div>
    );
  }

  const schedule = timetable.schedule?.[activeDay] || [];
  const timings = timetable.timings || [];

  const updateSubject = (index, value) => {
    const updated = { ...timetable };
    updated.schedule[activeDay][index] = value;
    setTimetable(updated);
  };

  return (
    <div style={containerStyle}>
      {/* HEADER */}
      <div style={header}>
        <h2 style={{ margin: 0 }}>
          Section {isAdmin ? selectedSection : studentSection}
        </h2>

        {isAdmin && (
          <button
            onClick={() => setMode("select")}
            style={{
              marginTop: "10px",
              padding: "6px 10px",
              background: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              color: "#F15A29",
              fontWeight: "bold",
            }}
          >
            Change Section
          </button>
        )}
      </div>

      {/* DAY BUTTONS */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #ddd",
              background: activeDay === d ? "#F15A29" : "#fff",
              color: activeDay === d ? "#fff" : "#333",
              cursor: "pointer",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* TIMETABLE */}
      <div>
        {timings.map((t, i) => {
          const subject = schedule[i];

          return (
            <div key={i} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <b>{t.label}</b>
                  <div style={{ fontSize: "12px", color: "#777" }}>
                    {t.start} - {t.end}
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() =>
                      setEditing({ index: i, value: subject || "" })
                    }
                    style={{
                      border: "1px solid #F15A29",
                      background: "#fff",
                      color: "#F15A29",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              <h3 style={{ marginTop: "8px" }}>{subject || "-"}</h3>
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div
          style={{
            position: "fixed",
            top: "30%",
            left: "30%",
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          }}
        >
          <h3>Edit Subject</h3>

          <input
            value={editing.value}
            onChange={(e) =>
              setEditing({ ...editing, value: e.target.value })
            }
            style={{ padding: "8px", width: "100%" }}
          />

          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => {
                updateSubject(editing.index, editing.value);
                setEditing(null);
              }}
              style={{
                background: "#F15A29",
                color: "#fff",
                border: "none",
                padding: "6px 10px",
                marginRight: "8px",
              }}
            >
              Save
            </button>

            <button
              onClick={() => setEditing(null)}
              style={{
                background: "#ccc",
                border: "none",
                padding: "6px 10px",
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