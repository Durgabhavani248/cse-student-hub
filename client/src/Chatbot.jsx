import { useState, useRef, useEffect } from "react";

function Chatbot({ api }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! 👋 Nenu NRI Hub AI Assistant. CSE subjects (DBMS, OS, CN, DS, etc.) gurinchi em doubt unna adagandi!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${api}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply || "Sorry, error vachindi!" }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Server error! Try again." }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", height: "600px", maxWidth: "700px" }}>

      <div style={{ background: "linear-gradient(90deg, #F15A29, #d44a1e)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "24px" }}>🤖</span>
        <div>
          <h3 style={{ margin: 0, color: "#fff", fontSize: "16px" }}>NRI Hub AI Assistant</h3>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>Ask any subject doubt</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", background: "#f9f9f9" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "75%",
              padding: "10px 16px",
              borderRadius: "16px",
              background: m.role === "user" ? "#F15A29" : "#fff",
              color: m.role === "user" ? "#fff" : "#1a1a1a",
              fontSize: "14px",
              lineHeight: "1.5",
              boxShadow: m.role === "assistant" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              whiteSpace: "pre-wrap"
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 16px", borderRadius: "16px", background: "#fff", color: "#999", fontSize: "14px" }}>
              Typing...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div style={{ padding: "16px", borderTop: "1px solid #e0e0e0", display: "flex", gap: "8px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your doubt here..."
          style={{ flex: 1, padding: "12px 16px", borderRadius: "24px", border: "1.5px solid #e0e0e0", outline: "none", fontSize: "14px" }}
        />
        <button onClick={sendMessage} disabled={loading} style={{ background: "#F15A29", color: "#fff", border: "none", borderRadius: "50%", width: "44px", height: "44px", cursor: "pointer", fontSize: "18px" }}>
          ➤
        </button>
      </div>
    </div>
  );
}

export default Chatbot;