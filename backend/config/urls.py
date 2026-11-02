from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from sitecontent import views as site_views

from .views import health

urlpatterns = [
    path('admin/', admin.site.urls),  # Django's built-in admin panel
    path('api/health/', health),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('catalog.urls')),
    path('api/admin/', include('dashboard.urls')),
    path('api/cart/', include('cart.urls')),
    path('api/', include('orders.urls')),
    path('api/manage/stores/', include('stores.urls')),  # super admin only
    path('api/site/', site_views.site_content),
    path('api/manage/site/', site_views.manage_site_content),  # super admin only
    path('api/chat/', include('chatbot.urls')),
    path('api/inventory/', include('inventory.urls')),  # warehouse managers + admins
    path('api/manage/', include('backoffice.urls')),
]

# Serve uploaded images during development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
