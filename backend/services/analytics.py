from typing import Any

import numpy as np
import pandas as pd


def _safe_sum(series: pd.Series) -> float:
    return float(series.sum()) if series is not None and not series.empty else 0.0


def _df_to_records(df: pd.DataFrame, limit: int = 100) -> list[dict]:
    rows = df.head(limit).replace({np.nan: None}).to_dict(orient="records")
    for row in rows:
        for key, val in row.items():
            if hasattr(val, "isoformat"):
                row[key] = str(val)[:10]
            elif isinstance(val, (np.integer, np.floating)):
                row[key] = float(val) if isinstance(val, np.floating) else int(val)
    return rows


def join_erp_data(
    products: pd.DataFrame,
    customers: pd.DataFrame,
    orders: pd.DataFrame,
    order_details: pd.DataFrame,
) -> pd.DataFrame:
    products_clean = products.rename(columns={"unit_price": "list_price"})
    merged = order_details.merge(orders, on="order_id", how="left")
    merged = merged.merge(products_clean, on="product_id", how="left")
    merged = merged.merge(customers, on="customer_id", how="left")

    merged["revenue"] = merged["quantity"] * merged["unit_price"]
    merged["cost_total"] = merged["quantity"] * merged["cost"]
    merged["profit"] = merged["revenue"] - merged["cost_total"]
    merged["date"] = merged["order_date"]
    merged["product"] = merged["product_name"]
    merged["customer"] = merged["customer_name"]
    return merged


def build_dashboard_from_erp(
    products: pd.DataFrame,
    customers: pd.DataFrame,
    orders: pd.DataFrame,
    order_details: pd.DataFrame,
    upload_status: list[dict[str, Any]],
) -> dict[str, Any]:
    df = join_erp_data(products, customers, orders, order_details)

    total_revenue = _safe_sum(df["revenue"])
    total_cost = _safe_sum(df["cost_total"])
    total_profit = _safe_sum(df["profit"])
    total_quantity = _safe_sum(df["quantity"])
    order_count = orders["order_id"].nunique()

    kpis = {
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(total_profit, 2),
        "total_quantity": round(total_quantity, 2),
        "profit_margin": round((total_profit / total_revenue * 100) if total_revenue else 0, 2),
        "avg_order_value": round(total_revenue / order_count, 2) if order_count else 0,
        "row_count": len(df),
        "order_count": int(order_count),
        "product_count": int(products["product_id"].nunique()),
        "customer_count": int(customers["customer_id"].nunique()),
    }

    monthly_trend: list[dict] = []
    if df["date"].notna().any():
        temp = df.dropna(subset=["date"]).copy()
        temp["month"] = temp["date"].dt.to_period("M").astype(str)
        grouped = temp.groupby("month").agg(revenue=("revenue", "sum"), profit=("profit", "sum")).reset_index()
        for _, row in grouped.iterrows():
            monthly_trend.append({
                "month": row["month"],
                "revenue": round(float(row["revenue"]), 2),
                "profit": round(float(row["profit"]), 2),
            })

    category_breakdown: list[dict] = []
    grouped = df.groupby("category")["revenue"].sum().sort_values(ascending=False).head(10)
    category_breakdown = [{"name": str(k), "value": round(float(v), 2)} for k, v in grouped.items()]

    product_top: list[dict] = []
    grouped = df.groupby("product")["revenue"].sum().sort_values(ascending=False).head(10)
    product_top = [{"name": str(k), "value": round(float(v), 2)} for k, v in grouped.items()]

    region_breakdown: list[dict] = []
    grouped = df.groupby("region")["revenue"].sum().sort_values(ascending=False).head(10)
    region_breakdown = [{"name": str(k), "value": round(float(v), 2)} for k, v in grouped.items()]

    customer_top: list[dict] = []
    grouped = df.groupby("customer")["revenue"].sum().sort_values(ascending=False).head(10)
    customer_top = [{"name": str(k), "value": round(float(v), 2)} for k, v in grouped.items()]

    summary_table: list[dict] = []
    agg = df.groupby("category").agg(
        revenue=("revenue", "sum"),
        quantity=("quantity", "sum"),
        profit=("profit", "sum"),
    ).reset_index().sort_values("revenue", ascending=False).head(15)
    for _, row in agg.iterrows():
        summary_table.append({
            "group": str(row["category"]),
            "revenue": round(float(row["revenue"]), 2),
            "quantity": round(float(row["quantity"]), 2),
            "profit": round(float(row["profit"]), 2),
        })

    return {
        "meta": {
            "upload_status": upload_status,
            "row_counts": {
                "products": len(products),
                "customers": len(customers),
                "orders": len(orders),
                "order_details": len(order_details),
            },
        },
        "kpis": kpis,
        "monthly_trend": monthly_trend,
        "category_breakdown": category_breakdown,
        "product_top": product_top,
        "region_breakdown": region_breakdown,
        "customer_top": customer_top,
        "summary_table": summary_table,
        "summary_group_by": "category",
    }


def build_raw_data(
    products: pd.DataFrame,
    customers: pd.DataFrame,
    orders: pd.DataFrame,
    order_details: pd.DataFrame,
) -> dict[str, Any]:
    return {
        "products": {"label": "상품", "rows": _df_to_records(products), "total": len(products)},
        "customers": {"label": "고객", "rows": _df_to_records(customers), "total": len(customers)},
        "orders": {"label": "주문", "rows": _df_to_records(orders), "total": len(orders)},
        "order_details": {"label": "주문상세", "rows": _df_to_records(order_details), "total": len(order_details)},
    }


def dashboard_to_text(dashboard: dict[str, Any]) -> str:
    kpis = dashboard["kpis"]
    lines = [
        f"총 매출: {kpis['total_revenue']:,.0f}원",
        f"총 원가: {kpis['total_cost']:,.0f}원",
        f"총 이익: {kpis['total_profit']:,.0f}원",
        f"이익률: {kpis['profit_margin']}%",
        f"총 수량: {kpis['total_quantity']:,.0f}",
        f"주문 건수: {kpis['order_count']}",
        f"상품 수: {kpis['product_count']}",
        f"고객 수: {kpis['customer_count']}",
    ]
    if dashboard["monthly_trend"]:
        lines.append("\n[월별 추이]")
        for item in dashboard["monthly_trend"]:
            lines.append(f"  {item['month']}: 매출 {item.get('revenue', 0):,.0f}원, 이익 {item.get('profit', 0):,.0f}원")
    if dashboard["category_breakdown"]:
        lines.append("\n[카테고리별 매출 TOP]")
        for item in dashboard["category_breakdown"][:5]:
            lines.append(f"  {item['name']}: {item['value']:,.0f}원")
    if dashboard["product_top"]:
        lines.append("\n[제품별 매출 TOP]")
        for item in dashboard["product_top"][:5]:
            lines.append(f"  {item['name']}: {item['value']:,.0f}원")
    if dashboard.get("customer_top"):
        lines.append("\n[고객별 매출 TOP]")
        for item in dashboard["customer_top"][:5]:
            lines.append(f"  {item['name']}: {item['value']:,.0f}원")
    return "\n".join(lines)
