"""Generates products.json – 8 categories and 100 products with variants and REAL photos.

Products, descriptions, ratings and images come from DummyJSON (free test data:
https://dummyjson.com). Sizes / storage variants, INR prices and stock are added here.

Run again any time:  python catalog/seed/generate_seed.py   (needs internet)
random.seed(42) makes prices and stock the same every run.
"""
import json
import random
import re
import urllib.request
from pathlib import Path

random.seed(42)

SOURCE_URL = 'https://dummyjson.com/products?limit=0'
USD_TO_INR = 85

# Our category → (DummyJSON categories, how many products to take, variant type)
CATEGORIES = {
    "Men's Clothing": (['mens-shirts'], 5, 'clothing'),
    "Women's Clothing": (['tops', 'womens-dresses'], 10, 'clothing'),
    'Footwear': (['mens-shoes', 'womens-shoes'], 10, 'shoes'),
    'Electronics': (['smartphones', 'laptops', 'tablets', 'mobile-accessories'], 20, 'storage'),
    'Home & Kitchen': (['kitchen-accessories', 'furniture', 'home-decoration'], 16, None),
    'Beauty & Care': (['beauty', 'fragrances', 'skin-care'], 13, None),
    'Sports & Fitness': (['sports-accessories'], 12, None),
    'Watches & Accessories': (
        ['mens-watches', 'womens-watches', 'sunglasses', 'womens-bags', 'womens-jewellery'], 15, None),
}

VARIANT_OPTIONS = {
    'clothing': ['S', 'M', 'L', 'XL'],
    'shoes': ['6', '7', '8', '9', '10'],
    'storage': ['128GB', '256GB'],
}
STORAGE_CATEGORIES = {'smartphones', 'laptops', 'tablets'}  # only these get storage options


def slugify(text):
    # "Home & Kitchen" → "home-kitchen",  "Men's Clothing" → "mens-clothing"
    text = text.lower().replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def to_inr(usd):
    # Indian-style prices that end in 9 (e.g. 499, 1299)
    return max(99, round(usd * USD_TO_INR / 10) * 10 - 1)


def pick_sizes(variant_type, source_category):
    if variant_type == 'storage' and source_category not in STORAGE_CATEGORIES:
        return ['']  # chargers, cases… have no storage size
    options = VARIANT_OPTIONS.get(variant_type)
    if not options:
        return ['']
    return options if variant_type == 'storage' else sorted(
        random.sample(options, k=random.randint(2, len(options))), key=options.index)


def build(source_products):
    by_source, seen = {}, set()
    for p in source_products:
        if slugify(p['title']) in seen:
            continue  # DummyJSON has a few duplicate titles – slugs must be unique
        seen.add(slugify(p['title']))
        by_source.setdefault(p['category'], []).append(p)

    categories, products = [], []
    for name, (sources, count, variant_type) in CATEGORIES.items():
        categories.append({'name': name, 'slug': slugify(name)})
        # Take products round-robin from each source so the category is mixed
        pool, queues = [], [list(by_source[s]) for s in sources]
        while len(pool) < count and any(queues):
            for q in queues:
                if q and len(pool) < count:
                    pool.append(q.pop(0))

        for item in pool:
            slug = slugify(item['title'])
            base_price = to_inr(item['price'])
            variants = []
            for i, size in enumerate(pick_sizes(variant_type, item['category'])):
                price = base_price + (i * round(base_price * 0.15, -1) if size.endswith('GB') else 0)
                variants.append({
                    'size': size or None,
                    'color': None,
                    'sku': f"{slug.upper()}-{size or 'STD'}",
                    'price': price,
                    # some stock is 0 or 1 → useful to test "out of stock" and "last item"
                    'stock': random.choice([0, 1, 2, 5, 10, 15, 25, 40]),
                })
            products.append({
                'category': slugify(name),
                'name': item['title'],
                'slug': slug,
                'description': item['description'],
                'rating': round(min(5, max(1, item['rating'])), 1),
                'is_active': True,
                'images': item['images'],
                'variants': variants,
            })
    return {'categories': categories, 'products': products}


if __name__ == '__main__':
    # A User-Agent header is required – DummyJSON rejects requests without one (403)
    request = urllib.request.Request(SOURCE_URL, headers={'User-Agent': 'Mozilla/5.0 ShopKart-seed'})
    with urllib.request.urlopen(request) as response:
        source = json.load(response)['products']
    data = build(source)
    out = Path(__file__).with_name('products.json')
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    n_variants = sum(len(p['variants']) for p in data['products'])
    n_images = sum(len(p['images']) for p in data['products'])
    print(f"Wrote {len(data['categories'])} categories, {len(data['products'])} products, "
          f'{n_variants} variants, {n_images} images → {out.name}')
