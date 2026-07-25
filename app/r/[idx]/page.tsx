import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import charactersData from "@/app/data/characters.json";

type Character = {
  result: string;
  name: string;
  age: number | string;
  pros: string;
  cons: string;
  likes: string;
  dislikes: string;
  tagline: string;
  description: string;
  index: number | string;
};

const { characters } = charactersData as { characters: Character[] };

const pad = (i: number | string) => String(i).padStart(2, "0");

function findByIdx(idx: string | number): Character | undefined {
  const n = Number(idx);
  return characters.find((c) => Number(c.index) === n);
}

function siteBase(): string {
  const custom = process.env.NEXT_PUBLIC_SITE_URL;
  if (custom) return custom.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const vurl = process.env.VERCEL_URL;
  if (vurl) return `https://${vurl}`;
  return "http://localhost:3000";
}

type Payload = {
  r?: string;
  b?: { i: number | string; c?: string } | null;
  w?: { i: number | string; c?: string } | null;
};

function decodePayload(d?: string): Payload | null {
  if (!d) return null;
  try {
    let s = d.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const json = Buffer.from(s, "base64").toString("utf-8");
    return JSON.parse(json) as Payload;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return characters.map((c) => ({ idx: String(c.index) }));
}

export function generateMetadata({ params }: { params: { idx: string } }): Metadata {
  const c = findByIdx(params.idx);
  if (!c) return { title: "나와 닮은 코코비 캐릭터 찾기" };
  const title = `나는 ${c.name}! | 나와 닮은 코코비 캐릭터 찾기`;
  const description = `${c.tagline} — 나와 닮은 코코비 캐릭터는 누구일까? 지금 테스트해 보세요!`;
  const card = `/cards/${pad(c.index)}.png`;
  return {
    metadataBase: new URL(siteBase()),
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: card, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: [card] },
  };
}

function CompatCard({
  kind,
  ch,
  comment,
}: {
  kind: "good" | "bad";
  ch: Character;
  comment?: string;
}) {
  return (
    <div className={`compat-card ${kind}`}>
      <span className="compat-label">{kind === "good" ? "💚 잘 맞아요" : "💥 안 맞아요"}</span>
      <div className="compat-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="avatar"
          src={`/characters/${pad(ch.index)}.png`}
          alt={ch.name}
          style={{ width: 48, height: 48 }}
        />
        <div>
          <b>{ch.name}</b>
          <span className="compat-tag">{ch.tagline}</span>
        </div>
      </div>
      {comment && <p className="compat-comment">{comment}</p>}
    </div>
  );
}

export default function SharedResult({
  params,
  searchParams,
}: {
  params: { idx: string };
  searchParams?: { d?: string };
}) {
  const c = findByIdx(params.idx);
  if (!c) notFound();

  const data = decodePayload(searchParams?.d);
  const bestCh = data?.b ? findByIdx(data.b.i) : undefined;
  const worstCh = data?.w ? findByIdx(data.w.i) : undefined;
  const card = `/cards/${pad(c.index)}.png`;

  return (
    <main className="quiz-screen">
      <div className="quiz-card">
        <p className="result-lead">코코비 캐릭터 테스트 결과</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="share-card-img" src={card} alt={`나는 ${c.name}`} />

        {data?.r && (
          <section className="rsec reason-sec">
            <h3 className="rsec-title">✨ 나와 닮은 점</h3>
            <p className="reason">{data.r}</p>
          </section>
        )}

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

        {(bestCh || worstCh) && (
          <section className="rsec">
            <h3 className="rsec-title">🤝 궁합</h3>
            <div className="compat">
              {bestCh && <CompatCard kind="good" ch={bestCh} comment={data?.b?.c} />}
              {worstCh && <CompatCard kind="bad" ch={worstCh} comment={data?.w?.c} />}
            </div>
          </section>
        )}

        <Link href="/" className="restart-btn">
          나도 테스트하기 🎨
        </Link>
      </div>
    </main>
  );
}
