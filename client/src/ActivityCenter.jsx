import { useEffect, useState } from "react";

export default function ActivityCenter({ api }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        setError("");

        const token =
  localStorage.getItem("token") ||
  localStorage.getItem("facultyToken");

        const response = await fetch(
          `${api}/api/activity-logs?limit=50&page=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load activities");
        }

        const data = await response.json();

        setActivities(data.logs || []);
      } catch (err) {
        console.error("Activity Center error:", err);
        setError("Unable to load recent activities.");
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [api]);

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString();
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1100px",
        margin: "0 auto"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#F15A29"
            }}
          >
            📋 Recent Activity
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#777"
            }}
          >
            Track recent actions performed by CRs, Faculty and HODs.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 14px",
            border: "none",
            borderRadius: "7px",
            background: "#F15A29",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading && (
        <p style={{ color: "#777" }}>
          Loading activities...
        </p>
      )}

      {error && (
        <p
          style={{
            color: "#c62828",
            background: "#ffebee",
            padding: "12px",
            borderRadius: "8px"
          }}
        >
          {error}
        </p>
      )}

      {!loading && !error && activities.length === 0 && (
        <div
          style={{
            padding: "30px",
            textAlign: "center",
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "12px",
            color: "#888"
          }}
        >
          No activities yet.
        </div>
      )}

      {!loading &&
        !error &&
        activities.map((activity) => (
          <div
            key={activity._id}
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderLeft: "4px solid #F15A29",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "10px",
              boxShadow: "0 2px 7px rgba(0,0,0,0.05)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap"
              }}
            >
              <strong style={{ color: "#222" }}>
                {activity.actorName}
              </strong>

              <small style={{ color: "#999" }}>
                {formatTime(activity.createdAt)}
              </small>
            </div>

            <div
              style={{
                marginTop: "6px",
                fontWeight: "600",
                color: "#F15A29"
              }}
            >
              {activity.action}
            </div>

            <div
              style={{
                marginTop: "4px",
                color: "#555"
              }}
            >
              {activity.description}
            </div>

            <div
              style={{
                marginTop: "8px",
                fontSize: "13px",
                color: "#888"
              }}
            >
              {activity.role?.toUpperCase()} •{" "}
              {activity.module}
              {activity.branch
                ? ` • ${activity.branch}`
                : ""}
              {activity.section
                ? ` • Section ${activity.section}`
                : ""}
            </div>
          </div>
        ))}
    </div>
  );
}