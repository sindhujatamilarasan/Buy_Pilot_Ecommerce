from django.urls import path

from . import operations, views

urlpatterns = [
    path('overview/', views.overview),
    path('warehouses/', views.WarehouseList.as_view()),
    path('warehouses/<int:pk>/', views.WarehouseDetail.as_view()),
    path('stock/', views.StockList.as_view()),
    path('stock/<int:pk>/', views.StockDetail.as_view()),
    path('variants/', views.variant_search),
    path('movements/', views.MovementList.as_view()),
    path('export/stock.csv', views.export_stock),
    path('export/movements.csv', views.export_movements),
    path('pick-list/<int:order_id>/', views.pick_list),
    path('receipts/', operations.ReceiptList.as_view()),
    path('adjustments/', operations.AdjustmentList.as_view()),
    path('adjustments/<int:pk>/approve/', operations.approve_adjustment),
    path('adjustments/<int:pk>/reject/', operations.reject_adjustment),
    path('transfers/', operations.TransferList.as_view()),
    path('transfers/<int:pk>/approve/', operations.approve_transfer),
    path('transfers/<int:pk>/reject/', operations.reject_transfer),
    path('transfers/<int:pk>/dispatch/', operations.dispatch_transfer),
    path('transfers/<int:pk>/receive/', operations.receive_transfer),
    path('transfers/<int:pk>/cancel/', operations.cancel_transfer),
]
