"""Rebrand: "ShopKart Official" (the marketplace's own store) becomes "Shopora Official". The slug stays, so links keep working."""
from django.db import migrations


def rename(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Store.objects.filter(slug='shopkart-official', name='ShopKart Official').update(name='Shopora Official')
    for store in Store.objects.filter(description__contains='ShopKart'):
        store.description = store.description.replace('ShopKart', 'Shopora')
        store.save(update_fields=['description'])


def undo(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    Store.objects.filter(slug='shopkart-official', name='Shopora Official').update(name='ShopKart Official')


class Migration(migrations.Migration):
    dependencies = [('stores', '0001_initial')]
    operations = [migrations.RunPython(rename, undo)]
