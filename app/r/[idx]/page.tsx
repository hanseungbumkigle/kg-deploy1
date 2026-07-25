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

function findByIdx(idx: string): Character | undefined {
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
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [card],
    },
  };
}

export default function SharedResult({ params }: { params: { idx: string } }) {
  const c = findByIdx(params.idx);
  if (!c) notFound();

  const card = `/cards/${pad(c.index)}.png`;
  return (
    <main className="quiz-screen">
      <div className="quiz-card">
        <p className="result-lead">코코비 캐릭터 테스트 결과</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="share-card-img" src={card} alt={`나는 ${c.name}`} />

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

        <Link href="/" className="restart-btn">
          나도 테스트하기 🎨
        </Link>
      </div>
    </main>
  );
}
