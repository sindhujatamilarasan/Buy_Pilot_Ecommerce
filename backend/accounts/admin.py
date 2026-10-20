from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'store', 'is_active')
    list_filter = ('role', 'store', 'is_active')
    # Show the role field on the edit page
    fieldsets = UserAdmin.fieldsets + (('Role', {'fields': ('role', 'store')}),)
