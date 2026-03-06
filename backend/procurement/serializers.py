from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Department, FiscalYear, Budget, QuarterBudget, BudgetLineItem,
    Supplier, Tender, TenderBid, Requisition, RequisitionItem,
    PurchaseOrder, POLineItem, GoodsReceivedNote, GRNLineItem,
    Invoice, Payment, AuditLog
)

User = get_user_model()


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'role', 'department', 'phone', 'is_active']
        read_only_fields = ['id']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'department', 'phone']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ─────────────────────────────────────────────
# DEPARTMENT
# ─────────────────────────────────────────────
class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'slug', 'code', 'head', 'head_name', 'created_at']
        read_only_fields = ['slug', 'created_at']

    def get_head_name(self, obj):
        return obj.head.get_full_name() if obj.head else None


# ─────────────────────────────────────────────
# FISCAL YEAR
# ─────────────────────────────────────────────
class FiscalYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalYear
        fields = ['id', 'name', 'slug', 'start_date', 'end_date', 'is_active', 'created_at']
        read_only_fields = ['slug', 'created_at']


# ─────────────────────────────────────────────
# BUDGET LINE ITEM
# ─────────────────────────────────────────────
class BudgetLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetLineItem
        fields = ['id', 'slug', 'item_name', 'description', 'unit',
                  'quantity', 'unit_price', 'total_price', 'category', 'created_at']
        read_only_fields = ['slug', 'total_price', 'created_at']


# ─────────────────────────────────────────────
# QUARTER BUDGET
# ─────────────────────────────────────────────
class QuarterBudgetSerializer(serializers.ModelSerializer):
    line_items = BudgetLineItemSerializer(many=True, read_only=True)
    total_planned = serializers.SerializerMethodField()

    class Meta:
        model = QuarterBudget
        fields = ['id', 'slug', 'quarter', 'allocated_amount',
                  'start_date', 'end_date', 'notes', 'line_items', 'total_planned', 'created_at']
        read_only_fields = ['slug', 'created_at']

    def get_total_planned(self, obj):
        return sum(item.total_price for item in obj.line_items.all())


# ─────────────────────────────────────────────
# BUDGET
# ─────────────────────────────────────────────
class BudgetSerializer(serializers.ModelSerializer):
    quarters = QuarterBudgetSerializer(many=True, read_only=True)
    fiscal_year_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    prepared_by_name = serializers.SerializerMethodField()
    utilization_percent = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = ['id', 'title', 'slug', 'fiscal_year', 'fiscal_year_name',
                  'department', 'department_name', 'total_amount', 'status',
                  'prepared_by', 'prepared_by_name', 'approved_by', 'approved_at',
                  'notes', 'quarters', 'utilization_percent', 'created_at', 'updated_at']
        read_only_fields = ['slug', 'created_at', 'updated_at']

    def get_fiscal_year_name(self, obj):
        return str(obj.fiscal_year)

    def get_department_name(self, obj):
        return str(obj.department)

    def get_prepared_by_name(self, obj):
        return obj.prepared_by.get_full_name() if obj.prepared_by else None

    def get_utilization_percent(self, obj):
        if obj.total_amount == 0:
            return 0
        spent = sum(
            item.total_price
            for q in obj.quarters.all()
            for item in q.line_items.all()
        )
        return round((float(spent) / float(obj.total_amount)) * 100, 2)


class BudgetListSerializer(serializers.ModelSerializer):
    fiscal_year_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = ['id', 'title', 'slug', 'fiscal_year_name', 'department_name',
                  'total_amount', 'status', 'created_at']

    def get_fiscal_year_name(self, obj):
        return str(obj.fiscal_year)

    def get_department_name(self, obj):
        return str(obj.department)


# ─────────────────────────────────────────────
# SUPPLIER
# ─────────────────────────────────────────────
class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['slug', 'created_at', 'updated_at']


class SupplierListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'slug', 'email', 'phone', 'category', 'status', 'rating', 'city']


# ─────────────────────────────────────────────
# TENDER BID
# ─────────────────────────────────────────────
class TenderBidSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()

    class Meta:
        model = TenderBid
        fields = '__all__'
        read_only_fields = ['slug', 'submitted_at']

    def get_supplier_name(self, obj):
        return str(obj.supplier)


# ─────────────────────────────────────────────
# TENDER
# ─────────────────────────────────────────────
class TenderSerializer(serializers.ModelSerializer):
    bids = TenderBidSerializer(many=True, read_only=True)
    department_name = serializers.SerializerMethodField()
    awarded_to_name = serializers.SerializerMethodField()
    bid_count = serializers.SerializerMethodField()

    class Meta:
        model = Tender
        fields = '__all__'
        read_only_fields = ['slug', 'created_at', 'updated_at']

    def get_department_name(self, obj):
        return str(obj.department) if obj.department else None

    def get_awarded_to_name(self, obj):
        return str(obj.awarded_to) if obj.awarded_to else None

    def get_bid_count(self, obj):
        return obj.bids.count()


class TenderListSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    bid_count = serializers.SerializerMethodField()

    class Meta:
        model = Tender
        fields = ['id', 'reference_number', 'slug', 'title', 'tender_type',
                  'department_name', 'budget', 'status', 'closing_date', 'bid_count', 'created_at']

    def get_department_name(self, obj):
        return str(obj.department) if obj.department else None

    def get_bid_count(self, obj):
        return obj.bids.count()


# ─────────────────────────────────────────────
# REQUISITION ITEM
# ─────────────────────────────────────────────
class RequisitionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisitionItem
        fields = '__all__'
        read_only_fields = ['slug', 'total_estimated_price', 'created_at']


# ─────────────────────────────────────────────
# REQUISITION
# ─────────────────────────────────────────────
class RequisitionSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True, read_only=True)
    department_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Requisition
        fields = '__all__'
        read_only_fields = ['slug', 'reference_number', 'created_at', 'updated_at']

    def get_department_name(self, obj):
        return str(obj.department)

    def get_requested_by_name(self, obj):
        return obj.requested_by.get_full_name() if obj.requested_by else None

    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else None


class RequisitionListSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Requisition
        fields = ['id', 'reference_number', 'slug', 'title', 'requisition_type',
                  'department_name', 'status', 'priority', 'total_estimated_cost',
                  'requested_by_name', 'required_date', 'created_at']

    def get_department_name(self, obj):
        return str(obj.department)

    def get_requested_by_name(self, obj):
        return obj.requested_by.get_full_name() if obj.requested_by else None


# ─────────────────────────────────────────────
# PO LINE ITEM
# ─────────────────────────────────────────────
class POLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = POLineItem
        fields = '__all__'
        read_only_fields = ['slug', 'total_price']


# ─────────────────────────────────────────────
# PURCHASE ORDER
# ─────────────────────────────────────────────
class PurchaseOrderSerializer(serializers.ModelSerializer):
    line_items = POLineItemSerializer(many=True, read_only=True)
    supplier_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    issued_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['slug', 'po_number', 'tax_amount', 'total_amount', 'created_at', 'updated_at']

    def get_supplier_name(self, obj):
        return str(obj.supplier)

    def get_department_name(self, obj):
        return str(obj.department) if obj.department else None

    def get_issued_by_name(self, obj):
        return obj.issued_by.get_full_name() if obj.issued_by else None


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'po_number', 'slug', 'supplier_name', 'department_name',
                  'status', 'total_amount', 'currency', 'delivery_date', 'created_at']

    def get_supplier_name(self, obj):
        return str(obj.supplier)

    def get_department_name(self, obj):
        return str(obj.department) if obj.department else None


# ─────────────────────────────────────────────
# GRN LINE ITEM
# ─────────────────────────────────────────────
class GRNLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GRNLineItem
        fields = '__all__'
        read_only_fields = ['slug', 'total_accepted_value']


# ─────────────────────────────────────────────
# GRN
# ─────────────────────────────────────────────
class GRNSerializer(serializers.ModelSerializer):
    line_items = GRNLineItemSerializer(many=True, read_only=True)
    supplier_name = serializers.SerializerMethodField()
    po_number = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceivedNote
        fields = '__all__'
        read_only_fields = ['slug', 'grn_number', 'created_at', 'updated_at']

    def get_supplier_name(self, obj):
        return str(obj.supplier)

    def get_po_number(self, obj):
        return obj.purchase_order.po_number if obj.purchase_order else None

    def get_received_by_name(self, obj):
        return obj.received_by.get_full_name() if obj.received_by else None


class GRNListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    po_number = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceivedNote
        fields = ['id', 'grn_number', 'slug', 'supplier_name', 'po_number',
                  'delivery_date', 'status', 'created_at']

    def get_supplier_name(self, obj):
        return str(obj.supplier)

    def get_po_number(self, obj):
        return obj.purchase_order.po_number if obj.purchase_order else None


# ─────────────────────────────────────────────
# INVOICE
# ─────────────────────────────────────────────
class InvoiceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    po_number = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['slug', 'balance', 'created_at', 'updated_at']

    def get_supplier_name(self, obj):
        return str(obj.supplier)

    def get_po_number(self, obj):
        return obj.purchase_order.po_number if obj.purchase_order else None


class InvoiceListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'slug', 'supplier_name',
                  'invoice_date', 'due_date', 'total_amount', 'balance', 'status', 'currency']

    def get_supplier_name(self, obj):
        return str(obj.supplier)


# ─────────────────────────────────────────────
# PAYMENT
# ─────────────────────────────────────────────
class PaymentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    initiated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['slug', 'payment_reference', 'created_at', 'updated_at']

    def get_supplier_name(self, obj):
        return str(obj.supplier)

    def get_invoice_number(self, obj):
        return obj.invoice.invoice_number if obj.invoice else None

    def get_initiated_by_name(self, obj):
        return obj.initiated_by.get_full_name() if obj.initiated_by else None


class PaymentListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['id', 'payment_reference', 'slug', 'supplier_name',
                  'amount', 'currency', 'payment_method', 'payment_date', 'status', 'created_at']

    def get_supplier_name(self, obj):
        return str(obj.supplier)


# ─────────────────────────────────────────────
# AUDIT LOG
# ─────────────────────────────────────────────
class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'


# ─────────────────────────────────────────────
# DASHBOARD STATS (read-only computed)
# ─────────────────────────────────────────────
class DashboardStatsSerializer(serializers.Serializer):
    total_budgets = serializers.IntegerField()
    total_requisitions = serializers.IntegerField()
    pending_requisitions = serializers.IntegerField()
    emergency_requisitions = serializers.IntegerField()
    total_purchase_orders = serializers.IntegerField()
    open_purchase_orders = serializers.IntegerField()
    total_grns = serializers.IntegerField()
    pending_grns = serializers.IntegerField()
    total_tenders = serializers.IntegerField()
    active_tenders = serializers.IntegerField()
    total_suppliers = serializers.IntegerField()
    active_suppliers = serializers.IntegerField()
    total_payments = serializers.DecimalField(max_digits=20, decimal_places=2)
    pending_invoices = serializers.IntegerField()
    overdue_invoices = serializers.IntegerField()