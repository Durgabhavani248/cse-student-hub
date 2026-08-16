import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Notifications.css";
import { requestPermission, getNotificationPermissionStatus } from "./firebase";

const API = "https://cse-student-hub.onrender.com";

export default function Notifications({ studentInfo }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all, unread, low-attendance, assignments, notices
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushStatus, setPushStatus] = useState(getNotificationPermissionStatus());
  const [pushMessage, setPushMessage] = useState("");
  const [pushLoading, setPushLoading] = useState(false);
  const token = localStorage.getItem("studentToken");

  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushMessage("");
    const result = await requestPermission(API, studentInfo?.rollNo, studentInfo?.name);
    setPushLoading(false);
    setPushStatus(getNotificationPermissionStatus());
    if (result.ok) {
      setPushMessage("✅ Notifications enabled! You'll get alerts for new notes, assignments, and papers.");
    } else if (result.reason === "permission-not-granted") {
      setPushMessage("❌ Permission denied. Enable notifications for this site in your browser settings, then try again.");
    } else {
      setPushMessage(`❌ Couldn't enable notifications (${result.reason}). Try refreshing the page.`);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Load every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [studentInfo]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Fetch all notification sources
      const [
  noticesRes,
  assignmentsRes,
  notesRes,
  papersRes,
  materialsRes
] = await Promise.all([
  axios.get(`${API}/api/notices`),

  axios.get(`${API}/api/assignments`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  axios.get(`${API}/api/notes`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  axios.get(`${API}/api/papers`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  axios.get(`${API}/api/materials`, {
    headers: { Authorization: `Bearer ${token}` }
  })
]);

      let allNotifications = [];

      // Add notices as notifications
      if (noticesRes.data) {
        allNotifications = [
          ...allNotifications,
          ...noticesRes.data.map(n => ({
            id: `notice-${n._id}`,
            type: "notice",
            title: n.title,
            description: n.description,
            createdAt: n.createdAt,
            icon: "📢",
            priority: "normal"
          }))
        ];
      }

      // Add assignments as notifications
      const assignments =
  assignmentsRes.data.assignments || assignmentsRes.data || [];

allNotifications.push(
  ...assignments.map(a => ({
    id: `assignment-${a._id}`,
    type: "assignment",
    title: `New Assignment - ${a.subject}`,
    description: a.description,
    createdAt: a.createdAt,
    icon: "📝",
    priority: "high"
  }))
);

const notes =
  notesRes.data.notes || notesRes.data || [];

allNotifications.push(
  ...notes.map(note => ({
    id: `note-${note._id}`,
    type: "note",
    title: "📚 New Notes Uploaded",
    description: note.subject || note.title || "New Notes Available",
    createdAt: note.createdAt,
    icon: "📚",
    priority: "normal"
  }))
);
const papers =
  papersRes.data.papers || papersRes.data || [];

allNotifications.push(
  ...papers.map(p => ({
    id: `paper-${p._id}`,
    type: "paper",
    title: `New Question Paper`,
    description: p.subject || p.title || "Question Paper Uploaded",
    createdAt: p.createdAt,
    icon: "📄",
    priority: "normal"
  }))
);



const materials =
  materialsRes.data.materials || materialsRes.data || [];

allNotifications.push(
  ...materials.map(m => ({
    id: `material-${m._id}`,
    type: "material",
    title: `New Study Material`,
    description: m.subject || m.title || "Study Material Uploaded",
    createdAt: m.createdAt,
    icon: "📚",
    priority: "normal"
  }))
);
      

      // Sort by date (newest first)
      allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Mark as read (store in localStorage)
      const readIds = JSON.parse(localStorage.getItem("readNotifications") || "[]");
      allNotifications = allNotifications.map(n => ({
        ...n,
        isRead: readIds.includes(n.id)
      }));

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.isRead).length);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId) => {
    const readIds = JSON.parse(localStorage.getItem("readNotifications") || "[]");
    if (!readIds.includes(notificationId)) {
      readIds.push(notificationId);
      localStorage.setItem("readNotifications", JSON.stringify(readIds));
      loadNotifications();
    }
  };

  const markAllAsRead = () => {
    const notificationIds = notifications.map(n => n.id);
    localStorage.setItem("readNotifications", JSON.stringify(notificationIds));
    loadNotifications();
  };

  const clearNotifications = () => {
    if (window.confirm("Clear all notifications?")) {
      localStorage.setItem("readNotifications", JSON.stringify(notifications.map(n => n.id)));
      loadNotifications();
    }
  };

  // Filter notifications
  let displayNotifications = notifications;
  if (filter === "unread") {
    displayNotifications = notifications.filter(n => !n.isRead);
  
  }else if (filter === "assignments") {
    displayNotifications = notifications.filter(n => n.type === "assignment");
  } else if (filter === "notices") {
    displayNotifications = notifications.filter(n => n.type === "notice");
  }

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h2>🔔 Notifications</h2>
        <div className="notification-badge">{unreadCount}</div>
      </div>

      {pushStatus !== "granted" && (
        <div style={{ background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#666" }}>
            {pushStatus === "denied"
              ? "Push notifications are blocked for this site. Allow them in your browser's site settings, then tap below."
              : "Turn on push notifications to get alerts the moment new notes, assignments, or papers are added."}
          </p>
          <button
            onClick={handleEnablePush}
            disabled={pushLoading}
            style={{ padding: "8px 16px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
          >
            {pushLoading ? "Enabling..." : "🔔 Enable Push Notifications"}
          </button>
          {pushMessage && <p style={{ margin: "8px 0 0 0", fontSize: "12px", fontWeight: "600" }}>{pushMessage}</p>}
        </div>
      )}

      <div className="notification-controls">
        <div className="filter-tabs">
          <button
            className={`tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({notifications.length})
          </button>
          <button
            className={`tab ${filter === "unread" ? "active" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </button>
          
          <button
            className={`tab ${filter === "assignments" ? "active" : ""}`}
            onClick={() => setFilter("assignments")}
          >
            Assignments
          </button>
          <button
            className={`tab ${filter === "notices" ? "active" : ""}`}
            onClick={() => setFilter("notices")}
          >
            Notices
          </button>
        </div>

        <div className="notification-actions">
          {unreadCount > 0 && (
            <button className="btn-action btn-mark-all" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button className="btn-action btn-clear" onClick={clearNotifications}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {loading && <p className="loading">Loading notifications...</p>}

      {displayNotifications.length === 0 ? (
        <div className="no-notifications">
          <p>📭 No notifications</p>
        </div>
      ) : (
        <div className="notifications-list">
          {displayNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-item ${notif.type} ${!notif.isRead ? "unread" : ""} priority-${notif.priority}`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className="notification-icon">{notif.icon}</div>

              <div className="notification-content">
                <h3>{notif.title}</h3>
                <p>{notif.description}</p>
                <small className="timestamp">
                  {formatDate(notif.createdAt)}
                </small>
              </div>

              {!notif.isRead && <div className="unread-indicator"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
