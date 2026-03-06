from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.text import slugify
from django.utils import timezone
import uuid


# ─────────────────────────────────────────────
# CUSTOM USER
# ─────────────────────────────────────────────
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('procurement_officer', 'Procurement Officer'),
        ('budget_manager', 'Budget Manager'),
        ('approver', 'Approver'),
        ('finance', 'Finance'),
        ('store_keeper', 'Store Keeper'),
        ('requester', 'Requester'),
    ]
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='requester')
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"


# ─────────────────────────────────────────────
# DEPARTMENT
# ─────────────────────────────────────────────
class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    code = models.CharField(max_length=10, unique=True)
    head = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='headed_departments')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# FISCAL YEAR
# ─────────────────────────────────────────────
class FiscalYear(models.Model):
    name = models.CharField(max_length=20)           # e.g. FY2025
    slug = models.SlugField(unique=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# BUDGET (Annual)
# ─────────────────────────────────────────────
class Budget(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='budgets')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='budgets')
    total_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    prepared_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='prepared_budgets')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_budgets')
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.title}-{self.fiscal_year}-{self.department}")
            self.slug = f"{base}-{uuid.uuid4().hex[:6]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} | {self.fiscal_year}"


# ─────────────────────────────────────────────
# QUARTER BUDGET
# ─────────────────────────────────────────────
class QuarterBudget(models.Model):
    QUARTER_CHOICES = [
        ('Q1', 'Quarter 1 (Jan–Mar)'),
        ('Q2', 'Quarter 2 (Apr–Jun)'),
        ('Q3', 'Quarter 3 (Jul–Sep)'),
        ('Q4', 'Quarter 4 (Oct–Dec)'),
    ]
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='quarters')
    quarter = models.CharField(max_length=2, choices=QUARTER_CHOICES)
    slug = models.SlugField(unique=True, blank=True)
    allocated_amount = models.DecimalField(max_digits=18, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('budget', 'quarter')

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"{slugify(str(self.budget))}-{self.quarter.lower()}-{uuid.uuid4().hex[:6]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.budget} – {self.quarter}"


# ─────────────────────────────────────────────
# BUDGET LINE ITEM (planned per quarter)
# ─────────────────────────────────────────────
class BudgetLineItem(models.Model):
    quarter_budget = models.ForeignKey(QuarterBudget, on_delete=models.CASCADE, related_name='line_items')
    slug = models.SlugField(unique=True, blank=True)
    item_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=50)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    total_price = models.DecimalField(max_digits=18, decimal_places=2, editable=False)
    category = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        if not self.slug:
            self.slug = f"{slugify(self.item_name)}-{uuid.uuid4().hex[:6]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} ({self.quarter_budget})"


# ─────────────────────────────────────────────
# SUPPLIER
# ─────────────────────────────────────────────
class Supplier(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('blacklisted', 'Blacklisted'),
        ('pending', 'Pending Approval'),
    ]
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    registration_number = models.CharField(max_length=100, unique=True)
    tax_pin = models.CharField(max_length=100, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='Kenya')
    contact_person = models.CharField(max_length=100)
    category = models.CharField(max_length=100)          # e.g. ICT, Construction, Consumables
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account = models.CharField(max_length=50, blank=True)
    bank_branch = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"{slugify(self.name)}-{uuid.uuid4().hex[:6]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# TENDER
# ─────────────────────────────────────────────
class Tender(models.Model):
    TYPE_CHOICES = [
        ('open', 'Open Tender'),
        ('restricted', 'Restricted Tender'),
        ('direct', 'Direct Procurement'),
        ('rfq', 'Request for Quotation'),
        ('eoi', 'Expression of Interest'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('evaluation', 'Under Evaluation'),
        ('awarded', 'Awarded'),
        ('cancelled', 'Cancelled'),
        ('closed', 'Closed'),
    ]
    reference_number = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    title = models.CharField(max_length=300)
    description = models.TextField()
    tender_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    budget = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=5, default='KES')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    published_date = models.DateField(null=True, blank=True)
    closing_date = models.DateField(null=True, blank=True)
    opening_date = models.DateField(null=True, blank=True)
    awarded_to = models.ForeignKey(Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name='won_tenders')
    awarded_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    evaluation_criteria = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tenders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"{slugify(self.title)}-{uuid.uuid4().hex[:6]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_number} – {self.title}"


# ─────────────────────────────────────────────
# TENDER BID
# ─────────────────────────────────────────────
class TenderBid(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('shortlisted', 'Shortlisted'),
        ('rejected', 'Rejected'),
        ('awarded', 'Awarded'),
    ]
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='bids')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='bids')
    slug = models.SlugField(unique=True, blank=True)
    bid_amount = models.DecimalField(max_digits=18, decimal_places=2)
    technical_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    financial_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"bid-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Bid by {self.supplier} on {self.tender}"


# ─────────────────────────────────────────────
# REQUISITION
# ─────────────────────────────────────────────
class Requisition(models.Model):
    TYPE_CHOICES = [
        ('planned', 'Planned'),
        ('emergency', 'Emergency'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('hod_approved', 'HOD Approved'),
        ('procurement_review', 'Procurement Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('converted_to_po', 'Converted to PO'),
        ('cancelled', 'Cancelled'),
    ]
    reference_number = models.CharField(max_length=50, unique=True, blank=True)
    slug = models.SlugField(unique=True, blank=True)
    title = models.CharField(max_length=300)
    requisition_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='planned')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='requisitions')
    quarter_budget = models.ForeignKey(QuarterBudget, null=True, blank=True, on_delete=models.SET_NULL, related_name='requisitions')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    priority = models.CharField(max_length=10, choices=[('low','Low'),('medium','Medium'),('high','High'),('critical','Critical')], default='medium')
    justification = models.TextField(blank=True)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='requested_requisitions')
    hod_approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='hod_approved_requisitions')
    hod_approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_requisitions')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    required_date = models.DateField(null=True, blank=True)
    emergency_reason = models.TextField(blank=True)
    total_estimated_cost = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.reference_number:
            prefix = 'EMR' if self.requisition_type == 'emergency' else 'REQ'
            self.reference_number = f"{prefix}-{timezone.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        if not self.slug:
            self.slug = f"{slugify(self.reference_number)}-{uuid.uuid4().hex[:4]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_number} – {self.title}"


# ─────────────────────────────────────────────
# REQUISITION LINE ITEM
# ─────────────────────────────────────────────
class RequisitionItem(models.Model):
    requisition = models.ForeignKey(Requisition, on_delete=models.CASCADE, related_name='items')
    slug = models.SlugField(unique=True, blank=True)
    item_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=50)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    estimated_unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    total_estimated_price = models.DecimalField(max_digits=18, decimal_places=2, editable=False)
    budget_line_item = models.ForeignKey(BudgetLineItem, null=True, blank=True, on_delete=models.SET_NULL, related_name='requisition_items')
    specifications = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.total_estimated_price = self.quantity * self.estimated_unit_price
        if not self.slug:
            self.slug = f"reqitem-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} ({self.requisition.reference_number})"


# ─────────────────────────────────────────────
# PURCHASE ORDER
# ─────────────────────────────────────────────
class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('acknowledged', 'Acknowledged'),
        ('partially_received', 'Partially Received'),
        ('fully_received', 'Fully Received'),
        ('cancelled', 'Cancelled'),
        ('closed', 'Closed'),
    ]
    po_number = models.CharField(max_length=50, unique=True, blank=True)
    slug = models.SlugField(unique=True, blank=True)
    requisition = models.ForeignKey(Requisition, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders')
    tender = models.ForeignKey(Tender, null=True, blank=True, on_delete=models.SET_NULL, related_name='purchase_orders')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    currency = models.CharField(max_length=5, default='KES')
    sub_total = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16.00)   # VAT %
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    payment_terms = models.CharField(max_length=200, blank=True)
    delivery_address = models.TextField(blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    issued_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='issued_pos')
    issued_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.po_number:
            self.po_number = f"PO-{timezone.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        if not self.slug:
            self.slug = f"{slugify(self.po_number)}-{uuid.uuid4().hex[:4]}"
        self.tax_amount = (self.sub_total * self.tax_rate) / 100
        self.total_amount = self.sub_total + self.tax_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.po_number} – {self.supplier}"


# ─────────────────────────────────────────────
# PURCHASE ORDER LINE ITEM
# ─────────────────────────────────────────────
class POLineItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='line_items')
    slug = models.SlugField(unique=True, blank=True)
    item_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=50)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    total_price = models.DecimalField(max_digits=18, decimal_places=2, editable=False)
    quantity_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        if not self.slug:
            self.slug = f"poitem-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} – {self.purchase_order.po_number}"


# ─────────────────────────────────────────────
# GOODS RECEIVED NOTE (GRN)
# ─────────────────────────────────────────────
class GoodsReceivedNote(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]
    grn_number = models.CharField(max_length=50, unique=True, blank=True)
    slug = models.SlugField(unique=True, blank=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='grns')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='grns')
    delivery_date = models.DateField()
    delivery_note_number = models.CharField(max_length=100, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='received_grns')
    verified_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='verified_grns')
    verified_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.grn_number:
            self.grn_number = f"GRN-{timezone.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        if not self.slug:
            self.slug = f"{slugify(self.grn_number)}-{uuid.uuid4().hex[:4]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.grn_number} – {self.purchase_order.po_number}"


# ─────────────────────────────────────────────
# GRN LINE ITEM
# ─────────────────────────────────────────────
class GRNLineItem(models.Model):
    grn = models.ForeignKey(GoodsReceivedNote, on_delete=models.CASCADE, related_name='line_items')
    po_line_item = models.ForeignKey(POLineItem, on_delete=models.SET_NULL, null=True, blank=True)
    slug = models.SlugField(unique=True, blank=True)
    item_name = models.CharField(max_length=200)
    unit = models.CharField(max_length=50)
    quantity_ordered = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_received = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_accepted = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_rejected = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rejection_reason = models.TextField(blank=True)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    total_accepted_value = models.DecimalField(max_digits=18, decimal_places=2, editable=False)
    batch_number = models.CharField(max_length=100, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    def save(self, *args, **kwargs):
        self.total_accepted_value = self.quantity_accepted * self.unit_price
        if not self.slug:
            self.slug = f"grnitem-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} – {self.grn.grn_number}"


# ─────────────────────────────────────────────
# INVOICE
# ─────────────────────────────────────────────
class Invoice(models.Model):
    STATUS_CHOICES = [
        ('received', 'Received'),
        ('matched', 'Matched to PO/GRN'),
        ('approved', 'Approved for Payment'),
        ('partially_paid', 'Partially Paid'),
        ('paid', 'Fully Paid'),
        ('disputed', 'Disputed'),
        ('cancelled', 'Cancelled'),
    ]
    invoice_number = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='invoices')
    purchase_order = models.ForeignKey(PurchaseOrder, null=True, blank=True, on_delete=models.SET_NULL, related_name='invoices')
    grn = models.ForeignKey(GoodsReceivedNote, null=True, blank=True, on_delete=models.SET_NULL, related_name='invoices')
    invoice_date = models.DateField()
    due_date = models.DateField()
    sub_total = models.DecimalField(max_digits=18, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=18, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=18, decimal_places=2, editable=False, default=0)
    currency = models.CharField(max_length=5, default='KES')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received')
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='received_invoices')
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_invoices')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.balance = self.total_amount - self.amount_paid
        if not self.slug:
            self.slug = f"inv-{slugify(self.invoice_number)}-{uuid.uuid4().hex[:6]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"INV {self.invoice_number} – {self.supplier}"


# ─────────────────────────────────────────────
# PAYMENT
# ─────────────────────────────────────────────
class Payment(models.Model):
    METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('mobile_money', 'Mobile Money'),
        ('cash', 'Cash'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('reversed', 'Reversed'),
    ]
    payment_reference = models.CharField(max_length=100, unique=True, blank=True)
    slug = models.SlugField(unique=True, blank=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.CharField(max_length=5, default='KES')
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    payment_date = models.DateField()
    transaction_reference = models.CharField(max_length=200, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='initiated_payments')
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_payments')
    approved_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.payment_reference:
            self.payment_reference = f"PAY-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        if not self.slug:
            self.slug = f"{slugify(self.payment_reference)}-{uuid.uuid4().hex[:4]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.payment_reference} – KES {self.amount}"


# ─────────────────────────────────────────────
# AUDIT LOG
# ─────────────────────────────────────────────
class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('submit', 'Submit'),
    ]
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50)
    object_repr = models.CharField(max_length=300)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} – {self.action} – {self.model_name} at {self.timestamp}"