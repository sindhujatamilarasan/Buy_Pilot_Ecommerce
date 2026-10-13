from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from .views import health

urlpatterns = [
    path('admin/', admin.site.urls),  # Django's built-in admin panel
    path('api/health/', health),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('catalog.urls')),
    path('api/admin/', include('dashboard.urls')),
    path('api/cart/', include('cart.urls')),
]

# Serve uploaded images during development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
