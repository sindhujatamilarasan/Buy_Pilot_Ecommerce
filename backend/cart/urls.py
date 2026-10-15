from django.urls import path

from . import views

urlpatterns = [
    path('', views.saved_cart),
    path('merge/', views.merge),
    path('quote/', views.quote),
]
