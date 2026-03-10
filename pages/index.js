import { useState } from "react";

export default function Home() {
  const [token, setToken] = useState("");
  const [fileKey, setFileKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [changeLog, setChangeLog] = useState("");
  const [figmaTodo, setFigmaTodo] = useState("");

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runReport() {
    if (!token || !fileKey) {
      alert("Token과 File Key를 모두 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, fileKey })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "실행 중 오류가 발생했습니다.");
      }

      setChangeLog(data.changeLog || "");
      setFigmaTodo(data.figmaTodo || "");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "Arial, sans-serif", maxWidth: 760, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Figma Comment Collector</h1>
      <p style={{ color: "#555" }}>
        Figma Token과 File Key를 입력하면 댓글을 수집해 노션용/피그마용 문서를 생성합니다.
      </p>

      <label style={{ display: "block", marginTop: 16, fontWeight: 600 }}>Figma Token</label>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="figd_..."
        style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, fontSize: 14 }}
      />

      <label style={{ display: "block", marginTop: 16, fontWeight: 600 }}>Figma File Key</label>
      <input
        type="text"
        value={fileKey}
        onChange={(e) => setFileKey(e.target.value)}
        placeholder="aPZLhcBaXZbOfzxjR9FXq5"
        style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, fontSize: 14 }}
      />

      <button
        onClick={runReport}
        disabled={loading}
        style={{ width: "100%", marginTop: 16, padding: 12, fontSize: 14, cursor: "pointer" }}
      >
        {loading ? "실행 중..." : "실행"}
      </button>

      {!!changeLog && (
        <section style={{ marginTop: 24 }}>
          <h2>change-log.md</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            {changeLog}
          </pre>
          <button onClick={() => downloadText("change-log.md", changeLog)} style={{ width: "100%", marginTop: 8, padding: 12 }}>
            change-log.md 다운로드
          </button>
        </section>
      )}

      {!!figmaTodo && (
        <section style={{ marginTop: 24 }}>
          <h2>figma-todo.md</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            {figmaTodo}
          </pre>
          <button onClick={() => downloadText("figma-todo.md", figmaTodo)} style={{ width: "100%", marginTop: 8, padding: 12 }}>
            figma-todo.md 다운로드
          </button>
        </section>
      )}
    </main>
  );
}