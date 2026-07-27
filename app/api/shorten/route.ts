import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 긴 공유 URL을 da.gd 무료 단축 서비스로 줄여준다 (서버 프록시 → CORS 회피).
// da.gd: 계정/키 불필요, 광고 경유 없이 원본으로 직접 리다이렉트.
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: "유효한 url이 필요합니다." }, { status: 400 });
    }

    const res = await fetch("https://da.gd/s", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "cocobi-quiz",
      },
      body: new URLSearchParams({ url }).toString(),
    });
    const text = (await res.text()).trim();

    // 성공 = 공백 없는 단일 URL (오류 메시지엔 공백 포함)
    if (res.ok && /^https?:\/\/\S+$/.test(text) && !/\s/.test(text)) {
      return NextResponse.json({ short: text });
    }
    return NextResponse.json({ error: text || "단축 실패" }, { status: 502 });
  } catch (err) {
    console.error("shorten error:", err);
    return NextResponse.json({ error: "단축 중 오류" }, { status: 500 });
  }
}
