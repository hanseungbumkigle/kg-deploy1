"use client";

import { useMemo, useRef, useState } from "react";
import questionsData from "@/app/data/questions.json";

// 결과를 URL에 담기 위한 base64url 인코딩
function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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
  index: string | number;
  name: string;
  size: number;
}) {
  const [err, setErr] = useState(false);
  const style = { width: size, height: size } as const;
  // 인덱스 숫자(1,2,…)를 파일명 2자리(01,02,…)로 매핑
  const file = String(index ?? "").padStart(2, "0");
  if (err || !index) {
    return (
      <div
        className="avatar avatar-dummy"
        style={{ ...style, background: colorFromString(String(index) || name) }}
      >
        {name?.[0] ?? "?"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="avatar"
      src={`/characters/${file}.png`}
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
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

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
    setCopied(false);
    setStep("intro");
  }

  function markCopied() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function fallbackCopy(text: string) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      ta.remove();
      markCopied();
    } catch {
      // 복사 실패 시 조용히 무시
    }
  }

  function shareUrl(r: ResultData): string {
    const idx = r.character?.index ?? "";
    const payload = {
      r: r.reason,
      b: r.best ? { i: r.best.index, c: r.best.comment || "" } : null,
      w: r.worst ? { i: r.worst.index, c: r.worst.comment || "" } : null,
    };
    const d = b64urlEncode(JSON.stringify(payload));
    return `${window.location.origin}/r/${idx}?d=${d}`;
  }

  function copyLink(r: ResultData) {
    const url = shareUrl(r);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(markCopied, () => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  }

  async function saveImage(name: string) {
    const node = captureRef.current;
    if (!node) return;
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(node, {
        backgroundColor: "#fffdf7",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `cocobi_${name}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // 캡처 실패 시 무시
    } finally {
      setSaving(false);
    }
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
      <main className="quiz-screen">
        <div className="quiz-card center-card">
          <div className="spinner" />
          <p className="loading-text">🔮 나와 닮은 코코비 친구를 찾는 중…</p>
        </div>
      </main>
    );
  }

  // ---------- 결과 ----------
  if (step === "result" && result) {
    const c = result.character;
    return (
      <main className="quiz-screen">
        <div className="quiz-card">
          <div className="capture" ref={captureRef}>
          <p className="result-lead">나와 닮은 코코비는</p>

          {c && (
            <>
              {/* 결과 카드 이미지 (공유 카드와 동일) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="share-card-img"
                src={`/cards/${String(c.index).padStart(2, "0")}.png`}
                alt={`나는 ${c.name}`}
              />

              {/* AI가 써 준 '닮은 이유' */}
              <section className="rsec reason-sec">
                <h3 className="rsec-title">✨ 나와 닮은 점</h3>
                <p className="reason">{result.reason}</p>
              </section>

              {/* DB에서 불러온 캐릭터 정보 */}
              <section className="rsec">
                <h3 className="rsec-title">🦕 {c.name} 캐릭터 정보</h3>
                <div className="info-sec">
                  <div className="info-row">
                    <span className="info-key">나이</span>
                    <span className="info-val">{c.age}살</span>
                  </div>
                  <p className="desc">{c.description}</p>
                  <div className="traits">
                    <div className="trait"><b>장점</b> {c.pros}</div>
                    <div className="trait"><b>단점</b> {c.cons}</div>
                    <div className="trait"><b>좋아함</b> {c.likes}</div>
                    <div className="trait"><b>싫어함</b> {c.dislikes}</div>
                  </div>
                </div>
              </section>
            </>
          )}

          {(result.best || result.worst) && (
            <section className="rsec">
              <h3 className="rsec-title">🤝 궁합</h3>
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
            </section>
          )}

          {/* 화면엔 표시하되, 이미지 저장(html2canvas) 캡처에서는 제외 */}
          <p className="capture-footer" data-html2canvas-ignore="true">
            🔮 나와 닮은 코코비 캐릭터 찾기
          </p>
          </div>

          {c && (
            <section className="rsec">
              <h3 className="rsec-title">📤 결과 공유하기</h3>
              <div className="share-row">
                <button className="share-btn" onClick={() => copyLink(result)}>
                  {copied ? "✅ 복사됨!" : "🔗 링크 복사"}
                </button>
                <button
                  className="share-btn"
                  onClick={() => saveImage(c.name)}
                  disabled={saving}
                >
                  {saving ? "저장 중…" : "🖼️ 이미지 저장"}
                </button>
              </div>
            </section>
          )}

          <button className="restart-btn" onClick={restart}>
            🔄 다시 하기
          </button>
        </div>
      </main>
    );
  }

  // ---------- 질문 ----------
  const q = order[idx];
  const progress = Math.round((idx / total) * 100);
  return (
    <main className="quiz-screen">
      <div className="quiz-stack">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="quiz-lineup" src="/char_lineup.png" alt="코코비 친구들" />
        <div className="quiz-card">
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
        </div>
      </div>
    </main>
  );
}
