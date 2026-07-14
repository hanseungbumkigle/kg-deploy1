import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import pastLives from "@/app/data/pastLives.json";

// Vercel 서버리스(nodejs)에서 실행 — API 키는 서버에만 존재
export const runtime = "nodejs";

type PastLife = {
  id: number;
  being: string;
  era: string;
  cause: string;
  achievement: string;
  memory: string;
};

const DATA = pastLives as PastLife[];

// 이름 -> 항상 동일한 전생을 고르기 위한 결정적 해시
function pickIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % DATA.length;
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
    }

    const cleanName = name.trim().slice(0, 40);
    const record = DATA[pickIndex(cleanName)];

    // 여기까지는 탑재된 엑셀 데이터로 항상 동작 (GPT 없이도 결과 보장)
    let intro = "";

    // OpenAI 키가 있으면 기록을 바탕으로 짧은 이야기를 덧붙임 (선택적 enrichment)
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey });
        // 설정 모델을 먼저 시도, 실패하면 안정적인 모델로 폴백
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
                    "너는 신비로운 전생 이야기꾼이다. 주어진 전생 기록(존재/시대/사인/업적/기억)을 " +
                    "바탕으로, 그 사람에게 들려주듯 2~3문장의 짧고 몰입감 있는 한국어 도입부를 쓴다. " +
                    "사실을 나열하지 말고 분위기 있게, 따뜻하게 마무리한다.",
                },
                {
                  role: "user",
                  content:
                    `이름: ${cleanName}\n` +
                    `전생의 존재: ${record.being}\n` +
                    `시대: ${record.era}\n` +
                    `사인: ${record.cause}\n` +
                    `업적: ${record.achievement}\n` +
                    `사람들의 기억: ${record.memory}`,
                },
              ],
              temperature: 0.9,
              max_tokens: 220,
            });
            intro = completion.choices[0]?.message?.content?.trim() || "";
            if (intro) break;
          } catch {
            // 다음 후보 모델로 폴백
          }
        }
      } catch {
        // enrichment 실패는 무시 — 기록은 그대로 반환
      }
    }

    return NextResponse.json({ name: cleanName, record, intro });
  } catch (err) {
    console.error("past-life API error:", err);
    return NextResponse.json(
      { error: "전생을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
