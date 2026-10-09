"""Generates products.json – 8 categories and 100 products with variants.

Run again any time:  python catalog/seed/generate_seed.py
random.seed(42) makes the output the same every run.
"""
import json
import random
import re
from pathlib import Path

random.seed(42)

CATEGORIES = {
    'Men\'s Clothing': {
        'items': ['Cotton T-Shirt', 'Slim Fit Jeans', 'Casual Shirt', 'Hoodie', 'Polo T-Shirt',
                  'Chino Pants', 'Denim Jacket', 'Track Pants', 'Kurta', 'Formal Shirt',
                  'Cargo Shorts', 'Sweatshirt', 'Linen Shirt'],
        'sizes': ['S', 'M', 'L', 'XL'], 'colors': ['Black', 'White', 'Navy', 'Olive'],
        'price': (399, 2499),
    },
    'Women\'s Clothing': {
        'items': ['Floral Dress', 'Cotton Kurti', 'Palazzo Pants', 'Crop Top', 'Denim Skirt',
                  'Anarkali Suit', 'Cardigan', 'Leggings', 'Maxi Dress', 'Blouse',
                  'Shrug', 'Saree', 'Jumpsuit'],
        'sizes': ['XS', 'S', 'M', 'L'], 'colors': ['Pink', 'Maroon', 'Beige', 'Teal'],
        'price': (449, 3999),
    },
    'Footwear': {
        'items': ['Running Shoes', 'Leather Sandals', 'Canvas Sneakers', 'Flip Flops', 'Formal Shoes',
                  'Sports Shoes', 'Loafers', 'Ankle Boots', 'Slip-On Shoes', 'Kolhapuri Chappals',
                  'Trekking Shoes', 'Heels'],
        'sizes': ['6', '7', '8', '9', '10'], 'colors': ['Black', 'Brown', 'White'],
        'price': (299, 4999),
    },
    'Electronics': {
        'items': ['Wireless Earbuds', 'Bluetooth Speaker', 'Smart Watch', 'Power Bank 10000mAh',
                  'USB-C Charger', 'Wireless Mouse', 'Mechanical Keyboard', 'Webcam HD',
                  'Neckband Headphones', 'Fitness Band', 'Phone Stand', 'Laptop Cooling Pad',
                  'Portable SSD 512GB'],
        'sizes': [None], 'colors': ['Black', 'White', 'Blue'],
        'price': (299, 6999),
    },
    'Home & Kitchen': {
        'items': ['Coffee Mug', 'Steel Water Bottle', 'Non-Stick Pan', 'Dinner Set', 'Table Lamp',
                  'Cushion Cover', 'Bedsheet Set', 'Wall Clock', 'Storage Box', 'Lunch Box',
                  'Pressure Cooker', 'Glass Jar Set', 'Door Mat'],
        'sizes': [None], 'colors': ['Grey', 'Red', 'Green'],
        'price': (149, 3499),
    },
    'Books': {
        'items': ['Learn Python the Easy Way', 'React for Beginners', 'The Clean Coder Notes',
                  'Tamil Short Stories', 'Indian History Simplified', 'Atomic Habits Workbook',
                  'Data Structures Made Easy', 'Kids Story Collection', 'Cooking at Home',
                  'Personal Finance 101', 'Poems of the Monsoon', 'Startup Stories'],
        'sizes': [None], 'colors': [None],
        'price': (149, 899),
    },
    'Beauty & Care': {
        'items': ['Aloe Vera Gel', 'Herbal Shampoo', 'Face Wash', 'Sunscreen SPF 50', 'Lip Balm',
                  'Body Lotion', 'Hair Oil', 'Beard Oil', 'Perfume', 'Face Serum',
                  'Hand Cream', 'Kajal'],
        'sizes': ['50ml', '100ml', '200ml'], 'colors': [None],
        'price': (99, 1499),
    },
    'Sports & Fitness': {
        'items': ['Yoga Mat', 'Dumbbell Set', 'Skipping Rope', 'Cricket Bat', 'Football',
                  'Badminton Racket', 'Resistance Bands', 'Gym Bag', 'Water Sipper',
                  'Cycling Gloves', 'Tennis Ball Pack', 'Foam Roller'],
        'sizes': [None], 'colors': ['Black', 'Blue', 'Orange'],
        'price': (149, 2999),
    },
}

ADJECTIVES = ['Premium', 'Classic', 'Everyday', 'Comfort', 'Pro', 'Eco', 'Urban', 'Smart']


def slugify(text):
    # "Home & Kitchen" → "home-kitchen",  "Men's Clothing" → "mens-clothing"
    text = text.lower().replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')


def make_price(low, high):
    # Indian-style prices: end in 9 (e.g. 499, 1299)
    return random.randrange(low // 10, high // 10) * 10 + 9


def build():
    categories, products = [], []

    for cat_name, cfg in CATEGORIES.items():
        categories.append({'name': cat_name, 'slug': slugify(cat_name)})

    # Spread exactly 100 products across categories
    all_items = [(cat, item) for cat, cfg in CATEGORIES.items() for item in cfg['items']]
    random.shuffle(all_items)
    all_items = all_items[:100]

    for cat_name, item in sorted(all_items):
        cfg = CATEGORIES[cat_name]
        name = f'{random.choice(ADJECTIVES)} {item}'
        slug = slugify(f'{name}-{len(products) + 1}')
        base_price = make_price(*cfg['price'])

        # Pick 1–3 colours and 1–all sizes → variants
        colors = random.sample(cfg['colors'], k=min(len(cfg['colors']), random.randint(1, 3)))
        sizes = cfg['sizes'] if cfg['sizes'] == [None] else random.sample(
            cfg['sizes'], k=random.randint(2, len(cfg['sizes'])))

        variants = []
        for color in colors:
            for size in sizes:
                extra = 50 if size in ('XL', '200ml', '10') else 0  # bigger = a bit pricier
                sku = '-'.join(p for p in [slug[:12].upper(), (color or 'STD').upper(),
                                           size or 'STD'] if p)
                variants.append({
                    'size': size,
                    'color': color,
                    'sku': f'{sku}-{len(products) + 1}',
                    'price': base_price + extra,
                    # some stock is 0 or 1 → useful to test "out of stock" and "last item"
                    'stock': random.choice([0, 1, 2, 5, 10, 15, 25, 40]),
                })

        products.append({
            'category': slugify(cat_name),
            'name': name,
            'slug': slug,
            'description': f'{name} – good quality, great value. A customer favourite in '
                           f'{cat_name.lower()}.',
            'rating': round(random.uniform(3.2, 5.0), 1),
            'is_active': True,
            # Placeholder images (picsum.photos). Real uploads go to media/ later.
            'images': [f'https://picsum.photos/seed/{slug}-{i}/600/600' for i in range(1, 4)],
            'variants': variants,
        })

    return {'categories': categories, 'products': products}


if __name__ == '__main__':
    data = build()
    out = Path(__file__).with_name('products.json')
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    n_variants = sum(len(p['variants']) for p in data['products'])
    print(f"Wrote {len(data['categories'])} categories, {len(data['products'])} products, "
          f'{n_variants} variants → {out.name}')
