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
  tone: { label: string; emoji: string };
  composition: string;
  seed: PastLife;
};

const SEED_FIELDS: { key: keyof PastLife; label: string }[] = [
  { key: "being", label: "존재" },
  { key: "era", label: "시대" },
  { key: "cause", label: "사인" },
  { key: "achievement", label: "업적" },
  { key: "memory", label: "기억" },
];

export default function Home() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(targetName: string) {
    const trimmed = targetName.trim();
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    run(name);
  }

  return (
    <main className="card">
      <h1>🔮 전생 이야기</h1>
      <p className="subtitle">
        이름을 넣으면 GPT가 매번 다른 뉘앙스로 전생을 작문합니다.
      </p>

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
          {loading ? "작문 중…" : "전생 보기"}
        </button>
      </form>

      {loading && <p className="loading">✨ 전생을 새로 써 내려가는 중…</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <div className="result-head">
            <span className="result-name">
              <b>{result.name}</b> 님의 전생
            </span>
            <span className="tone-badge">
              {result.tone.emoji} {result.tone.label}
            </span>
          </div>

          <p className="composition">{result.composition}</p>

          <div className="seed">
            <span className="seed-title">🌱 전생 씨앗</span>
            <div className="seed-chips">
              {SEED_FIELDS.map((f) => (
                <span className="chip" key={f.key}>
                  <b>{f.label}</b> {result.seed[f.key]}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="reroll"
            onClick={() => run(result.name)}
            disabled={loading}
          >
            🎲 다른 뉘앙스로 다시 쓰기
          </button>
        </div>
      )}
    </main>
  );
}
