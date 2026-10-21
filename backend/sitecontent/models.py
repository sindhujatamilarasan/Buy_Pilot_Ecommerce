"""Shop texts the super admin can change without touching code: announcement strip, home hero,
perks and footer links."""
import re

from django.core.exceptions import ValidationError
from django.db import models

# A link must be a page of this shop ("/orders", "/products?category=footwear") or a full web address.
# Anything else (e.g. "javascript:…") is refused – it could run code in a visitor's browser.
SAFE_URL = re.compile(r'^(/(?!/)\S*|https?://\S+)$')


def validate_link(value):
    if not SAFE_URL.match(value):
        raise ValidationError('Use a shop page like /orders or a full address like https://example.com')


class SiteSettings(models.Model):
    """Exactly one row (pk=1) – use SiteSettings.load()."""

    announcement_enabled = models.BooleanField(default=True)
    announcement_text = models.CharField(max_length=160, blank=True)
    hero_badge = models.CharField(max_length=60, blank=True)
    hero_title = models.CharField(max_length=80)
    hero_highlight = models.CharField(max_length=60, blank=True)  # shown in the brand colour on a new line
    hero_subtitle = models.CharField(max_length=200, blank=True)
    footer_tagline = models.CharField(max_length=200, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1, defaults={'hero_title': 'Shop the trends'})[0]

    def __str__(self):
        return 'Site settings'


class Perk(models.Model):
    """The small cards under the home hero ("Free shipping", "Secure payments"…)."""

    icon = models.CharField(max_length=8)  # an emoji
    title = models.CharField(max_length=40)
    text = models.CharField(max_length=80, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']


class FooterLink(models.Model):
    group = models.CharField(max_length=30)  # footer column title, e.g. "Help"
    label = models.CharField(max_length=40)
    url = models.CharField(max_length=300, validators=[validate_link])
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']
