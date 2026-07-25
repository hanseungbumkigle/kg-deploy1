"use client";

import { useMemo, useState } from "react";
import questionsData from "@/app/data/questions.json";

type Question = { id: number; axis: string; yes: string; text: string };
type CompatCard = { name: string; tagline: string; index: string; comment?: string };
type ResultData = {
  character: {
    name: string;
    age: number | string;
    pros: string;
    cons: string;
    likes: string;
    dislikes: string;
    tagline: string;
    description: string;
    index: string;
  } | null;
  reason: string;
  best: CompatCard | null;
  worst: CompatCard | null;
};

const QUESTIONS = questionsData as Question[];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 문자열 → 안정적인 파스텔 색 (더미 아바타 배경)
function colorFromString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h}, 60%, 55%)`;
}

function Avatar({
  index,
  name,
  size,
}: {
  index: string;
  name: string;
  size: number;
}) {
  const [err, setErr] = useState(false);
  const style = { width: size, height: size } as const;
  if (err || !index) {
    return (
      <div
        className="avatar avatar-dummy"
        style={{ ...style, background: colorFromString(index || name) }}
      >
        {name?.[0] ?? "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="avatar"
      src={`/characters/${index}.png`}
      alt={name}
      style={style}
      onError={() => setErr(true)}
    />
  );
}

type Step = "intro" | "quiz" | "loading" | "result";

export default function Home() {
  const order = useMemo(() => shuffle(QUESTIONS), []);
  const [step, setStep] = useState<Step>("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState("");

  const total = order.length;

  async function submit(finalAnswers: Record<string, boolean>) {
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "결과를 불러오지 못했습니다.");
      setResult(data);
      setStep("result");
    } catch {
      setError("결과를 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.");
      setStep("quiz");
    }
  }

  function answer(yes: boolean) {
    const q = order[idx];
    const next = { ...answers, [String(q.id)]: yes };
    setAnswers(next);
    if (idx + 1 < total) {
      setIdx(idx + 1);
    } else {
      submit(next);
    }
  }

  function restart() {
    setAnswers({});
    setIdx(0);
    setResult(null);
    setError("");
    setStep("intro");
  }

  // ---------- 인트로 ----------
  if (step === "intro") {
    return (
      <main className="intro-screen">
        <div className="intro-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.png" alt="Cocobi" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-img" src="/hero.png" alt="코코비 캐릭터와 친구들" />
          <h1 className="intro-title">
            나와 닮은
            <br />
            코코비 캐릭터 찾기
          </h1>
          <p className="intro-sub">나와 꼭 닮은 코코비 친구를 찾아드릴게요!</p>
          <button className="start-btn" onClick={() => setStep("quiz")}>
            시작하기 🎨
          </button>
        </div>
      </main>
    );
  }

  // ---------- 로딩 ----------
  if (step === "loading") {
    return (
      <main className="card center">
        <div className="spinner" />
        <p className="loading">🔮 당신과 닮은 캐릭터를 찾는 중…</p>
      </main>
    );
  }

  // ---------- 결과 ----------
  if (step === "result" && result) {
    const c = result.character;
    return (
      <main className="card result">
        <p className="result-lead">당신과 닮은 코코비는…</p>

        {c && (
          <>
            <div className="hero">
              <Avatar index={c.index} name={c.name} size={104} />
              <div className="hero-text">
                <h2>{c.name}</h2>
                <span className="tag">{c.tagline}</span>
                <span className="age">{c.age}살</span>
              </div>
            </div>

            <p className="reason">{result.reason}</p>

            <div className="traits">
              <div className="trait"><b>장점</b> {c.pros}</div>
              <div className="trait"><b>단점</b> {c.cons}</div>
              <div className="trait"><b>좋아함</b> {c.likes}</div>
              <div className="trait"><b>싫어함</b> {c.dislikes}</div>
            </div>

            <p className="desc">{c.description}</p>
          </>
        )}

        <div className="compat">
          {result.best && (
            <div className="compat-card good">
              <span className="compat-label">💚 잘 맞아요</span>
              <div className="compat-row">
                <Avatar index={result.best.index} name={result.best.name} size={48} />
                <div>
                  <b>{result.best.name}</b>
                  <span className="compat-tag">{result.best.tagline}</span>
                </div>
              </div>
              {result.best.comment && <p className="compat-comment">{result.best.comment}</p>}
            </div>
          )}
          {result.worst && (
            <div className="compat-card bad">
              <span className="compat-label">💥 안 맞아요</span>
              <div className="compat-row">
                <Avatar index={result.worst.index} name={result.worst.name} size={48} />
                <div>
                  <b>{result.worst.name}</b>
                  <span className="compat-tag">{result.worst.tagline}</span>
                </div>
              </div>
              {result.worst.comment && <p className="compat-comment">{result.worst.comment}</p>}
            </div>
          )}
        </div>

        <button className="primary" onClick={restart}>
          🔄 다시 하기
        </button>
      </main>
    );
  }

  // ---------- 질문 ----------
  const q = order[idx];
  const progress = Math.round((idx / total) * 100);
  return (
    <main className="card quiz">
      <div className="progress">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <span className="progress-text">
        {idx + 1} / {total}
      </span>

      {error && <p className="error">{error}</p>}

      <p className="question">{q.text}</p>

      <div className="choices">
        <button className="choice yes" onClick={() => answer(true)}>
          예
        </button>
        <button className="choice no" onClick={() => answer(false)}>
          아니오
        </button>
      </div>
    </main>
  );
}
