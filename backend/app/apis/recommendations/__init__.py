from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# -----------------------------
# Models
# -----------------------------
class RecommendProductsRequest(BaseModel):
    skinType: Optional[str] = None
    acne: Optional[int] = None          # 0-100
    redness: Optional[int] = None       # 0-100
    oiliness: Optional[int] = None      # 0-100
    dryness: Optional[int] = None       # 0-100
    pores: Optional[int] = None         # 0-100
    darkSpots: Optional[int] = None     # 0-100
    concerns: Optional[List[str]] = None
    # Quick filter preferences
    acneSafeOnly: Optional[bool] = None
    fragranceFreeOnly: Optional[bool] = None

class Product(BaseModel):
    id: str
    brand: str
    name: str
    imageUrl: str
    productUrl: Optional[str] = None
    keyIngredients: List[str]
    concernTags: List[str]
    routineStep: str  # cleanser | treatment | moisturizer | sunscreen | toner | serum
    fragranceFree: bool = False
    nonComedogenic: bool = True
    acneSafe: bool = True
    alcoholFree: bool = True
    rationale: str

class RecommendProductsResponse(BaseModel):
    products: List[Product]


# -----------------------------
# Static seed catalog (curated)
# -----------------------------
# Note: Using reliable external image URLs for now. Can be swapped to static assets later.
CATALOG: List[Product] = [
    Product(
        id="cleanser_sa",
        brand="CeraVe",
        name="Renewing SA Cleanser",
        imageUrl="https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.cerave.com/skincare/cleansers/renewing-sa-cleanser",
        keyIngredients=["Salicylic Acid", "Niacinamide", "Ceramides"],
        concernTags=["acne", "oiliness", "texture"],
        routineStep="cleanser",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Gently exfoliates and helps keep pores clear without stripping."
    ),
    Product(
        id="cleanser_gentle",
        brand="La Roche-Posay",
        name="Toleriane Hydrating Gentle Cleanser",
        imageUrl="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.laroche-posay.us/",
        keyIngredients=["Niacinamide", "Ceramides", "Prebiotic Water"],
        concernTags=["redness", "sensitivity", "dryness"],
        routineStep="cleanser",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Very gentle, barrier-supporting cleanser for sensitive or dry skin."
    ),
    Product(
        id="treatment_bha",
        brand="Paula's Choice",
        name="2% BHA Liquid Exfoliant",
        imageUrl="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201.html",
        keyIngredients=["Salicylic Acid (BHA)", "Green Tea"],
        concernTags=["acne", "pores", "blackheads", "oiliness"],
        routineStep="treatment",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Decongests pores and reduces blackheads; ideal for acne-prone, oily skin."
    ),
    Product(
        id="treatment_bp",
        brand="PanOxyl",
        name="Benzoyl Peroxide 4% Wash",
        imageUrl="https://images.unsplash.com/photo-1596755094514-f87e3e08ae3b?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.panoxyl.com/",
        keyIngredients=["Benzoyl Peroxide"],
        concernTags=["acne", "inflammatory acne"],
        routineStep="treatment",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Targets acne-causing bacteria. Best as short-contact therapy for breakouts."
    ),
    Product(
        id="serum_vitc",
        brand="Timeless",
        name="Vitamin C + E Ferulic Acid Serum",
        imageUrl="https://images.unsplash.com/photo-1619451163876-17fddc4b61dc?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.timelessha.com/",
        keyIngredients=["L-Ascorbic Acid", "Vitamin E", "Ferulic Acid"],
        concernTags=["dark spots", "dullness", "tone"],
        routineStep="serum",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Brightens and supports collagen; helps fade dark spots."
    ),
    Product(
        id="serum_niacinamide",
        brand="The Ordinary",
        name="Niacinamide 10% + Zinc 1%",
        imageUrl="https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?q=80&w=800&auto=format&fit=crop",
        productUrl="https://theordinary.com/",
        keyIngredients=["Niacinamide", "Zinc"],
        concernTags=["redness", "oiliness", "pores"],
        routineStep="serum",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Calms redness, regulates oil, and minimizes the look of pores."
    ),
    Product(
        id="moisturizer_gel",
        brand="Neutrogena",
        name="Hydro Boost Water Gel",
        imageUrl="https://images.unsplash.com/photo-1562887085-b7b4d7b8f3d4?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.neutrogena.com/",
        keyIngredients=["Hyaluronic Acid"],
        concernTags=["dehydration", "oiliness"],
        routineStep="moisturizer",
        fragranceFree=False,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Lightweight hydration suitable for normal to oily skin."
    ),
    Product(
        id="moisturizer_ceramide",
        brand="CeraVe",
        name="Moisturizing Cream",
        imageUrl="https://images.unsplash.com/photo-1540574163026-643ea20ade25?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.cerave.com/",
        keyIngredients=["Ceramides", "Hyaluronic Acid"],
        concernTags=["dryness", "barrier"],
        routineStep="moisturizer",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Rich, barrier-repairing moisturizer ideal for dry/sensitive skin."
    ),
    Product(
        id="sunscreen_mineral",
        brand="EltaMD",
        name="UV Clear Broad-Spectrum SPF 46",
        imageUrl="https://images.unsplash.com/photo-1582882435061-705b9c9a46a5?q=80&w=800&auto=format&fit=crop",
        productUrl="https://eltamd.com/",
        keyIngredients=["Zinc Oxide", "Niacinamide"],
        concernTags=["acne", "redness", "sensitivity"],
        routineStep="sunscreen",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Lightweight SPF with niacinamide; excellent for acne-prone, sensitive skin."
    ),
    Product(
        id="sunscreen_chemical",
        brand="La Roche-Posay",
        name="Anthelios Melt-in Milk SPF 60",
        imageUrl="https://images.unsplash.com/photo-1600959907703-125ba1374b74?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.laroche-posay.us/",
        keyIngredients=["Mexoryl SX/XL"],
        concernTags=["sun protection", "dark spots"],
        routineStep="sunscreen",
        fragranceFree=False,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=False,
        rationale="High protection sunscreen that layers well; great daily wear."
    ),
    Product(
        id="treatment_retinoid",
        brand="Adapalene",
        name="Differin Gel 0.1%",
        imageUrl="https://images.unsplash.com/photo-1608245449318-10120e4f3a3a?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.differin.com/",
        keyIngredients=["Adapalene (Retinoid)"],
        concernTags=["acne", "texture", "fine lines"],
        routineStep="treatment",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Evidence-backed retinoid for acne and texture; start 2-3x/week."
    ),
    Product(
        id="serum_azelaic",
        brand="The Ordinary",
        name="Azelaic Acid Suspension 10%",
        imageUrl="https://images.unsplash.com/photo-1608245448864-9b9b1a2ef4f0?q=80&w=800&auto=format&fit=crop",
        productUrl="https://theordinary.com/",
        keyIngredients=["Azelaic Acid"],
        concernTags=["redness", "dark spots", "acne"],
        routineStep="treatment",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Soothes redness, helps brighten, and supports acne routines."
    ),
    Product(
        id="moisturizer_gel_cream",
        brand="Clinique",
        name="Moisture Surge 100H Auto-Replenishing Hydrator",
        imageUrl="https://images.unsplash.com/photo-1556228720-d00f6c1b6d9b?q=80&w=800&auto=format&fit=crop",
        productUrl="https://www.clinique.com/",
        keyIngredients=["Aloe Bio-Ferment", "Hyaluronic Acid"],
        concernTags=["dehydration", "dullness"],
        routineStep="moisturizer",
        fragranceFree=True,
        nonComedogenic=True,
        acneSafe=True,
        alcoholFree=True,
        rationale="Plump hydration with a lightweight gel-cream texture."
    ),
]


# -----------------------------
# Helper: Rule-based selection
# -----------------------------

def _score_product(p: Product, req: RecommendProductsRequest) -> float:
    score = 0.0
    concerns = set([c.lower() for c in (req.concerns or [])])

    # Map metrics to pseudo concerns
    if (req.acne or 0) >= 30:
        concerns.add("acne")
    if (req.redness or 0) >= 30:
        concerns.add("redness")
    if (req.oiliness or 0) >= 50:
        concerns.add("oiliness")
    if (req.dryness or 0) >= 50:
        concerns.add("dryness")
    if (req.darkSpots or 0) >= 30:
        concerns.add("dark spots")
    if (req.pores or 0) >= 40:
        concerns.add("pores")

    # Base match: concern tags
    score += sum(1 for t in p.concernTags if t.lower() in concerns)

    # Skin type matching heuristics
    if req.skinType:
        st = req.skinType.lower()
        if st == "oily" and ("oiliness" in p.concernTags or p.nonComedogenic):
            score += 0.5
        if st == "dry" and ("dryness" in p.concernTags):
            score += 0.5
        if st == "sensitive" and p.fragranceFree:
            score += 0.5
        if st == "combination" and ("pores" in p.concernTags or "oiliness" in p.concernTags):
            score += 0.5

    # Suitability filters
    if req.acneSafeOnly and not p.acneSafe:
        return -1.0
    if req.fragranceFreeOnly and not p.fragranceFree:
        return -1.0

    return score


# -----------------------------
# Endpoint
# -----------------------------
@router.post("/recommend-products", response_model=RecommendProductsResponse)
def recommend_products(body: RecommendProductsRequest) -> RecommendProductsResponse:
    try:
        # Score and sort
        scored = []
        for prod in CATALOG:
            s = _score_product(prod, body)
            if s >= 0:
                scored.append((s, prod))
        scored.sort(key=lambda x: x[0], reverse=True)

        # Ensure coverage across routine steps
        selected: List[Product] = []
        seen_steps = set()
        for _, p in scored:
            # Aim for diversity: try to include at least one of each major step first
            if len(selected) < 6:
                if p.routineStep not in seen_steps:
                    selected.append(p)
                    seen_steps.add(p.routineStep)
            else:
                selected.append(p)
            if len(selected) >= 12:
                break

        # Fallback: if no strong matches, just take top N diverse
        if not selected:
            selected = [p for _, p in scored[:8]]

        return RecommendProductsResponse(products=selected)
    except Exception as e:
        print(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")
