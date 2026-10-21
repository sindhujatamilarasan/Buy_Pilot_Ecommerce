from django.db import transaction
from rest_framework import serializers

from .models import FooterLink, Perk, SiteSettings


class PerkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perk
        fields = ['icon', 'title', 'text']


class FooterLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = FooterLink
        fields = ['group', 'label', 'url']


class SiteContentSerializer(serializers.ModelSerializer):
    """Everything on one form: settings + perks + footer links (lists are replaced as a whole)."""

    perks = PerkSerializer(many=True, max_length=6, write_only=True)  # read back in to_representation
    footer_links = FooterLinkSerializer(many=True, max_length=40, write_only=True)

    class Meta:
        model = SiteSettings
        fields = ['announcement_enabled', 'announcement_text', 'hero_badge', 'hero_title', 'hero_highlight',
                  'hero_subtitle', 'footer_tagline', 'perks', 'footer_links', 'updated_at']
        read_only_fields = ['updated_at']

    def to_representation(self, site):
        data = super().to_representation(site)
        # Lists live in their own tables (one site → many perks / links)
        data['perks'] = PerkSerializer(Perk.objects.all(), many=True).data
        data['footer_links'] = FooterLinkSerializer(FooterLink.objects.all(), many=True).data
        return data

    @transaction.atomic  # all or nothing: a bad link never leaves a half-saved footer
    def update(self, site, data):
        perks, links = data.pop('perks'), data.pop('footer_links')
        for field, value in data.items():
            setattr(site, field, value)
        site.save()
        Perk.objects.all().delete()
        Perk.objects.bulk_create(Perk(sort_order=i, **p) for i, p in enumerate(perks))
        FooterLink.objects.all().delete()
        FooterLink.objects.bulk_create(FooterLink(sort_order=i, **link) for i, link in enumerate(links))
        return site
