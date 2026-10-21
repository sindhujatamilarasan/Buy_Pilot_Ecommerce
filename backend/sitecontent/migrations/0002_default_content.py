"""Starting content (same texts as before, without the "7-day returns" promise; footer links go to real pages)."""
from django.db import migrations

PERKS = [
    ('🚚', 'Free shipping', 'On orders above ₹500'),
    ('🔒', 'Secure payments', 'Protected by Razorpay'),
    ('📦', 'Track every order', 'From packed to delivered'),
]
LINKS = [
    ('Shop', 'All products', '/products'),
    ('Shop', 'Electronics', '/products?category=electronics'),
    ('Shop', 'Fashion', '/products?category=womens-clothing'),
    ('Shop', 'Home & Kitchen', '/products?category=home-kitchen'),
    ('Help', 'Track my orders', '/orders'),
    ('Help', 'My cart', '/cart'),
    ('Help', 'Wishlist', '/wishlist'),
    ('Help', 'My account', '/account'),
]


def add_defaults(apps, schema_editor):
    SiteSettings = apps.get_model('sitecontent', 'SiteSettings')
    Perk = apps.get_model('sitecontent', 'Perk')
    FooterLink = apps.get_model('sitecontent', 'FooterLink')
    SiteSettings.objects.update_or_create(pk=1, defaults={
        'announcement_enabled': True,
        'announcement_text': '🎉 Free shipping on orders above ₹500 · Track every order step by step',
        'hero_badge': '✨ Festive Sale is live',
        'hero_title': 'Shop the trends',
        'hero_highlight': 'you’ll love 💚',
        'hero_subtitle': 'Phones, fashion, shoes, beauty and more – all in one happy place.',
        'footer_tagline': 'Trendy products, honest prices and happy shopping – every day.',
    })
    for i, (icon, title, text) in enumerate(PERKS):
        Perk.objects.create(icon=icon, title=title, text=text, sort_order=i)
    for i, (group, label, url) in enumerate(LINKS):
        FooterLink.objects.create(group=group, label=label, url=url, sort_order=i)


def remove_defaults(apps, schema_editor):
    for model in ('SiteSettings', 'Perk', 'FooterLink'):
        apps.get_model('sitecontent', model).objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [('sitecontent', '0001_initial')]
    operations = [migrations.RunPython(add_defaults, remove_defaults)]
