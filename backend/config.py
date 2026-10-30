"""KDP Platform — marketplace registry & config (ported & extended from kdp-scout)."""
import os

MARKETPLACES = {
    "us": {
        "domain": "www.amazon.com",
        "mid": "ATVPDKIKX0DER",
        "tld": "com",
        "currency": "USD",
        "symbol": "$",
        "locale": "en-US",
        "bsr_model": "us_kindle",
        "completion_domain": "completion.amazon.com",
    },
    "uk": {
        "domain": "www.amazon.co.uk",
        "mid": "A1F83G8C2ARO7P",
        "tld": "co.uk",
        "currency": "GBP",
        "symbol": "£",
        "locale": "en-GB",
        "bsr_model": "us_kindle",
        "completion_domain": "completion.amazon.co.uk",
    },
    "ca": {
        "domain": "www.amazon.ca",
        "mid": "A2EUQ1WTGCTBG2",
        "tld": "ca",
        "currency": "CAD",
        "symbol": "C$",
        "locale": "en-CA",
        "bsr_model": "us_kindle",
        "completion_domain": "completion.amazon.ca",
    },
    "au": {
        "domain": "www.amazon.com.au",
        "mid": "A39IBJ37TRP1C6",
        "tld": "com.au",
        "currency": "AUD",
        "symbol": "A$",
        "locale": "en-AU",
        "bsr_model": "us_kindle",
        "completion_domain": "completion.amazon.com.au",
    },
    "de": {
        "domain": "www.amazon.de",
        "mid": "A1PA6795UKMFR9",
        "tld": "de",
        "currency": "EUR",
        "symbol": "€",
        "locale": "de-DE",
        "bsr_model": "us_kindle",
        "completion_domain": "completion.amazon.de",
    },
    "in": {
        "domain": "www.amazon.in",
        "mid": "A21TJRUUN4KGV",
        "tld": "in",
        "currency": "INR",
        "symbol": "₹",
        "locale": "en-IN",
        "bsr_model": "us_kindle",
        "completion_domain": "completion.amazon.in",
    },
}

DEPT_ALIASES = {
    "kindle": "digital-text",
    "books": "stripbooks",
    "all": "aps",
    "ebooks": "digital-text",
    "paperback": "stripbooks",
}

CATEGORY_EXPLORER = {
    "Arts & Photography": ["Arts & Photography", "Architecture", "Music"],
    "Biographies & Memoirs": ["Biographies", "Memoir", "True Crime"],
    "Business & Money": ["Business", "Entrepreneurship", "Investing", "Careers"],
    "Children's Books": ["Children's Books", "Early Learning", "Middle Grade"],
    "Comics & Graphic Novels": ["Comics", "Manga"],
    "Cookbooks": ["Cooking", "Food & Wine", "Baking"],
    "Crafts, Hobbies & Home": ["Crafts", "DIY", "Home Improvement"],
    "Education & Teaching": ["Education", "Study Guides"],
    "Engineering & Transportation": ["Engineering", "Automotive"],
    "Health, Fitness & Dieting": ["Health", "Fitness", "Dieting", "Yoga"],
    "History": ["History", "Military", "Ancient"],
    "Humor & Entertainment": ["Humor", "Puzzles & Games"],
    "Law": ["Law", "Legal"],
    "Literature & Fiction": ["Fiction", "Contemporary", "Classics", "Historical Fiction", "Thriller", "Mystery", "Romance", "Sci-Fi", "Fantasy", "Horror"],
    "Medical Books": ["Medical", "Nursing"],
    "Mystery, Thriller & Suspense": ["Mystery", "Thriller", "Suspense", "Crime"],
    "Parenting & Relationships": ["Parenting", "Relationships", "Family"],
    "Politics & Social Sciences": ["Politics", "Social Sciences", "Philosophy"],
    "Reference": ["Reference", "Dictionaries", "Almanacs"],
    "Religion & Spirituality": ["Religion", "Spirituality", "Self-Help"],
    "Romance": ["Romance", "Contemporary Romance", "Historical Romance", "Paranormal Romance"],
    "Science & Math": ["Science", "Math", "Nature"],
    "Self-Help": ["Self-Help", "Motivation", "Personal Transformation"],
    "Sports & Outdoors": ["Sports", "Outdoors", "Travel"],
    "Teen & Young Adult": ["Teen", "Young Adult", "YA Fantasy"],
}

# KDP royalty & printing cost models
KDP_EBOOK_ROYALTY_HIGH = 0.70  # $2.99-$9.99
KDP_EBOOK_ROYALTY_LOW = 0.35

# Amazon printing cost (approximate, USD) — per KDP pricing table
# Black & white: $0.012/page + fixed; Color: higher
PAPERBACK_COST = {"fixed_bw": 0.85, "per_page_bw": 0.012, "fixed_color": 0.85, "per_page_color": 0.025}
HARDCOVER_COST = {"fixed_bw": 4.50, "per_page_bw": 0.012, "fixed_color": 4.50, "per_page_color": 0.03}

BESTSELLER_URLS = {
    "us": "https://www.amazon.com/gp/bestsellers/digital-text/",
    "uk": "https://www.amazon.co.uk/gp/bestsellers/digital-text/",
    "de": "https://www.amazon.de/gp/bestsellers/digital-text/",
    "ca": "https://www.amazon.ca/gp/bestsellers/digital-text/",
    "au": "https://www.amazon.com.au/gp/bestsellers/digital-text/",
    "in": "https://www.amazon.in/gp/bestsellers/digital-text/",
}

def get_marketplace(code: str):
    code = (code or "us").lower()
    mp = MARKETPLACES.get(code)
    if not mp:
        raise ValueError(f"Unknown marketplace '{code}'. Supported: {', '.join(sorted(MARKETPLACES))}")
    return mp

def get_env(key, default=None):
    return os.environ.get(key, default)
