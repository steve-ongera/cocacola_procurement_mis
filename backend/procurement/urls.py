from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from .views import (
    UserViewSet, DepartmentViewSet, FiscalYearViewSet,
    BudgetViewSet, QuarterBudgetViewSet, BudgetLineItemViewSet,
    SupplierViewSet, TenderViewSet, TenderBidViewSet,
    RequisitionViewSet, RequisitionItemViewSet,
    PurchaseOrderViewSet, POLineItemViewSet,
    GRNViewSet, GRNLineItemViewSet,
    InvoiceViewSet, PaymentViewSet,
    AuditLogViewSet, DashboardViewSet,
)

router = DefaultRouter()

# ── Core
router.register(r'users',               UserViewSet,           basename='user')
router.register(r'departments',         DepartmentViewSet,     basename='department')
router.register(r'fiscal-years',        FiscalYearViewSet,     basename='fiscal-year')

# ── Budget
router.register(r'budgets',             BudgetViewSet,         basename='budget')
router.register(r'quarter-budgets',     QuarterBudgetViewSet,  basename='quarter-budget')
router.register(r'budget-line-items',   BudgetLineItemViewSet, basename='budget-line-item')

# ── Suppliers & Tenders
router.register(r'suppliers',           SupplierViewSet,       basename='supplier')
router.register(r'tenders',             TenderViewSet,         basename='tender')
router.register(r'tender-bids',         TenderBidViewSet,      basename='tender-bid')

# ── Requisitions
router.register(r'requisitions',        RequisitionViewSet,    basename='requisition')
router.register(r'requisition-items',   RequisitionItemViewSet, basename='requisition-item')

# ── Purchase Orders
router.register(r'purchase-orders',     PurchaseOrderViewSet,  basename='purchase-order')
router.register(r'po-line-items',       POLineItemViewSet,     basename='po-line-item')

# ── GRN
router.register(r'grns',               GRNViewSet,            basename='grn')
router.register(r'grn-line-items',     GRNLineItemViewSet,    basename='grn-line-item')

# ── Finance
router.register(r'invoices',           InvoiceViewSet,        basename='invoice')
router.register(r'payments',           PaymentViewSet,        basename='payment')

# ── Audit & Dashboard
router.register(r'audit-logs',         AuditLogViewSet,       basename='audit-log')
router.register(r'dashboard',          DashboardViewSet,      basename='dashboard')

urlpatterns = [
    # JWT Auth
    path('auth/login/',         TokenObtainPairView.as_view(),  name='token_obtain'),
    path('auth/refresh/',       TokenRefreshView.as_view(),     name='token_refresh'),
    path('auth/verify/',        TokenVerifyView.as_view(),      name='token_verify'),

    # API routes
    path('', include(router.urls)),
]