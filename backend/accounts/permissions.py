# Role checks used by API views. The backend ALWAYS checks the role –
# hiding a page in React is not security, this is.
#
#   superadmin → every store          admin → their own store (store admin)
#   staff      → orders of their store customer → shopping only
#   warehouse  → warehouses + stock of their store (warehouse manager)
from rest_framework.permissions import BasePermission

ADMIN_ROLES = ('admin', 'superadmin')
STAFF_ROLES = ('staff', 'admin', 'superadmin')
WAREHOUSE_ROLES = ('warehouse', 'admin', 'superadmin')  # inventory team
FULFILMENT_ROLES = ('staff', 'warehouse', 'admin', 'superadmin')  # can open pick lists
STORE_TEAM_ROLES = ('staff', 'warehouse')  # created by a store admin, belong to one store


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'superadmin'


class IsAdminRole(BasePermission):
    """Store admin or super admin."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ADMIN_ROLES


class IsStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in STAFF_ROLES


class IsWarehouseTeam(BasePermission):
    """Warehouse manager, store admin or super admin."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in WAREHOUSE_ROLES


class IsFulfilmentTeam(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in FULFILMENT_ROLES


def for_my_store(queryset, user, field='store'):
    """Limit any queryset to the user's store. The super admin sees everything.

    A store admin / staff member without a store sees nothing (safe default).
    """
    if user.role == 'superadmin':
        return queryset
    return queryset.filter(**{field: user.store_id}) if user.store_id else queryset.none()
