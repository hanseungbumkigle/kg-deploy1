import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import pastLives from "@/app/data/pastLives.json";

// Vercel 서버리스(nodejs)에서 실행 — API 키는 서버에만 존재
export const runtime = "nodejs";
// 매 요청마다 톤을 랜덤으로 뽑으므로 캐시하지 않음
export const dynamic = "force-dynamic";

type PastLife = {
  id: number;
  being: string;
  era: string;
  cause: string;
  achievement: string;
  memory: string;
};

const DATA = pastLives as PastLife[];

// 작문 뉘앙스(톤) — 감동적인 것부터 완전 병맛까지
const TONES: { label: string; emoji: string; instruction: string }[] = [
  {
    label: "감동 실화극",
    emoji: "😭",
    instruction:
      "눈물샘을 자극하는 감동 실화처럼. 따뜻하고 뭉클하게, 마지막 한 줄에 긴 여운을 남긴다.",
  },
  {
    label: "웅장한 대하드라마",
    emoji: "🎬",
    instruction:
      "운명과 시대의 격랑을 담은 장엄한 서사시. 웅장하고 비장한 문체로 몰아친다.",
  },
  {
    label: "미스터리 스릴러",
    emoji: "🕵️",
    instruction:
      "긴장감 넘치는 추리 스릴러처럼. 복선과 반전을 심고, 서늘한 분위기로 끝맺는다.",
  },
  {
    label: "완전 병맛",
    emoji: "🤪",
    instruction:
      "정신 나간 B급 병맛으로. 어이없는 비약, 밈, 과장, 개드립을 마구 섞어라. 진지함은 0%, 웃기면 장땡.",
  },
  {
    label: "조선왕조실록 사극체",
    emoji: "📜",
    instruction:
      "조선왕조실록 사관의 문체로. '~하였더라', '~라 전해지느니라' 같은 고어체와 사초(史草) 형식을 쓴다.",
  },
  {
    label: "뉴스 속보",
    emoji: "📰",
    instruction:
      "긴급 뉴스 보도 형식으로. '[속보]'로 시작하고, 현장 기자 멘트와 관계자 인터뷰 인용을 섞는다.",
  },
  {
    label: "우주적 SF 내레이션",
    emoji: "🚀",
    instruction:
      "우주 다큐멘터리 내레이션처럼. 냉정하고 장대한 스케일로, 시간과 존재를 관조하듯 서술한다.",
  },
  {
    label: "그림동화",
    emoji: "🧚",
    instruction:
      "어린이 그림동화 말투로. '옛날 옛적에'로 시작해 다정하고 순수하게, 교훈 한 스푼으로 끝낸다.",
  },
  {
    label: "힙합 벌스",
    emoji: "🎤",
    instruction:
      "라임을 살린 힙합 랩 가사처럼. 펀치라인과 플로우를 살리고 각운을 맞춰 벌스로 쓴다.",
  },
  {
    label: "동기부여 자기계발서",
    emoji: "💪",
    instruction:
      "열혈 자기계발서 톤으로. 교훈과 명언, '당신도 할 수 있습니다' 같은 동기부여 멘트를 팍팍 넣는다.",
  },
];

// 이름 -> 항상 동일한 전생 씨앗을 고르기 위한 결정적 해시
function pickIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % DATA.length;
}

// GPT 실패 시 최소한의 결과라도 만들어주는 폴백 작문
function fallbackComposition(name: string, s: PastLife): string {
  return (
    `${name} 님의 전생은 '${s.being}'였습니다. ${s.era}, ${s.achievement}. ` +
    `${s.cause}(으)로 생을 마쳤지만, 사람들은 그를 '${s.memory}'(으)로 기억합니다.`
  );
}

// 800자를 넘으면 마지막 문장 경계에서 안전하게 자름
function clampLength(text: string, max = 800): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  const slice = chars.slice(0, max).join("");
  const m = slice.match(/[\s\S]*[.!?…。”"』」\n]/);
  if (m && [...m[0]].length >= 400) return m[0].trim();
  return slice.trim() + "…";
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
    }

    const cleanName = name.trim().slice(0, 40);
    const seed = DATA[pickIndex(cleanName)]; // 씨앗(제목+값)은 엑셀에서
    const tone = TONES[Math.floor(Math.random() * TONES.length)]; // 뉘앙스는 랜덤

    let composition = "";

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey });
        const configured = process.env.OPENAI_MODEL || "gpt-5.5";
        const candidates = [configured, "gpt-4o-mini"].filter(
          (m, i, arr) => arr.indexOf(m) === i
        );

        for (const model of candidates) {
          try {
            const completion = await openai.chat.completions.create({
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "너는 '전생 작가'다. 주어진 씨앗 정보(존재/시대/사인/업적/기억)를 재료로만 삼아, " +
                    "요청된 뉘앙스로 그 사람의 전생을 자유롭게 창작한다. " +
                    "씨앗을 그대로 나열하지 말고, 이야기 속에 자연스럽게 녹여 새로 써라. " +
                    "분량은 한국어 기준 반드시 500자 이상 800자 이하다. 800자를 절대 넘기지 마라. " +
                    "600자 안팎으로 간결하게 쓰되 완결된 문장으로 끝맺어라. " +
                    "입력한 이름을 주인공으로 등장시키고, 제목이나 머리말 없이 본문만 출력한다.",
                },
                {
                  role: "user",
                  content:
                    `[이름] ${cleanName}\n` +
                    `[뉘앙스] ${tone.label} — ${tone.instruction}\n\n` +
                    `[씨앗 정보]\n` +
                    `- 전생의 존재: ${seed.being}\n` +
                    `- 시대: ${seed.era}\n` +
                    `- 사인: ${seed.cause}\n` +
                    `- 업적: ${seed.achievement}\n` +
                    `- 사람들의 기억: ${seed.memory}\n\n` +
                    `위 씨앗을 재료로, '${tone.label}' 뉘앙스로 ${cleanName} 님의 전생을 500~800자로 작문해줘.`,
                },
              ],
              temperature: 1.0,
              max_tokens: 1200,
            });
            composition = completion.choices[0]?.message?.content?.trim() || "";
            if (composition) break;
          } catch {
            // 다음 후보 모델로 폴백
          }
        }
      } catch {
        // enrichment 실패는 무시
      }
    }

    if (!composition) composition = fallbackComposition(cleanName, seed);
    composition = clampLength(composition, 800);

    return NextResponse.json({
      name: cleanName,
      tone: { label: tone.label, emoji: tone.emoji },
      composition,
      seed,
    });
  } catch (err) {
    console.error("past-life API error:", err);
    return NextResponse.json(
      { error: "전생을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
