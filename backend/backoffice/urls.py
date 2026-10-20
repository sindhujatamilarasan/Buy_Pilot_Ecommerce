from django.urls import path

from . import views

urlpatterns = [
    path('products/', views.ProductAdminList.as_view()),
    path('products/<int:pk>/', views.ProductAdminDetail.as_view()),
    path('uploads/', views.upload_image),
    path('coupons/', views.CouponList.as_view()),
    path('coupons/<int:pk>/', views.CouponDetail.as_view()),
    path('orders/', views.OrderManageList.as_view()),
    path('orders/<int:pk>/next-status/', views.order_next_status),
    path('orders/<int:pk>/cancel/', views.order_cancel),
    path('users/', views.UserList.as_view()),
    path('users/<int:pk>/role/', views.update_user_role),
    path('reports/sales/', views.sales_report_view),
]
