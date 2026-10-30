"""Mock datasets for demo when Amazon outbound is blocked (sandbox egress).
All mock is clearly labeled MOCK/DEMO — never claimed as ACTUAL.
"""
MOCK_KEYWORDS = {
    "cozy mystery": [
        "cozy mystery books", "cozy mystery series", "cozy mystery for beginners",
        "cozy mystery cats", "cozy mystery bakery", "cozy mystery bookshop",
        "cozy mystery dogs", "cozy mystery christmas", "cozy mystery kindle unlimited",
        "cozy mystery tea shop", "cozy mystery with recipes", "cozy mystery small town",
        "cozy mystery paranormal", "cozy mystery books kindle unlimited", "cozy mystery audiobook",
        "cozy mystery box set", "cozy mystery halloween", "cozy mystery cozy crime",
        "cozy mystery bookstore", "cozy mystery cooking", "cozy mystery new releases 2024"
    ],
    "culinary mystery": [
        "culinary mystery books", "culinary mystery series", "culinary mystery cooking",
        "culinary mystery recipes", "culinary mystery kindle unlimited", "culinary cozy mystery"
    ],
    "cozy crime fiction": [
        "cozy crime fiction", "cozy crime books", "cozy crime series", "cozy crime kindle",
        "cozy crime mystery"
    ],
    "bookshop mystery": [
        "bookshop mystery books", "bookshop mystery series", "bookshop cozy mystery",
        "bookshop mystery kindle unlimited"
    ],
    "thriller": [
        "thriller books", "thriller kindle unlimited", "psychological thriller",
        "thriller series", "crime thriller", "thriller bestseller", "thriller new releases"
    ],
    "romance": ["romance books", "romance kindle unlimited", "contemporary romance", "romance bestseller"],
    "coloring book": ["coloring book for adults", "coloring book for kids ages 8-12", "mandala coloring book"],
}

MOCK_PRODUCTS = {
    "B08N5WRWNW": {"title": "The Silent Library — A Cozy Mystery (Book 1)", "author": "Jane Doe", "bsr": 45210, "price": 4.99, "rating": 4.4, "review_count": 342, "pages": 280, "categories": ["Mystery > Cozy", "Literature > Fiction"], "bsr_categories": {"Kindle Store > Kindle eBooks > Mystery > Cozy": 1204, "Books > Mystery > Cozy": 890}, "status": "ok"},
    "B003K16PJW": {"title": "The Name of the Rose", "author": "Umberto Eco", "bsr": 18200, "price": 9.99, "rating": 4.6, "review_count": 12450, "pages": 536, "categories": ["Historical Fiction", "Mystery"], "bsr_categories": {"Books > Literature & Fiction > Historical": 45}, "status": "ok"},
}

def get_mock_keywords_for_seed(seed):
    seed_low = seed.lower().strip()
    # direct hit or fuzzy
    for key, vals in MOCK_KEYWORDS.items():
        if key in seed_low or seed_low in key:
            return vals
    # fallback: generate synthetic long-tail from seed
    base = seed_low
    return [
        f"{base} books", f"{base} kindle unlimited", f"{base} for beginners", f"{base} series",
        f"{base} best seller", f"{base} new releases", f"{base} workbook", f"{base} guide",
    ]

def get_mock_product(asin):
    return MOCK_PRODUCTS.get(asin.upper())
