import { useEffect, useMemo, useState } from "react";
import "./MentorAlerts.css";

export default function MentorAlerts({ api, facultyInfo }) {
  const token = localStorage.getItem("facultyToken");

  const mentorSections = useMemo(() => {
    const values = Array.isArray(facultyInfo?.mentorSections)
      ? facultyInfo.mentorSections
      : [];

    return [...new Set(values.map((item) =>
      typeof item === "string"
        ? item
        : item?.section || item?.sectionName || ""
    ).filter(Boolean))];
  }, [facultyInfo]);

  const [section, setSection] = useState(mentorSections[0] || "");
  const [date, setDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  });
  const [records, setRecords] = useState([]);
const sortedRecords = useMemo(
  () =>
    [...records].sort((a, b) => {
      const aSent = a.notificationStatus === "sent" ? 1 : 0;
      const bSent = b.notificationStatus === "sent" ? 1 : 0;
      return aSent - bSent;
    }),
  [records]
);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!mentorSections.includes(section) && mentorSections.length) {
      setSection(mentorSections[0]);
    }
  }, [mentorSections, section]);

  async function loadRecords() {
    if (!section || !date) {
      setRecords([]);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const branch = encodeURIComponent(facultyInfo?.branch || "");
      const selectedSection = encodeURIComponent(section);
      const selectedDate = encodeURIComponent(date);

      const response = await fetch(
        `${api}/api/mentor/section/${branch}/${selectedSection}?date=${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load mentor attendance");
      }

      setRecords(Array.isArray(data.students) ? data.students : []);
    } catch (error) {
      setRecords([]);
      setMessage(error.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [section, date]);

  function getWhatsAppUrl(record) {
    let phone = String(record.parentMobile || "").replace(/\D/g, "");

    if (phone.length === 10) {
      phone = `91${phone}`;
    }

    if (!phone) return "";

    const student = record.studentName || "Student";
    const subject = record.subject || "class";
    const messageText = [
      `Dear Parent,`,
      ``,
      `This is to inform you that ${student} (${record.rollNo}) was absent for ${subject} on ${record.date} at NRI Institute of Technology.`,
      ``,
      `ప్రియమైన తల్లిదండ్రులకు,`,
      ``,
      `మీ విద్యార్థి ${student} (${record.rollNo}), ${record.date} తేదీన ${subject} కి హాజరు కాలేదు.`,
      ``,
      `Attendance is mandatory. Regular attendance is essential for academic progress. Kindly ensure that your child attends all classes and examinations without fail.`,
      ``,
      `విద్యార్థి ప్రతి తరగతికి మరియు పరీక్షకు తప్పనిసరిగా హాజరు కావాలి. చదువులో మంచి ప్రగతి సాధించడానికి క్రమం తప్పకుండా హాజరు కావడం చాలా ముఖ్యం. దయచేసి మీ విద్యార్థి అన్ని తరగతులకు మరియు పరీక్షలకు తప్పనిసరిగా హాజరయ్యేలా చూడండి.`,
      ``,
      `Regards,`,
      `Mentor / మెంటర్`
    ].join("\n");

    return `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
  }

  async function markSent(record) {
    try {
      setMessage("");

      const response = await fetch(`${api}/api/mentor/mark-sent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rollNo: record.rollNo,
          studentName: record.studentName,
          branch: record.branch,
          section: record.section,
          subject: record.subject,
          date: record.date,
          periodId: record.periodId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update sent status");
      }

      setRecords((current) =>
        current.map((item) =>
          item.rollNo === record.rollNo &&
          item.subject === record.subject &&
          item.date === record.date &&
          item.periodId === record.periodId
            ? { ...item, notificationStatus: "sent" }
            : item
        )
      );
      setMessage("Sent status updated.");
    } catch (error) {
      setMessage(error.message || "Failed to update sent status");
    }
  }

  async function markPermission(record) {
    try {
      setMessage("");

      const response = await fetch(`${api}/api/mentor/mark-permission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rollNo: record.rollNo,
          studentName: record.studentName,
          branch: record.branch,
          section: record.section,
          date: record.date
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save permission status");
      }

      setRecords((current) =>
        current.map((item) =>
          item.rollNo === record.rollNo &&
          item.branch === record.branch &&
          item.section === record.section &&
          item.date === record.date
            ? { ...item, permissionTaken: true }
            : item
        )
      );

      setMessage("Permission status saved.");
    } catch (error) {
      setMessage(error.message || "Failed to save permission status");
    }
  }
  return (
    <section className="mentor-alerts">
      <h2>Mentor Parent Alerts</h2>
      <p>Open WhatsApp, send the message manually, then mark it as sent here.</p>

      {mentorSections.length === 0 ? (
        <p>No mentor sections are assigned to this faculty account.</p>
      ) : (
        <>
          <div className="mentor-alerts-filters">
            <label>
              Section
              <select value={section} onChange={(event) => setSection(event.target.value)}>
                {mentorSections.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <button type="button" onClick={loadRecords}>Refresh</button>
          </div>

          {message && <p role="status">{message}</p>}
          {loading ? (
            <p>Loading attendance records…</p>
          ) : records.length === 0 ? (
            <p>No absent students found for this section and date.</p>
          ) : (
            <div className="mentor-alerts-list">
              {sortedRecords.map((record, index) => {
                const key = [
                  record.rollNo,
                  record.subject,
                  record.date,
                  record.periodId || "historical",
                  index
                ].join("|");
                const isSent = record.notificationStatus === "sent";
                const isPermissionTaken = record.permissionTaken === true;
                const whatsappUrl = isPermissionTaken ? "" : getWhatsAppUrl(record);

                return (
                  <article className="mentor-alert-card" key={key}>
                    <h3>{record.studentName || "Student"} ({record.rollNo})</h3>
                    <p>
                      {record.branch} · Section {record.section} · {record.subject} · {record.date}
                    </p>
                    <p>
                      Parent mobile: {record.parentMobile || "Not available"}
                    </p>
                    {record.hasPriorAbsence && (
                      <p>
                        Previous absences: {record.priorAbsences?.length || 0}
                      </p>
                    )}
                    <p>Status: {isPermissionTaken ? "Permission Taken" : isSent ? "Sent" : "Not sent"}</p>

                    {isPermissionTaken ? (
                      <p>Permission already taken. Parent message is not required.</p>
                    ) : whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open WhatsApp
                      </a>
                    ) : (
                      <p>Parent mobile number is missing.</p>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <button
                        type="button"
                        disabled={isSent || isPermissionTaken}
                        onClick={() => markSent(record)}
                      >
                        {isSent ? "Marked Sent" : isPermissionTaken ? "Permission Taken" : "Mark Sent"}
                      </button>

                      <button
                        type="button"
                        disabled={isSent || isPermissionTaken}
                        onClick={() => markPermission(record)}
                      >
                        {isPermissionTaken ? "Permission Taken" : "Permission"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}



