import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from services.analytics import build_dashboard_from_erp, build_raw_data, dashboard_to_text
from services.erp_parser import CSV_TYPE_LABELS, CSV_TYPE_ORDER, CsvType, parse_typed_csv
from services.gemini_service import generate_analysis_report
from services.report_generator import generate_docx, generate_pdf

app = FastAPI(title="ERP 경영 대시보드 API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vercel Services: routePrefix="/api" 이므로 앱 내부 경로는 /api 없이 정의
# 로컬 uvicorn: /api prefix 로 동일 URL 유지
IS_VERCEL = os.getenv("VERCEL") == "1"
API_PREFIX = "" if IS_VERCEL else "/api"

router = APIRouter()

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_data"
sessions: dict[str, dict[str, Any]] = {}


def _empty_upload_status() -> list[dict[str, Any]]:
    return [
        {"type": t, "label": CSV_TYPE_LABELS[t], "uploaded": False, "filename": None, "row_count": 0}
        for t in CSV_TYPE_ORDER
    ]


def _process_csv_files(files: dict[CsvType, tuple[bytes, str]]) -> dict[str, Any]:
    parsed: dict[CsvType, Any] = {}
    upload_status: list[dict[str, Any]] = []

    for csv_type in CSV_TYPE_ORDER:
        content, filename = files[csv_type]
        df, meta = parse_typed_csv(content, csv_type, filename)
        parsed[csv_type] = df
        upload_status.append({
            "type": csv_type,
            "label": CSV_TYPE_LABELS[csv_type],
            "uploaded": True,
            "filename": filename,
            "row_count": meta["row_count"],
        })

    dashboard = build_dashboard_from_erp(
        parsed["products"],
        parsed["customers"],
        parsed["orders"],
        parsed["order_details"],
        upload_status,
    )
    raw_data = build_raw_data(
        parsed["products"],
        parsed["customers"],
        parsed["orders"],
        parsed["order_details"],
    )

    return {
        "products": parsed["products"],
        "customers": parsed["customers"],
        "orders": parsed["orders"],
        "order_details": parsed["order_details"],
        "upload_status": upload_status,
        "dashboard": dashboard,
        "raw_data": raw_data,
        "report": None,
    }


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/session")
def create_session():
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "upload_status": _empty_upload_status(),
        "loaded": False,
    }
    return {"session_id": session_id, "upload_status": _empty_upload_status()}


@router.get("/session/{session_id}/status")
def get_session_status(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    return {
        "session_id": session_id,
        "loaded": session.get("loaded", False),
        "upload_status": session.get("upload_status", _empty_upload_status()),
    }


@router.post("/load")
async def load_data(
    products: UploadFile = File(...),
    customers: UploadFile = File(...),
    orders: UploadFile = File(...),
    order_details: UploadFile = File(...),
    session_id: str | None = Form(None),
):
    file_map = {
        "products": products,
        "customers": customers,
        "orders": orders,
        "order_details": order_details,
    }

    contents: dict[CsvType, tuple[bytes, str]] = {}
    for csv_type in CSV_TYPE_ORDER:
        f = file_map[csv_type]
        if not f.filename or not f.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail=f"[{CSV_TYPE_LABELS[csv_type]}] CSV 파일이 필요합니다.")
        contents[csv_type] = (await f.read(), f.filename)

    try:
        result = _process_csv_files(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    sid = session_id or str(uuid.uuid4())
    sessions[sid] = {**result, "loaded": True}

    return {
        "session_id": sid,
        "upload_status": result["upload_status"],
        "dashboard": result["dashboard"],
        "raw_data": result["raw_data"],
    }


@router.post("/load/sample")
def load_sample_data(session_id: str | None = None):
    sample_files = {
        "products": "products.csv",
        "customers": "customers.csv",
        "orders": "orders.csv",
        "order_details": "order_details.csv",
    }

    contents: dict[CsvType, tuple[bytes, str]] = {}
    for csv_type, filename in sample_files.items():
        path = SAMPLE_DIR / filename
        if not path.exists():
            raise HTTPException(status_code=500, detail=f"샘플 파일이 없습니다: {filename}")
        contents[csv_type] = (path.read_bytes(), filename)

    try:
        result = _process_csv_files(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    sid = session_id or str(uuid.uuid4())
    sessions[sid] = {**result, "loaded": True}

    return {
        "session_id": sid,
        "upload_status": result["upload_status"],
        "dashboard": result["dashboard"],
        "raw_data": result["raw_data"],
    }


@router.get("/dashboard/{session_id}")
def get_dashboard(session_id: str):
    session = sessions.get(session_id)
    if not session or not session.get("loaded"):
        raise HTTPException(status_code=404, detail="데이터가 로드되지 않았습니다.")
    return session["dashboard"]


@router.get("/raw-data/{session_id}")
def get_raw_data(session_id: str):
    session = sessions.get(session_id)
    if not session or not session.get("loaded"):
        raise HTTPException(status_code=404, detail="데이터가 로드되지 않았습니다.")
    return session["raw_data"]


@router.post("/report/generate/{session_id}")
def generate_report(session_id: str):
    session = sessions.get(session_id)
    if not session or not session.get("loaded"):
        raise HTTPException(status_code=404, detail="데이터가 로드되지 않았습니다.")

    dashboard = session["dashboard"]
    data_summary = dashboard_to_text(dashboard)

    try:
        report = generate_analysis_report(dashboard, data_summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 보고서 생성 실패: {str(e)}") from e

    session["report"] = report
    return {"session_id": session_id, "report": report}


@router.get("/report/download/{session_id}")
def download_report(session_id: str, format: str = "pdf"):
    session = sessions.get(session_id)
    if not session or not session.get("loaded"):
        raise HTTPException(status_code=404, detail="데이터가 로드되지 않았습니다.")
    if not session.get("report"):
        raise HTTPException(status_code=400, detail="먼저 AI 보고서를 생성해주세요.")

    dashboard = session["dashboard"]
    report = session["report"]

    if format == "pdf":
        content = generate_pdf(dashboard, report)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="erp_report.pdf"'},
        )
    if format == "docx":
        content = generate_docx(dashboard, report)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": 'attachment; filename="erp_report.docx"'},
        )
    raise HTTPException(status_code=400, detail="format은 pdf 또는 docx만 지원합니다.")


app.include_router(router, prefix=API_PREFIX)
