import { useState } from "react";

const ORANGE = "#F15A29";

export default function CodingPractice({ api, token }) {
  const API_BASE = (api || "").replace(/\/$/, "");
  const authToken = token || localStorage.getItem("studentToken");

  const [selectedLanguage, setSelectedLanguage] = useState("Python");
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [runningCode, setRunningCode] = useState(false);
const starterCode = {
  Python: `# Write your Python code here

print("Hello, World!")`,

  Cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!";
    return 0;
}`,

  Java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`
};

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setCode(starterCode[language]);
    setCodeOutput("");
    setCodeError("");
  };

  const runCode = async () => {
    if (!authToken) {
      setCodeError("Student authentication token not found.");
      return;
    }

    if (!code.trim()) {
      setCodeError("Please enter some code before running.");
      return;
    }

    try {
      setRunningCode(true);
      setCodeOutput("");
      setCodeError("");

      const response = await fetch(
        `${API_BASE}/api/lms/coding/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            language: selectedLanguage,
            code,
            stdin: customInput
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to execute code"
        );
      }

      if (data.output) {
        setCodeOutput(data.output);
      } else if (data.success) {
        setCodeOutput(
          "Program executed successfully with no output."
        );
      }

      if (data.error) {
        setCodeError(data.error);
      }

      if (data.signal && !data.error) {
        setCodeError(
          `Program stopped by signal: ${data.signal}`
        );
      }
    } catch (err) {
      console.error("Run code error:", err);
      setCodeError(
        err.message || "Unable to run code."
      );
    } finally {
      setRunningCode(false);
    }
  };

  const resetCode = () => {
    setCode(starterCode[selectedLanguage]);
    setCustomInput("");
    setCodeOutput("");
    setCodeError("");
  };

  return (
    <div
      style={{
        padding: "24px",
        minHeight: "100%",
        background: "#f7f8fa"
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "24px"
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: "700",
            color: "#222"
          }}
        >
          Online Compiler
        </h1>

        <p
          style={{
            marginTop: "8px",
            color: "#666",
            fontSize: "15px"
          }}
        >
          Write, run and test your code online.
        </p>
      </div>

      {/* Compiler Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          padding: "22px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)"
        }}
      >
        {/* Language */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "18px"
          }}
        >
          <label
            style={{
              fontWeight: "600",
              color: "#333"
            }}
          >
            Language
          </label>

          <select
            value={selectedLanguage}
            onChange={(e) =>
              handleLanguageChange(e.target.value)
            }
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            <option value="Python">Python</option>
            <option value="Cpp">C++</option>
            <option value="Java">Java</option>
          </select>
        </div>

        {/* Code Editor */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontWeight: "600",
              marginBottom: "8px",
              color: "#333"
            }}
          >
            Code Editor
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            style={{
              width: "100%",
              minHeight: "400px",
              resize: "vertical",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              background: "#1e1e1e",
              color: "#f5f5f5",
              fontFamily:
                "Consolas, Monaco, monospace",
              fontSize: "14px",
              lineHeight: "1.6",
              boxSizing: "border-box",
              outline: "none"
            }}
          />
        </div>

        {/* Custom Input */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontWeight: "600",
              marginBottom: "8px",
              color: "#333"
            }}
          >
            Custom Input
          </div>

          <textarea
            value={customInput}
            onChange={(e) =>
              setCustomInput(e.target.value)
            }
            placeholder="Enter input for your program..."
            style={{
              width: "100%",
              minHeight: "120px",
              resize: "vertical",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              fontFamily:
                "Consolas, Monaco, monospace",
              fontSize: "14px",
              boxSizing: "border-box",
              outline: "none"
            }}
          />
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "24px"
          }}
        >
          <button
            onClick={runCode}
            disabled={runningCode}
            style={{
              background: ORANGE,
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "11px 22px",
              fontWeight: "600",
              cursor: runningCode
                ? "not-allowed"
                : "pointer",
              opacity: runningCode ? 0.7 : 1
            }}
          >
            {runningCode
              ? "Running..."
              : "▶ Run Code"}
          </button>

          <button
            onClick={resetCode}
            style={{
              background: "#fff",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "11px 22px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Reset
          </button>
        </div>

        {/* Output */}
        <div>
          <div
            style={{
              fontWeight: "600",
              marginBottom: "8px",
              color: "#333"
            }}
          >
            Output
          </div>

          <pre
            style={{
              margin: 0,
              minHeight: "150px",
              padding: "16px",
              background: "#111827",
              color: "#e5e7eb",
              borderRadius: "10px",
              fontFamily:
                "Consolas, Monaco, monospace",
              fontSize: "14px",
              whiteSpace: "pre-wrap",
              overflowX: "auto",
              boxSizing: "border-box"
            }}
          >
            {codeOutput ||
              "Output will appear here..."}
          </pre>
        </div>

        {/* Error */}
        {codeError && (
          <div style={{ marginTop: "18px" }}>
            <div
              style={{
                fontWeight: "600",
                marginBottom: "8px",
                color: "#dc2626"
              }}
            >
              Error
            </div>

            <pre
              style={{
                margin: 0,
                padding: "16px",
                background: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                whiteSpace: "pre-wrap",
                fontFamily:
                  "Consolas, Monaco, monospace",
                fontSize: "14px"
              }}
            >
              {codeError}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}