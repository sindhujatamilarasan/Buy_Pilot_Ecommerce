"""Create one demo user per role (for development only).

Usage:  python manage.py seed_users
"""
from django.core.management.base import BaseCommand

from accounts.models import User

DEMO_USERS = [
    ('Admin User', 'admin@shopkart.test', 'admin'),
    ('Staff User', 'staff@shopkart.test', 'staff'),
    ('Customer User', 'customer@shopkart.test', 'customer'),
]
PASSWORD = 'Shop@1234'


class Command(BaseCommand):
    help = 'Create demo admin / staff / customer accounts'

    def handle(self, *args, **options):
        for name, email, role in DEMO_USERS:
            user, created = User.objects.get_or_create(
                username=email, defaults={'email': email, 'first_name': name, 'role': role}
            )
            user.role = role
            user.is_staff = role == 'admin'  # admin can also open Django's /admin panel
            user.is_superuser = role == 'admin'
            user.set_password(PASSWORD)
            user.save()
            self.stdout.write(f"{'Created' if created else 'Updated'} {role}: {email}")
        self.stdout.write(self.style.SUCCESS(f'Password for all: {PASSWORD}'))
