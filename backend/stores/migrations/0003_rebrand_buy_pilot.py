"""Rebrand: "Shopora Official" becomes "Buy Pilot Official". The slug stays, so links keep working."""
from django.db import migrations


def rename(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Store.objects.filter(slug='shopkart-official', name='Shopora Official').update(name='Buy Pilot Official')
    for store in Store.objects.filter(description__contains='Shopora'):
        store.description = store.description.replace('Shopora', 'Buy Pilot')
        store.save(update_fields=['description'])


def undo(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Store.objects.filter(slug='shopkart-official', name='Buy Pilot Official').update(name='Shopora Official')


class Migration(migrations.Migration):
    dependencies = [('stores', '0002_rebrand_shopora')]
    operations = [migrations.RunPython(rename, undo)]
