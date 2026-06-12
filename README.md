# ERP 경영 대시보드 & Gemini AI 분석 보고서

ERP CSV 4종(상품·고객·주문·주문상세)을 업로드하면 경영 대시보드가 생성되고, Gemini 3.1 Flash Lite AI가 분석 보고서를 작성합니다.

## 메뉴 구성

| 메뉴 | 설명 |
|------|------|
| **데이터입력** | CSV 4종 선택 및 불러오기 |
| **대시보드** | KPI, 차트, 집계표 |
| **분석보고서** | Gemini AI 분석 + PDF/Word 다운로드 |
| **원본데이터** | 업로드된 CSV 원본 조회 |

## CSV 파일 (순서대로 4종)

1. **상품** — 상품ID, 상품명, 카테고리, 단가, 원가
2. **고객** — 고객ID, 고객명, 지역, 업종
3. **주문** — 주문ID, 고객ID, 주문일, 상태
4. **주문상세** — 주문ID, 상품ID, 수량, 판매단가

파일 선택 후 **데이터 불러오기** 또는 **샘플 데이터 불러오기** 버튼을 클릭해야 데이터가 로드됩니다.

## 실행 방법

```bash
# 백엔드
cd backend
.\venv\Scripts\uvicorn main:app --reload --port 8000

# 프론트엔드
cd frontend
npm run dev
```

http://localhost:5173 접속

## 샘플 데이터

`sample_data/` 폴더에 4종 CSV 샘플 파일이 있습니다.

## Vercel 배포

이 프로젝트는 **Vercel Services**(프론트 + 백엔드 단일 프로젝트)로 배포합니다.

### 1. Vercel 프로젝트 설정

- GitHub 저장소 연결: `mungui128-afk/aidata`
- **Framework Preset**: `Services` 선택 (중요)
- Root Directory: `.` (저장소 루트)

### 2. 환경 변수 (Vercel Dashboard → Settings → Environment Variables)

| 변수 | 값 |
|------|-----|
| `GEMINI_API_KEY` | Gemini API 키 |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` |

### 3. `vercel.json` 구조 (루트)

```json
{
  "experimentalServices": {
    "frontend": {
      "entrypoint": "frontend",
      "routePrefix": "/",
      "framework": "vite"
    },
    "backend": {
      "entrypoint": "backend/main.py",
      "routePrefix": "/api",
      "framework": "fastapi"
    }
  }
}
```

> ⚠️ `root`가 아니라 **`entrypoint`** 를 사용해야 합니다. 백엔드는 디렉터리가 아니라 **`backend/main.py` 파일**을 지정합니다.

### 4. 로컬에서 Vercel Services 테스트

```bash
npm i -g vercel
vercel dev -L
```

### 5. 주의사항

- Serverless 환경에서는 **세션 데이터가 함수 재시작 시 초기화**될 수 있습니다.
- AI 보고서 생성은 시간이 걸릴 수 있어 `maxDuration: 60`을 설정했습니다.
