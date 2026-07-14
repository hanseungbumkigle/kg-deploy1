# 🔮 전생 이야기 (Past Life)

이름을 입력하면 OpenAI GPT가 그 사람의 전생을 이야기로 써 주는 한 기능짜리 웹 서비스입니다.
TypeScript + Next.js(App Router)로 만들어졌고 Vercel 배포에 최적화되어 있습니다.

## 로컬 실행

```bash
npm install
# .env.local 파일에 OPENAI_API_KEY 를 넣은 뒤
npm run dev
```

http://localhost:3000 접속.

## 환경변수

| 이름 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 (필수) |
| `OPENAI_MODEL` | 사용할 모델명 (선택, 기본 `gpt-5.5`) |

- 로컬: `.env.local` 파일에 입력
- Vercel: 프로젝트 Settings → Environment Variables 에 동일하게 입력

## 구조

```
app/
  page.tsx              입력창 UI (클라이언트)
  api/past-life/route.ts  OpenAI 호출 (서버, 키 노출 없음)
```

API 키는 서버 사이드(route.ts)에서만 사용되며 브라우저로 전달되지 않습니다.
