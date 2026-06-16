"""
Country Rules API — exposes configurable phone validation rules per country.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import CountryRule

router = APIRouter(prefix="/api", tags=["Countries"])

# Phone length examples per country for display
PHONE_EXAMPLES = {
    "India": "9876543210",
    "USA": "2125551234",
    "United Kingdom": "7911123456",
    "Germany": "15123456789",
    "France": "612345678",
    "Australia": "412345678",
    "Canada": "4161234567",
    "Singapore": "81234567",
    "China": "13812345678",
    "Japan": "9012345678",
    "Brazil": "11987654321",
    "Mexico": "5512345678",
    "South Africa": "821234567",
    "Nigeria": "8012345678",
    "Kenya": "712345678",
    "UAE": "501234567",
    "Saudi Arabia": "501234567",
    "Pakistan": "3001234567",
    "Bangladesh": "1712345678",
    "Indonesia": "81234567890",
    "Philippines": "9171234567",
    "Thailand": "812345678",
    "Vietnam": "912345678",
    "Malaysia": "123456789",
    "Russia": "9161234567",
    "South Korea": "1012345678",
    "Italy": "3121234567",
    "Turkey": "5321234567",
    "Poland": "512345678",
    "Norway": "41234567",
    "Sweden": "701234567",
    "Ghana": "241234567",
    "Senegal": "701234567",
    "Morocco": "612345678",
    "Algeria": "551234567",
    "Czech Republic": "601234567",
    "Netherlands": "612345678",
    "Spain": "612345678",
}

REGION_MAP = {
    "India": "Asia", "China": "Asia", "Japan": "Asia", "Singapore": "Asia",
    "Indonesia": "Asia", "Philippines": "Asia", "Thailand": "Asia",
    "Vietnam": "Asia", "Malaysia": "Asia", "Pakistan": "Asia",
    "Bangladesh": "Asia", "South Korea": "Asia",
    "USA": "North America", "Canada": "North America", "Mexico": "North America",
    "Brazil": "South America",
    "United Kingdom": "Europe", "Germany": "Europe", "France": "Europe",
    "Italy": "Europe", "Spain": "Europe", "Netherlands": "Europe",
    "Sweden": "Europe", "Norway": "Europe", "Poland": "Europe",
    "Czech Republic": "Europe", "Russia": "Europe", "Turkey": "Europe",
    "Australia": "Oceania",
    "UAE": "Middle East", "Saudi Arabia": "Middle East",
    "Nigeria": "Africa", "South Africa": "Africa", "Kenya": "Africa",
    "Ghana": "Africa", "Senegal": "Africa", "Morocco": "Africa",
    "Algeria": "Africa", "Burkina Faso": "Africa",
}


@router.get("/countries", summary="Get all configurable country phone validation rules")
def get_countries(db: Session = Depends(get_db)):
    rules = db.query(CountryRule).filter(CountryRule.is_active == True).order_by(CountryRule.country).all()
    return {
        "total": len(rules),
        "rules": [
            {
                "country": r.country,
                "phone_digits": r.phone_digits,
                "phone_prefix": r.phone_prefix or "—",
                "currency": r.currency or "USD",
                "date_format": r.date_format or "yyyy-MM-dd",
                "example_phone": PHONE_EXAMPLES.get(r.country, "N/A"),
                "region": REGION_MAP.get(r.country, "Other"),
                "is_active": r.is_active,
            }
            for r in rules
        ]
    }
