"""Create one demo user per role (for development only).

Usage:  python manage.py seed_users
"""
from django.core.management.base import BaseCommand

from accounts.models import User
from stores.models import DEFAULT_STORE_SLUG, Store, default_store_id

# (name, email, role, store slug)  – run seed_stores first so "urban-threads" exists
DEMO_USERS = [
    ('Super Admin', 'superadmin@shopkart.test', 'superadmin', None),
    ('Admin User', 'admin@shopkart.test', 'admin', DEFAULT_STORE_SLUG),
    ('Urban Admin', 'urban@shopkart.test', 'admin', 'urban-threads'),
    ('Staff User', 'staff@shopkart.test', 'staff', DEFAULT_STORE_SLUG),
    ('Warehouse Manager', 'warehouse@shopkart.test', 'warehouse', DEFAULT_STORE_SLUG),
    ('Customer User', 'customer@shopkart.test', 'customer', None),
]
PASSWORD = 'Shop@1234'


class Command(BaseCommand):
    help = 'Create demo admin / staff / customer accounts'

    def handle(self, *args, **options):
        default_store_id()  # make sure the default store exists
        for name, email, role, store_slug in DEMO_USERS:
            store = Store.objects.filter(slug=store_slug).first() if store_slug else None
            if store_slug and store is None:
                self.stdout.write(self.style.WARNING(f'Skipped {email}: run seed_stores first'))
                continue
            user, created = User.objects.get_or_create(
                username=email, defaults={'email': email, 'first_name': name, 'role': role}
            )
            user.role, user.store = role, store
            user.is_staff = role == 'superadmin'  # only the super admin can open Django's /admin panel
            user.is_superuser = role == 'superadmin'
            user.set_password(PASSWORD)
            user.save()
            self.stdout.write(f"{'Created' if created else 'Updated'} {role}: {email}" + (f' ({store})' if store else ''))
        self.stdout.write(self.style.SUCCESS(f'Password for all: {PASSWORD}'))
