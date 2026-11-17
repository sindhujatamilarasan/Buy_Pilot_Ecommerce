from django.urls import path

from . import views

urlpatterns = [
    path('addresses/', views.AddressList.as_view()),
    path('addresses/<int:pk>/', views.AddressDetail.as_view()),
    path('orders/', views.orders),
    path('orders/<int:pk>/', views.order_detail),
    path('payments/options/', views.payment_options),
    path('payments/webhook/', views.razorpay_webhook),
    path('orders/<int:pk>/pay/', views.retry_payment),
    path('orders/<int:pk>/pay/verify/', views.verify_payment),
    path('orders/<int:pk>/pay/failed/', views.payment_failed),
    path('orders/<int:pk>/cancel/', views.cancel),
]
