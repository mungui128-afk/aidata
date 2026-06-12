import json
import os
from typing import Any

from dotenv import load_dotenv
from google import genai

load_dotenv()

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")
    return genai.Client(api_key=api_key)


def generate_analysis_report(dashboard: dict[str, Any], data_summary: str) -> dict[str, Any]:
    client = _get_client()
    kpis = dashboard["kpis"]

    prompt = f"""당신은 ERP 데이터 분석 전문가입니다. 아래 경영 데이터를 분석하여 한국어 경영 분석 보고서를 작성하세요.

## KPI 요약
- 총 매출: {kpis['total_revenue']:,.0f}원
- 총 원가: {kpis['total_cost']:,.0f}원
- 총 이익: {kpis['total_profit']:,.0f}원
- 이익률: {kpis['profit_margin']}%
- 거래 건수: {kpis['row_count']}건

## 상세 데이터
{data_summary}

다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON만):
{{
  "title": "보고서 제목",
  "executive_summary": "경영진 요약 (3-5문장)",
  "sections": [
    {{
      "heading": "섹션 제목",
      "content": "분석 내용 (2-4문단)",
      "insights": ["핵심 인사이트1", "핵심 인사이트2"]
    }}
  ],
  "recommendations": ["권고사항1", "권고사항2", "권고사항3"],
  "risk_factors": ["리스크1", "리스크2"],
  "outlook": "향후 전망 (2-3문장)"
}}
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config={
            "temperature": 0.4,
            "response_mime_type": "application/json",
        },
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    report = json.loads(text)
    report["generated_by"] = MODEL
    return report
