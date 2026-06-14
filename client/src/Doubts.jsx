import { useEffect, useState } from "react";

function Doubts({ isAdmin, api }) {
  const [doubts, setDoubts] = useState([]);
  const [question, setQuestion] = useState("");
  const [name, setName] = useState("");
  const [answerText, setAnswerText] = useState({});
  const [filter, setFilter] = useState("unanswered");

  const fetchDoubts = () => {
    fetch(`${api}/api/doubts`)
      .then(res => res.json())
      .then(data => setDoubts(data));
  };

  useEffect(() => {
    fetchDoubts();
  }, []);

  const addDoubt = () => {
    if (!question || !name) {
      alert("Name and question enter cheyyi!");
      return;
    }
    fetch(`${api}/api/doubts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, name })
    })
      .then(res => res.json())
      .then(data => {
        setDoubts([data, ...doubts]);
        setQuestion("");
        setName("");
      });
  };

  const addAnswer = (id) => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/doubts/${id}/answer`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ answer: answerText[id] })
    })
      .then(res => res.json())
      .then(() => {
        fetchDoubts();
        setAnswerText({ ...answerText, [id]: "" });
      });
  };

  const deleteDoubt = (id) => {
    const token = localStorage.getItem("token");
    fetch(`${api}/api/doubts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchDoubts());
  };

  const filtered = doubts.filter(d =>
    filter === "all" ? true :
    filter === "answered" ? d.answer :
    !d.answer
  );

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #06d6a0",
    background: "#0f0f0f",
    color: "#fff",
    fontSize: "14px",
    marginBottom: "12px",
    outline: "none",
    boxSizing: "border-box"
  };

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #06d6a0", borderRadius: "16px", padding: "24px", maxWidth: "500px", marginBottom: "24px", boxShadow: "0 4px 20px #06d6a033" }}>
        <h2 style={{ margin: "0 0 16px 0", background: "linear-gradient(90deg, #06d6a0, #4cc9f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>❓ Ask a Doubt</h2>
        <input placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <textarea placeholder="Your Question..." value={question} onChange={e => setQuestion(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        <button onClick={addDoubt} style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #06d6a0, #4cc9f0)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>
          Post Doubt 🙋
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {["all", "unanswered", "answered"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: "20px", border: "none", background: filter === f ? "linear-gradient(90deg, #06d6a0, #4cc9f0)" : "#1a1a2e", color: "#fff", cursor: "pointer", fontWeight: filter === f ? "bold" : "normal" }}>
            {f === "all" ? "All" : f === "unanswered" ? "❓ Unanswered" : "✅ Answered"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filtered.map(d => (
          <div key={d._id} style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: `1px solid ${d.answer ? "#06d6a0" : "#f72585"}`, borderRadius: "16px", padding: "20px", boxShadow: `0 4px 20px ${d.answer ? "#06d6a033" : "#f7258533"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 4px 0", color: "#4cc9f0", fontSize: "13px" }}>🙋 {d.name}</p>
                <p style={{ margin: "0 0 12px 0", color: "#fff", fontSize: "15px" }}>{d.question}</p>
              </div>
              {isAdmin && (
                <button onClick={() => deleteDoubt(d._id)} style={{ background: "#f72585", color: "#fff", border: "none", padding: "4px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px" }}>
                  Delete
                </button>
              )}
            </div>

            {d.answer ? (
              <div style={{ background: "#06d6a022", borderRadius: "10px", padding: "12px", borderLeft: "3px solid #06d6a0" }}>
                <p style={{ margin: 0, color: "#06d6a0", fontSize: "13px" }}>✅ Answer:</p>
                <p style={{ margin: "4px 0 0 0", color: "#fff", fontSize: "14px" }}>{d.answer}</p>
              </div>
            ) : (
              isAdmin && (
                <div style={{ marginTop: "12px" }}>
                  <textarea
                    placeholder="Answer icheyyi..."
                    value={answerText[d._id] || ""}
                    onChange={e => setAnswerText({ ...answerText, [d._id]: e.target.value })}
                    rows={2}
                    style={{ ...inputStyle, marginBottom: "8px" }}
                  />
                  <button onClick={() => addAnswer(d._id)} style={{ padding: "8px 20px", background: "linear-gradient(90deg, #06d6a0, #4cc9f0)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                    Answer ✅
                  </button>
                </div>
              )
            )}
          </div>
        ))}
        {filtered.length === 0 && <p style={{ color: "#888" }}>No doubts yet!</p>}
      </div>
    </div>
  );
}

export default Doubts;