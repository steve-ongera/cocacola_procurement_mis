from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model

from .models import (
    Department, FiscalYear, Budget, QuarterBudget, BudgetLineItem,
    Supplier, Tender, TenderBid, Requisition, RequisitionItem,
    PurchaseOrder, POLineItem, GoodsReceivedNote, GRNLineItem,
    Invoice, Payment, AuditLog
)
from .serializers import (
    UserSerializer, UserCreateSerializer,
    DepartmentSerializer, FiscalYearSerializer,
    BudgetSerializer, BudgetListSerializer,
    QuarterBudgetSerializer, BudgetLineItemSerializer,
    SupplierSerializer, SupplierListSerializer,
    TenderSerializer, TenderListSerializer, TenderBidSerializer,
    RequisitionSerializer, RequisitionListSerializer, RequisitionItemSerializer,
    PurchaseOrderSerializer, PurchaseOrderListSerializer, POLineItemSerializer,
    GRNSerializer, GRNListSerializer, GRNLineItemSerializer,
    InvoiceSerializer, InvoiceListSerializer,
    PaymentSerializer, PaymentListSerializer,
    AuditLogSerializer, DashboardStatsSerializer,
)

User = get_user_model()


def log_action(user, action, obj, changes=None, request=None):
    ip = None
    if request:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')
    AuditLog.objects.create(
        user=user,
        action=action,
        model_name=obj.__class__.__name__,
        object_id=str(obj.pk),
        object_repr=str(obj),
        changes=changes or {},
        ip_address=ip,
    )


# ─────────────────────────────────────────────
# USER VIEWSET
# ─────────────────────────────────────────────
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'first_name', 'last_name', 'email', 'role']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)


# ─────────────────────────────────────────────
# DEPARTMENT VIEWSET
# ─────────────────────────────────────────────
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']


# ─────────────────────────────────────────────
# FISCAL YEAR VIEWSET
# ─────────────────────────────────────────────
class FiscalYearViewSet(viewsets.ModelViewSet):
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'

    @action(detail=True, methods=['post'])
    def set_active(self, request, slug=None):
        fy = self.get_object()
        FiscalYear.objects.update(is_active=False)
        fy.is_active = True
        fy.save()
        return Response({'status': 'activated'})


# ─────────────────────────────────────────────
# BUDGET VIEWSET
# ─────────────────────────────────────────────
class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.select_related('fiscal_year', 'department', 'prepared_by').prefetch_related('quarters__line_items')
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'fiscal_year', 'department']
    search_fields = ['title']

    def get_serializer_class(self):
        if self.action == 'list':
            return BudgetListSerializer
        return BudgetSerializer

    def perform_create(self, serializer):
        budget = serializer.save(prepared_by=self.request.user)
        log_action(self.request.user, 'create', budget, request=self.request)

    @action(detail=True, methods=['post'])
    def submit(self, request, slug=None):
        budget = self.get_object()
        budget.status = 'submitted'
        budget.save()
        log_action(request.user, 'submit', budget, request=request)
        return Response(BudgetSerializer(budget).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, slug=None):
        budget = self.get_object()
        budget.status = 'approved'
        budget.approved_by = request.user
        budget.approved_at = timezone.now()
        budget.save()
        log_action(request.user, 'approve', budget, request=request)
        return Response(BudgetSerializer(budget).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, slug=None):
        budget = self.get_object()
        budget.status = 'rejected'
        budget.save()
        log_action(request.user, 'reject', budget, request=request)
        return Response(BudgetSerializer(budget).data)


# ─────────────────────────────────────────────
# QUARTER BUDGET VIEWSET
# ─────────────────────────────────────────────
class QuarterBudgetViewSet(viewsets.ModelViewSet):
    queryset = QuarterBudget.objects.select_related('budget').prefetch_related('line_items')
    serializer_class = QuarterBudgetSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['budget', 'quarter']


# ─────────────────────────────────────────────
# BUDGET LINE ITEM VIEWSET
# ─────────────────────────────────────────────
class BudgetLineItemViewSet(viewsets.ModelViewSet):
    queryset = BudgetLineItem.objects.select_related('quarter_budget')
    serializer_class = BudgetLineItemSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['quarter_budget', 'category']
    search_fields = ['item_name']


# ─────────────────────────────────────────────
# SUPPLIER VIEWSET
# ─────────────────────────────────────────────
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'country']
    search_fields = ['name', 'registration_number', 'email', 'contact_person']
    ordering_fields = ['name', 'rating', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return SupplierListSerializer
        return SupplierSerializer

    def perform_create(self, serializer):
        supplier = serializer.save()
        log_action(self.request.user, 'create', supplier, request=self.request)

    @action(detail=True, methods=['post'])
    def activate(self, request, slug=None):
        supplier = self.get_object()
        supplier.status = 'active'
        supplier.save()
        return Response(SupplierSerializer(supplier).data)

    @action(detail=True, methods=['post'])
    def blacklist(self, request, slug=None):
        supplier = self.get_object()
        supplier.status = 'blacklisted'
        supplier.save()
        log_action(request.user, 'update', supplier, {'status': 'blacklisted'}, request=request)
        return Response(SupplierSerializer(supplier).data)


# ─────────────────────────────────────────────
# TENDER VIEWSET
# ─────────────────────────────────────────────
class TenderViewSet(viewsets.ModelViewSet):
    queryset = Tender.objects.select_related('department', 'awarded_to', 'created_by').prefetch_related('bids')
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'tender_type', 'department']
    search_fields = ['title', 'reference_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return TenderListSerializer
        return TenderSerializer

    def perform_create(self, serializer):
        tender = serializer.save(created_by=self.request.user)
        log_action(self.request.user, 'create', tender, request=self.request)

    @action(detail=True, methods=['post'])
    def publish(self, request, slug=None):
        tender = self.get_object()
        tender.status = 'published'
        tender.published_date = timezone.now().date()
        tender.save()
        log_action(request.user, 'update', tender, {'status': 'published'}, request=request)
        return Response(TenderSerializer(tender).data)

    @action(detail=True, methods=['post'])
    def award(self, request, slug=None):
        tender = self.get_object()
        supplier_id = request.data.get('supplier_id')
        awarded_amount = request.data.get('awarded_amount')
        if not supplier_id:
            return Response({'error': 'supplier_id required'}, status=400)
        tender.awarded_to_id = supplier_id
        tender.awarded_amount = awarded_amount
        tender.status = 'awarded'
        tender.save()
        log_action(request.user, 'update', tender, {'status': 'awarded', 'supplier': supplier_id}, request=request)
        return Response(TenderSerializer(tender).data)


# ─────────────────────────────────────────────
# TENDER BID VIEWSET
# ─────────────────────────────────────────────
class TenderBidViewSet(viewsets.ModelViewSet):
    queryset = TenderBid.objects.select_related('tender', 'supplier')
    serializer_class = TenderBidSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tender', 'supplier', 'status']


# ─────────────────────────────────────────────
# REQUISITION VIEWSET
# ─────────────────────────────────────────────
class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.select_related('department', 'requested_by').prefetch_related('items')
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'requisition_type', 'department', 'priority']
    search_fields = ['title', 'reference_number']
    ordering_fields = ['created_at', 'required_date', 'total_estimated_cost']

    def get_serializer_class(self):
        if self.action == 'list':
            return RequisitionListSerializer
        return RequisitionSerializer

    def perform_create(self, serializer):
        req = serializer.save(requested_by=self.request.user)
        log_action(self.request.user, 'create', req, request=self.request)

    @action(detail=True, methods=['post'])
    def submit(self, request, slug=None):
        req = self.get_object()
        req.status = 'submitted'
        req.save()
        log_action(request.user, 'submit', req, request=request)
        return Response(RequisitionSerializer(req).data)

    @action(detail=True, methods=['post'])
    def hod_approve(self, request, slug=None):
        req = self.get_object()
        req.status = 'hod_approved'
        req.hod_approved_by = request.user
        req.hod_approved_at = timezone.now()
        req.save()
        log_action(request.user, 'approve', req, request=request)
        return Response(RequisitionSerializer(req).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, slug=None):
        req = self.get_object()
        req.status = 'approved'
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.save()
        log_action(request.user, 'approve', req, request=request)
        return Response(RequisitionSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, slug=None):
        req = self.get_object()
        req.status = 'rejected'
        req.rejection_reason = request.data.get('reason', '')
        req.save()
        log_action(request.user, 'reject', req, {'reason': req.rejection_reason}, request=request)
        return Response(RequisitionSerializer(req).data)

    @action(detail=True, methods=['post'])
    def convert_to_po(self, request, slug=None):
        req = self.get_object()
        req.status = 'converted_to_po'
        req.save()
        log_action(request.user, 'update', req, {'status': 'converted_to_po'}, request=request)
        return Response(RequisitionSerializer(req).data)


# ─────────────────────────────────────────────
# REQUISITION ITEM VIEWSET
# ─────────────────────────────────────────────
class RequisitionItemViewSet(viewsets.ModelViewSet):
    queryset = RequisitionItem.objects.select_related('requisition')
    serializer_class = RequisitionItemSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['requisition']


# ─────────────────────────────────────────────
# PURCHASE ORDER VIEWSET
# ─────────────────────────────────────────────
class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related('supplier', 'department', 'requisition').prefetch_related('line_items')
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'supplier', 'department']
    search_fields = ['po_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return PurchaseOrderListSerializer
        return PurchaseOrderSerializer

    def perform_create(self, serializer):
        po = serializer.save(issued_by=self.request.user)
        log_action(self.request.user, 'create', po, request=self.request)

    @action(detail=True, methods=['post'])
    def issue(self, request, slug=None):
        po = self.get_object()
        po.status = 'issued'
        po.issued_by = request.user
        po.issued_at = timezone.now()
        po.save()
        log_action(request.user, 'update', po, {'status': 'issued'}, request=request)
        return Response(PurchaseOrderSerializer(po).data)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, slug=None):
        po = self.get_object()
        po.status = 'acknowledged'
        po.save()
        return Response(PurchaseOrderSerializer(po).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, slug=None):
        po = self.get_object()
        po.status = 'cancelled'
        po.save()
        log_action(request.user, 'update', po, {'status': 'cancelled'}, request=request)
        return Response(PurchaseOrderSerializer(po).data)


# ─────────────────────────────────────────────
# PO LINE ITEM VIEWSET
# ─────────────────────────────────────────────
class POLineItemViewSet(viewsets.ModelViewSet):
    queryset = POLineItem.objects.select_related('purchase_order')
    serializer_class = POLineItemSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['purchase_order']


# ─────────────────────────────────────────────
# GRN VIEWSET
# ─────────────────────────────────────────────
class GRNViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceivedNote.objects.select_related('purchase_order', 'supplier', 'received_by').prefetch_related('line_items')
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'supplier', 'purchase_order']
    search_fields = ['grn_number', 'invoice_number', 'delivery_note_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return GRNListSerializer
        return GRNSerializer

    def perform_create(self, serializer):
        grn = serializer.save(received_by=self.request.user)
        log_action(self.request.user, 'create', grn, request=self.request)

    @action(detail=True, methods=['post'])
    def verify(self, request, slug=None):
        grn = self.get_object()
        grn.status = 'verified'
        grn.verified_by = request.user
        grn.verified_at = timezone.now()
        grn.save()
        log_action(request.user, 'approve', grn, request=request)
        return Response(GRNSerializer(grn).data)

    @action(detail=True, methods=['post'])
    def submit(self, request, slug=None):
        grn = self.get_object()
        grn.status = 'submitted'
        grn.save()
        return Response(GRNSerializer(grn).data)


# ─────────────────────────────────────────────
# GRN LINE ITEM VIEWSET
# ─────────────────────────────────────────────
class GRNLineItemViewSet(viewsets.ModelViewSet):
    queryset = GRNLineItem.objects.select_related('grn')
    serializer_class = GRNLineItemSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['grn']


# ─────────────────────────────────────────────
# INVOICE VIEWSET
# ─────────────────────────────────────────────
class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('supplier', 'purchase_order', 'received_by')
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'supplier', 'currency']
    search_fields = ['invoice_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        invoice = serializer.save(received_by=self.request.user)
        log_action(self.request.user, 'create', invoice, request=self.request)

    @action(detail=True, methods=['post'])
    def approve(self, request, slug=None):
        invoice = self.get_object()
        invoice.status = 'approved'
        invoice.approved_by = request.user
        invoice.save()
        log_action(request.user, 'approve', invoice, request=request)
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'])
    def dispute(self, request, slug=None):
        invoice = self.get_object()
        invoice.status = 'disputed'
        invoice.notes = request.data.get('reason', invoice.notes)
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)


# ─────────────────────────────────────────────
# PAYMENT VIEWSET
# ─────────────────────────────────────────────
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('supplier', 'invoice', 'initiated_by')
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'supplier', 'payment_method']
    search_fields = ['payment_reference', 'transaction_reference']

    def get_serializer_class(self):
        if self.action == 'list':
            return PaymentListSerializer
        return PaymentSerializer

    def perform_create(self, serializer):
        payment = serializer.save(initiated_by=self.request.user)
        # Update invoice paid amount
        invoice = payment.invoice
        invoice.amount_paid = (invoice.amount_paid or 0) + payment.amount
        invoice.balance = invoice.total_amount - invoice.amount_paid
        if invoice.balance <= 0:
            invoice.status = 'paid'
        else:
            invoice.status = 'partially_paid'
        invoice.save()
        log_action(self.request.user, 'create', payment, request=self.request)

    @action(detail=True, methods=['post'])
    def approve(self, request, slug=None):
        payment = self.get_object()
        payment.status = 'completed'
        payment.approved_by = request.user
        payment.approved_at = timezone.now()
        payment.save()
        log_action(request.user, 'approve', payment, request=request)
        return Response(PaymentSerializer(payment).data)


# ─────────────────────────────────────────────
# AUDIT LOG VIEWSET
# ─────────────────────────────────────────────
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['action', 'model_name', 'user']
    search_fields = ['object_repr', 'model_name']


# ─────────────────────────────────────────────
# DASHBOARD VIEWSET
# ─────────────────────────────────────────────
class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = timezone.now().date()
        data = {
            'total_budgets': Budget.objects.count(),
            'total_requisitions': Requisition.objects.count(),
            'pending_requisitions': Requisition.objects.filter(status__in=['submitted', 'hod_approved', 'procurement_review']).count(),
            'emergency_requisitions': Requisition.objects.filter(requisition_type='emergency').count(),
            'total_purchase_orders': PurchaseOrder.objects.count(),
            'open_purchase_orders': PurchaseOrder.objects.filter(status__in=['draft', 'issued', 'acknowledged', 'partially_received']).count(),
            'total_grns': GoodsReceivedNote.objects.count(),
            'pending_grns': GoodsReceivedNote.objects.filter(status__in=['draft', 'submitted']).count(),
            'total_tenders': Tender.objects.count(),
            'active_tenders': Tender.objects.filter(status__in=['published', 'evaluation']).count(),
            'total_suppliers': Supplier.objects.count(),
            'active_suppliers': Supplier.objects.filter(status='active').count(),
            'total_payments': Payment.objects.filter(status='completed').aggregate(t=Sum('amount'))['t'] or 0,
            'pending_invoices': Invoice.objects.filter(status__in=['received', 'matched']).count(),
            'overdue_invoices': Invoice.objects.filter(due_date__lt=today, status__in=['received', 'matched', 'approved']).count(),
        }
        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent_activity(self, request):
        logs = AuditLog.objects.select_related('user').order_by('-timestamp')[:20]
        return Response(AuditLogSerializer(logs, many=True).data)

    @action(detail=False, methods=['get'])
    def budget_utilization(self, request):
        budgets = Budget.objects.filter(status='approved').select_related('department', 'fiscal_year')
        result = []
        for b in budgets:
            spent = sum(
                float(item.total_price)
                for q in b.quarters.all()
                for item in q.line_items.all()
            )
            result.append({
                'budget_id': b.id,
                'title': b.title,
                'department': str(b.department),
                'total_amount': float(b.total_amount),
                'spent': spent,
                'remaining': float(b.total_amount) - spent,
                'utilization_percent': round((spent / float(b.total_amount) * 100), 2) if b.total_amount else 0,
            })
        return Response(result)

    @action(detail=False, methods=['get'])
    def monthly_spend(self, request):
        from django.db.models.functions import TruncMonth
        data = (
            Payment.objects
            .filter(status='completed')
            .annotate(month=TruncMonth('payment_date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )
        return Response(list(data))