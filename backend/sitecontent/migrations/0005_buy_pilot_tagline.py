"""New tagline for Buy Pilot (a tagline the admin already changed is left alone)."""
from django.db import migrations


def set_tagline(apps, schema_editor):
    SiteSettings = apps.get_model('sitecontent', 'SiteSettings')
    SiteSettings.objects.filter(footer_tagline='Shop Smart. Live Better.').update(footer_tagline='Shop Smart. Fly High.')


def undo(apps, schema_editor):
    SiteSettings = apps.get_model('sitecontent', 'SiteSettings')
    SiteSettings.objects.filter(footer_tagline='Shop Smart. Fly High.').update(footer_tagline='Shop Smart. Live Better.')


class Migration(migrations.Migration):
    dependencies = [('sitecontent', '0004_shopora_theme')]
    operations = [migrations.RunPython(set_tagline, undo)]
