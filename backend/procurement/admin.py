# procurement/admin.py
#
# Comprehensive admin configuration for the ProcurePro procurement system.
# Every model is registered with full inline support, list filtering,
# search, actions and display customisation.

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Sum
from django.urls import reverse
from django.utils.safestring import mark_safe

from .models import (
    User, Department, FiscalYear,
    Budget, QuarterBudget, BudgetLineItem,
    Supplier, Tender, TenderBid,
    Requisition, RequisitionItem,
    PurchaseOrder, POLineItem,
    GoodsReceivedNote, GRNLineItem,
    Invoice, Payment, AuditLog,
)

# ─────────────────────────────────────────────────────────────────
# ADMIN SITE BRANDING
# ─────────────────────────────────────────────────────────────────
admin.site.site_header  = 'ProcurePro Administration'
admin.site.site_title   = 'ProcurePro Admin'
admin.site.index_title  = 'Procurement Management System'


# ─────────────────────────────────────────────────────────────────
# COLOUR HELPERS  (reused across admin classes)
# ─────────────────────────────────────────────────────────────────
STATUS_COLOURS = {
    # generic
    'draft':              '#6c757d',
    'submitted':          '#0d6efd',
    'approved':           '#198754',
    'rejected':           '#dc3545',
    'cancelled':          '#dc3545',
    'completed':          '#198754',
    'failed':             '#dc3545',
    'reversed':           '#fd7e14',
    'processing':         '#0dcaf0',
    # budget
    'hod_approved':       '#0d6efd',
    'procurement_review': '#6610f2',
    'converted_to_po':    '#20c997',
    # tender
    'published':          '#0d6efd',
    'evaluation':         '#fd7e14',
    'awarded':            '#198754',
    'closed':             '#6c757d',
    # po
    'issued':             '#0d6efd',
    'acknowledged':       '#6610f2',
    'partially_received': '#fd7e14',
    'fully_received':     '#198754',
    # invoice
    'received':           '#0d6efd',
    'matched':            '#6610f2',
    'partially_paid':     '#fd7e14',
    'paid':               '#198754',
    'disputed':           '#dc3545',
    # supplier
    'active':             '#198754',
    'inactive':           '#6c757d',
    'blacklisted':        '#dc3545',
    'pending':            '#fd7e14',
    # grn
    'verified':           '#198754',
    # priority
    'low':                '#adb5bd',
    'medium':             '#0d6efd',
    'high':               '#fd7e14',
    'critical':           '#dc3545',
    # payment
    'pending_approval':   '#fd7e14',
}

def coloured_status(status):
    colour = STATUS_COLOURS.get(status, '#6c757d')
    label  = (status or '').replace('_', ' ').upper()
    return format_html(
        '<span style="background:{};color:#fff;padding:2px 8px;'
        'font-size:10px;font-weight:700;letter-spacing:.06em;">{}</span>',
        colour, label
    )

def amount_display(value, currency='KES'):
    if value is None:
        return '—'
    return format_html(
        '<span style="font-family:monospace;font-weight:600;">{} {:,.2f}</span>',
        currency, value
    )


# ─────────────────────────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────────────────────────
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ('username', 'full_name', 'email', 'coloured_role', 'department', 'phone', 'is_active', 'is_staff')
    list_filter     = ('role', 'is_active', 'is_staff', 'is_superuser')
    search_fields   = ('username', 'first_name', 'last_name', 'email', 'department')
    ordering        = ('username',)
    list_per_page   = 25

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Procurement Profile', {
            'fields': ('role', 'department', 'phone'),
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Procurement Profile', {
            'fields': ('role', 'department', 'phone'),
        }),
    )

    @admin.display(description='Name')
    def full_name(self, obj):
        return obj.get_full_name() or obj.username

    @admin.display(description='Role')
    def coloured_role(self, obj):
        return coloured_status(obj.role)


# ─────────────────────────────────────────────────────────────────
# DEPARTMENT
# ─────────────────────────────────────────────────────────────────
@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display    = ('name', 'code', 'head', 'budget_count', 'requisition_count', 'created_at')
    search_fields   = ('name', 'code')
    readonly_fields = ('slug', 'created_at')
    list_per_page   = 20

    @admin.display(description='Budgets')
    def budget_count(self, obj):
        return obj.budgets.count()

    @admin.display(description='Requisitions')
    def requisition_count(self, obj):
        return obj.requisitions.count()


# ─────────────────────────────────────────────────────────────────
# FISCAL YEAR
# ─────────────────────────────────────────────────────────────────
@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    list_display    = ('name', 'start_date', 'end_date', 'is_active_badge', 'budget_count')
    list_filter     = ('is_active',)
    search_fields   = ('name',)
    readonly_fields = ('slug', 'created_at')
    actions         = ['mark_active']

    @admin.display(description='Active')
    def is_active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color:#198754;font-weight:700;">● ACTIVE</span>')
        return format_html('<span style="color:#adb5bd;">○ inactive</span>')

    @admin.display(description='Budgets')
    def budget_count(self, obj):
        return obj.budgets.count()

    @admin.action(description='Set selected fiscal year as active')
    def mark_active(self, request, queryset):
        FiscalYear.objects.update(is_active=False)
        if queryset.count() == 1:
            queryset.update(is_active=True)
            self.message_user(request, 'Fiscal year set as active.')
        else:
            self.message_user(request, 'Select exactly one fiscal year.', level='warning')


# ─────────────────────────────────────────────────────────────────
# BUDGET  +  INLINE QUARTERS
# ─────────────────────────────────────────────────────────────────
class BudgetLineItemInline(admin.TabularInline):
    model         = BudgetLineItem
    extra         = 1
    readonly_fields = ('slug', 'total_price', 'created_at')
    fields        = ('item_name', 'category', 'unit', 'quantity', 'unit_price', 'total_price', 'description')
    show_change_link = True


class QuarterBudgetInline(admin.StackedInline):
    model       = QuarterBudget
    extra       = 0
    readonly_fields = ('slug', 'created_at')
    fields      = ('quarter', 'allocated_amount', 'start_date', 'end_date', 'notes')
    show_change_link = True


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display    = ('title', 'fiscal_year', 'department', 'formatted_total', 'coloured_status_field', 'prepared_by', 'approved_by', 'created_at')
    list_filter     = ('status', 'fiscal_year', 'department')
    search_fields   = ('title',)
    readonly_fields = ('slug', 'created_at', 'updated_at')
    inlines         = [QuarterBudgetInline]
    autocomplete_fields = ['department', 'fiscal_year', 'prepared_by', 'approved_by']
    date_hierarchy  = 'created_at'
    list_per_page   = 20
    actions         = ['action_approve', 'action_reject', 'action_submit']

    fieldsets = (
        ('Budget Details', {
            'fields': ('title', 'slug', 'fiscal_year', 'department', 'total_amount', 'status'),
        }),
        ('Approval', {
            'fields': ('prepared_by', 'approved_by', 'approved_at', 'notes'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Total Amount')
    def formatted_total(self, obj):
        return amount_display(obj.total_amount)

    @admin.display(description='Status')
    def coloured_status_field(self, obj):
        return coloured_status(obj.status)

    @admin.action(description='Approve selected budgets')
    def action_approve(self, request, queryset):
        updated = queryset.filter(status='submitted').update(
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now(),
        )
        self.message_user(request, f'{updated} budget(s) approved.')

    @admin.action(description='Reject selected budgets')
    def action_reject(self, request, queryset):
        updated = queryset.exclude(status__in=['approved']).update(status='rejected')
        self.message_user(request, f'{updated} budget(s) rejected.')

    @admin.action(description='Submit selected budgets for approval')
    def action_submit(self, request, queryset):
        updated = queryset.filter(status='draft').update(status='submitted')
        self.message_user(request, f'{updated} budget(s) submitted.')


@admin.register(QuarterBudget)
class QuarterBudgetAdmin(admin.ModelAdmin):
    list_display    = ('budget', 'quarter', 'formatted_allocated', 'start_date', 'end_date', 'line_item_count')
    list_filter     = ('quarter', 'budget__fiscal_year')
    search_fields   = ('budget__title',)
    readonly_fields = ('slug', 'created_at')
    inlines         = [BudgetLineItemInline]
    list_per_page   = 30

    @admin.display(description='Allocated')
    def formatted_allocated(self, obj):
        return amount_display(obj.allocated_amount)

    @admin.display(description='Line Items')
    def line_item_count(self, obj):
        return obj.line_items.count()


@admin.register(BudgetLineItem)
class BudgetLineItemAdmin(admin.ModelAdmin):
    list_display    = ('item_name', 'quarter_budget', 'category', 'unit', 'quantity', 'unit_price_fmt', 'total_price_fmt', 'created_at')
    list_filter     = ('category', 'quarter_budget__quarter')
    search_fields   = ('item_name', 'category')
    readonly_fields = ('slug', 'total_price', 'created_at')
    list_per_page   = 40

    @admin.display(description='Unit Price')
    def unit_price_fmt(self, obj):
        return amount_display(obj.unit_price)

    @admin.display(description='Total Price')
    def total_price_fmt(self, obj):
        return amount_display(obj.total_price)


# ─────────────────────────────────────────────────────────────────
# SUPPLIER
# ─────────────────────────────────────────────────────────────────
@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display    = ('name', 'category', 'email', 'phone', 'city', 'coloured_status_field', 'star_rating', 'po_count', 'created_at')
    list_filter     = ('status', 'category', 'city', 'country')
    search_fields   = ('name', 'registration_number', 'email', 'contact_person', 'tax_pin')
    readonly_fields = ('slug', 'created_at', 'updated_at')
    list_per_page   = 25
    actions         = ['action_activate', 'action_blacklist', 'action_set_pending']

    fieldsets = (
        ('Company Information', {
            'fields': ('name', 'slug', 'registration_number', 'tax_pin', 'category', 'status', 'rating'),
        }),
        ('Contact', {
            'fields': ('email', 'phone', 'contact_person', 'address', 'city', 'country'),
        }),
        ('Banking', {
            'fields': ('bank_name', 'bank_account', 'bank_branch'),
        }),
        ('Notes & Timestamps', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Status')
    def coloured_status_field(self, obj):
        return coloured_status(obj.status)

    @admin.display(description='Rating')
    def star_rating(self, obj):
        filled = int(obj.rating)
        half   = 1 if (obj.rating - filled) >= 0.5 else 0
        stars  = '★' * filled + ('½' if half else '') + '☆' * (5 - filled - half)
        return format_html('<span style="color:#fd7e14;font-size:13px;">{}</span> {}', stars, obj.rating)

    @admin.display(description='POs')
    def po_count(self, obj):
        return obj.purchase_orders.count()

    @admin.action(description='Activate selected suppliers')
    def action_activate(self, request, queryset):
        queryset.update(status='active')
        self.message_user(request, f'{queryset.count()} supplier(s) activated.')

    @admin.action(description='Blacklist selected suppliers')
    def action_blacklist(self, request, queryset):
        queryset.update(status='blacklisted')
        self.message_user(request, f'{queryset.count()} supplier(s) blacklisted.', level='warning')

    @admin.action(description='Set selected suppliers as Pending')
    def action_set_pending(self, request, queryset):
        queryset.update(status='pending')
        self.message_user(request, f'{queryset.count()} supplier(s) set to pending.')


# ─────────────────────────────────────────────────────────────────
# TENDER  +  BIDS
# ─────────────────────────────────────────────────────────────────
class TenderBidInline(admin.TabularInline):
    model         = TenderBid
    extra         = 0
    readonly_fields = ('slug', 'submitted_at', 'total_score')
    fields        = ('supplier', 'bid_amount', 'technical_score', 'financial_score', 'total_score', 'status', 'notes')
    show_change_link = True


@admin.register(Tender)
class TenderAdmin(admin.ModelAdmin):
    list_display    = ('reference_number', 'title', 'tender_type', 'department', 'formatted_budget', 'coloured_status', 'closing_date', 'bid_count', 'awarded_to')
    list_filter     = ('status', 'tender_type', 'department')
    search_fields   = ('reference_number', 'title')
    readonly_fields = ('slug', 'created_at', 'updated_at')
    inlines         = [TenderBidInline]
    date_hierarchy  = 'created_at'
    list_per_page   = 20
    autocomplete_fields = ['department', 'awarded_to', 'created_by']
    actions         = ['action_publish', 'action_close', 'action_cancel']

    fieldsets = (
        ('Tender Details', {
            'fields': ('reference_number', 'slug', 'title', 'description', 'tender_type', 'department'),
        }),
        ('Financials', {
            'fields': ('budget', 'currency', 'awarded_to', 'awarded_amount'),
        }),
        ('Timeline', {
            'fields': ('status', 'published_date', 'closing_date', 'opening_date'),
        }),
        ('Evaluation', {
            'fields': ('evaluation_criteria',),
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Budget')
    def formatted_budget(self, obj):
        return amount_display(obj.budget)

    @admin.display(description='Status')
    def coloured_status(self, obj):
        return coloured_status(obj.status)

    @admin.display(description='Bids')
    def bid_count(self, obj):
        return obj.bids.count()

    @admin.action(description='Publish selected tenders')
    def action_publish(self, request, queryset):
        updated = queryset.filter(status='draft').update(
            status='published', published_date=timezone.now().date()
        )
        self.message_user(request, f'{updated} tender(s) published.')

    @admin.action(description='Close selected tenders')
    def action_close(self, request, queryset):
        updated = queryset.exclude(status__in=['awarded', 'cancelled']).update(status='closed')
        self.message_user(request, f'{updated} tender(s) closed.')

    @admin.action(description='Cancel selected tenders')
    def action_cancel(self, request, queryset):
        updated = queryset.exclude(status='awarded').update(status='cancelled')
        self.message_user(request, f'{updated} tender(s) cancelled.')


@admin.register(TenderBid)
class TenderBidAdmin(admin.ModelAdmin):
    list_display    = ('tender', 'supplier', 'formatted_bid', 'technical_score', 'financial_score', 'total_score', 'coloured_status', 'submitted_at')
    list_filter     = ('status', 'tender')
    search_fields   = ('tender__title', 'supplier__name')
    readonly_fields = ('slug', 'submitted_at')
    list_per_page   = 30

    @admin.display(description='Bid Amount')
    def formatted_bid(self, obj):
        return amount_display(obj.bid_amount)

    @admin.display(description='Status')
    def coloured_status(self, obj):
        return coloured_status(obj.status)


# ─────────────────────────────────────────────────────────────────
# REQUISITION  +  ITEMS
# ─────────────────────────────────────────────────────────────────
class RequisitionItemInline(admin.TabularInline):
    model         = RequisitionItem
    extra         = 1
    readonly_fields = ('slug', 'total_estimated_price', 'created_at')
    fields        = ('item_name', 'unit', 'quantity', 'estimated_unit_price', 'total_estimated_price', 'specifications')
    show_change_link = True


@admin.register(Requisition)
class RequisitionAdmin(admin.ModelAdmin):
    list_display    = ('reference_number', 'title', 'type_badge', 'department', 'priority_badge', 'formatted_cost', 'coloured_status', 'requested_by', 'required_date', 'created_at')
    list_filter     = ('status', 'requisition_type', 'priority', 'department')
    search_fields   = ('reference_number', 'title', 'requested_by__username')
    readonly_fields = ('reference_number', 'slug', 'created_at', 'updated_at')
    inlines         = [RequisitionItemInline]
    date_hierarchy  = 'created_at'
    list_per_page   = 25
    autocomplete_fields = ['department', 'requested_by', 'approved_by', 'hod_approved_by']
    actions         = ['action_hod_approve', 'action_approve', 'action_reject', 'action_convert_po']

    fieldsets = (
        ('Requisition Details', {
            'fields': ('reference_number', 'slug', 'title', 'requisition_type', 'department', 'quarter_budget'),
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'total_estimated_cost', 'required_date', 'justification'),
        }),
        ('Emergency', {
            'fields': ('emergency_reason',),
            'classes': ('collapse',),
        }),
        ('Approval Chain', {
            'fields': ('requested_by', 'hod_approved_by', 'hod_approved_at', 'approved_by', 'approved_at', 'rejection_reason'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Type')
    def type_badge(self, obj):
        if obj.requisition_type == 'emergency':
            return format_html('<span style="background:#dc3545;color:#fff;padding:2px 8px;font-size:10px;font-weight:700;">🚨 EMERGENCY</span>')
        return format_html('<span style="background:#6c757d;color:#fff;padding:2px 8px;font-size:10px;">PLANNED</span>')

    @admin.display(description='Priority')
    def priority_badge(self, obj):
        return coloured_status(obj.priority)

    @admin.display(description='Est. Cost')
    def formatted_cost(self, obj):
        return amount_display(obj.total_estimated_cost)

    @admin.display(description='Status')
    def coloured_status(self, obj):
        return coloured_status(obj.status)

    @admin.action(description='HOD Approve selected requisitions')
    def action_hod_approve(self, request, queryset):
        updated = queryset.filter(status='submitted').update(
            status='hod_approved', hod_approved_by=request.user, hod_approved_at=timezone.now()
        )
        self.message_user(request, f'{updated} requisition(s) HOD-approved.')

    @admin.action(description='Final-Approve selected requisitions')
    def action_approve(self, request, queryset):
        updated = queryset.filter(status='hod_approved').update(
            status='approved', approved_by=request.user, approved_at=timezone.now()
        )
        self.message_user(request, f'{updated} requisition(s) approved.')

    @admin.action(description='Reject selected requisitions')
    def action_reject(self, request, queryset):
        updated = queryset.exclude(status__in=['converted_to_po', 'cancelled']).update(
            status='rejected', rejection_reason='Rejected via admin bulk action.'
        )
        self.message_user(request, f'{updated} requisition(s) rejected.', level='warning')

    @admin.action(description='Mark as Converted to PO')
    def action_convert_po(self, request, queryset):
        updated = queryset.filter(status='approved').update(status='converted_to_po')
        self.message_user(request, f'{updated} requisition(s) marked as converted to PO.')


@admin.register(RequisitionItem)
class RequisitionItemAdmin(admin.ModelAdmin):
    list_display    = ('item_name', 'requisition', 'unit', 'quantity', 'unit_price_fmt', 'total_fmt')
    list_filter     = ('requisition__department',)
    search_fields   = ('item_name', 'requisition__reference_number')
    readonly_fields = ('slug', 'total_estimated_price', 'created_at')
    list_per_page   = 40

    @admin.display(description='Unit Price')
    def unit_price_fmt(self, obj):
        return amount_display(obj.estimated_unit_price)

    @admin.display(description='Total')
    def total_fmt(self, obj):
        return amount_display(obj.total_estimated_price)


# ─────────────────────────────────────────────────────────────────
# PURCHASE ORDER  +  LINE ITEMS
# ─────────────────────────────────────────────────────────────────
class POLineItemInline(admin.TabularInline):
    model           = POLineItem
    extra           = 1
    readonly_fields = ('slug', 'total_price')
    fields          = ('item_name', 'unit', 'quantity', 'unit_price', 'total_price', 'quantity_received')
    show_change_link = True


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display    = ('po_number', 'supplier', 'department', 'formatted_total', 'coloured_status', 'delivery_date', 'issued_by', 'created_at')
    list_filter     = ('status', 'currency', 'department', 'supplier')
    search_fields   = ('po_number', 'supplier__name')
    readonly_fields = ('po_number', 'slug', 'tax_amount', 'total_amount', 'created_at', 'updated_at')
    inlines         = [POLineItemInline]
    date_hierarchy  = 'created_at'
    list_per_page   = 20
    autocomplete_fields = ['supplier', 'department', 'requisition', 'tender', 'issued_by']
    actions         = ['action_issue', 'action_cancel']

    fieldsets = (
        ('PO Details', {
            'fields': ('po_number', 'slug', 'supplier', 'department', 'requisition', 'tender'),
        }),
        ('Financials', {
            'fields': ('currency', 'sub_total', 'tax_rate', 'tax_amount', 'total_amount'),
        }),
        ('Delivery', {
            'fields': ('status', 'payment_terms', 'delivery_address', 'delivery_date'),
        }),
        ('Issuance', {
            'fields': ('issued_by', 'issued_at', 'notes'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Total')
    def formatted_total(self, obj):
        return amount_display(obj.total_amount)

    @admin.display(description='Status')
    def coloured_status(self, obj):
        return coloured_status(obj.status)

    @admin.action(description='Issue selected Purchase Orders')
    def action_issue(self, request, queryset):
        updated = queryset.filter(status='draft').update(
            status='issued', issued_by=request.user, issued_at=timezone.now()
        )
        self.message_user(request, f'{updated} PO(s) issued.')

    @admin.action(description='Cancel selected Purchase Orders')
    def action_cancel(self, request, queryset):
        updated = queryset.filter(status__in=['draft', 'issued']).update(status='cancelled')
        self.message_user(request, f'{updated} PO(s) cancelled.', level='warning')


@admin.register(POLineItem)
class POLineItemAdmin(admin.ModelAdmin):
    list_display    = ('item_name', 'purchase_order', 'unit', 'quantity', 'unit_price_fmt', 'total_fmt', 'quantity_received')
    list_filter     = ('purchase_order__department',)
    search_fields   = ('item_name', 'purchase_order__po_number')
    readonly_fields = ('slug', 'total_price')
    list_per_page   = 40

    @admin.display(description='Unit Price')
    def unit_price_fmt(self, obj):
        return amount_display(obj.unit_price)

    @admin.display(description='Total')
    def total_fmt(self, obj):
        return amount_display(obj.total_price)


# ─────────────────────────────────────────────────────────────────
# GRN  +  LINE ITEMS
# ─────────────────────────────────────────────────────────────────
class GRNLineItemInline(admin.TabularInline):
    model           = GRNLineItem
    extra           = 1
    readonly_fields = ('slug', 'total_accepted_value')
    fields          = ('item_name', 'unit', 'quantity_ordered', 'quantity_received',
                       'quantity_accepted', 'quantity_rejected', 'unit_price',
                       'total_accepted_value', 'rejection_reason', 'batch_number', 'expiry_date')
    show_change_link = True


@admin.register(GoodsReceivedNote)
class GRNAdmin(admin.ModelAdmin):
    list_display    = ('grn_number', 'purchase_order', 'supplier', 'delivery_date', 'coloured_status', 'received_by', 'verified_by', 'created_at')
    list_filter     = ('status', 'supplier', 'delivery_date')
    search_fields   = ('grn_number', 'invoice_number', 'delivery_note_number', 'supplier__name')
    readonly_fields = ('grn_number', 'slug', 'created_at', 'updated_at')
    inlines         = [GRNLineItemInline]
    date_hierarchy  = 'delivery_date'
    list_per_page   = 20
    autocomplete_fields = ['purchase_order', 'supplier', 'received_by', 'verified_by']
    actions         = ['action_verify', 'action_reject']

    fieldsets = (
        ('GRN Details', {
            'fields': ('grn_number', 'slug', 'purchase_order', 'supplier'),
        }),
        ('Delivery Info', {
            'fields': ('delivery_date', 'delivery_note_number', 'invoice_number'),
        }),
        ('Verification', {
            'fields': ('status', 'received_by', 'verified_by', 'verified_at', 'remarks'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Status')
    def coloured_status(self, obj):
        return coloured_status(obj.status)

    @admin.action(description='Verify selected GRNs')
    def action_verify(self, request, queryset):
        updated = queryset.filter(status='submitted').update(
            status='verified', verified_by=request.user, verified_at=timezone.now()
        )
        self.message_user(request, f'{updated} GRN(s) verified.')

    @admin.action(description='Reject selected GRNs')
    def action_reject(self, request, queryset):
        updated = queryset.filter(status='submitted').update(status='rejected')
        self.message_user(request, f'{updated} GRN(s) rejected.', level='warning')


@admin.register(GRNLineItem)
class GRNLineItemAdmin(admin.ModelAdmin):
    list_display    = ('item_name', 'grn', 'unit', 'quantity_ordered', 'quantity_received', 'quantity_accepted', 'quantity_rejected', 'accepted_value_fmt')
    list_filter     = ('grn__status',)
    search_fields   = ('item_name', 'grn__grn_number', 'batch_number')
    readonly_fields = ('slug', 'total_accepted_value')
    list_per_page   = 40

    @admin.display(description='Accepted Value')
    def accepted_value_fmt(self, obj):
        return amount_display(obj.total_accepted_value)


# ─────────────────────────────────────────────────────────────────
# INVOICE
# ─────────────────────────────────────────────────────────────────
@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display    = ('invoice_number', 'supplier', 'invoice_date', 'due_date', 'total_fmt', 'paid_fmt', 'balance_fmt', 'overdue_flag', 'coloured_status', 'received_by')
    list_filter     = ('status', 'currency', 'supplier')
    search_fields   = ('invoice_number', 'supplier__name')
    readonly_fields = ('slug', 'balance', 'created_at', 'updated_at')
    date_hierarchy  = 'invoice_date'
    list_per_page   = 25
    autocomplete_fields = ['supplier', 'purchase_order', 'grn', 'received_by', 'approved_by']
    actions         = ['action_approve', 'action_dispute', 'action_mark_paid']

    fieldsets = (
        ('Invoice Details', {
            'fields': ('invoice_number', 'slug', 'supplier', 'purchase_order', 'grn'),
        }),
        ('Amounts', {
            'fields': ('invoice_date', 'due_date', 'sub_total', 'tax_amount', 'total_amount', 'amount_paid', 'balance', 'currency'),
        }),
        ('Status & Approval', {
            'fields': ('status', 'received_by', 'approved_by', 'notes'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Total')
    def total_fmt(self, obj):
        return amount_display(obj.total_amount)

    @admin.display(description='Paid')
    def paid_fmt(self, obj):
        return amount_display(obj.amount_paid)

    @admin.display(description='Balance')
    def balance_fmt(self, obj):
        return amount_display(obj.balance)

    @admin.display(description='Overdue', boolean=False)
    def overdue_flag(self, obj):
        if obj.due_date and obj.due_date < timezone.now().date() and obj.status not in ('paid', 'cancelled'):
            return format_html('<span style="color:#dc3545;font-weight:700;">⚠ OVERDUE</span>')
        return format_html('<span style="color:#198754;">✓</span>')

    @admin.display(description='Status')
    def coloured_status(self, obj):
        return coloured_status(obj.status)

    @admin.action(description='Approve selected invoices for payment')
    def action_approve(self, request, queryset):
        updated = queryset.filter(status__in=['received', 'matched']).update(
            status='approved', approved_by=request.user
        )
        self.message_user(request, f'{updated} invoice(s) approved for payment.')

    @admin.action(description='Mark selected invoices as Disputed')
    def action_dispute(self, request, queryset):
        updated = queryset.filter(status__in=['received', 'matched', 'approved']).update(status='disputed')
        self.message_user(request, f'{updated} invoice(s) marked as disputed.', level='warning')

    @admin.action(description='Mark selected invoices as Fully Paid')
    def action_mark_paid(self, request, queryset):
        for inv in queryset.filter(status__in=['approved', 'partially_paid']):
            inv.amount_paid = inv.total_amount
            inv.balance     = 0
            inv.status      = 'paid'
            inv.save()
        self.message_user(request, f'Invoice(s) marked as paid.')


# ─────────────────────────────────────────────────────────────────
# PAYMENT
# ─────────────────────────────────────────────────────────────────
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display    = ('payment_reference', 'supplier', 'formatted_amount', 'payment_method', 'payment_date', 'coloured_status', 'initiated_by', 'approved_by', 'created_at')
    list_filter     = ('status', 'payment_method', 'currency')
    search_fields   = ('payment_reference', 'transaction_reference', 'supplier__name')
    readonly_fields = ('payment_reference', 'slug', 'created_at', 'updated_at')
    date_hierarchy  = 'payment_date'
    list_per_page   = 25
    autocomplete_fields = ['invoice', 'supplier', 'initiated_by', 'approved_by']
    actions         = ['action_approve', 'action_mark_failed']

    fieldsets = (
        ('Payment Details', {
            'fields': ('payment_reference', 'slug', 'invoice', 'supplier'),
        }),
        ('Amount & Method', {
            'fields': ('amount', 'currency', 'payment_method', 'payment_date', 'transaction_reference'),
        }),
        ('Bank Details', {
            'fields': ('bank_name', 'account_number'),
        }),
        ('Approval', {
            'fields': ('status', 'initiated_by', 'approved_by', 'approved_at', 'remarks'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Amount')
    def formatted_amount(self, obj):
        return amount_display(obj.amount, obj.currency)

    @admin.display(description='Status')
    def coloured_status(self, obj):
        return coloured_status(obj.status)

    @admin.action(description='Approve and complete selected payments')
    def action_approve(self, request, queryset):
        updated = queryset.filter(status__in=['pending', 'processing']).update(
            status='completed', approved_by=request.user, approved_at=timezone.now()
        )
        self.message_user(request, f'{updated} payment(s) completed.')

    @admin.action(description='Mark selected payments as Failed')
    def action_mark_failed(self, request, queryset):
        updated = queryset.filter(status__in=['pending', 'processing']).update(status='failed')
        self.message_user(request, f'{updated} payment(s) marked as failed.', level='warning')


# ─────────────────────────────────────────────────────────────────
# AUDIT LOG  (read-only)
# ─────────────────────────────────────────────────────────────────
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display    = ('timestamp', 'user', 'coloured_action', 'model_name', 'object_repr_truncated', 'ip_address')
    list_filter     = ('action', 'model_name')
    search_fields   = ('user__username', 'object_repr', 'model_name')
    readonly_fields = ('user', 'action', 'model_name', 'object_id', 'object_repr', 'changes', 'ip_address', 'timestamp')
    date_hierarchy  = 'timestamp'
    list_per_page   = 50
    ordering        = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    @admin.display(description='Action')
    def coloured_action(self, obj):
        return coloured_status(obj.action)

    @admin.display(description='Object')
    def object_repr_truncated(self, obj):
        text = obj.object_repr
        if len(text) > 60:
            text = text[:57] + '…'
        return text