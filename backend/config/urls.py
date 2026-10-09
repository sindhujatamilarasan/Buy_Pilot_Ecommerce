from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from .views import health

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
]

# Serve uploaded images during development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
