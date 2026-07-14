"use client";

import { useState, FormEvent } from "react";

type PastLife = {
  id: number;
  being: string;
  era: string;
  cause: string;
  achievement: string;
  memory: string;
};

type Result = {
  name: string;
  record: PastLife;
  intro: string;
};

const FIELDS: { key: keyof PastLife; label: string; icon: string }[] = [
  { key: "being", label: "전생의 직업 또는 존재", icon: "🧬" },
  { key: "era", label: "시대", icon: "⏳" },
  { key: "cause", label: "사인 (죽은 이유)", icon: "🥀" },
  { key: "achievement", label: "전생의 업적", icon: "🏆" },
  { key: "memory", label: "사람들의 기억", icon: "🕯️" },
];

export default function Home() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/past-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card">
      <h1>🔮 전생 이야기</h1>
      <p className="subtitle">이름을 입력하면 그 사람의 전생 기록을 펼쳐 보여드립니다.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요 (예: 홍길동)"
          maxLength={40}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !name.trim()}>
          {loading ? "점치는 중…" : "전생 보기"}
        </button>
      </form>

      {loading && <p className="loading">✨ 전생의 실타래를 풀어내는 중…</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <p className="result-name">
            <b>{result.name}</b> 님의 전생
          </p>

          {result.intro && <p className="intro">{result.intro}</p>}

          <div className="fields">
            {FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <span className="field-label">
                  {f.icon} {f.label}
                </span>
                <span className="field-value">{result.record[f.key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
