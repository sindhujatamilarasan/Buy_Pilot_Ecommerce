from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Django's built-in user (username, email, password...) + a role.

    AbstractUser already gives us login, password hashing, etc.
    We only ADD the role field (OOP inheritance).
    """

    class Role(models.TextChoices):
        CUSTOMER = 'customer', 'Customer'
        STAFF = 'staff', 'Staff'  # orders of their store
        WAREHOUSE = 'warehouse', 'Warehouse manager'  # stock of their store's warehouses
        ADMIN = 'admin', 'Store admin'  # everything of their store
        SUPERADMIN = 'superadmin', 'Super admin'  # all stores; creates stores + store admins

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    # Which store a store admin / staff member works for (empty for customers and the super admin)
    store = models.ForeignKey('stores.Store', on_delete=models.PROTECT, null=True, blank=True, related_name='members')
    # A warehouse manager can be tied to ONE warehouse (e.g. Chennai): they then see and handle only that
    # warehouse. Empty = all warehouses of the store.
    warehouse = models.ForeignKey('inventory.Warehouse', on_delete=models.PROTECT, null=True, blank=True, related_name='managers')

    def __str__(self):
        return f'{self.username} ({self.role})'
