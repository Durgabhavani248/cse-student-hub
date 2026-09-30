import React, { useEffect, useMemo, useState } from "react";

export default function CodingAnalytics({ api = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_BASE = (api || "").replace(/\/$/, "");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("studentToken");

      const response = await fetch(
        `${API_BASE}/api/lms/coding/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to load analytics");
      }

      setData(result);
    } catch (err) {
      console.error("Coding analytics error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const stats = useMemo(() => {
    if (!data) return {};

    const students = data.students || [];
    const progress = data.progress || [];
    const attempts = data.attempts || [];

    const started = new Set(
      attempts.map(a => String(a.studentId?._id || a.studentId))
    ).size;

    const completedAttempts = attempts.filter(
      a => a.completed && a.verdict === "Accepted"
    );

    const completedStudents = new Set(
      completedAttempts.map(a =>
        String(a.studentId?._id || a.studentId)
      )
    ).size;

    const totalXP = progress.reduce(
      (sum, p) => sum + (p.xp || 0),
      0
    );

    const activeStreaks = progress.filter(
      p => (p.currentStreak || 0) > 0
    ).length;

    return {
      totalStudents: students.length,
      started,
      completed: completedStudents,
      notAttempted: Math.max(students.length - started, 0),
      totalXP,
      activeStreaks
    };
  }, [data]);

  const leaderboard = useMemo(() => {
    if (!data) return [];

    return [...(data.progress || [])]
      .sort((a, b) => {
        if ((b.xp || 0) !== (a.xp || 0)) {
          return (b.xp || 0) - (a.xp || 0);
        }

        return (b.currentStreak || 0) - (a.currentStreak || 0);
      })
      .slice(0, 10);
  }, [data]);

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner}>⏳</div>
        <h3>Loading Coding Analytics...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorBox}>
          ❌ {error}
        </div>

        <button style={styles.refreshButton} onClick={loadAnalytics}>
          🔄 Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>
            💻 Coding Analytics
          </div>

          <div style={styles.subtitle}>
            {data?.scope === "all"
              ? "Admin • All Branches & Sections"
              : `HOD • ${data?.branch || "Branch"}`}
          </div>
        </div>

        <button
          style={styles.refreshButton}
          onClick={loadAnalytics}
        >
          🔄 Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div style={styles.cards}>
        <StatCard
          icon="👨‍🎓"
          title="Total Students"
          value={stats.totalStudents}
        />

        <StatCard
          icon="▶️"
          title="Challenge Started"
          value={stats.started}
        />

        <StatCard
          icon="✅"
          title="Completed"
          value={stats.completed}
        />

        <StatCard
          icon="⏳"
          title="Not Attempted"
          value={stats.notAttempted}
        />

        <StatCard
          icon="⭐"
          title="Total XP"
          value={stats.totalXP}
        />

        <StatCard
          icon="🔥"
          title="Active Streaks"
          value={stats.activeStreaks}
        />
      </div>

      {/* LEADERBOARD */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          🏆 Coding Leaderboard
        </div>

        {leaderboard.length === 0 ? (
          <div style={styles.empty}>
            No coding activity yet.
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Rank</th>
                  <th style={styles.th}>Student</th>
                  <th style={styles.th}>Roll No</th>
                  <th style={styles.th}>Branch</th>
                  <th style={styles.th}>Section</th>
                  <th style={styles.th}>XP</th>
                  <th style={styles.th}>Streak</th>
                  <th style={styles.th}>Level</th>
                  <th style={styles.th}>Badges</th>
                </tr>
              </thead>

              <tbody>
                {leaderboard.map((item, index) => {
                  const student = item.studentId || {};

                  return (
                    <tr key={item._id || index}>
                      <td style={styles.td}>
                        {index === 0
                          ? "🥇"
                          : index === 1
                          ? "🥈"
                          : index === 2
                          ? "🥉"
                          : index + 1}
                      </td>

                      <td style={styles.td}>
                        <strong>
                          {student.name || "Unknown"}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {student.rollNo || "-"}
                      </td>

                      <td style={styles.td}>
                        {student.branch || "-"}
                      </td>

                      <td style={styles.td}>
                        {student.section || "-"}
                      </td>

                      <td style={styles.td}>
                        ⭐ {item.xp || 0}
                      </td>

                      <td style={styles.td}>
                        🔥 {item.currentStreak || 0}
                      </td>

                      <td style={styles.td}>
                        Level {item.level || 1}
                      </td>

                      <td style={styles.td}>
                        {item.badges?.length || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION ACTIVITY */}
      <SectionActivity
        students={data?.students || []}
        progress={data?.progress || []}
      />
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardIcon}>{icon}</div>

      <div>
        <div style={styles.cardTitle}>{title}</div>
        <div style={styles.cardValue}>{value ?? 0}</div>
      </div>
    </div>
  );
}

function SectionActivity({ students, progress }) {
  const sectionMap = {};

  students.forEach(student => {
    const key = `${student.branch || "Unknown"}-${student.section || "Unknown"}`;

    if (!sectionMap[key]) {
      sectionMap[key] = {
        branch: student.branch || "Unknown",
        section: student.section || "Unknown",
        students: 0,
        active: 0,
        xp: 0
      };
    }

    sectionMap[key].students++;
  });

  progress.forEach(item => {
    const student = item.studentId;

    if (!student) return;

    const key = `${student.branch || "Unknown"}-${student.section || "Unknown"}`;

    if (!sectionMap[key]) {
      sectionMap[key] = {
        branch: student.branch || "Unknown",
        section: student.section || "Unknown",
        students: 0,
        active: 0,
        xp: 0
      };
    }

    sectionMap[key].active++;
    sectionMap[key].xp += item.xp || 0;
  });

  const sections = Object.values(sectionMap).sort(
    (a, b) => b.xp - a.xp
  );

  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>
        📊 Branch & Section Activity
      </div>

      {sections.length === 0 ? (
        <div style={styles.empty}>
          No section data available.
        </div>
      ) : (
        <div style={styles.sectionGrid}>
          {sections.map((section, index) => (
            <div
              key={`${section.branch}-${section.section}-${index}`}
              style={styles.sectionCard}
            >
              <div style={styles.sectionName}>
                {section.branch} • Section {section.section}
              </div>

              <div style={styles.sectionStats}>
                <span>
                  👨‍🎓 {section.students}
                </span>

                <span>
                  💻 {section.active}
                </span>

                <span>
                  ⭐ {section.xp}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f5f7fb",
    color: "#1f2937"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    gap: "15px"
  },

  title: {
    fontSize: "30px",
    fontWeight: "800"
  },

  subtitle: {
    marginTop: "6px",
    color: "#6b7280",
    fontSize: "14px"
  },

  refreshButton: {
    border: "none",
    padding: "11px 17px",
    borderRadius: "9px",
    background: "#111827",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer"
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "15px",
    marginBottom: "25px"
  },

  card: {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow: "0 4px 18px rgba(0,0,0,0.06)"
  },

  cardIcon: {
    fontSize: "28px"
  },

  cardTitle: {
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: "600"
  },

  cardValue: {
    fontSize: "25px",
    fontWeight: "800",
    marginTop: "3px"
  },

  section: {
    background: "#fff",
    borderRadius: "16px",
    padding: "22px",
    marginBottom: "25px",
    boxShadow: "0 4px 18px rgba(0,0,0,0.06)"
  },

  sectionTitle: {
    fontSize: "20px",
    fontWeight: "800",
    marginBottom: "18px"
  },

  tableWrapper: {
    overflowX: "auto"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px"
  },

  th: {
    textAlign: "left",
    padding: "13px",
    background: "#f3f4f6",
    fontSize: "13px",
    whiteSpace: "nowrap"
  },

  td: {
    padding: "13px",
    borderBottom: "1px solid #eee",
    fontSize: "14px"
  },

  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "13px"
  },

  sectionCard: {
    padding: "16px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px"
  },

  sectionName: {
    fontWeight: "750",
    marginBottom: "12px"
  },

  sectionStats: {
    display: "flex",
    justifyContent: "space-between",
    color: "#6b7280",
    fontSize: "13px"
  },

  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#6b7280"
  },

  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "15px"
  },

  center: {
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },

  spinner: {
    fontSize: "35px"
  }
};