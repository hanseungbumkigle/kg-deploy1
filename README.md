# 🦕 나와 닮은 코코비 캐릭터 찾기

엉뚱한 질문 16개에 "예/아니오"로 답하면, 성향(MBTI)을 계산해 **꼭 닮은 코코비 캐릭터**를 찾아 주는 서비스입니다.
결과로 캐릭터 프로필과 함께 **잘 맞는 캐릭터 / 안 맞는 캐릭터**도 알려줍니다.
TypeScript + Next.js(App Router), Vercel 배포.

## 동작 개요

1. 16문항(예/아니오) → 4축(E/I·S/N·T/F·J/P) 점수 합산 → MBTI 산출 *(유저에겐 미표시)*
2. MBTI로 `resources/char_DB_live.csv`의 `result` 컬럼과 매칭 → 캐릭터 결정
3. 궁합표로 잘 맞음/안 맞음 캐릭터 산출
4. OpenAI로 "닮은 이유" 개인화 작문 + 궁합 코멘트 (+ 중복 타입일 때 캐릭터 선택)

## 로컬 실행

```bash
npm install
# .env.local 에 OPENAI_API_KEY 입력 후
npm run dev
```

http://localhost:3000

## 환경변수

| 이름 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 (필수) |
| `OPENAI_MODEL` | 사용 모델 (기본 `gpt-5.5`) |

## 데이터 / 이미지

- 캐릭터 원본: `resources/char_DB_live.csv` → `npm run build:data` 로 `app/data/characters.json`·`compatibility.json` 생성
- 문항: `app/data/questions.json`
- 캐릭터 이미지: `public/characters/{index}.png` (예: `coco.png`). 없으면 더미 아바타 자동 표시.

## 구조

```
app/
  page.tsx                 인트로→퀴즈→결과 UI
  api/character/route.ts   채점 + 매칭 + 궁합 + OpenAI (서버, 키 미노출)
  data/                    questions / characters / compatibility (JSON)
resources/char_DB_live.csv 캐릭터 원본 데이터
scripts/build-data.mjs     CSV → JSON 변환
```
