import { useState } from "react";

function AddNotice({ onAdd }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1.5px solid #e0e0e0",
    background: "#fff",
    color: "#1a1a1a",
    fontSize: "15px",
    marginBottom: "12px",
    outline: "none",
    boxSizing: "border-box"
  };

  const addNotice = () => {
    if (!title || !description) {
      alert("Please enter title and description!");
      return;
    }

    const token = localStorage.getItem("token");

    fetch("https://cse-student-hub.onrender.com/api/notices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, description })
    })
      .then(res => res.json())
      .then(data => {
        onAdd(data);
        setTitle("");
        setDescription("");
      })
      .catch(err => console.error("Error:", err));
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "28px", maxWidth: "500px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <h2 style={{ margin: "0 0 20px 0", color: "#F15A29", fontSize: "18px", fontWeight: "700" }}>Add Notice</h2>
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
      <button onClick={addNotice} style={{ width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
        Add Notice
      </button>
    </div>
  );
}

export default AddNotice;