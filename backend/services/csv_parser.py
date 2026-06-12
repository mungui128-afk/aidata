import io
import re
from typing import Any

import pandas as pd

COLUMN_ALIASES: dict[str, list[str]] = {
    "date": ["date", "날짜", "일자", "거래일", "transaction_date", "order_date"],
    "product": ["product", "제품", "품목", "상품", "item", "product_name"],
    "category": ["category", "카테고리", "분류", "부문", "department", "dept"],
    "revenue": ["revenue", "매출", "금액", "sales", "amount", "total", "판매금액", "매출액"],
    "cost": ["cost", "원가", "비용", "purchase_cost", "원가액"],
    "quantity": ["quantity", "수량", "qty", "판매수량"],
    "region": ["region", "지역", "권역", "area", "location"],
    "customer": ["customer", "고객", "거래처", "client", "buyer"],
    "profit": ["profit", "이익", "순이익", "margin"],
}


def _normalize_col(name: str) -> str:
    return re.sub(r"\s+", "", str(name).strip().lower())


def _detect_column(columns: list[str], field: str) -> str | None:
    normalized = {_normalize_col(c): c for c in columns}
    for alias in COLUMN_ALIASES.get(field, []):
        key = _normalize_col(alias)
        if key in normalized:
            return normalized[key]
    return None


def parse_erp_csv(content: bytes, filename: str = "") -> tuple[pd.DataFrame, dict[str, Any]]:
    for encoding in ("utf-8-sig", "utf-8", "cp949", "euc-kr"):
        try:
            df = pd.read_csv(io.BytesIO(content), encoding=encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("CSV 파일 인코딩을 인식할 수 없습니다.")

    if df.empty:
        raise ValueError("CSV 파일에 데이터가 없습니다.")

    df.columns = [str(c).strip() for c in df.columns]
    mapping: dict[str, str | None] = {field: _detect_column(list(df.columns), field) for field in COLUMN_ALIASES}

    rename_map = {orig: field for field, orig in mapping.items() if orig}
    df = df.rename(columns=rename_map)

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    for num_col in ("revenue", "cost", "quantity", "profit"):
        if num_col in df.columns:
            df[num_col] = pd.to_numeric(
                df[num_col].astype(str).str.replace(",", "").str.replace("₩", "").str.replace("원", ""),
                errors="coerce",
            )

    if "profit" not in df.columns and "revenue" in df.columns and "cost" in df.columns:
        df["profit"] = df["revenue"] - df["cost"]

    meta = {
        "filename": filename,
        "row_count": len(df),
        "columns_detected": {k: v for k, v in mapping.items() if v},
        "columns_original": list(df.columns),
    }
    return df, meta
