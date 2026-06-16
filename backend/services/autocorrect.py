"""
Auto-correction engine — normalises phone numbers, country names,
dates and free-text fields.  Returns (corrected_value, was_corrected).
"""
from __future__ import annotations
import re
from datetime import datetime
from typing import Optional

# ── Country name normalisation ────────────────────────────────────────────────
COUNTRY_ALIASES: dict[str, str] = {
    # India
    "india": "India", "ind": "India", "in": "India", "bharat": "India",
    # USA
    "usa": "USA", "us": "USA", "united states": "USA",
    "united states of america": "USA", "america": "USA", "u.s.a": "USA", "u.s": "USA",
    # UK
    "uk": "UK", "united kingdom": "UK", "great britain": "UK",
    "gb": "UK", "england": "UK", "britain": "UK",
    # Singapore
    "singapore": "Singapore", "sg": "Singapore", "sin": "Singapore",
    # Australia
    "australia": "Australia", "aus": "Australia", "au": "Australia",
    # Canada
    "canada": "Canada", "can": "Canada", "ca": "Canada",
    # Germany
    "germany": "Germany", "ger": "Germany", "de": "Germany", "deutschland": "Germany",
    # France
    "france": "France", "fr": "France",
    # Japan
    "japan": "Japan", "jpn": "Japan", "jp": "Japan",
    # China
    "china": "China", "chn": "China", "cn": "China", "prc": "China",
    # Brazil
    "brazil": "Brazil", "bra": "Brazil", "br": "Brazil", "brasil": "Brazil",
    # UAE
    "uae": "UAE", "united arab emirates": "UAE", "dubai": "UAE", "abu dhabi": "UAE",
    # South Africa
    "south africa": "South Africa", "za": "South Africa", "rsa": "South Africa",
    # Nigeria
    "nigeria": "Nigeria", "nga": "Nigeria", "ng": "Nigeria",
    # Kenya
    "kenya": "Kenya", "ken": "Kenya", "ke": "Kenya",
    # Mexico
    "mexico": "Mexico", "mex": "Mexico", "mx": "Mexico", "méxico": "Mexico",
    # Russia
    "russia": "Russia", "rus": "Russia", "ru": "Russia", "russian federation": "Russia",
    # South Korea
    "south korea": "South Korea", "korea": "South Korea", "kr": "South Korea",
    "republic of korea": "South Korea",
    # Italy
    "italy": "Italy", "ita": "Italy", "it": "Italy", "italia": "Italy",
    # Turkey
    "turkey": "Turkey", "tur": "Turkey", "tr": "Turkey", "türkiye": "Turkey",
    # Poland
    "poland": "Poland", "pol": "Poland", "pl": "Poland", "polska": "Poland",
    # Norway
    "norway": "Norway", "nor": "Norway", "no": "Norway", "norge": "Norway",
    # Sweden
    "sweden": "Sweden", "swe": "Sweden", "se": "Sweden", "sverige": "Sweden",
    # Ghana
    "ghana": "Ghana", "gha": "Ghana", "gh": "Ghana",
    # Senegal
    "senegal": "Senegal", "sen": "Senegal", "sn": "Senegal",
    # Burkina Faso
    "burkina faso": "Burkina Faso", "bf": "Burkina Faso", "burkina": "Burkina Faso",
    # Morocco
    "morocco": "Morocco", "mar": "Morocco", "ma": "Morocco", "maroc": "Morocco",
    # Algeria
    "algeria": "Algeria", "dza": "Algeria", "dz": "Algeria", "algérie": "Algeria",
    # Saudi Arabia
    "saudi arabia": "Saudi Arabia", "ksa": "Saudi Arabia", "sa": "Saudi Arabia",
    "saudi": "Saudi Arabia",
    # Pakistan
    "pakistan": "Pakistan", "pak": "Pakistan", "pk": "Pakistan",
    # Bangladesh
    "bangladesh": "Bangladesh", "bgd": "Bangladesh", "bd": "Bangladesh",
    # Czech Republic
    "czech republic": "Czech Republic", "czechia": "Czech Republic", "cz": "Czech Republic",
    # Greece
    "greece": "Greece", "grc": "Greece", "gr": "Greece", "hellas": "Greece",
    # Ireland
    "ireland": "Ireland", "irl": "Ireland", "ie": "Ireland", "éire": "Ireland",
    # Portugal
    "portugal": "Portugal", "prt": "Portugal", "pt": "Portugal",
    # Netherlands
    "netherlands": "Netherlands", "nld": "Netherlands", "nl": "Netherlands",
    "holland": "Netherlands",
    # Spain
    "spain": "Spain", "esp": "Spain", "es": "Spain", "españa": "Spain",
}

DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
    "%d-%m-%Y", "%m-%d-%Y",
    "%d-%b-%Y", "%d-%B-%Y",
    "%Y/%m/%d", "%b %d, %Y", "%B %d, %Y",
    "%d %b %Y", "%d %B %Y",
    "%Y%m%d",
]


def normalize_country(raw: str) -> tuple[str, bool]:
    if not raw or str(raw).strip() in ("", "nan", "None"):
        return raw, False
    cleaned = str(raw).strip()
    canonical = COUNTRY_ALIASES.get(cleaned.lower())
    if canonical:
        # Return alias result; was_corrected only if value actually changed
        return canonical, canonical != cleaned
    # Title-case fallback for unknown countries not in alias list
    titled = cleaned.title()
    if titled != cleaned:
        return titled, True
    return cleaned, False


def normalize_phone(
    raw: str,
    expected_digits: Optional[int] = None,
    country_prefix: Optional[str] = None,
) -> tuple[str, bool]:
    if not raw or str(raw).strip() in ("", "nan", "None"):
        return raw, False
    original = str(raw).strip()
    # Strip formatting characters
    digits_only = re.sub(r"[\s\-\(\)\+\. ]", "", original)

    if expected_digits and len(digits_only) > expected_digits:
        # Try stripping country code from LEFT first (most accurate)
        if country_prefix:
            prefix_digits = re.sub(r"\D", "", country_prefix)
            if digits_only.startswith(prefix_digits) and len(digits_only) - len(prefix_digits) == expected_digits:
                digits_only = digits_only[len(prefix_digits):]
            elif digits_only.startswith("00" + prefix_digits):
                digits_only = digits_only[2 + len(prefix_digits):]
        # Fallback: strip from right
        if len(digits_only) > expected_digits:
            digits_only = digits_only[-expected_digits:]

    original_stripped = re.sub(r"[\s\-\(\)\+\. ]", "", original)
    corrected = digits_only != original_stripped
    return digits_only, corrected


def normalize_date(raw: str) -> tuple[str, bool]:
    if not raw or str(raw).strip() in ("", "nan", "None", "NaT"):
        return raw, False
    original = str(raw).strip()
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(original, fmt)
            iso = dt.strftime("%Y-%m-%d")
            return iso, (iso != original)
        except ValueError:
            continue
    return original, False


def normalize_text(raw: str) -> tuple[str, bool]:
    if not raw or str(raw).strip() in ("", "nan", "None"):
        return raw, False
    original = str(raw)
    cleaned = " ".join(original.split()).strip()
    return cleaned, cleaned != original


def normalize_payment_mode(raw: str) -> tuple[str, bool]:
    if not raw or str(raw).strip() in ("", "nan", "None"):
        return raw, False
    VALID = {"Card", "Cash", "UPI", "Wallet", "Net Banking"}
    ALIASES = {
        "card": "Card", "credit card": "Card", "debit card": "Card",
        "credit": "Card", "debit": "Card", "visa": "Card", "mastercard": "Card",
        "cash": "Cash", "cod": "Cash", "cash on delivery": "Cash",
        "upi": "UPI", "gpay": "UPI", "google pay": "UPI", "phonepe": "UPI",
        "paytm": "UPI", "bhim": "UPI",
        "wallet": "Wallet", "ewallet": "Wallet", "e-wallet": "Wallet",
        "mobile wallet": "Wallet", "digital wallet": "Wallet",
        "net banking": "Net Banking", "netbanking": "Net Banking",
        "neft": "Net Banking", "bank transfer": "Net Banking",
        "online banking": "Net Banking", "internet banking": "Net Banking",
        "rtgs": "Net Banking", "imps": "Net Banking",
    }
    original = str(raw).strip()
    canonical = ALIASES.get(original.lower())
    if canonical and canonical != original:
        return canonical, True
    if original in VALID:
        return original, False
    return original, False
