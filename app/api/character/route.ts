import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import questionsData from "@/app/data/questions.json";
import charactersData from "@/app/data/characters.json";
import compatibilityData from "@/app/data/compatibility.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Axis = "EI" | "SN" | "TF" | "JP";
type Question = { id: number; axis: Axis; yes: string; text: string };
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
  index: string;
};
type Compat = {
  best: { type: string; name: string };
  worst: { type: string; name: string };
};

const QUESTIONS = questionsData as Question[];
const { characters, byType } = charactersData as {
  characters: Character[];
  byType: Record<string, string[]>;
};
const COMPAT = compatibilityData as Record<string, Compat>;

const OPPOSITE: Record<string, string> = {
  E: "I", I: "E", S: "N", N: "S", T: "F", F: "T", J: "P", P: "J",
};

// 성향을 알파벳 노출 없이 자연어로 (OpenAI 프롬프트용 — MBTI 코드 숨김)
const TRAIT_WORDS: Record<string, string> = {
  E: "사람들과 어울릴 때 힘이 나는",
  I: "혼자만의 시간에 충전되는",
  S: "현실적이고 구체적인 걸 중시하는",
  N: "상상력이 풍부하고 가능성을 보는",
  T: "논리와 사실을 먼저 따지는",
  F: "마음과 공감을 소중히 여기는",
  J: "계획적이고 체계적인",
  P: "즉흥적이고 유연한",
};

// 16개 답변 -> MBTI (동점 시 I/N/F/P 우선)
function scoreMBTI(answers: Record<string, boolean>) {
  const tally: Record<string, number> = {
    E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0,
  };
  for (const q of QUESTIONS) {
    const a = answers[String(q.id)];
    if (typeof a !== "boolean") continue;
    const pole = a ? q.yes : OPPOSITE[q.yes];
    tally[pole]++;
  }
  const pick = (a: string, b: string, tie: string) =>
    tally[a] === tally[b] ? tie : tally[a] > tally[b] ? a : b;
  const mbti =
    pick("E", "I", "I") + pick("S", "N", "N") + pick("T", "F", "F") + pick("J", "P", "P");
  return { mbti, tally };
}

function findChar(name: string): Character | undefined {
  return characters.find((c) => c.name === name);
}

// 유저에게 보낼 캐릭터 (MBTI가 담긴 result 필드는 제거)
function publicChar(c: Character) {
  const { result: _omit, ...rest } = c;
  return rest;
}

function fallbackReason(name: string, c?: Character) {
  if (!c) return `당신은 ${name}와(과) 꼭 닮았어요!`;
  return `당신은 ${name}와(과) 닮았어요. ${c.tagline} — ${c.description.slice(0, 60)}…`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const answers = body?.answers as Record<string, boolean> | undefined;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "answers가 필요합니다." }, { status: 400 });
    }
    const answered = QUESTIONS.filter(
      (q) => typeof answers[String(q.id)] === "boolean"
    ).length;
    if (answered < QUESTIONS.length) {
      return NextResponse.json(
        { error: `모든 문항(${QUESTIONS.length})에 답해 주세요. (현재 ${answered})` },
        { status: 400 }
      );
    }

    const { mbti, tally } = scoreMBTI(answers);
    const candidates = byType[mbti] || [];
    const compat = COMPAT[mbti];

    // 성향 키워드 (자연어)
    const traits = [
      TRAIT_WORDS[mbti[0]], TRAIT_WORDS[mbti[1]],
      TRAIT_WORDS[mbti[2]], TRAIT_WORDS[mbti[3]],
    ];

    const bestChar = findChar(compat?.best.name || "");
    const worstChar = findChar(compat?.worst.name || "");

    // 기본값(폴백)
    let chosenName = candidates[0] || "";
    let reason = "";
    let bestComment = "";
    let worstComment = "";

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && candidates.length > 0) {
      try {
        const openai = new OpenAI({ apiKey });
        const configured = process.env.OPENAI_MODEL || "gpt-5.5";
        const models = [configured, "gpt-4o-mini"].filter(
          (m, i, arr) => arr.indexOf(m) === i
        );

        const candidateInfo = candidates
          .map((n) => {
            const c = findChar(n);
            return c ? `- ${c.name}: ${c.tagline} / ${c.description}` : `- ${n}`;
          })
          .join("\n");

        const userPrompt =
          `[사용자 성향 키워드]\n${traits.map((t) => `- ${t}`).join("\n")}\n\n` +
          `[닮은 캐릭터 후보]\n${candidateInfo}\n\n` +
          `[잘 맞는 캐릭터] ${bestChar?.name ?? compat?.best.name} — ${bestChar?.tagline ?? ""}\n` +
          `[안 맞는 캐릭터] ${worstChar?.name ?? compat?.worst.name} — ${worstChar?.tagline ?? ""}\n\n` +
          `다음 JSON만 출력해줘:\n` +
          `{\n` +
          `  "chosenName": "후보 중 사용자 성향에 가장 어울리는 캐릭터 이름 (후보가 하나면 그 이름)",\n` +
          `  "reason": "왜 그 캐릭터와 닮았는지 사용자에게 말하듯 2~3문장, 친근하고 재미있게",\n` +
          `  "bestComment": "잘 맞는 캐릭터와 왜 잘 통하는지 한 문장",\n` +
          `  "worstComment": "안 맞는 캐릭터와 왜 티격태격할지 한 문장, 유쾌하게"\n` +
          `}`;

        for (const model of models) {
          try {
            const completion = await openai.chat.completions.create({
              model,
              response_format: { type: "json_object" },
              max_completion_tokens: 1000,
              messages: [
                {
                  role: "system",
                  content:
                    "너는 성격유형 테스트 결과를 재미있게 풀어 주는 작가다. " +
                    "MBTI 알파벳(E/I/S/N/T/F/J/P)이나 유형 코드는 절대 언급하지 마라. " +
                    "성향은 자연스러운 말로만 표현한다. 반드시 유효한 JSON 하나만 출력한다.",
                },
                { role: "user", content: userPrompt },
              ],
            });
            const txt = completion.choices[0]?.message?.content?.trim();
            if (!txt) continue;
            const parsed = JSON.parse(txt);
            if (parsed && typeof parsed === "object") {
              if (
                typeof parsed.chosenName === "string" &&
                candidates.includes(parsed.chosenName)
              ) {
                chosenName = parsed.chosenName;
              }
              if (typeof parsed.reason === "string") reason = parsed.reason.trim();
              if (typeof parsed.bestComment === "string")
                bestComment = parsed.bestComment.trim();
              if (typeof parsed.worstComment === "string")
                worstComment = parsed.worstComment.trim();
              if (reason) break;
            }
          } catch {
            // 다음 모델로 폴백
          }
        }
      } catch {
        // enrichment 실패 무시
      }
    }

    const chosen = findChar(chosenName);
    if (!reason) reason = fallbackReason(chosenName, chosen);

    return NextResponse.json({
      character: chosen ? publicChar(chosen) : null,
      reason,
      best: bestChar
        ? { name: bestChar.name, tagline: bestChar.tagline, index: bestChar.index, comment: bestComment }
        : null,
      worst: worstChar
        ? { name: worstChar.name, tagline: worstChar.tagline, index: worstChar.index, comment: worstComment }
        : null,
      // 디버그용(비공개): 유저 화면엔 표시하지 않음
      _debug: { mbti, tally },
    });
  } catch (err) {
    console.error("character API error:", err);
    return NextResponse.json(
      { error: "결과를 만드는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
