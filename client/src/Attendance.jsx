import { useEffect, useState, useRef } from "react";
import { cacheData, readCachedData, getLocalPeriodAttendance, makeAttendancePeriodKey, getAllAttendanceQueue, updateAttendanceStatus, markAttendanceSynced, savePendingAttendance } from "./offlineAttendance.js";

function Attendance({ api, facultyInfo }) {
  const isHod = facultyInfo?.role === "hod";
  const sectionOptions = isHod ? [] : (facultyInfo?.assignedSections || []);

  const [section, setSection] = useState(sectionOptions[0] || "");
  const [subject, setSubject] = useState("");
  const [periodId, setPeriodId] = useState("1");
  const [periodOptions, setPeriodOptions] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      label: `Period ${i + 1}`,
      subject: "",
      type: "class"
    }))
  );
  const [date] = useState(() => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  });

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // rollNo -> "present" | "absent"
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [existingRecords, setExistingRecords] = useState([]);
  const [localPeriodRecord, setLocalPeriodRecord] = useState(null);
  const [syncStatus, setSyncStatus] = useState("");
  const syncInProgressRef = useRef(false);

  const token = localStorage.getItem("facultyToken");
// Load timetable periods for the selected date and section.
  useEffect(() => {
    if (!section || !facultyInfo?.branch) return;

    let active = true;

    const fallbackPeriods = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      label: `Period ${i + 1}`,
      subject: "",
      type: "class"
    }));

    const loadPeriods = async () => {
      try {
        const res = await fetch(
          `${api}/api/timetable/${encodeURIComponent(facultyInfo.branch)}/${encodeURIComponent(section)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("Timetable unavailable");

        const timetable = await res.json();
        const dayKey = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
          new Date(`${date}T00:00:00`).getDay()
        ];

        const subjects = timetable.schedule?.[dayKey] || [];
        const timings = timetable.timings || [];
        const count = Math.max(subjects.length, timings.length);

        const options = Array.from({ length: count }, (_, i) => {
          const timing = timings[i] || {};
          return {
            id: String(i + 1),
            label: (timing.label || `Period ${i + 1}`).replace(/-/g, "-"),
            subject: String(subjects[i] || "").trim(),
            type: String(timing.type || "class").toLowerCase()
          };
        }).filter(p =>
          p.subject &&
          p.type !== "break" &&
          p.type !== "lunch"
        );

        const next = options.length ? options : fallbackPeriods;

        if (active) {
          setPeriodOptions(next);
          setPeriodId(current =>
            next.some(p => p.id === current) ? current : next[0].id
          );
        }
      } catch {
        if (active) setPeriodOptions(fallbackPeriods);
      }
    };

    loadPeriods();

    return () => {
      active = false;
    };
  }, [section, date, api, facultyInfo?.branch, token]);

  const loadStudents = async () => {
    if (!section) { alert("Section enter cheyyi!"); return; }
    if (existingRecords.length > 0) {
      setMessage("Already marked for this hour. Attendance cannot be changed.");
      return;
    }

    setLoading(true);
    const cacheKey = `students:${facultyInfo.branch}:${section}`;

    const applyStudents = (data, offline = false) => {
      setStudents(data);
      const initial = {};
      data.forEach(s => { initial[s.rollNo] = "present"; });
      setAttendance(initial);

      if (offline) {
        setMessage(`Offline: Loaded ${data.length} cached students.`);
      } else if (data.length === 0) {
        setMessage(`Warning: Status 200 OK, but 0 students found in ${facultyInfo.branch} - Section ${section}.`);
      } else {
        setMessage(`Success: Loaded ${data.length} students. Offline cache updated.`);
      }
    };

    try {
      if (!navigator.onLine) {
        const cached = await readCachedData(cacheKey);
        if (Array.isArray(cached)) {
          applyStudents(cached, true);
        } else {
          setMessage("Offline: No cached students found. Connect to internet and load students once.");
        }
        return;
      }

      const res = await fetch(`${api}/api/students/${facultyInfo.branch}/${section}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(`Error: Status ${res.status}: ${data?.message || "Unable to load students."}`);
        return;
      }

      if (Array.isArray(data)) {
        await cacheData(cacheKey, data);
        applyStudents(data);
      } else {
        setMessage(`Error: Unexpected response: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      try {
        const cached = await readCachedData(cacheKey);
        if (Array.isArray(cached)) {
          applyStudents(cached, true);
        } else {
          setMessage(`Error: Network unavailable and no cached students found. ${err.message}`);
        }
      } catch {
        setMessage(`Error: Could not load students or access offline cache. ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadExisting = async () => {
    if (!section || !subject || !date) return;

    const batch = {
      branch: facultyInfo.branch,
      section,
      subject,
      date,
      periodId
    };

    try {
      const periodKey = makeAttendancePeriodKey(batch);
      const localRecord = await getLocalPeriodAttendance(periodKey);
      setLocalPeriodRecord(localRecord || null);

      if (localRecord?.records) {
        const localMarked = {};
        localRecord.records.forEach(r => {
          localMarked[r.rollNo] = r.status;
        });
        setAttendance(prev => ({ ...prev, ...localMarked }));
        setSyncStatus(localRecord.status || "pending");
      } else {
        setSyncStatus("");
      }

      if (!navigator.onLine) {
        setExistingRecords([]);
        return;
      }

      const res = await fetch(
        `${api}/api/attendance/section/${facultyInfo.branch}/${section}?subject=${encodeURIComponent(subject)}&date=${date}&periodId=${encodeURIComponent(periodId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setExistingRecords(data);

        if (data.length > 0) {
          const marked = {};
          data.forEach(r => { marked[r.rollNo] = r.status; });
          setAttendance(prev => ({ ...prev, ...marked }));
        }
      }
    } catch (error) {
      console.warn("Could not refresh attendance records:", error);
    }
  };
  useEffect(() => {
    if (students.length > 0) loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, date, periodId, section, students.length]);

  const syncPendingAttendance = async () => {
    if (!navigator.onLine || !token || syncInProgressRef.current) return;

    syncInProgressRef.current = true;

    const selectedPeriodKey = makeAttendancePeriodKey({
      branch: facultyInfo.branch,
      section,
      subject,
      date,
      periodId
    });

    try {
      const queue = await getAllAttendanceQueue();
      const pendingItems = queue.filter(item =>
        item.status === "pending" || item.status === "syncing"
      );

      for (const item of pendingItems) {
        const itemPeriodKey = makeAttendancePeriodKey(item);
        const isSelected = itemPeriodKey === selectedPeriodKey;

        await updateAttendanceStatus(item.syncId, "syncing");

        if (isSelected) {
          setSyncStatus("syncing");
          setLocalPeriodRecord(prev =>
            prev?.syncId === item.syncId ? { ...prev, status: "syncing" } : prev
          );
        }

        try {
          const res = await fetch(`${api}/api/attendance/mark`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              branch: item.branch,
              section: item.section,
              subject: item.subject,
              date: item.date,
              periodId: String(item.periodId),
              records: item.records
            })
          });

          const data = await res.json().catch(() => null);

          if (res.ok && data?.message?.startsWith("Attendance")) {
            await markAttendanceSynced(item.syncId, data.message);

            if (isSelected) {
              setSyncStatus("synced");
              setLocalPeriodRecord(prev =>
                prev?.syncId === item.syncId
                  ? { ...prev, status: "synced", serverMessage: data.message }
                  : prev
              );
              setMessage(`Synced: ${data.message}`);
            }
            continue;
          }

          if (res.status === 409) {
            const verifyUrl = `${api}/api/attendance/section/${encodeURIComponent(item.branch)}/${encodeURIComponent(item.section)}?subject=${encodeURIComponent(item.subject)}&date=${encodeURIComponent(item.date)}&periodId=${encodeURIComponent(item.periodId)}`;

            const verifyRes = await fetch(verifyUrl, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const serverRecords = await verifyRes.json().catch(() => null);

            const matches = verifyRes.ok &&
              Array.isArray(serverRecords) &&
              item.records.every(record =>
                serverRecords.some(serverRecord =>
                  String(serverRecord.rollNo) === String(record.rollNo) &&
                  serverRecord.status === record.status
                )
              );

            if (matches) {
              await markAttendanceSynced(item.syncId, "Matching attendance already exists on server.");

              if (isSelected) {
                setSyncStatus("synced");
                setLocalPeriodRecord(prev =>
                  prev?.syncId === item.syncId
                    ? { ...prev, status: "synced", serverMessage: "Matching attendance already exists on server." }
                    : prev
                );
                setMessage("Synced: Matching attendance already exists on the server.");
              }
            } else {
              const reason = data?.message || "Server already has different attendance for this period.";
              await updateAttendanceStatus(item.syncId, "needs-attention", { lastError: reason });

              if (isSelected) {
                setSyncStatus("needs-attention");
                setLocalPeriodRecord(prev =>
                  prev?.syncId === item.syncId
                    ? { ...prev, status: "needs-attention", lastError: reason }
                    : prev
                );
                setMessage(`Needs attention: ${reason}`);
              }
            }
            continue;
          }

          const reason = data?.message || `Server returned status ${res.status}.`;

          if (res.status === 401) {
            const loginReason = "Faculty session expired. Log in again online to sync this attendance.";
            await updateAttendanceStatus(item.syncId, "pending", { lastError: loginReason });

            if (isSelected) {
              setSyncStatus("pending");
              setLocalPeriodRecord(prev =>
                prev?.syncId === item.syncId
                  ? { ...prev, status: "pending", lastError: loginReason }
                  : prev
              );
              setMessage(loginReason);
            }
            break;
          }
          if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
            await updateAttendanceStatus(item.syncId, "needs-attention", { lastError: reason });

            if (isSelected) {
              setSyncStatus("needs-attention");
              setLocalPeriodRecord(prev =>
                prev?.syncId === item.syncId
                  ? { ...prev, status: "needs-attention", lastError: reason }
                  : prev
              );
              setMessage(`Needs attention: ${reason}`);
            }
          } else {
            await updateAttendanceStatus(item.syncId, "pending", { lastError: reason });
            if (isSelected) {
              setSyncStatus("pending");
              setMessage("Sync pending: Server temporarily unavailable. It will retry when online.");
            }
            break;
          }
        } catch (error) {
          await updateAttendanceStatus(item.syncId, "pending", { lastError: error.message });

          if (isSelected) {
            setSyncStatus("pending");
            setLocalPeriodRecord(prev =>
              prev?.syncId === item.syncId
                ? { ...prev, status: "pending", lastError: error.message }
                : prev
            );
            setMessage("Sync pending: Network error. Attendance remains saved on this device.");
          }
          break;
        }
      }
    } catch (error) {
      console.warn("Offline attendance sync could not run:", error);
    } finally {
      syncInProgressRef.current = false;
    }
  };

  useEffect(() => {
    syncPendingAttendance();
    window.addEventListener("online", syncPendingAttendance);

    return () => {
      window.removeEventListener("online", syncPendingAttendance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, token, facultyInfo?.branch, section, subject, date, periodId]);
  const toggle = (rollNo) => {
    setAttendance(prev => ({
      ...prev,
      [rollNo]: prev[rollNo] === "present" ? "absent" : "present"
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(s => { updated[s.rollNo] = status; });
    setAttendance(updated);
  };

  const submitAttendance = async () => {
    if (!subject || !date) { alert("Subject and date required!"); return; }
    if (students.length === 0) { alert("Load students first!"); return; }
    if (existingRecords.length > 0 || localPeriodRecord) {
      setMessage("Attendance for this period is already saved and locked.");
      return;
    }

    const batch = {
      branch: facultyInfo.branch,
      section,
      subject,
      date,
      periodId: String(periodId),
      records: students.map(s => ({
        rollNo: s.rollNo,
        status: attendance[s.rollNo] || "present"
      }))
    };

    const saveOffline = async () => {
      const saved = await savePendingAttendance(batch);
      setLocalPeriodRecord(saved);
      setSyncStatus(saved.status);
      setMessage(`Offline: Attendance saved locally for ${saved.records.length} students. Pending sync.`);
    };

    setLoading(true);

    try {
      if (!navigator.onLine) {
        await saveOffline();
        return;
      }

      const res = await fetch(`${api}/api/attendance/mark`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(batch)
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.message?.startsWith("Attendance")) {
        setExistingRecords(batch.records);
        setLocalPeriodRecord(null);
        setSyncStatus("");
        setMessage(`Success: ${data.message}`);
      } else {
        setMessage(`Error: ${data?.message || `Server returned status ${res.status}.`}`);
      }
    } catch (error) {
      try {
        await saveOffline();
      } catch (saveError) {
        const existingLocal = await getLocalPeriodAttendance(
          makeAttendancePeriodKey(batch)
        ).catch(() => null);

        if (existingLocal) {
          setLocalPeriodRecord(existingLocal);
          setSyncStatus(existingLocal.status);
          setMessage(`Already saved locally. Status: ${existingLocal.status}.`);
        } else {
          setMessage(`Error: Could not save attendance offline. ${saveError.message || error.message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  const inputStyle = {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1.5px solid #e0e0e0",
    fontSize: "14px",
    boxSizing: "border-box"
  };

  const presentCount = Object.values(attendance).filter(s => s === "present").length;

  return (
    <div>
      <h2 style={{ color: "#F15A29", marginBottom: "16px" }}>Mark Attendance</h2>

      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>SECTION</label>
          {isHod ? (
            <input placeholder="e.g. A" value={section} onChange={e => setSection(e.target.value.toUpperCase())} style={inputStyle} />
          ) : (
            <select value={section} onChange={e => setSection(e.target.value)} style={inputStyle}>
              {sectionOptions.length === 0 && <option value="">No sections assigned</option>}
              {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>HOUR / PERIOD</label>
          <select
            value={periodId}
            onChange={e => {
              const value = e.target.value;
              setPeriodId(value);
              const selected = periodOptions.find(p => p.id === value);
              if (selected?.subject) setSubject(selected.subject);
            }}
            style={inputStyle}
          >
            {periodOptions.map(p => (
              <option key={p.id} value={p.id}>
                {p.label}{p.subject ? ` - ${p.subject}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>SUBJECT</label>
          <input placeholder="e.g. DBMS" value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#999", fontWeight: "700", marginBottom: "4px" }}>DATE</label>
          <input type="date" value={date} disabled style={inputStyle} />
        </div>

        <button
          onClick={loadStudents}
          disabled={loading || existingRecords.length > 0 || !!localPeriodRecord}
          style={{ padding: "10px 20px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
        >
          {loading ? "Loading..." : "Load Students"}
        </button>
      </div>

      {message && (
        <p style={{ color: message.startsWith("Error:") ? "#F15A29" : message.startsWith("Warning:Â") ? "#e0a800" : "#4CAF50", fontWeight: "600", marginBottom: "16px" }}>{message}</p>
      )}

      {localPeriodRecord && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: "8px", background: "#f5f5f5", marginBottom: "14px", fontSize: "13px", color: "#333" }}>
          <strong>Offline Attendance: </strong>
          {syncStatus === "pending" ? "Pending - saved on this device; waiting for internet."
            : syncStatus === "syncing" ? "Syncing attendance to server..."
            : syncStatus === "synced" ? "Synced to server successfully."
            : syncStatus === "needs-attention" ? `Needs attention: ${localPeriodRecord.lastError || "Server rejected this attendance."}`
            : "Saved locally."}
        </div>
      )}
      {students.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <h3 style={{ margin: 0, color: "#1a1a1a" }}>
              {students.length} Students - <span style={{ color: "#4CAF50" }}>{presentCount} Present</span>, <span style={{ color: "#F15A29" }}>{students.length - presentCount} Absent</span>
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button disabled={existingRecords.length > 0 || !!localPeriodRecord} onClick={() => markAll("present")} style={{ padding: "6px 14px", background: "#e8f8ec", color: "#4CAF50", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Mark All Present</button>
              <button disabled={existingRecords.length > 0 || !!localPeriodRecord} onClick={() => markAll("absent")} style={{ padding: "6px 14px", background: "#fff0ee", color: "#F15A29", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Mark All Absent</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px", marginBottom: "20px" }}>
            {students.map(s => {
              const status = attendance[s.rollNo] || "present";
              const isPresent = status === "present";
              return (
                <div
                  key={s.rollNo}
                  onClick={() => {
                    if (existingRecords.length > 0 || localPeriodRecord) return;
                    toggle(s.rollNo);
                  }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderRadius: "8px", cursor: existingRecords.length > 0 || localPeriodRecord ? "not-allowed" : "pointer",
                    background: isPresent ? "#e8f8ec" : "#fff0ee",
                    border: `1.5px solid ${isPresent ? "#4CAF50" : "#F15A29"}`
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "13px", color: "#1a1a1a" }}>{s.name}{s.isCR ? " " : ""}</div>
                    <div style={{ fontSize: "11px", color: "#999" }}>{s.rollNo}</div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: isPresent ? "#4CAF50" : "#F15A29" }}>
                    {isPresent ? "PRESENT" : "ABSENT"}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={submitAttendance}
            disabled={loading || existingRecords.length > 0 || !!localPeriodRecord}
            style={{ width: "100%", padding: "14px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
          >
            {loading ? "Saving..." : localPeriodRecord ? (syncStatus === "synced" ? "Attendance Synced - Locked" : syncStatus === "needs-attention" ? "Needs Attention - Locked" : "Attendance Saved - Locked") : existingRecords.length > 0 ? "Already Marked - Locked" : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Attendance;











