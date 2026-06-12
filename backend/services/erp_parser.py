import io
import re
from typing import Any, Literal

import pandas as pd

CsvType = Literal["products", "customers", "orders", "order_details"]

CSV_TYPE_ORDER: list[CsvType] = ["products", "customers", "orders", "order_details"]

CSV_TYPE_LABELS: dict[CsvType, str] = {
    "products": "상품",
    "customers": "고객",
    "orders": "주문",
    "order_details": "주문상세",
}

SCHEMAS: dict[CsvType, dict[str, list[str]]] = {
    "products": {
        "product_id": ["product_id", "상품id", "상품ID", "품목id", "품목ID"],
        "product_name": ["product_name", "상품명", "품목명", "제품명"],
        "category": ["category", "카테고리", "분류"],
        "unit_price": ["unit_price", "unit_price_krw", "단가", "판매단가", "가격", "price"],
        "cost": ["cost", "unit_cost_krw", "원가", "원가액", "cost_krw"],
    },
    "customers": {
        "customer_id": ["customer_id", "고객id", "고객ID"],
        "customer_name": ["customer_name", "고객명", "거래처명", "회사명", "name"],
        "region": ["region", "지역", "권역", "city", "도시"],
        "industry": ["industry", "업종", "산업", "customer_type", "고객유형"],
    },
    "orders": {
        "order_id": ["order_id", "order_no", "주문id", "주문ID", "주문번호"],
        "customer_id": ["customer_id", "고객id", "고객ID"],
        "order_date": ["order_date", "주문일", "날짜", "일자", "date"],
        "status": ["status", "상태", "주문상태"],
    },
    "order_details": {
        "order_id": ["order_id", "order_no", "주문id", "주문ID", "주문번호"],
        "product_id": ["product_id", "상품id", "상품ID"],
        "quantity": ["quantity", "수량", "qty", "qnt"],
        "unit_price": ["unit_price", "unit_price_krw", "판매단가", "단가", "amount_krw"],
    },
}


def _normalize_col(name: str) -> str:
    return re.sub(r"\s+", "", str(name).strip().lower())


def _detect_column(columns: list[str], aliases: list[str]) -> str | None:
    normalized = {_normalize_col(c): c for c in columns}
    for alias in aliases:
        key = _normalize_col(alias)
        if key in normalized:
            return normalized[key]
    return None


def _read_csv_bytes(content: bytes) -> pd.DataFrame:
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
    return df


def parse_typed_csv(content: bytes, csv_type: CsvType, filename: str = "") -> tuple[pd.DataFrame, dict[str, Any]]:
    df = _read_csv_bytes(content)
    schema = SCHEMAS[csv_type]
    mapping: dict[str, str | None] = {
        field: _detect_column(list(df.columns), aliases) for field, aliases in schema.items()
    }
    missing = [field for field, col in mapping.items() if col is None]
    if missing:
        label = CSV_TYPE_LABELS[csv_type]
        raise ValueError(f"[{label}] 필수 컬럼이 없습니다: {', '.join(missing)}")

    rename_map = {orig: field for field, orig in mapping.items() if orig}
    df = df.rename(columns=rename_map)

    for id_col in ("product_id", "customer_id", "order_id"):
        if id_col in df.columns:
            df[id_col] = df[id_col].astype(str).str.strip()

    if csv_type == "orders" and "order_date" in df.columns:
        df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")

    numeric_cols = {
        "products": ("unit_price", "cost"),
        "order_details": ("quantity", "unit_price"),
    }.get(csv_type, ())

    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col].astype(str).str.replace(",", "").str.replace("₩", "").str.replace("원", ""),
                errors="coerce",
            )

    meta = {
        "csv_type": csv_type,
        "label": CSV_TYPE_LABELS[csv_type],
        "filename": filename,
        "row_count": len(df),
        "columns": list(df.columns),
    }
    return df, meta
