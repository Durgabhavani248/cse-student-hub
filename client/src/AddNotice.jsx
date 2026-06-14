import { useState } from "react";

function AddNotice({ onAdd }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #4361ee",
    background: "#0f0f0f",
    color: "#fff",
    fontSize: "15px",
    marginBottom: "14px",
    outline: "none",
    boxSizing: "border-box"
  };

  const addNotice = () => {
    if (!title || !description) {
      alert("Title and description enter cheyyi!");
      return;
    }

    const token = localStorage.getItem("token");
    console.log("Token:", token);

    fetch("http://localhost:3001/api/notices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, description })
    })
      .then(res => {
        console.log("Response status:", res.status);
        return res.json();
      })
      .then(data => {
        console.log("Response data:", data);
        onAdd(data);
        setTitle("");
        setDescription("");
      })
      .catch(err => console.error("Error:", err));
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #4361ee", borderRadius: "16px", padding: "28px", maxWidth: "500px", marginBottom: "24px", boxShadow: "0 4px 20px #4361ee33" }}>
      <h2 style={{ margin: "0 0 20px 0", background: "linear-gradient(90deg, #4361ee, #4cc9f0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>➕ Add Notice</h2>
      <input
        placeholder="Notice Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="Notice Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <button onClick={addNotice} style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #4361ee, #4cc9f0)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>
        Add Notice 📢
      </button>
    </div>
  );
}

export default AddNotice;