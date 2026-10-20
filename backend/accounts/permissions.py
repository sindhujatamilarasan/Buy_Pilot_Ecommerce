# Role checks used by API views. The backend ALWAYS checks the role –
# hiding a page in React is not security, this is.
#
#   superadmin → every store          admin → their own store (store admin)
#   staff      → orders of their store customer → shopping only
from rest_framework.permissions import BasePermission

ADMIN_ROLES = ('admin', 'superadmin')
STAFF_ROLES = ('staff', 'admin', 'superadmin')


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


def for_my_store(queryset, user, field='store'):
    """Limit any queryset to the user's store. The super admin sees everything.

    A store admin / staff member without a store sees nothing (safe default).
    """
    if user.role == 'superadmin':
        return queryset
    return queryset.filter(**{field: user.store_id}) if user.store_id else queryset.none()
