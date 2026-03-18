# MARS V&V Manager

MARS(다중 사고 대응 시뮬레이션) 코드의 검증 및 확인(V&V)을 관리하는 웹 애플리케이션.

## 기술 스택

- **Frontend**: React 19 + TypeScript, Vite, MUI 7, TanStack React Query
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **배포**: Vercel

## 프로젝트 구조

```
/vnv-manager
├── frontend/               # React 앱 (Vite)
│   ├── src/
│   │   ├── pages/         # LoginPage, DashboardPage, InputFilesPage, MarsVersionsPage, ResultUploadPage, SettingsPage
│   │   ├── components/    # Layout, ProtectedRoute, CategorySelect
│   │   ├── contexts/      # AuthContext (인증 + 역할)
│   │   ├── services/      # Supabase API 호출 (inputFiles, marsVersions, simulationResults, settings)
│   │   ├── types/         # TypeScript 인터페이스
│   │   └── utils/         # categories, plotflParser
│   ├── supabase-schema.sql # DB 스키마 (테이블, RLS, 트리거, Storage 정책)
│   └── .env               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── assessment-manuals/     # 평가 매뉴얼 문서
├── input-files/            # 입력 파일 원본
└── .mcp.json               # Supabase MCP 서버 설정
```

## 개발 명령어

```bash
cd frontend
npm run dev       # 개발 서버
npm run build     # 빌드 (tsc + vite build)
npm run lint      # ESLint
npm run preview   # 빌드 미리보기
```

## 주요 규칙

- **언어**: 코드는 영어, 주석/문서/대화는 한국어
- **빌드 체크**: 직접 실행하지 말고, 사용자에게 실행하라고 안내만 할 것
- **DB 스키마**: 변경 시 `frontend/supabase-schema.sql` 파일도 반드시 동기화
- **RLS**: 현재 개발 중이므로 모든 테이블 DISABLE 상태. 프로덕션 전에 ENABLE 필요
- **인증**: Supabase Auth (email/password), 역할은 user_roles 테이블 (admin/user)
- **Storage 버킷**: input-files, plotfl-results
