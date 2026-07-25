// resources/char_DB_live.csv 를 읽어
//  - app/data/characters.json    (캐릭터 목록 + MBTI별 인덱스)
//  - app/data/compatibility.json (16개 MBTI별 잘맞음/안맞음 캐릭터)
// 로 변환한다.
//
// 실행:  node scripts/build-data.mjs
//
// 궁합 규칙:
//  - 잘 맞음  = E/I 와 J/P 만 반전, 가운데(N/S·T/F) 유지  (상호보완형)
//  - 안 맞음  = 네 글자 모두 반전                          (정반대형)

import * as XLSX from "xlsx";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ALL_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
];

// --- CSV 파싱 (SheetJS 로 견고하게: 따옴표 안 콤마 처리) ---
const csvText = readFileSync(join(root, "resources", "char_DB_live.csv"), "utf-8");
const wb = XLSX.read(csvText, { type: "string" });
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

const FIELDS = [
  "result", "name", "age", "pros", "cons",
  "likes", "dislikes", "tagline", "description", "index",
];

const characters = raw.map((r) => {
  const o = {};
  for (const f of FIELDS) o[f] = typeof r[f] === "string" ? r[f].trim() : r[f];
  o.result = String(o.result).toUpperCase().trim();
  return o;
});

// --- MBTI별 인덱스 (대표 = CSV 등장 순서상 첫 번째) ---
const byType = {};
for (const c of characters) {
  (byType[c.result] ||= []).push(c.name);
}

// --- 검증: 16개 타입 모두 최소 1명 있는지 ---
const missing = ALL_TYPES.filter((t) => !byType[t]);
if (missing.length) {
  throw new Error(`다음 MBTI 타입에 매칭 캐릭터가 없습니다: ${missing.join(", ")}`);
}

// --- 궁합 계산 ---
const FLIP = { E: "I", I: "E", S: "N", N: "S", T: "F", F: "T", J: "P", P: "J" };
const bestMatch = (t) => FLIP[t[0]] + t[1] + t[2] + FLIP[t[3]];
const worstMatch = (t) => [...t].map((c) => FLIP[c]).join("");
const repName = (t) => byType[t][0]; // 대표 캐릭터 (ESFP는 코코)

const compatibility = {};
for (const t of ALL_TYPES) {
  const b = bestMatch(t);
  const w = worstMatch(t);
  if (!byType[b]) throw new Error(`${t}의 잘맞음 타입 ${b} 캐릭터 없음`);
  if (!byType[w]) throw new Error(`${t}의 안맞음 타입 ${w} 캐릭터 없음`);
  compatibility[t] = {
    best: { type: b, name: repName(b) },
    worst: { type: w, name: repName(w) },
  };
}

// --- 저장 ---
mkdirSync(join(root, "app", "data"), { recursive: true });
writeFileSync(
  join(root, "app", "data", "characters.json"),
  JSON.stringify({ characters, byType }, null, 2),
  "utf-8"
);
writeFileSync(
  join(root, "app", "data", "compatibility.json"),
  JSON.stringify(compatibility, null, 2),
  "utf-8"
);

// --- 리포트 ---
console.log(`✅ 캐릭터 ${characters.length}명, MBTI ${Object.keys(byType).length}종`);
const dups = Object.entries(byType).filter(([, v]) => v.length > 1);
if (dups.length) {
  console.log("   중복 타입:", dups.map(([t, v]) => `${t}(${v.join("/")})→대표 ${v[0]}`).join(", "));
}
console.log("\n=== 궁합표 ===");
for (const t of ALL_TYPES) {
  const c = compatibility[t];
  console.log(
    `${t} ${repName(t).padEnd(3)} | 잘맞음 ${c.best.type} ${c.best.name.padEnd(3)} | 안맞음 ${c.worst.type} ${c.worst.name}`
  );
}
console.log("\n생성: app/data/characters.json, app/data/compatibility.json");
