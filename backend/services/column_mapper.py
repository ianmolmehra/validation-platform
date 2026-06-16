"""
Flexible column alias mapper — maps hundreds of real-world column name
variations to canonical internal field names.  No error on mismatch.
"""
from __future__ import annotations
import re
from typing import Optional

# ── canonical name → list of accepted aliases (all lower-cased) ──────────────
COLUMN_ALIASES: dict[str, list[str]] = {
    "order_id": [
        "order_id", "orderid", "order id", "order no", "orderno",
        "order number", "ordernumber", "order_no", "sale_id", "saleid",
        "transaction_id", "transactionid", "invoice_id", "invoiceid",
        "ref_id", "reference_id",
    ],
    "order_date": [
        "order_date", "orderdate", "order date", "date", "sale_date",
        "saledate", "transaction_date", "transactiondate", "invoice_date",
        "invoicedate", "purchase_date", "created_at", "created date",
    ],
    "customer_name": [
        "customer_name", "customername", "customer name", "client_name",
        "clientname", "client name", "buyer_name", "buyername",
        "name", "full_name", "fullname", "contact_name",
    ],
    "customer_phone": [
        "customer_phone", "customerphone", "customer phone", "phone",
        "phone_number", "phonenumber", "mobile", "mobile_number",
        "mobilenumber", "contact", "contact_number", "contactnumber",
        "tel", "telephone", "cell", "cell_phone",
    ],
    "country": [
        "country", "country_name", "countryname", "nation",
        "region", "location", "origin", "source_country",
    ],
    "order_amount": [
        "order_amount", "orderamount", "order amount", "amount",
        "total", "total_amount", "totalamount", "sale_amount",
        "saleamount", "invoice_amount", "invoiceamount", "revenue",
        "price_total", "grand_total", "grandtotal",
    ],
    "product_id": [
        "product_id", "productid", "product id", "item_id",
        "itemid", "sku", "sku_id", "skuid", "prod_id",
        "article_id", "articleid",
    ],
    "product_name": [
        "product_name", "productname", "product name", "item",
        "item_name", "itemname", "product", "description",
        "prod_name", "article", "article_name",
    ],
    "quantity": [
        "quantity", "qty", "units", "count", "no_of_units",
        "num_units", "pieces", "pcs", "volume",
    ],
    "unit_price": [
        "unit_price", "unitprice", "unit price", "price",
        "price_per_unit", "priceperunit", "rate", "cost",
        "unit_cost", "unitcost", "selling_price", "sellingprice",
    ],
    "payment_mode": [
        "payment_mode", "paymentmode", "payment mode", "payment_method",
        "paymentmethod", "payment method", "pay_mode", "mode",
        "payment_type", "paymenttype",
    ],
    "payment_status": [
        "payment_status", "paymentstatus", "payment status", "status",
        "pay_status", "txn_status", "transaction_status",
    ],
    "transaction_ref": [
        "transaction_ref", "transactionref", "transaction ref",
        "transaction_reference", "transactionreference",
        "txn_ref", "txnref", "ref_no", "refno", "reference",
        "reference_number", "referencenumber", "txn_id",
        "transaction reference number", "transaction_reference_number",
        "txn_reference", "txn reference", "ref number", "ref_number",
    ],
}

# Pre-built lookup: alias → canonical
_ALIAS_LOOKUP: dict[str, str] = {}
for canonical, aliases in COLUMN_ALIASES.items():
    for alias in aliases:
        _ALIAS_LOOKUP[alias] = canonical


def _normalize(col: str) -> str:
    """Lowercase + collapse whitespace/underscores/dashes."""
    return re.sub(r"[\s_\-]+", " ", col.strip().lower())


def map_columns(raw_columns: list[str]) -> dict[str, Optional[str]]:
    """
    Given the actual columns from a CSV/XLSX, return a mapping of
    canonical_name → actual_column_name (or None if not found).
    """
    canonical_to_actual: dict[str, Optional[str]] = {c: None for c in COLUMN_ALIASES}
    for raw_col in raw_columns:
        key = _normalize(raw_col)
        canonical = _ALIAS_LOOKUP.get(key)
        if canonical and canonical_to_actual[canonical] is None:
            canonical_to_actual[canonical] = raw_col
    return canonical_to_actual


def missing_required_columns(mapping: dict[str, Optional[str]]) -> list[str]:
    required = [
        "order_id", "order_date", "customer_name", "customer_phone",
        "country", "order_amount", "product_id", "product_name",
        "quantity", "unit_price", "payment_mode", "payment_status",
        "transaction_ref",
    ]
    return [col for col in required if mapping.get(col) is None]
