from django.contrib import admin

from .models import FooterLink, Perk, SiteSettings

admin.site.register(SiteSettings)
admin.site.register(Perk)
admin.site.register(FooterLink)
