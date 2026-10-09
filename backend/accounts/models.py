from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Django's built-in user (username, email, password...) + a role.

    AbstractUser already gives us login, password hashing, etc.
    We only ADD the role field (OOP inheritance).
    """

    class Role(models.TextChoices):
        CUSTOMER = 'customer', 'Customer'
        STAFF = 'staff', 'Staff'
        ADMIN = 'admin', 'Admin'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)

    def __str__(self):
        return f'{self.username} ({self.role})'
