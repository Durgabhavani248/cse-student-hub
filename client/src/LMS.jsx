import { useEffect, useMemo, useRef, useState } from "react";

const ORANGE = "#F15A29";
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken(isAdmin, facultyInfo, studentInfo) {
  if (isAdmin) return localStorage.getItem("token");

  if (facultyInfo) {
    return localStorage.getItem("facultyToken");
  }

  if (studentInfo) {
    return localStorage.getItem("studentToken");
  }

  return null;
}

function getRole(isAdmin, facultyInfo, studentInfo) {
  if (isAdmin) return "admin";
  if (facultyInfo?.role) return facultyInfo.role;
  if (studentInfo) return "student";
  return "";
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatTimeLeft(milliseconds) {
  if (milliseconds <= 0) return "00:00";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function emptyQuestion() {
  return {
    question: "",
    type: "mcq",
    options: ["", "", "", ""],
    correctAnswer: "",
    marks: 1,
    negativeMarks: 0
  };
}

function emptySection() {
  return {
    section: "",
    startAt: "",
    endAt: ""
  };
}

export default function LMS({
  api = API,
  isAdmin = false,
  facultyInfo = null,
  studentInfo = null
}) {
  const role = getRole(isAdmin, facultyInfo, studentInfo);
  const token = getToken(isAdmin, facultyInfo, studentInfo);

  const isStudent = role === "student";
  const canManage = ["admin", "hod", "faculty"].includes(role);

  const [activeTab, setActiveTab] = useState("exams");
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [branch, setBranch] = useState(
    facultyInfo?.branch || studentInfo?.branch || ""
  );
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [sections, setSections] = useState([emptySection()]);
  const [questions, setQuestions] = useState([emptyQuestion()]);

  const [activeAttempt, setActiveAttempt] = useState(null);
  const [activeExam, setActiveExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  const [result, setResult] = useState(null);
  const [resultsExam, setResultsExam] = useState(null);
  const [results, setResults] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  const examActiveRef = useRef(false);
  const tabSwitchInProgressRef = useRef(false);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }),
    [token]
  );

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const showError = (text) => {
    setMessage("");
    setError(text);
  };

  const showMessage = (text) => {
    setError("");
    setMessage(text);
  };

  // =========================================================
  // LOAD EXAMS
  // =========================================================

  const loadExams = async () => {
    if (!token) return;

    try {
      setLoading(true);
      clearMessages();

      const response = await fetch(`${api}/api/lms/exams`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load exams");
      }

      setExams(Array.isArray(data.exams) ? data.exams : []);
    } catch (err) {
      console.error("LMS load exams error:", err);
      showError(err.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [token]);

  // =========================================================
  // CREATE EXAM
  // =========================================================

  const updateSection = (index, field, value) => {
    setSections((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  };

  const updateQuestionOption = (questionIndex, optionIndex, value) => {
    setQuestions((prev) =>
      prev.map((item, i) => {
        if (i !== questionIndex) return item;

        const options = [...item.options];
        options[optionIndex] = value;

        return {
          ...item,
          options
        };
      })
    );
  };

  const addSection = () => {
    setSections((prev) => [...prev, emptySection()]);
  };

  const removeSection = (index) => {
    if (sections.length === 1) return;

    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) return;

    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const createExam = async (event) => {
    event.preventDefault();
    clearMessages();

    if (!title.trim() || !subject.trim() || !branch.trim()) {
      showError("Title, subject and branch are required.");
      return;
    }

    const cleanedSections = sections.map((item) => ({
      section: item.section.trim(),
      startAt: item.startAt
        ? new Date(item.startAt).toISOString()
        : "",
      endAt: item.endAt
        ? new Date(item.endAt).toISOString()
        : ""
    }));

    if (
      cleanedSections.some(
        (item) => !item.section || !item.startAt || !item.endAt
      )
    ) {
      showError("Please complete every section schedule.");
      return;
    }

    const cleanedQuestions = questions.map((item) => {
      const cleanOptions =
        item.type === "mcq"
          ? item.options.map((option) => option.trim()).filter(Boolean)
          : ["True", "False"];

      return {
        question: item.question.trim(),
        type: item.type,
        options: cleanOptions,
        correctAnswer:
          item.type === "true-false"
            ? item.correctAnswer || "True"
            : item.correctAnswer,
        marks: Number(item.marks) || 0,
        negativeMarks: Number(item.negativeMarks) || 0
      };
    });

    if (
      cleanedQuestions.some(
        (item) =>
          !item.question ||
          !item.correctAnswer ||
          item.marks <= 0
      )
    ) {
      showError(
        "Please complete every question, correct answer and marks."
      );
      return;
    }

    if (
      cleanedQuestions.some(
        (item) =>
          item.type === "mcq" &&
          item.options.length < 2
      )
    ) {
      showError("Every MCQ needs at least two options.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${api}/api/lms/exams`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          branch: branch.trim(),
          sections: cleanedSections,
          durationMinutes: Number(durationMinutes),
          questions: cleanedQuestions
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create exam");
      }

      showMessage("Exam created successfully as Draft.");

      setTitle("");
      setSubject("");
      setDescription("");
      setInstructions("");
      setDurationMinutes(30);
      setSections([emptySection()]);
      setQuestions([emptyQuestion()]);
      setShowCreate(false);

      await loadExams();
    } catch (err) {
      console.error("Create exam error:", err);
      showError(err.message || "Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // PUBLISH
  // =========================================================

  const publishExam = async (examId) => {
    const confirmed = window.confirm(
      "Publish this exam? Students will be able to see it according to their section schedule."
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      clearMessages();

      const response = await fetch(
        `${api}/api/lms/exams/${examId}/publish`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to publish exam");
      }

      showMessage("Exam published successfully.");
      await loadExams();
    } catch (err) {
      console.error("Publish exam error:", err);
      showError(err.message || "Failed to publish exam");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // START EXAM
  // =========================================================

  const startExam = async (exam) => {
    clearMessages();

    try {
      setLoading(true);

      const response = await fetch(
        `${api}/api/lms/exams/${exam._id}/start`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to start exam");
      }

      setActiveExam(data.exam);
      setActiveAttempt(data.attempt);

      const initialAnswers = {};

      (data.attempt?.answers || []).forEach((item) => {
        initialAnswers[String(item.questionId)] = item.answer || "";
      });

      setAnswers(initialAnswers);

      examActiveRef.current = true;

      setActiveTab("attempt");
      showMessage(data.message || "Exam started.");
    } catch (err) {
      console.error("Start exam error:", err);
      showError(err.message || "Unable to start exam");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // TIMER
  // =========================================================

  useEffect(() => {
    if (!activeAttempt || !activeExam) {
      setTimeLeft(null);
      return;
    }

    const calculate = () => {
      const startedAt = new Date(activeAttempt.startedAt).getTime();
      const durationEnd =
        startedAt + Number(activeExam.durationMinutes) * 60 * 1000;

      const examEnd = new Date(activeExam.examEndAt).getTime();

      const finalEnd = Math.min(durationEnd, examEnd);
      const remaining = finalEnd - Date.now();

      setTimeLeft(remaining > 0 ? remaining : 0);

      if (remaining <= 0 && examActiveRef.current) {
        submitExam(true);
      }
    };

    calculate();

    const interval = setInterval(calculate, 1000);

    return () => clearInterval(interval);
  }, [activeAttempt, activeExam]);

  // =========================================================
  // SAVE ANSWERS
  // =========================================================

  const saveAnswers = async (silent = false) => {
    if (!activeExam || !activeAttempt) return false;

    try {
      const answerArray = Object.entries(answers).map(
        ([questionId, answer]) => ({
          questionId,
          answer
        })
      );

      const response = await fetch(
        `${api}/api/lms/exams/${activeExam.id}/attempt/${activeAttempt.id}/answers`,
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({
            answers: answerArray
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (!silent) {
          showError(data.message || "Failed to save answers");
        }

        return false;
      }

      if (!silent) {
        showMessage("Answers saved.");
      }

      return true;
    } catch (err) {
      console.error("Save answers error:", err);

      if (!silent) {
        showError("Server error while saving answers.");
      }

      return false;
    }
  };

  // =========================================================
  // SUBMIT EXAM
  // =========================================================

  const submitExam = async (automatic = false) => {
    if (!activeExam || !activeAttempt || submitting) return;

    try {
      setSubmitting(true);

      await saveAnswers(true);

      const response = await fetch(
        `${api}/api/lms/exams/${activeExam.id}/attempt/${activeAttempt.id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit exam");
      }

      examActiveRef.current = false;

      setResult(data.result || null);
      setActiveAttempt(null);
      setActiveExam(null);
      setAnswers({});
      setTimeLeft(null);

      setActiveTab("result");

      showMessage(
        automatic
          ? "Exam time ended. Your exam was automatically submitted."
          : data.message || "Exam submitted successfully."
      );
    } catch (err) {
      console.error("Submit exam error:", err);
      showError(err.message || "Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // TAB SWITCH
  // =========================================================

  useEffect(() => {
    if (!isStudent) return;

    const handleVisibilityChange = async () => {
      if (
        document.visibilityState !== "hidden" ||
        !examActiveRef.current ||
        !activeExam ||
        !activeAttempt ||
        tabSwitchInProgressRef.current
      ) {
        return;
      }

      tabSwitchInProgressRef.current = true;

      try {
        const response = await fetch(
          `${api}/api/lms/exams/${activeExam.id}/attempt/${activeAttempt.id}/tab-switch`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (response.ok) {
          if (data.autoSubmitted) {
            examActiveRef.current = false;

            setResult(data.result || null);
            setActiveAttempt(null);
            setActiveExam(null);
            setAnswers({});
            setTimeLeft(null);
            setActiveTab("result");

            showError(
              "Second tab switch detected. Your exam was automatically submitted."
            );
          } else if (data.warning) {
            window.setTimeout(() => {
              alert(
                "⚠️ Warning\n\nDo not switch tabs during the exam.\n\nOne more violation will automatically submit your exam."
              );
            }, 200);
          }
        }
      } catch (err) {
        console.error("Tab switch error:", err);
      } finally {
        tabSwitchInProgressRef.current = false;
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [isStudent, activeExam, activeAttempt, token]);

  // =========================================================
  // RESULT
  // =========================================================

  const loadOwnResult = async (examId, attemptId) => {
    try {
      setLoading(true);
      clearMessages();

      const response = await fetch(
        `${api}/api/lms/exams/${examId}/attempt/${attemptId}/result`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load result");
      }

      setResult(data.result);
      setActiveTab("result");
    } catch (err) {
      showError(err.message || "Failed to load result");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FACULTY / HOD RESULTS
  // =========================================================

  const loadResults = async (exam) => {
    try {
      setLoading(true);
      clearMessages();

      const response = await fetch(
        `${api}/api/lms/exams/${exam._id}/results`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load results");
      }

      setResultsExam(exam);
      setResults(Array.isArray(data.results) ? data.results : []);
      setActiveTab("results");
    } catch (err) {
      showError(err.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // STYLES
  // =========================================================

  const cardStyle = {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "12px",
    padding: "18px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
  };

  const buttonStyle = {
    border: "none",
    borderRadius: "7px",
    padding: "10px 16px",
    background: ORANGE,
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600"
  };

  const secondaryButtonStyle = {
    border: "1px solid #ddd",
    borderRadius: "7px",
    padding: "10px 16px",
    background: "#fff",
    color: "#444",
    cursor: "pointer",
    fontWeight: "600"
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "7px",
    outline: "none",
    fontSize: "14px",
    background: "#fff"
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    color: "#555",
    fontSize: "13px",
    fontWeight: "600"
  };

  // =========================================================
  // EXAM CARD
  // =========================================================

  const renderExamCard = (exam) => {
    const isPublished = exam.status === "published";

    return (
      <div key={exam._id} style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-start"
          }}
        >
          <div>
            <h3
              style={{
                margin: "0 0 7px",
                color: "#222",
                fontSize: "18px"
              }}
            >
              📘 {exam.title}
            </h3>

            <p
              style={{
                margin: "0 0 5px",
                color: "#666",
                fontSize: "14px"
              }}
            >
              {exam.subject}
            </p>
          </div>

          <span
            style={{
              padding: "5px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
              background: isPublished ? "#e8f7ee" : "#fff4e8",
              color: isPublished ? "#18864b" : ORANGE
            }}
          >
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        {exam.description && (
          <p
            style={{
              color: "#666",
              lineHeight: "1.5",
              fontSize: "14px",
              margin: "12px 0"
            }}
          >
            {exam.description}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "8px",
            margin: "14px 0"
          }}
        >
          <div
            style={{
              background: "#fafafa",
              borderRadius: "8px",
              padding: "10px"
            }}
          >
            <small style={{ color: "#999" }}>Questions</small>
            <div style={{ fontWeight: "700", marginTop: "3px" }}>
              {exam.questions?.length || 0}
            </div>
          </div>

          <div
            style={{
              background: "#fafafa",
              borderRadius: "8px",
              padding: "10px"
            }}
          >
            <small style={{ color: "#999" }}>Total Marks</small>
            <div style={{ fontWeight: "700", marginTop: "3px" }}>
              {exam.totalMarks || 0}
            </div>
          </div>

          <div
            style={{
              background: "#fafafa",
              borderRadius: "8px",
              padding: "10px"
            }}
          >
            <small style={{ color: "#999" }}>Duration</small>
            <div style={{ fontWeight: "700", marginTop: "3px" }}>
              {exam.durationMinutes} min
            </div>
          </div>
        </div>

        <div style={{ marginTop: "10px" }}>
          <strong
            style={{
              fontSize: "13px",
              color: "#555"
            }}
          >
            Section schedules
          </strong>

          <div style={{ marginTop: "8px" }}>
            {(exam.sections || []).map((section) => (
              <div
                key={`${exam._id}-${section.section}`}
                style={{
                  padding: "8px 10px",
                  background: "#fafafa",
                  borderRadius: "7px",
                  marginBottom: "6px",
                  fontSize: "13px",
                  color: "#666"
                }}
              >
                <strong style={{ color: "#333" }}>
                  {section.section}
                </strong>{" "}
                — {formatDateTime(section.startAt)} →{" "}
                {formatDateTime(section.endAt)}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "16px"
          }}
        >
          {isStudent && isPublished && (
            <button
              style={buttonStyle}
              onClick={() => startExam(exam)}
              disabled={loading}
            >
              ▶ Start Exam
            </button>
          )}

          {canManage && !isPublished && (
            <button
              style={buttonStyle}
              onClick={() => publishExam(exam._id)}
              disabled={loading}
            >
              🚀 Publish
            </button>
          )}

          {canManage && isPublished && (
            <button
              style={secondaryButtonStyle}
              onClick={() => loadResults(exam)}
              disabled={loading}
            >
              📊 View Results
            </button>
          )}
        </div>
      </div>
    );
  };

  // =========================================================
  // CREATE FORM
  // =========================================================

  const renderCreateForm = () => (
    <form onSubmit={createExam}>
      <div style={cardStyle}>
        <h3
          style={{
            margin: "0 0 18px",
            color: "#222"
          }}
        >
          ➕ Create New Exam
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px"
          }}
        >
          <div>
            <label style={labelStyle}>Exam Title</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Python Programming"
            />
          </div>

          <div>
            <label style={labelStyle}>Subject</label>
            <input
              style={inputStyle}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Example: Python"
            />
          </div>

          <div>
            <label style={labelStyle}>Branch</label>
            <input
              style={inputStyle}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Example: CSE"
              disabled={role === "hod" || role === "faculty"}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              style={inputStyle}
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(e.target.value)
              }
            />
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: "75px",
              resize: "vertical"
            }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description about the exam"
          />
        </div>

        <div style={{ marginTop: "14px" }}>
          <label style={labelStyle}>Instructions</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: "75px",
              resize: "vertical"
            }}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Exam instructions for students"
          />
        </div>
      </div>

      {/* SECTION SCHEDULES */}
      <div style={{ ...cardStyle, marginTop: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                color: "#222"
              }}
            >
              🕐 Section-wise Exam Timing
            </h3>

            <p
              style={{
                color: "#999",
                fontSize: "13px",
                margin: "5px 0 0"
              }}
            >
              Each section can have a different exam window.
            </p>
          </div>

          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={addSection}
          >
            + Add Section
          </button>
        </div>

        <div style={{ marginTop: "15px" }}>
          {sections.map((item, index) => (
            <div
              key={index}
              style={{
                padding: "14px",
                border: "1px solid #eee",
                borderRadius: "9px",
                marginBottom: "10px",
                background: "#fafafa"
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px"
                }}
              >
                <div>
                  <label style={labelStyle}>Section</label>
                  <input
                    style={inputStyle}
                    value={item.section}
                    onChange={(e) =>
                      updateSection(
                        index,
                        "section",
                        e.target.value
                      )
                    }
                    placeholder="Example: CSE-A"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Start Time</label>
                  <input
                    type="datetime-local"
                    style={inputStyle}
                    value={item.startAt}
                    onChange={(e) =>
                      updateSection(
                        index,
                        "startAt",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label style={labelStyle}>End Time</label>
                  <input
                    type="datetime-local"
                    style={inputStyle}
                    value={item.endAt}
                    onChange={(e) =>
                      updateSection(
                        index,
                        "endAt",
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  style={{
                    ...secondaryButtonStyle,
                    marginTop: "10px",
                    color: "#d33"
                  }}
                >
                  Remove Section
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* QUESTIONS */}
      <div style={{ ...cardStyle, marginTop: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                color: "#222"
              }}
            >
              📝 Questions
            </h3>

            <p
              style={{
                color: "#999",
                fontSize: "13px",
                margin: "5px 0 0"
              }}
            >
              MCQ and True/False are supported in this version.
            </p>
          </div>

          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={addQuestion}
          >
            + Add Question
          </button>
        </div>

        <div style={{ marginTop: "15px" }}>
          {questions.map((item, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #eee",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "12px",
                background: "#fafafa"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px"
                }}
              >
                <strong style={{ color: ORANGE }}>
                  Question {index + 1}
                </strong>

                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#d33",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div style={{ marginTop: "12px" }}>
                <label style={labelStyle}>Question</label>

                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "65px",
                    resize: "vertical"
                  }}
                  value={item.question}
                  onChange={(e) =>
                    updateQuestion(
                      index,
                      "question",
                      e.target.value
                    )
                  }
                  placeholder="Enter your question"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                  marginTop: "12px"
                }}
              >
                <div>
                  <label style={labelStyle}>Question Type</label>

                  <select
                    style={inputStyle}
                    value={item.type}
                    onChange={(e) => {
                      const type = e.target.value;

                      updateQuestion(index, "type", type);

                      if (type === "true-false") {
                        updateQuestion(
                          index,
                          "correctAnswer",
                          "True"
                        );
                      } else {
                        updateQuestion(
                          index,
                          "correctAnswer",
                          ""
                        );
                      }
                    }}
                  >
                    <option value="mcq">MCQ</option>
                    <option value="true-false">
                      True / False
                    </option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Marks</label>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    style={inputStyle}
                    value={item.marks}
                    onChange={(e) =>
                      updateQuestion(
                        index,
                        "marks",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Negative Marks
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    style={inputStyle}
                    value={item.negativeMarks}
                    onChange={(e) =>
                      updateQuestion(
                        index,
                        "negativeMarks",
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              {item.type === "mcq" ? (
                <div style={{ marginTop: "14px" }}>
                  <label style={labelStyle}>Options</label>

                  {item.options.map((option, optionIndex) => (
                    <input
                      key={optionIndex}
                      style={{
                        ...inputStyle,
                        marginBottom: "7px"
                      }}
                      value={option}
                      onChange={(e) =>
                        updateQuestionOption(
                          index,
                          optionIndex,
                          e.target.value
                        )
                      }
                      placeholder={`Option ${optionIndex + 1}`}
                    />
                  ))}

                  <label
                    style={{
                      ...labelStyle,
                      marginTop: "6px"
                    }}
                  >
                    Correct Answer
                  </label>

                  <select
                    style={inputStyle}
                    value={item.correctAnswer}
                    onChange={(e) =>
                      updateQuestion(
                        index,
                        "correctAnswer",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Select correct answer
                    </option>

                    {item.options
                      .filter((option) => option.trim())
                      .map((option, optionIndex) => (
                        <option
                          key={optionIndex}
                          value={option}
                        >
                          {option}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div style={{ marginTop: "14px" }}>
                  <label style={labelStyle}>
                    Correct Answer
                  </label>

                  <select
                    style={inputStyle}
                    value={item.correctAnswer}
                    onChange={(e) =>
                      updateQuestion(
                        index,
                        "correctAnswer",
                        e.target.value
                      )
                    }
                  >
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "16px"
        }}
      >
        <button
          type="submit"
          style={buttonStyle}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Draft Exam"}
        </button>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => setShowCreate(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );

  // =========================================================
  // EXAM ATTEMPT UI
  // =========================================================

  if (activeTab === "attempt" && activeExam && activeAttempt) {
    return (
      <div>
        <div
          style={{
            ...cardStyle,
            marginBottom: "16px",
            position: "sticky",
            top: "10px",
            zIndex: 10
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap"
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: ORANGE,
                  fontSize: "22px"
                }}
              >
                📚 {activeExam.title}
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#777"
                }}
              >
                {activeExam.subject}
              </p>
            </div>

            <div
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                background:
                  timeLeft !== null && timeLeft <= 60000
                    ? "#fff0f0"
                    : "#fff4e8",
                color:
                  timeLeft !== null && timeLeft <= 60000
                    ? "#d33"
                    : ORANGE,
                fontWeight: "800",
                fontSize: "18px"
              }}
            >
              ⏱ {formatTimeLeft(timeLeft)}
            </div>
          </div>

          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: "#fff8f3",
              borderRadius: "8px",
              color: "#777",
              fontSize: "13px"
            }}
          >
            ⚠️ Do not switch tabs. Your first tab switch will show a
            warning. A second violation will automatically submit
            your exam.
          </div>
        </div>

        {activeExam.instructions && (
          <div style={{ ...cardStyle, marginBottom: "14px" }}>
            <strong style={{ color: "#333" }}>
              📌 Instructions
            </strong>

            <p
              style={{
                whiteSpace: "pre-wrap",
                color: "#666",
                lineHeight: "1.6",
                marginBottom: 0
              }}
            >
              {activeExam.instructions}
            </p>
          </div>
        )}

        {(activeExam.questions || []).map(
          (question, index) => {
            const selected =
              answers[String(question._id)] || "";

            return (
              <div
                key={question._id}
                style={{
                  ...cardStyle,
                  marginBottom: "12px"
                }}
              >
                <div
                  style={{
                    color: ORANGE,
                    fontSize: "13px",
                    fontWeight: "700",
                    marginBottom: "7px"
                  }}
                >
                  Question {index + 1} • {question.marks} mark
                  {question.marks !== 1 ? "s" : ""}
                </div>

                <h3
                  style={{
                    margin: "0 0 15px",
                    color: "#222",
                    fontSize: "16px",
                    lineHeight: "1.5"
                  }}
                >
                  {question.question}
                </h3>

                <div>
                  {(question.options || []).map(
                    (option, optionIndex) => (
                      <label
                        key={optionIndex}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "9px",
                          padding: "10px 12px",
                          border:
                            selected === option
                              ? `1px solid ${ORANGE}`
                              : "1px solid #eee",
                          background:
                            selected === option
                              ? "#fff8f3"
                              : "#fff",
                          borderRadius: "8px",
                          marginBottom: "7px",
                          cursor: "pointer"
                        }}
                      >
                        <input
                          type="radio"
                          name={`question-${question._id}`}
                          checked={selected === option}
                          onChange={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [String(question._id)]: option
                            }))
                          }
                        />

                        <span style={{ color: "#444" }}>
                          {option}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>
            );
          }
        )}

        <div
          style={{
            ...cardStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "20px"
          }}
        >
          <button
            style={secondaryButtonStyle}
            onClick={() => saveAnswers(false)}
            disabled={submitting}
          >
            💾 Save Answers
          </button>

          <button
            style={{
              ...buttonStyle,
              padding: "11px 22px"
            }}
            onClick={() => {
              const confirmed = window.confirm(
                "Are you sure you want to submit the exam?"
              );

              if (confirmed) {
                submitExam(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // RESULT UI
  // =========================================================

  if (activeTab === "result" && result) {
    return (
      <div>
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            maxWidth: "650px",
            margin: "25px auto"
          }}
        >
          <div
            style={{
              fontSize: "45px",
              marginBottom: "8px"
            }}
          >
            🎉
          </div>

          <h2
            style={{
              margin: 0,
              color: ORANGE
            }}
          >
            Exam Result
          </h2>

          <p
            style={{
              color: "#777",
              marginTop: "7px"
            }}
          >
            Your exam has been evaluated successfully.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "10px",
              marginTop: "22px"
            }}
          >
            <div
              style={{
                background: "#fafafa",
                borderRadius: "9px",
                padding: "16px"
              }}
            >
              <small style={{ color: "#999" }}>Score</small>
              <h2 style={{ margin: "5px 0 0" }}>
                {result.score}
              </h2>
            </div>

            <div
              style={{
                background: "#fafafa",
                borderRadius: "9px",
                padding: "16px"
              }}
            >
              <small style={{ color: "#999" }}>
                Total Marks
              </small>
              <h2 style={{ margin: "5px 0 0" }}>
                {result.totalMarks}
              </h2>
            </div>

            <div
              style={{
                background: "#fafafa",
                borderRadius: "9px",
                padding: "16px"
              }}
            >
              <small style={{ color: "#999" }}>
                Percentage
              </small>
              <h2
                style={{
                  margin: "5px 0 0",
                  color: ORANGE
                }}
              >
                {result.percentage}%
              </h2>
            </div>
          </div>

          <div
            style={{
              marginTop: "18px",
              padding: "12px",
              background: "#fafafa",
              borderRadius: "8px",
              color: "#666",
              fontSize: "14px"
            }}
          >
            Status:{" "}
            <strong>
              {result.status === "auto-submitted"
                ? "Auto-submitted"
                : "Submitted"}
            </strong>
            <br />
            Submitted: {formatDateTime(result.submittedAt)}
          </div>

          <button
            style={{
              ...buttonStyle,
              marginTop: "18px"
            }}
            onClick={() => {
              setResult(null);
              setActiveTab("exams");
              loadExams();
            }}
          >
            ← Back to LMS
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // FACULTY / HOD RESULTS UI
  // =========================================================

  if (activeTab === "results" && resultsExam) {
    return (
      <div>
        <div style={{ ...cardStyle, marginBottom: "15px" }}>
          <button
            style={secondaryButtonStyle}
            onClick={() => {
              setResultsExam(null);
              setResults([]);
              setActiveTab("exams");
            }}
          >
            ← Back to Exams
          </button>

          <h2
            style={{
              color: ORANGE,
              margin: "16px 0 5px"
            }}
          >
            📊 {resultsExam.title} — Results
          </h2>

          <p
            style={{
              color: "#777",
              margin: 0
            }}
          >
            {resultsExam.subject} • {resultsExam.totalMarks} marks
          </p>
        </div>

        {results.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              textAlign: "center",
              color: "#999"
            }}
          >
            No submitted results yet.
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: "12px",
              overflowX: "auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "800px"
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#fafafa"
                  }}
                >
                  {[
                    "Student",
                    "Roll No",
                    "Section",
                    "Score",
                    "Percentage",
                    "Status",
                    "Tab Switches",
                    "Submitted"
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "12px 10px",
                        textAlign: "left",
                        color: "#999",
                        fontSize: "13px",
                        fontWeight: "600",
                        borderBottom: "1px solid #eee"
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {results.map((item) => (
                  <tr key={item.attemptId}>
                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #f2f2f2",
                        color: "#333"
                      }}
                    >
                      {item.studentName || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #f2f2f2",
                        color: "#333"
                      }}
                    >
                      {item.rollNo || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #f2f2f2",
                        color: "#333"
                      }}
                    >
                      {item.section || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #f2f2f2",
                        fontWeight: "700"
                      }}
                    >
                      {item.score}/{item.totalMarks}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #f2f2f2",
                        color: ORANGE,
                        fontWeight: "700"
                      }}
                    >
                      {item.percentage}%
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #f2f2f2"
                      }}
                    >
                      {item.status === "auto-submitted"
                        ? "Auto-submitted"
                        : "Submitted"}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #f2f2f2"
                      }}
                    >
                      {item.tabSwitchCount || 0}
                    </td>

                    <td
                      style={{
                        padding: "12px 10px",
                        borderBottom: "1px solid #f2f2f2",
                        color: "#777",
                        fontSize: "13px"
                      }}
                    >
                      {formatDateTime(item.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // MAIN LMS UI
  // =========================================================

  return (
    <div style={{ marginTop: "24px" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
          marginBottom: "18px"
        }}
      >
        <div>
          <h2
            style={{
              color: ORANGE,
              fontSize: "22px",
              margin: 0
            }}
          >
            📚 LMS
          </h2>

          <p
            style={{
              color: "#999",
              margin: "5px 0 0",
              fontSize: "14px"
            }}
          >
            Learning Management System • Exams & Results
          </p>
        </div>

        {canManage && (
          <button
            style={buttonStyle}
            onClick={() => {
              setShowCreate(true);
              clearMessages();
            }}
          >
            + Create Exam
          </button>
        )}
      </div>

      {/* TABS */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "18px"
        }}
      >
        <button
          style={{
            ...secondaryButtonStyle,
            background:
              activeTab === "exams" ? ORANGE : "#fff",
            color:
              activeTab === "exams" ? "#fff" : "#444",
            borderColor:
              activeTab === "exams" ? ORANGE : "#ddd"
          }}
          onClick={() => {
            setActiveTab("exams");
            clearMessages();
            loadExams();
          }}
        >
          📝 Exams
        </button>

        {isStudent && (
          <button
            style={{
              ...secondaryButtonStyle,
              background:
                activeTab === "result" ? ORANGE : "#fff",
              color:
                activeTab === "result" ? "#fff" : "#444",
              borderColor:
                activeTab === "result" ? ORANGE : "#ddd"
            }}
            onClick={() => {
              setActiveTab("result");
              clearMessages();
            }}
          >
            📊 My Result
          </button>
        )}
      </div>

      {/* MESSAGE */}
      {message && (
        <div
          style={{
            marginBottom: "14px",
            padding: "11px 13px",
            borderRadius: "8px",
            background: "#eaf7ef",
            color: "#18864b",
            fontSize: "14px"
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: "14px",
            padding: "11px 13px",
            borderRadius: "8px",
            background: "#fff0f0",
            color: "#d33",
            fontSize: "14px"
          }}
        >
          {error}
        </div>
      )}

      {/* CREATE */}
      {showCreate ? (
        renderCreateForm()
      ) : (
        <>
          {loading && (
            <div
              style={{
                ...cardStyle,
                textAlign: "center",
                color: "#999",
                marginBottom: "14px"
              }}
            >
              Loading LMS...
            </div>
          )}

          {!loading && exams.length === 0 && (
            <div
              style={{
                ...cardStyle,
                textAlign: "center",
                padding: "35px 20px"
              }}
            >
              <div style={{ fontSize: "40px" }}>📚</div>

              <h3
                style={{
                  margin: "10px 0 5px",
                  color: "#333"
                }}
              >
                No exams available
              </h3>

              <p
                style={{
                  color: "#999",
                  margin: 0
                }}
              >
                {canManage
                  ? "Create your first exam using the button above."
                  : "There are no published exams assigned to you right now."}
              </p>
            </div>
          )}

          ```jsx
          {!loading && exams.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "16px"
              }}
            >
              {exams.map(renderExamCard)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
