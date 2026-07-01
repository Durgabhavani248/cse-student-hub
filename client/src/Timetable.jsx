import { useEffect, useState } from "react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_MAP = {
  Monday: "MON",
  Tuesday: "TUE",
  Wednesday: "WED",
  Thursday: "THU",
  Friday: "FRI",
  Saturday: "SAT",
};

const SUBJECTS = [
  "ADS",
  "AI",
  "LMS",
  "P&S",
  "QP",
  "ENG",
  "BED",
  "ADS LAB",
  "BED LAB",
  "EXAM",
];

function Timetable({ isAdmin, studentSection, api }) {
  const [mode, setMode] = useState(isAdmin ? "select" : "view");

  const [selectedSection, setSelectedSection] = useState("");

  const [timetable, setTimetable] = useState(null);

  const [editedSchedule, setEditedSchedule] = useState({});

  const [editing, setEditing] = useState(false);

  const [activeDay, setActiveDay] = useState("Monday");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const section = isAdmin ? selectedSection : studentSection;

    if (!section) {
      setTimetable(null);
      return;
    }

    loadTimetable(section);

  }, [selectedSection, studentSection]);

  const loadTimetable = async (section) => {
    try {

      setLoading(true);
      setError("");

      const res = await fetch(
        `${api}/api/timetable/${section}`
      );

      if (!res.ok)
        throw new Error("Unable to load timetable");

      const data = await res.json();

      console.log(data);

      setTimetable(data);

      setEditedSchedule(data.schedule);

      setMode("view");

    } catch (err) {

      console.log(err);

      setError("No timetable found.");

      setTimetable(null);

    } finally {

      setLoading(false);

    }
  };

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value);
  };

  const updateSubject = (index, value) => {

    const key = DAY_MAP[activeDay];

    setEditedSchedule((prev) => ({
      ...prev,

      [key]: prev[key].map((item, i) =>
        i === index ? value : item
      ),
    }));
  };

  const cancelEdit = () => {
    setEditedSchedule(timetable.schedule);
    setEditing(false);
  };

  const saveTimetable = async () => {
    try {

      const section = isAdmin
        ? selectedSection
        : studentSection;

      const res = await fetch(
        `${api}/api/timetable`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization:
              "Bearer " +
              localStorage.getItem("token"),
          },

          body: JSON.stringify({
            section,
            timings: timetable.timings,
            schedule: editedSchedule,
          }),
        }
      );

      if (!res.ok)
        throw new Error();

      alert("Timetable Updated Successfully");

      setTimetable({
        ...timetable,
        schedule: editedSchedule,
      });

      setEditing(false);

    } catch {

      alert("Failed to update timetable.");

    }
  };

  if (isAdmin && mode === "select") {
    return (
      <div
        style={{
          padding: 30,
          background:
            "linear-gradient(135deg,#fff5f0,#fff)",
          borderRadius: 12,
        }}
      >
        <h2
          style={{
            color: "#F15A29",
            marginBottom: 20,
          }}
        >
          Select Section
        </h2>

        <select
          value={selectedSection}
          onChange={handleSectionChange}
          style={{
            padding: 12,
            width: 220,
            borderRadius: 8,
          }}
        >
          <option value="">
            -- Select Section --
          </option>

          {Array.from(
            { length: 24 },
            (_, i) => (
              <option
                key={i}
                value={String(i + 1)}
              >
                Section {i + 1}
              </option>
            )
          )}
        </select>
      </div>
    );
  }

  if (loading)
    return (
      <div style={{ padding: 40 }}>
        Loading timetable...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          padding: 30,
          color: "red",
        }}
      >
        {error}
      </div>
    );

  if (!timetable)
    return (
      <div style={{ padding: 40 }}>
        No Timetable Available
      </div>
    );

  const dayKey = DAY_MAP[activeDay];

  const daySchedule = editing
    ? editedSchedule[dayKey] || []
    : timetable.schedule[dayKey] || [];

  const timings = timetable.timings || [];
    return (
    <div
      style={{
        background: "linear-gradient(135deg,#fff5f0,#fff)",
        borderRadius: "12px",
        padding: "30px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            color: "#F15A29",
            margin: 0,
          }}
        >
          Section {isAdmin ? selectedSection : studentSection}
        </h2>

        {!editing && isAdmin && (
          <button
            onClick={() => setEditing(true)}
            style={{
              background: "#F15A29",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ✏️ Edit Timetable
          </button>
        )}
      </div>

      {/* DAY BUTTONS */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "25px",
        }}
      >
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            style={{
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              padding: "10px 18px",
              background:
                activeDay === day
                  ? "#F15A29"
                  : "#ececec",
              color:
                activeDay === day
                  ? "#fff"
                  : "#333",
              fontWeight:
                activeDay === day
                  ? "600"
                  : "500",
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* TIMETABLE CARD */}

       <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow:
            "0 2px 8px rgba(0,0,0,.08)",
        }}
      >
              {daySchedule.length > 0 ? (
          daySchedule.map((subject, index) => {
            const timing = timings[index] || {};

            const isBreak =
              timing.type === "break" ||
              timing.type === "lunch";

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderBottom:
                    index !== daySchedule.length - 1
                      ? "1px solid #eee"
                      : "none",
                  background: isBreak
                    ? "#fafafa"
                    : "#fff",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#F15A29",
                      fontWeight: "700",
                      fontSize: "13px",
                    }}
                  >
                    {timing.label}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {timing.start} - {timing.end}
                  </div>
                </div>

                <div>
                  {editing && !isBreak ? (
                    <select
                      value={subject}
                      onChange={(e) =>
                        updateSubject(
                          index,
                          e.target.value
                        )
                      }
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        minWidth: "140px",
                      }}
                    >
                      {SUBJECTS.map((sub) => (
                        <option
                          key={sub}
                          value={sub}
                        >
                          {sub}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <h4
                      style={{
                        margin: 0,
                        color: isBreak
                          ? "#888"
                          : "#333",
                        fontWeight: "600",
                      }}
                    >
                      {isBreak
                        ? timing.type === "lunch"
                          ? "🍽️ Lunch"
                          : "☕ Break"
                        : subject}
                    </h4>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#999",
            }}
          >
            No Classes Available
          </div>
        )}
      </div>
            {/* Bottom Buttons */}

      {editing ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginTop: "25px",
          }}
        >
          <button
            onClick={cancelEdit}
            style={{
              padding: "12px 22px",
              border: "none",
              borderRadius: "8px",
              background: "#888",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Cancel
          </button>

          <button
            onClick={saveTimetable}
            style={{
              padding: "12px 22px",
              border: "none",
              borderRadius: "8px",
              background: "#F15A29",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            💾 Save Changes
          </button>
        </div>
      ) : (
        isAdmin && (
          <div
            style={{
              textAlign: "center",
              marginTop: "25px",
            }}
          >
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: "12px 24px",
                border: "none",
                borderRadius: "8px",
                background: "#F15A29",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              ✏️ Edit Timetable
            </button>
          </div>
        )
      )}
    </div>
  );
}

export default Timetable;