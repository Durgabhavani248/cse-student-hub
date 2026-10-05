import { useState } from "react";

function AddNotice({ onAdd, api, facultyInfo }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
const [pdf, setPdf] = useState(null);

  const isHod = facultyInfo?.role === "hod";

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

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("facultyToken");

  const formData = new FormData();

  formData.append("title", title);
  formData.append("description", description);

  if (pdf) {
    formData.append("pdf", pdf);
  }

  fetch(`${api}/api/notices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (!data || data.message) {
        alert(data?.message || "Failed to add notice");
        return;
      }

      onAdd(data);
      setTitle("");
      setDescription("");
      setPdf(null);

      const fileInput =
        document.getElementById("notice-pdf");

      if (fileInput) {
        fileInput.value = "";
      }
    })
    .catch(err => {
      console.error("Error:", err);
      alert("Failed to add notice");
    });
};

  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "16px", padding: "28px", maxWidth: "500px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <h2 style={{ margin: "0 0 4px 0", color: "#F15A29", fontSize: "18px", fontWeight: "700" }}>Add Notice</h2>
      <p style={{ margin: "0 0 16px 0", color: "#999", fontSize: "12px" }}>
        {isHod ? `Visible to ${facultyInfo.branch} students only` : "Visible to all branches"}
      </p>
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
            <div style={{ marginBottom: "14px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#444"
          }}
        >
          📄 Attach PDF (Optional)
        </label>

        <input
          id="notice-pdf"
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (!file) {
              setPdf(null);
              return;
            }

            if (file.type !== "application/pdf") {
              alert("Please select a PDF file only.");
              e.target.value = "";
              setPdf(null);
              return;
            }

            if (file.size > 10 * 1024 * 1024) {
              alert("PDF size must be below 10 MB.");
              e.target.value = "";
              setPdf(null);
              return;
            }

            setPdf(file);
          }}
          style={{
            width: "100%",
            padding: "10px",
            border: "1.5px solid #e0e0e0",
            borderRadius: "10px",
            background: "#fff",
            boxSizing: "border-box",
            cursor: "pointer"
          }}
        />

        {pdf && (
          <small
            style={{
              display: "block",
              marginTop: "6px",
              color: "#666"
            }}
          >
            Selected: {pdf.name}
          </small>
        )}
      </div>
      <button onClick={addNotice} style={{ width: "100%", padding: "12px", background: "#F15A29", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}>
        Add Notice
      </button>
    </div>
  );
}

export default AddNotice;