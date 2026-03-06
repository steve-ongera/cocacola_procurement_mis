# procurement/management/commands/seed_data.py
#
# Usage:
#   python manage.py seed_data               # seed everything (idempotent)
#   python manage.py seed_data --flush       # wipe all procurement data first, then seed
#   python manage.py seed_data --module users
#   python manage.py seed_data --module departments
#   python manage.py seed_data --module fiscal_years
#   python manage.py seed_data --module budgets
#   python manage.py seed_data --module suppliers
#   python manage.py seed_data --module tenders
#   python manage.py seed_data --module requisitions
#   python manage.py seed_data --module purchase_orders
#   python manage.py seed_data --module grns
#   python manage.py seed_data --module invoices
#   python manage.py seed_data --module payments

import random
import decimal
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from procurement.models import (
    Department, FiscalYear, Budget, QuarterBudget, BudgetLineItem,
    Supplier, Tender, TenderBid,
    Requisition, RequisitionItem,
    PurchaseOrder, POLineItem,
    GoodsReceivedNote, GRNLineItem,
    Invoice, Payment, AuditLog,
)

User = get_user_model()

# ─────────────────────────────────────────────────────────────────────────────
# STYLE HELPERS (coloured terminal output)
# ─────────────────────────────────────────────────────────────────────────────
BOLD  = '\033[1m'
GREEN = '\033[92m'
CYAN  = '\033[96m'
YELLOW= '\033[93m'
RED   = '\033[91m'
RESET = '\033[0m'

def ok(msg):   return f'{GREEN}  ✔  {RESET}{msg}'
def info(msg): return f'{CYAN}  →  {RESET}{msg}'
def warn(msg): return f'{YELLOW}  ⚠  {RESET}{msg}'
def head(msg): return f'\n{BOLD}{msg}{RESET}'


# ─────────────────────────────────────────────────────────────────────────────
# COMMAND
# ─────────────────────────────────────────────────────────────────────────────
class Command(BaseCommand):
    help = 'Seed the database with realistic Coca-Cola-style procurement demo data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            default=False,
            help='Delete all existing procurement data before seeding.',
        )
        parser.add_argument(
            '--module',
            type=str,
            default='all',
            help='Seed only one module: users | departments | fiscal_years | budgets | '
                 'suppliers | tenders | requisitions | purchase_orders | grns | invoices | payments',
        )

    # ──────────────────────────────────────────
    def handle(self, *args, **options):
        flush  = options['flush']
        module = options['module'].lower()

        self.stdout.write(head('═' * 60))
        self.stdout.write(head('  ProcurePro  ·  Database Seed Script'))
        self.stdout.write(head('═' * 60))

        if flush:
            self._flush()

        MODULES = {
            'users':           self._seed_users,
            'departments':     self._seed_departments,
            'fiscal_years':    self._seed_fiscal_years,
            'budgets':         self._seed_budgets,
            'suppliers':       self._seed_suppliers,
            'tenders':         self._seed_tenders,
            'requisitions':    self._seed_requisitions,
            'purchase_orders': self._seed_purchase_orders,
            'grns':            self._seed_grns,
            'invoices':        self._seed_invoices,
            'payments':        self._seed_payments,
        }

        if module == 'all':
            for name, fn in MODULES.items():
                self.stdout.write(head(f'  Seeding: {name.replace("_", " ").upper()}'))
                with transaction.atomic():
                    fn()
        elif module in MODULES:
            self.stdout.write(head(f'  Seeding: {module.replace("_", " ").upper()}'))
            with transaction.atomic():
                MODULES[module]()
        else:
            raise CommandError(f'Unknown module "{module}". Choose from: {", ".join(MODULES)}')

        self.stdout.write(head('─' * 60))
        self.stdout.write(f'{GREEN}{BOLD}  Seed complete.{RESET}\n')

    # ──────────────────────────────────────────
    def _flush(self):
        self.stdout.write(head('  FLUSH — deleting all procurement data'))
        models_to_flush = [
            AuditLog, Payment, Invoice, GRNLineItem, GoodsReceivedNote,
            POLineItem, PurchaseOrder, RequisitionItem, Requisition,
            TenderBid, Tender, BudgetLineItem, QuarterBudget, Budget,
            Supplier, FiscalYear, Department,
        ]
        for m in models_to_flush:
            count, _ = m.objects.all().delete()
            self.stdout.write(ok(f'Deleted {count} {m.__name__} records'))
        # Keep superuser, delete demo users
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(ok('Deleted non-superuser accounts'))

    # ═════════════════════════════════════════════════════════════════════════
    # USERS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_users(self):
        users_data = [
            # (username, first, last, email, role, department, phone, is_superuser, is_staff)
            ('admin',       'System',   'Admin',    'admin@procure.co.ke',       'admin',               'Executive',   '+254700000001', True,  True),
            ('jmwangi',     'James',    'Mwangi',   'j.mwangi@procure.co.ke',    'budget_manager',      'Finance',     '+254701000002', False, True),
            ('atieno',      'Akinyi',   'Atieno',   'a.atieno@procure.co.ke',    'procurement_officer', 'Procurement', '+254702000003', False, True),
            ('korir',       'Emmanuel', 'Korir',    'e.korir@procure.co.ke',     'approver',            'Executive',   '+254703000004', False, True),
            ('nmuthoni',    'Nancy',    'Muthoni',  'n.muthoni@procure.co.ke',   'finance',             'Finance',     '+254704000005', False, False),
            ('wanjiku',     'Peter',    'Wanjiku',  'p.wanjiku@procure.co.ke',   'store_keeper',        'Warehouse',   '+254705000006', False, False),
            ('otieno',      'George',   'Otieno',   'g.otieno@procure.co.ke',    'requester',           'Marketing',   '+254706000007', False, False),
            ('kamau',       'Diana',    'Kamau',    'd.kamau@procure.co.ke',     'requester',           'Production',  '+254707000008', False, False),
            ('njoroge',     'Samuel',   'Njoroge',  's.njoroge@procure.co.ke',   'requester',           'ICT',         '+254708000009', False, False),
            ('odhiambo',    'Lydia',    'Odhiambo', 'l.odhiambo@procure.co.ke', 'procurement_officer', 'Procurement', '+254709000010', False, False),
        ]

        created = 0
        for uname, first, last, email, role, dept, phone, is_super, is_staff in users_data:
            if User.objects.filter(username=uname).exists():
                self.stdout.write(warn(f'User "{uname}" already exists — skipped'))
                continue
            User.objects.create_user(
                username=uname,
                first_name=first,
                last_name=last,
                email=email,
                password='ProcurePro@2025',   # default password for all demo users
                role=role,
                department=dept,
                phone=phone,
                is_superuser=is_super,
                is_staff=is_staff,
                is_active=True,
            )
            self.stdout.write(ok(f'Created user: {uname}  ({role})'))
            created += 1

        self.stdout.write(info(f'{created} user(s) created  |  default password: ProcurePro@2025'))

    # ═════════════════════════════════════════════════════════════════════════
    # DEPARTMENTS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_departments(self):
        dept_data = [
            ('Executive & Strategy',       'EXEC'),
            ('Finance & Accounting',       'FIN'),
            ('Procurement & Supply Chain', 'PROC'),
            ('Production & Manufacturing', 'PROD'),
            ('Marketing & Sales',          'MKT'),
            ('ICT & Digital',              'ICT'),
            ('Human Resources',            'HR'),
            ('Warehouse & Logistics',      'WH'),
            ('Quality Assurance',          'QA'),
            ('Legal & Compliance',         'LEG'),
        ]

        # Map head users by department keyword
        head_map = {
            'Finance':     'jmwangi',
            'Procurement': 'atieno',
            'Executive':   'korir',
            'Marketing':   'otieno',
            'ICT':         'njoroge',
            'Warehouse':   'wanjiku',
        }

        for name, code in dept_data:
            dept, created = Department.objects.get_or_create(
                code=code,
                defaults={'name': name},
            )
            if created:
                # Assign head if a matching user exists
                for key, uname in head_map.items():
                    if key in name:
                        try:
                            dept.head = User.objects.get(username=uname)
                            dept.save()
                        except User.DoesNotExist:
                            pass
                        break
                self.stdout.write(ok(f'Department: {name}  [{code}]'))
            else:
                self.stdout.write(warn(f'Department "{name}" already exists — skipped'))

    # ═════════════════════════════════════════════════════════════════════════
    # FISCAL YEARS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_fiscal_years(self):
        fiscal_data = [
            ('FY2023', date(2023, 1, 1), date(2023, 12, 31), False),
            ('FY2024', date(2024, 1, 1), date(2024, 12, 31), False),
            ('FY2025', date(2025, 1, 1), date(2025, 12, 31), True),   # active year
            ('FY2026', date(2026, 1, 1), date(2026, 12, 31), False),
        ]
        for name, start, end, active in fiscal_data:
            fy, created = FiscalYear.objects.get_or_create(
                name=name,
                defaults={'start_date': start, 'end_date': end, 'is_active': active},
            )
            flag = '  ◀ ACTIVE' if active else ''
            if created:
                self.stdout.write(ok(f'FiscalYear: {name}  ({start} → {end}){flag}'))
            else:
                self.stdout.write(warn(f'FiscalYear "{name}" exists — skipped'))

    # ═════════════════════════════════════════════════════════════════════════
    # BUDGETS  (annual → quarters → line items)
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_budgets(self):
        try:
            fy     = FiscalYear.objects.get(name='FY2025')
            bm     = User.objects.get(username='jmwangi')
            approver = User.objects.get(username='korir')
        except (FiscalYear.DoesNotExist, User.DoesNotExist) as e:
            raise CommandError(f'Run --module users and --module fiscal_years first. ({e})')

        budget_specs = [
            # (dept_code, title,                            total_amount,   status)
            ('PROC', 'Procurement Operations Budget FY2025',  45_000_000,  'approved'),
            ('PROD', 'Production Supplies Budget FY2025',     120_000_000, 'approved'),
            ('ICT',  'ICT Infrastructure Budget FY2025',       22_000_000, 'submitted'),
            ('MKT',  'Marketing Materials Budget FY2025',      18_500_000, 'draft'),
            ('HR',   'HR & Training Budget FY2025',             8_000_000, 'approved'),
            ('WH',   'Warehouse & Logistics Budget FY2025',    30_000_000, 'approved'),
        ]

        # Quarter allocations as % of total: Q1=20, Q2=25, Q3=30, Q4=25
        Q_ALLOC = {'Q1': 0.20, 'Q2': 0.25, 'Q3': 0.30, 'Q4': 0.25}
        Q_DATES  = {
            'Q1': (date(2025, 1, 1),  date(2025, 3, 31)),
            'Q2': (date(2025, 4, 1),  date(2025, 6, 30)),
            'Q3': (date(2025, 7, 1),  date(2025, 9, 30)),
            'Q4': (date(2025, 10, 1), date(2025, 12, 31)),
        }

        # Generic line items per department category
        LINE_ITEMS = {
            'PROC': [
                ('Laptop Computers',        'Units', 10,  85_000,   'ICT'),
                ('Office Chairs',           'Units', 50,   8_500,   'Furniture'),
                ('Printer Toner Cartridges','Box',   100,  1_200,   'Consumables'),
                ('Branded Stationery',      'Reams', 500,    450,   'Consumables'),
                ('Safety Boots',            'Pairs', 30,   4_200,   'PPE'),
            ],
            'PROD': [
                ('Sugar (50kg bags)',        'Bags',    5000,  3_800, 'Raw Material'),
                ('CO2 Gas Cylinders',        'Units',    200, 12_500, 'Raw Material'),
                ('Bottle Caps (carton)',     'Cartons', 3000,  1_600, 'Packaging'),
                ('PET Preforms',             'Units', 50000,     42,  'Packaging'),
                ('Lubricating Oil (20L)',    'Drums',    150,  4_800, 'Maintenance'),
                ('Conveyor Belts',           'Units',     10, 28_000, 'Maintenance'),
            ],
            'ICT': [
                ('Network Switches (24-port)', 'Units',   5, 45_000, 'Network'),
                ('UPS Systems (3KVA)',         'Units',  10, 38_000, 'Power'),
                ('ERP License Renewal',        'Seats', 100,  8_500, 'Software'),
                ('CAT6 Cable Reels',           'Reels',  20,  3_200, 'Network'),
            ],
            'MKT': [
                ('Branded Gazebos',         'Units',  20,  35_000, 'Branding'),
                ('Promotional T-shirts',    'Units', 500,    600,  'Merchandise'),
                ('Billboard Printing',      'Units',   8, 120_000, 'Advertising'),
                ('POS Display Materials',   'Sets',  150,  2_200,  'Branding'),
            ],
            'HR': [
                ('Training Manuals',        'Books',  200,   850,  'Training'),
                ('First Aid Kits',          'Kits',    30, 3_500,  'Safety'),
                ('Staff Uniforms',          'Sets',   150, 4_200,  'Uniforms'),
            ],
            'WH': [
                ('Pallet Racking System',   'Bays',   20,  45_000, 'Equipment'),
                ('Forklift Maintenance',    'Service', 4,  85_000, 'Maintenance'),
                ('Stretch Wrap Film',       'Rolls', 500,    380,  'Consumables'),
                ('Barcode Scanners',        'Units',  10, 12_500,  'ICT'),
            ],
        }

        for dept_code, title, total, status in budget_specs:
            try:
                dept = Department.objects.get(code=dept_code)
            except Department.DoesNotExist:
                self.stdout.write(warn(f'Dept {dept_code} not found — run --module departments first'))
                continue

            budget, created = Budget.objects.get_or_create(
                title=title,
                fiscal_year=fy,
                department=dept,
                defaults={
                    'total_amount': decimal.Decimal(str(total)),
                    'status': status,
                    'prepared_by': bm,
                    'approved_by': approver if status == 'approved' else None,
                    'approved_at': timezone.now() if status == 'approved' else None,
                    'notes': f'Annual procurement budget for {dept.name}',
                },
            )

            if not created:
                self.stdout.write(warn(f'Budget "{title}" exists — skipped'))
                continue

            self.stdout.write(ok(f'Budget: {title}  [{status}]  KES {total:,}'))

            # Create 4 quarters
            for q, alloc_pct in Q_ALLOC.items():
                q_amount = decimal.Decimal(str(round(total * alloc_pct, 2)))
                start, end = Q_DATES[q]
                qb = QuarterBudget.objects.create(
                    budget=budget,
                    quarter=q,
                    allocated_amount=q_amount,
                    start_date=start,
                    end_date=end,
                    notes=f'{q} allocation for {dept.name}',
                )
                self.stdout.write(info(f'  Quarter {q}: KES {q_amount:,}'))

                # Seed line items only for Q1 and Q2 (to show planned vs partial)
                items = LINE_ITEMS.get(dept_code, [])
                if q in ('Q1', 'Q2') and items:
                    # Use a subset based on quarter
                    subset = items[:3] if q == 'Q1' else items[3:] if len(items) > 3 else items
                    for name, unit, qty, unit_price, cat in subset:
                        BudgetLineItem.objects.create(
                            quarter_budget=qb,
                            item_name=name,
                            unit=unit,
                            quantity=decimal.Decimal(str(qty)),
                            unit_price=decimal.Decimal(str(unit_price)),
                            category=cat,
                            description=f'Planned {name.lower()} for {dept.name} - {q}',
                        )
                    self.stdout.write(info(f'    → {len(subset)} line item(s) added'))

    # ═════════════════════════════════════════════════════════════════════════
    # SUPPLIERS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_suppliers(self):
        suppliers_data = [
            # name, reg_no, tax_pin, email, phone, address, city, contact, category, bank, acct, branch, status, rating
            (
                'Techno Solutions Ltd',
                'CPR/2019/001234', 'P051234567A',
                'info@technosolutions.co.ke', '+254720100001',
                'Westlands Commercial Centre, 4th Floor', 'Nairobi',
                'Brian Kariuki', 'ICT',
                'Equity Bank', '0190200123456', 'Westlands',
                'active', 4.5,
            ),
            (
                'East African Packaging Co.',
                'CPR/2018/005678', 'P052345678B',
                'sales@eapackaging.co.ke', '+254720100002',
                'Industrial Area, Enterprise Road', 'Nairobi',
                'Catherine Waweru', 'Packaging',
                'KCB Bank', '1102034567', 'Industrial Area',
                'active', 4.2,
            ),
            (
                'Savanna Office Supplies',
                'CPR/2020/009012', 'P053456789C',
                'orders@savannasupplies.co.ke', '+254720100003',
                'Tom Mboya Street, Suite 210', 'Nairobi',
                'Moses Opiyo', 'Office Supplies',
                'Cooperative Bank', '01100123456', 'Nairobi CBD',
                'active', 3.8,
            ),
            (
                'Nairobi Industrial Supplies',
                'CPR/2017/003456', 'P054567890D',
                'procurement@nairobisupplies.co.ke', '+254720100004',
                'Enterprise Road, Industrial Area', 'Nairobi',
                'Ruth Wambui', 'Industrial',
                'Absa Bank', '2087654321', 'Industrial Area',
                'active', 4.0,
            ),
            (
                'Summit Engineering Works',
                'CPR/2016/007890', 'P055678901E',
                'info@summitengineering.co.ke', '+254720100005',
                'Mombasa Road, Airport North Road', 'Nairobi',
                'David Njuguna', 'Engineering',
                'Stanbic Bank', '9100012345', 'Upper Hill',
                'active', 4.7,
            ),
            (
                'Green Leaf Consumables',
                'CPR/2021/011234', 'P056789012F',
                'sales@greenleaf.co.ke', '+254720100006',
                'Ronald Ngala Street', 'Nairobi',
                'Alice Mutua', 'Consumables',
                'DTB Bank', '0440987654', 'Nairobi CBD',
                'active', 3.5,
            ),
            (
                'Pan Africa Printers Ltd',
                'CPR/2019/015678', 'P057890123G',
                'info@panafricoprint.co.ke', '+254720100007',
                'Lusaka Road, Industrial Area', 'Nairobi',
                'John Kamau', 'Printing',
                'Family Bank', '0082043210', 'Industrial Area',
                'active', 4.1,
            ),
            (
                'Rift Valley Freight Services',
                'CPR/2015/019012', 'P058901234H',
                'ops@rvfreight.co.ke', '+254720100008',
                'Ronald Ngala Ave, Port Area', 'Mombasa',
                'Hassan Salim', 'Logistics',
                'I&M Bank', '01010056789', 'Mombasa',
                'active', 4.3,
            ),
            (
                'Baraka Cleaning Products',
                'CPR/2022/023456', 'P059012345I',
                'info@baraka.co.ke', '+254720100009',
                'Kamukunji, Kirinyaga Road', 'Nairobi',
                'Fatuma Hassan', 'Cleaning',
                'Equity Bank', '0190556677', 'Kamukunji',
                'pending', 0.0,
            ),
            (
                'MegaBuild Construction Ltd',
                'CPR/2014/027890', 'P050123456J',
                'contracts@megabuild.co.ke', '+254720100010',
                'Kilimani Business Park', 'Nairobi',
                'Patrick Oloo', 'Construction',
                'Standard Chartered', '8701234567', 'Kilimani',
                'active', 4.6,
            ),
            (
                'Digital Horizons ICT',
                'CPR/2020/031234', 'P051234560K',
                'sales@digitalhorizons.co.ke', '+254720100011',
                'Upper Hill Medical Centre, 6th Floor', 'Nairobi',
                'Irene Mutheu', 'ICT',
                'NCBA Bank', '2301876543', 'Upper Hill',
                'active', 3.9,
            ),
            (
                'Karibu Furniture Ltd',
                'CPR/2018/035678', 'P052345601L',
                'info@karibufurniture.co.ke', '+254720100012',
                'Ngong Road, Karen', 'Nairobi',
                'Tom Cheruiyot', 'Furniture',
                'Equity Bank', '0190334455', 'Karen',
                'inactive', 2.5,
            ),
        ]

        created_count = 0
        for row in suppliers_data:
            (name, reg, pin, email, phone, addr, city, contact,
             category, bank, acct, branch, status, rating) = row

            supplier, created = Supplier.objects.get_or_create(
                registration_number=reg,
                defaults={
                    'name': name, 'tax_pin': pin, 'email': email,
                    'phone': phone, 'address': addr, 'city': city,
                    'country': 'Kenya', 'contact_person': contact,
                    'category': category, 'bank_name': bank,
                    'bank_account': acct, 'bank_branch': branch,
                    'status': status,
                    'rating': decimal.Decimal(str(rating)),
                    'notes': f'Registered vendor for {category} supplies.',
                },
            )
            if created:
                self.stdout.write(ok(f'Supplier: {name}  [{status}]  ★{rating}'))
                created_count += 1
            else:
                self.stdout.write(warn(f'Supplier "{name}" exists — skipped'))

        self.stdout.write(info(f'{created_count} supplier(s) created'))

    # ═════════════════════════════════════════════════════════════════════════
    # TENDERS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_tenders(self):
        try:
            proc_user  = User.objects.get(username='atieno')
            dept_proc  = Department.objects.get(code='PROC')
            dept_ict   = Department.objects.get(code='ICT')
            dept_prod  = Department.objects.get(code='PROD')
            dept_wh    = Department.objects.get(code='WH')
        except (User.DoesNotExist, Department.DoesNotExist) as e:
            raise CommandError(f'Prerequisites missing. ({e})')

        tenders_data = [
            {
                'reference_number': 'TEND-2025-001',
                'title': 'Supply and Delivery of ICT Equipment FY2025',
                'description': 'Supply, delivery and installation of laptop computers, '
                               'network switches, UPS systems and accessories for all '
                               'company branches across Kenya.',
                'tender_type': 'open',
                'department': dept_ict,
                'budget': 8_500_000,
                'status': 'awarded',
                'published_date': date(2025, 1, 10),
                'closing_date': date(2025, 2, 10),
                'opening_date': date(2025, 2, 11),
                'awarded_supplier': 'Techno Solutions Ltd',
                'awarded_amount': 7_950_000,
                'evaluation_criteria': 'Technical 40% | Financial 60%',
            },
            {
                'reference_number': 'TEND-2025-002',
                'title': 'Annual Supply of Packaging Materials',
                'description': 'Annual contract for supply of PET preforms, bottle caps, '
                               'labels and packaging materials for production lines.',
                'tender_type': 'open',
                'department': dept_prod,
                'budget': 45_000_000,
                'status': 'awarded',
                'published_date': date(2025, 1, 15),
                'closing_date': date(2025, 2, 20),
                'opening_date': date(2025, 2, 21),
                'awarded_supplier': 'East African Packaging Co.',
                'awarded_amount': 42_300_000,
                'evaluation_criteria': 'Technical 30% | Financial 50% | Past Performance 20%',
            },
            {
                'reference_number': 'TEND-2025-003',
                'title': 'Provision of Warehousing and Pallet Racking Systems',
                'description': 'Design, supply and installation of heavy-duty pallet '
                               'racking systems for expanded warehouse capacity.',
                'tender_type': 'restricted',
                'department': dept_wh,
                'budget': 12_000_000,
                'status': 'evaluation',
                'published_date': date(2025, 2, 1),
                'closing_date': date(2025, 3, 5),
                'opening_date': date(2025, 3, 6),
                'awarded_supplier': None,
                'awarded_amount': None,
                'evaluation_criteria': 'Technical 50% | Financial 50%',
            },
            {
                'reference_number': 'TEND-2025-004',
                'title': 'Cleaning Supplies and Hygiene Products Annual Contract',
                'description': 'Annual supply of industrial cleaning chemicals, '
                               'hygiene products and consumables for all facilities.',
                'tender_type': 'rfq',
                'department': dept_proc,
                'budget': 3_200_000,
                'status': 'published',
                'published_date': date(2025, 3, 1),
                'closing_date': date(2025, 3, 31),
                'opening_date': date(2025, 4, 1),
                'awarded_supplier': None,
                'awarded_amount': None,
                'evaluation_criteria': 'Best value for money',
            },
            {
                'reference_number': 'TEND-2025-005',
                'title': 'ERP System Upgrade and Licensing',
                'description': 'Expression of interest for ERP system upgrade, '
                               'module expansion, customisation and annual licensing.',
                'tender_type': 'eoi',
                'department': dept_ict,
                'budget': 15_000_000,
                'status': 'draft',
                'published_date': None,
                'closing_date': None,
                'opening_date': None,
                'awarded_supplier': None,
                'awarded_amount': None,
                'evaluation_criteria': '',
            },
            {
                'reference_number': 'TEND-2025-006',
                'title': 'Direct Procurement — Emergency Generator Repair',
                'description': 'Emergency repair and overhaul of production floor '
                               'backup generator following breakdown.',
                'tender_type': 'direct',
                'department': dept_prod,
                'budget': 950_000,
                'status': 'awarded',
                'published_date': date(2025, 2, 5),
                'closing_date': date(2025, 2, 8),
                'opening_date': date(2025, 2, 9),
                'awarded_supplier': 'Summit Engineering Works',
                'awarded_amount': 870_000,
                'evaluation_criteria': 'Single source — emergency justification approved',
            },
        ]

        bid_suppliers = Supplier.objects.filter(status='active')[:5]

        for spec in tenders_data:
            awarded_sup = None
            if spec['awarded_supplier']:
                try:
                    awarded_sup = Supplier.objects.get(name=spec['awarded_supplier'])
                except Supplier.DoesNotExist:
                    pass

            tender, created = Tender.objects.get_or_create(
                reference_number=spec['reference_number'],
                defaults={
                    'title': spec['title'],
                    'description': spec['description'],
                    'tender_type': spec['tender_type'],
                    'department': spec['department'],
                    'budget': decimal.Decimal(str(spec['budget'])),
                    'status': spec['status'],
                    'published_date': spec['published_date'],
                    'closing_date': spec['closing_date'],
                    'opening_date': spec['opening_date'],
                    'awarded_to': awarded_sup,
                    'awarded_amount': decimal.Decimal(str(spec['awarded_amount'])) if spec['awarded_amount'] else None,
                    'evaluation_criteria': spec['evaluation_criteria'],
                    'created_by': proc_user,
                },
            )

            if not created:
                self.stdout.write(warn(f'Tender "{spec["reference_number"]}" exists — skipped'))
                continue

            self.stdout.write(ok(f'Tender: {spec["reference_number"]}  [{spec["status"]}]'))

            # Seed bids for published/evaluation/awarded tenders
            if spec['status'] in ('evaluation', 'awarded', 'published') and bid_suppliers:
                for i, supplier in enumerate(bid_suppliers[:4]):
                    base = float(spec['budget'])
                    bid_amount = round(base * random.uniform(0.75, 1.05), 2)
                    t_score = round(random.uniform(55, 95), 2)
                    f_score = round(random.uniform(55, 95), 2)
                    total   = round((t_score + f_score) / 2, 2)

                    bid_status = 'submitted'
                    if spec['awarded_supplier'] and supplier.name == spec['awarded_supplier']:
                        bid_status = 'awarded'
                    elif spec['status'] == 'evaluation':
                        bid_status = 'shortlisted' if i < 2 else 'submitted'

                    TenderBid.objects.get_or_create(
                        tender=tender,
                        supplier=supplier,
                        defaults={
                            'bid_amount': decimal.Decimal(str(bid_amount)),
                            'technical_score': decimal.Decimal(str(t_score)),
                            'financial_score': decimal.Decimal(str(f_score)),
                            'total_score': decimal.Decimal(str(total)),
                            'status': bid_status,
                            'notes': f'Bid submitted by {supplier.name}',
                        },
                    )
                self.stdout.write(info(f'  → {min(4, len(bid_suppliers))} bid(s) created'))

    # ═════════════════════════════════════════════════════════════════════════
    # REQUISITIONS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_requisitions(self):
        try:
            requester  = User.objects.get(username='otieno')
            requester2 = User.objects.get(username='kamau')
            hod        = User.objects.get(username='korir')
            approver   = User.objects.get(username='atieno')
            dept_mkt   = Department.objects.get(code='MKT')
            dept_prod  = Department.objects.get(code='PROD')
            dept_ict   = Department.objects.get(code='ICT')
            dept_hr    = Department.objects.get(code='HR')
            dept_wh    = Department.objects.get(code='WH')
            fy         = FiscalYear.objects.get(name='FY2025')
        except (User.DoesNotExist, Department.DoesNotExist, FiscalYear.DoesNotExist) as e:
            raise CommandError(f'Prerequisites missing. ({e})')

        # Try to get Q1 budgets for linking
        def get_q1(dept):
            try:
                budget = Budget.objects.get(department=dept, fiscal_year=fy)
                return QuarterBudget.objects.get(budget=budget, quarter='Q1')
            except (Budget.DoesNotExist, QuarterBudget.DoesNotExist):
                return None

        requisitions_data = [
            {
                'title': 'Office Stationery and Supplies Q1 2025',
                'requisition_type': 'planned',
                'department': dept_mkt,
                'status': 'converted_to_po',
                'priority': 'medium',
                'justification': 'Quarterly replenishment of office stationery for marketing team.',
                'requested_by': requester,
                'required_date': date(2025, 1, 31),
                'total_estimated_cost': 185_000,
                'items': [
                    ('A4 Paper Reams (80gsm)',   'Reams', 200,    450,  'Branded Copier Paper'),
                    ('Ballpoint Pens (box)',     'Box',    50,    320,  'Box of 50 pens'),
                    ('Staples (box of 1000)',    'Box',    30,    180,  'Standard staples'),
                    ('Sticky Notes (pack)',      'Pack',  100,    220,  'Post-it style notes'),
                ],
            },
            {
                'title': 'Production Line Lubricants and Maintenance Supplies',
                'requisition_type': 'planned',
                'department': dept_prod,
                'status': 'approved',
                'priority': 'high',
                'justification': 'Scheduled maintenance of production Line 3 requires lubricants.',
                'requested_by': requester2,
                'required_date': date(2025, 2, 15),
                'total_estimated_cost': 420_000,
                'items': [
                    ('Lubricating Oil 20L (Shell Omala)',  'Drums',  15, 4_800, 'Food-grade lubricant'),
                    ('Bearing Grease (5kg)',               'Units',  20, 2_200, 'High temp grease'),
                    ('O-Ring Kits Assorted',               'Sets',   10, 3_500, 'Seal replacement kits'),
                ],
            },
            {
                'title': 'EMERGENCY — UPS Replacement Production Server Room',
                'requisition_type': 'emergency',
                'department': dept_ict,
                'status': 'approved',
                'priority': 'critical',
                'justification': 'Critical UPS failure in server room. Risk of data loss and production downtime.',
                'requested_by': User.objects.get(username='njoroge'),
                'required_date': date(2025, 1, 20),
                'emergency_reason': 'UPS unit failed causing repeated power interruptions to production ERP server. '
                                    'Immediate replacement required to prevent data loss.',
                'total_estimated_cost': 380_000,
                'items': [
                    ('UPS 10KVA (APC Smart-UPS)',    'Units',  2, 85_000, 'Server room UPS replacement'),
                    ('UPS Battery Replacement Kit',  'Sets',   4, 28_000, 'Lead-acid battery pack'),
                    ('PDU 16-way Rack Mounted',      'Units',  2, 32_000, 'Power distribution unit'),
                ],
            },
            {
                'title': 'HR Training Materials and Conference Supplies Q2',
                'requisition_type': 'planned',
                'department': dept_hr,
                'status': 'hod_approved',
                'priority': 'low',
                'justification': 'Staff induction training scheduled for Q2 requires printed materials.',
                'requested_by': User.objects.get(username='jmwangi'),
                'required_date': date(2025, 4, 10),
                'total_estimated_cost': 95_000,
                'items': [
                    ('Training Manuals (printed)', 'Books', 100,  850, 'Full colour printed'),
                    ('Name Tag Holders',           'Units', 150,  120, 'Lanyard with insert'),
                    ('Conference Notepads (A5)',   'Units', 150,  180, 'Spiral bound'),
                ],
            },
            {
                'title': 'Warehouse Barcode Scanners and Labels',
                'requisition_type': 'planned',
                'department': dept_wh,
                'status': 'submitted',
                'priority': 'medium',
                'justification': 'Current barcode scanners are end-of-life. New scanners required for WMS.',
                'requested_by': User.objects.get(username='wanjiku'),
                'required_date': date(2025, 3, 1),
                'total_estimated_cost': 245_000,
                'items': [
                    ('Handheld Barcode Scanner (Zebra TC21)', 'Units',  8, 22_000, 'Android-based WMS scanner'),
                    ('Thermal Label Rolls (100x150mm)',       'Rolls', 50,    850, 'Direct thermal labels'),
                    ('Charging Cradles',                      'Units',  4,  4_500, '4-slot charging cradle'),
                ],
            },
            {
                'title': 'EMERGENCY — Production Bottling Machine Spare Parts',
                'requisition_type': 'emergency',
                'department': dept_prod,
                'status': 'hod_approved',
                'priority': 'critical',
                'justification': 'Bottling machine Line 2 breakdown. Spare parts required immediately.',
                'requested_by': requester2,
                'required_date': date(2025, 2, 5),
                'emergency_reason': 'Main filling valve assembly cracked during operation on Line 2. '
                                    'Production capacity reduced by 40%. Emergency procurement authorised.',
                'total_estimated_cost': 680_000,
                'items': [
                    ('Filling Valve Assembly (Line 2)', 'Units', 2, 145_000, 'OEM replacement part'),
                    ('Pneumatic Cylinder 80x200mm',     'Units', 4,  35_000, 'Double-acting cylinder'),
                    ('Solenoid Valve 24VDC',            'Units', 6,  12_500, 'Direct mounting valve'),
                ],
            },
            {
                'title': 'Marketing Promotional Materials — Festive Season 2025',
                'requisition_type': 'planned',
                'department': dept_mkt,
                'status': 'draft',
                'priority': 'medium',
                'justification': 'Festive season promotion requires branded materials.',
                'requested_by': requester,
                'required_date': date(2025, 11, 1),
                'total_estimated_cost': 1_250_000,
                'items': [
                    ('Branded Cooler Boxes',         'Units', 500,  1_200, 'Co-branding with retailers'),
                    ('Promotional T-shirts (S-XL)',  'Units', 2000,   600, 'Cotton branded T-shirts'),
                    ('POS Display Stand',            'Units', 200,  2_500, 'Cardboard display unit'),
                    ('Roll-up Banners (1x2m)',       'Units', 100,  3_500, 'Premium print with stand'),
                ],
            },
        ]

        created_count = 0
        for spec in requisitions_data:
            if Requisition.objects.filter(title=spec['title']).exists():
                self.stdout.write(warn(f'Requisition "{spec["title"][:50]}…" exists — skipped'))
                continue

            req = Requisition.objects.create(
                title=spec['title'],
                requisition_type=spec['requisition_type'],
                department=spec['department'],
                status=spec['status'],
                priority=spec['priority'],
                justification=spec['justification'],
                requested_by=spec['requested_by'],
                required_date=spec.get('required_date'),
                emergency_reason=spec.get('emergency_reason', ''),
                total_estimated_cost=decimal.Decimal(str(spec['total_estimated_cost'])),
                quarter_budget=get_q1(spec['department']),
                hod_approved_by=hod if spec['status'] in ('hod_approved', 'approved', 'converted_to_po') else None,
                hod_approved_at=timezone.now() if spec['status'] in ('hod_approved', 'approved', 'converted_to_po') else None,
                approved_by=approver if spec['status'] in ('approved', 'converted_to_po') else None,
                approved_at=timezone.now() if spec['status'] in ('approved', 'converted_to_po') else None,
            )

            for iname, unit, qty, uprice, desc in spec['items']:
                RequisitionItem.objects.create(
                    requisition=req,
                    item_name=iname,
                    unit=unit,
                    quantity=decimal.Decimal(str(qty)),
                    estimated_unit_price=decimal.Decimal(str(uprice)),
                    specifications=desc,
                )

            self.stdout.write(ok(
                f'Requisition: {req.reference_number}  [{spec["status"]}]  '
                f'{"🚨 EMERGENCY" if spec["requisition_type"] == "emergency" else "📋 Planned"}'
            ))
            created_count += 1

        self.stdout.write(info(f'{created_count} requisition(s) created'))

    # ═════════════════════════════════════════════════════════════════════════
    # PURCHASE ORDERS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_purchase_orders(self):
        try:
            proc_user = User.objects.get(username='atieno')
            dept_ict  = Department.objects.get(code='ICT')
            dept_prod = Department.objects.get(code='PROD')
            dept_wh   = Department.objects.get(code='WH')
            dept_mkt  = Department.objects.get(code='MKT')
        except (User.DoesNotExist, Department.DoesNotExist) as e:
            raise CommandError(f'Prerequisites missing. ({e})')

        # Fetch suppliers
        def sup(name):
            try:
                return Supplier.objects.get(name=name)
            except Supplier.DoesNotExist:
                return Supplier.objects.filter(status='active').first()

        pos_data = [
            {
                'supplier': 'Techno Solutions Ltd',
                'department': dept_ict,
                'status': 'fully_received',
                'currency': 'KES',
                'sub_total': 7_950_000,
                'tax_rate': 16.00,
                'payment_terms': 'Net 30 days',
                'delivery_address': 'ICT Department, Head Office, Westlands, Nairobi',
                'delivery_date': date(2025, 2, 28),
                'notes': 'Linked to TEND-2025-001 award',
                'items': [
                    ('Laptop Computers (Dell Latitude 5540)',  'Units', 50, 85_000),
                    ('Network Switches 24-port (Cisco)',       'Units',  5, 48_000),
                    ('UPS 3KVA (APC Smart-UPS)',               'Units', 10, 38_500),
                    ('CAT6 Cable Reels (305m)',                'Reels', 20,  3_200),
                ],
            },
            {
                'supplier': 'East African Packaging Co.',
                'department': dept_prod,
                'status': 'partially_received',
                'currency': 'KES',
                'sub_total': 18_000_000,
                'tax_rate': 16.00,
                'payment_terms': 'Net 45 days',
                'delivery_address': 'Production Stores, Industrial Area, Nairobi',
                'delivery_date': date(2025, 3, 15),
                'notes': 'Q1 tranche of annual packaging supply contract',
                'items': [
                    ('PET Preforms (28mm)',      'Units',  100_000,     42),
                    ('Bottle Caps 38mm (carton)','Cartons',  5_000,  1_600),
                    ('Shrink Film Roll',         'Rolls',    2_000,    980),
                ],
            },
            {
                'supplier': 'Nairobi Industrial Supplies',
                'department': dept_prod,
                'status': 'issued',
                'currency': 'KES',
                'sub_total': 420_000,
                'tax_rate': 16.00,
                'payment_terms': 'Net 14 days',
                'delivery_address': 'Maintenance Store, Production Floor, Nairobi',
                'delivery_date': date(2025, 2, 20),
                'notes': 'Maintenance lubricants for Line 3 scheduled overhaul',
                'items': [
                    ('Shell Omala Lubricating Oil 20L', 'Drums', 15, 4_800),
                    ('Bearing Grease 5kg',              'Units', 20, 2_200),
                    ('O-Ring Kits Assorted',            'Sets',  10, 3_500),
                ],
            },
            {
                'supplier': 'Summit Engineering Works',
                'department': dept_prod,
                'status': 'fully_received',
                'currency': 'KES',
                'sub_total': 870_000,
                'tax_rate': 16.00,
                'payment_terms': 'Immediate payment on completion',
                'delivery_address': 'Generator Room, Production Block B',
                'delivery_date': date(2025, 2, 12),
                'notes': 'Emergency generator repair — TEND-2025-006',
                'items': [
                    ('Generator Overhaul Labour',      'Service', 1, 320_000),
                    ('Alternator Brushes (set)',        'Sets',    2,  18_500),
                    ('AVR Module (Stamford)',           'Units',   1,  95_000),
                    ('Engine Service Parts',           'Lot',      1, 436_500),
                ],
            },
            {
                'supplier': 'Savanna Office Supplies',
                'department': dept_mkt,
                'status': 'acknowledged',
                'currency': 'KES',
                'sub_total': 185_000,
                'tax_rate': 16.00,
                'payment_terms': 'Net 21 days',
                'delivery_address': 'Marketing Department, 3rd Floor, Head Office',
                'delivery_date': date(2025, 1, 28),
                'notes': 'Q1 office stationery replenishment',
                'items': [
                    ('A4 Paper Reams 80gsm (box of 5)', 'Boxes',  40,  2_250),
                    ('Ballpoint Pens (box of 50)',       'Boxes',  50,    320),
                    ('Assorted Stationery Pack',         'Sets',   50,  2_180),
                ],
            },
            {
                'supplier': 'Digital Horizons ICT',
                'department': dept_ict,
                'status': 'draft',
                'currency': 'KES',
                'sub_total': 380_000,
                'tax_rate': 16.00,
                'payment_terms': 'Net 7 days (emergency)',
                'delivery_address': 'Server Room, ICT Department, Head Office',
                'delivery_date': date(2025, 1, 22),
                'notes': 'Emergency UPS replacement — server room',
                'items': [
                    ('APC Smart-UPS 10KVA',       'Units', 2, 85_000),
                    ('UPS Battery Pack RBC12',    'Sets',  4, 28_000),
                    ('Rack PDU 16-way',           'Units', 2, 32_000),
                ],
            },
        ]

        created_count = 0
        for spec in pos_data:
            supplier = sup(spec['supplier'])
            if not supplier:
                self.stdout.write(warn(f'Supplier "{spec["supplier"]}" not found — skipped'))
                continue

            sub = decimal.Decimal(str(spec['sub_total']))
            tax = (sub * decimal.Decimal(str(spec['tax_rate']))) / 100
            total = sub + tax

            po = PurchaseOrder.objects.create(
                supplier=supplier,
                department=spec['department'],
                status=spec['status'],
                currency=spec['currency'],
                sub_total=sub,
                tax_rate=decimal.Decimal(str(spec['tax_rate'])),
                payment_terms=spec['payment_terms'],
                delivery_address=spec['delivery_address'],
                delivery_date=spec['delivery_date'],
                notes=spec['notes'],
                issued_by=proc_user,
                issued_at=timezone.now() if spec['status'] != 'draft' else None,
            )

            for iname, unit, qty, uprice in spec['items']:
                q = decimal.Decimal(str(qty))
                u = decimal.Decimal(str(uprice))
                POLineItem.objects.create(
                    purchase_order=po,
                    item_name=iname,
                    unit=unit,
                    quantity=q,
                    unit_price=u,
                    quantity_received=q if spec['status'] == 'fully_received' else
                                      (q * decimal.Decimal('0.5') if spec['status'] == 'partially_received' else
                                       decimal.Decimal('0')),
                )

            self.stdout.write(ok(f'PO: {po.po_number}  [{spec["status"]}]  {spec["supplier"]}  KES {total:,.2f}'))
            created_count += 1

        self.stdout.write(info(f'{created_count} purchase order(s) created'))

    # ═════════════════════════════════════════════════════════════════════════
    # GRNs
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_grns(self):
        try:
            store_keeper = User.objects.get(username='wanjiku')
            verifier     = User.objects.get(username='atieno')
        except User.DoesNotExist as e:
            raise CommandError(f'Prerequisites missing. ({e})')

        # Match POs with received status
        received_pos = PurchaseOrder.objects.filter(
            status__in=['fully_received', 'partially_received']
        ).prefetch_related('line_items')

        if not received_pos.exists():
            self.stdout.write(warn('No received POs found — run --module purchase_orders first'))
            return

        created_count = 0
        for po in received_pos:
            if GoodsReceivedNote.objects.filter(purchase_order=po).exists():
                self.stdout.write(warn(f'GRN for PO {po.po_number} exists — skipped'))
                continue

            is_full   = po.status == 'fully_received'
            grn_status = 'verified' if is_full else 'submitted'

            grn = GoodsReceivedNote.objects.create(
                purchase_order=po,
                supplier=po.supplier,
                delivery_date=po.delivery_date or date(2025, 2, 28),
                delivery_note_number=f'DN-{po.po_number[-6:]}',
                invoice_number=f'INV-SUP-{po.po_number[-6:]}',
                status=grn_status,
                received_by=store_keeper,
                verified_by=verifier if grn_status == 'verified' else None,
                verified_at=timezone.now() if grn_status == 'verified' else None,
                remarks='Goods received in good condition.' if is_full else 'Partial delivery. Balance pending.',
            )

            for po_item in po.line_items.all():
                qty_ordered   = po_item.quantity
                qty_received  = qty_ordered if is_full else (qty_ordered * decimal.Decimal('0.5')).quantize(decimal.Decimal('0.01'))
                qty_accepted  = qty_received
                qty_rejected  = decimal.Decimal('0')

                # Simulate minor rejection for partial deliveries
                if not is_full and random.random() < 0.15:
                    qty_rejected = decimal.Decimal('1')
                    qty_accepted = qty_received - qty_rejected

                GRNLineItem.objects.create(
                    grn=grn,
                    po_line_item=po_item,
                    item_name=po_item.item_name,
                    unit=po_item.unit,
                    quantity_ordered=qty_ordered,
                    quantity_received=qty_received,
                    quantity_accepted=qty_accepted,
                    quantity_rejected=qty_rejected,
                    rejection_reason='Damaged in transit' if qty_rejected > 0 else '',
                    unit_price=po_item.unit_price,
                    batch_number=f'BAT-{random.randint(10000, 99999)}',
                )

            self.stdout.write(ok(f'GRN: {grn.grn_number}  [{grn_status}]  ← PO {po.po_number}'))
            created_count += 1

        self.stdout.write(info(f'{created_count} GRN(s) created'))

    # ═════════════════════════════════════════════════════════════════════════
    # INVOICES
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_invoices(self):
        try:
            finance_user = User.objects.get(username='nmuthoni')
            approver     = User.objects.get(username='jmwangi')
        except User.DoesNotExist as e:
            raise CommandError(f'Prerequisites missing. ({e})')

        # Create invoices against received/partially received POs
        target_pos = PurchaseOrder.objects.filter(
            status__in=['fully_received', 'partially_received', 'acknowledged']
        )

        if not target_pos.exists():
            self.stdout.write(warn('No eligible POs found for invoicing — run purchase_orders first'))
            return

        invoice_specs = [
            # (status, days_after_delivery, amount_pct, due_days)
            ('approved',       5, 1.00, 30),
            ('partially_paid', 3, 1.00, 45),
            ('received',       2, 1.00, 21),
            ('matched',        4, 1.00, 30),
            ('approved',       7, 1.00, 14),
        ]

        created_count = 0
        for po, (inv_status, days_offset, amt_pct, due_days) in zip(target_pos, invoice_specs):
            # Skip if invoice already exists for this PO
            if Invoice.objects.filter(purchase_order=po).exists():
                self.stdout.write(warn(f'Invoice for PO {po.po_number} exists — skipped'))
                continue

            delivery = po.delivery_date or date(2025, 2, 28)
            inv_date  = delivery + timedelta(days=days_offset)
            due_date  = inv_date + timedelta(days=due_days)

            total_amount = po.total_amount * decimal.Decimal(str(amt_pct))
            amount_paid  = decimal.Decimal('0')

            if inv_status == 'partially_paid':
                amount_paid = (total_amount * decimal.Decimal('0.50')).quantize(decimal.Decimal('0.01'))

            # Look for matching GRN
            grn = GoodsReceivedNote.objects.filter(purchase_order=po).first()

            inv = Invoice.objects.create(
                invoice_number=f'INV-{po.supplier.name[:3].upper()}-{po.po_number[-6:]}',
                supplier=po.supplier,
                purchase_order=po,
                grn=grn,
                invoice_date=inv_date,
                due_date=due_date,
                sub_total=po.sub_total,
                tax_amount=po.tax_amount,
                total_amount=total_amount,
                amount_paid=amount_paid,
                currency=po.currency,
                status=inv_status,
                received_by=finance_user,
                approved_by=approver if inv_status in ('approved', 'partially_paid', 'paid') else None,
                notes=f'Invoice for {po.po_number}. Terms: {po.payment_terms}',
            )

            self.stdout.write(ok(
                f'Invoice: {inv.invoice_number}  [{inv_status}]  '
                f'KES {total_amount:,.2f}  due {due_date}'
            ))
            created_count += 1

        self.stdout.write(info(f'{created_count} invoice(s) created'))

    # ═════════════════════════════════════════════════════════════════════════
    # PAYMENTS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_payments(self):
        try:
            finance_user = User.objects.get(username='nmuthoni')
            approver     = User.objects.get(username='jmwangi')
        except User.DoesNotExist as e:
            raise CommandError(f'Prerequisites missing. ({e})')

        eligible_invoices = Invoice.objects.filter(
            status__in=['approved', 'partially_paid']
        ).select_related('supplier')

        if not eligible_invoices.exists():
            self.stdout.write(warn('No approved invoices found — run --module invoices first'))
            return

        payment_methods = ['bank_transfer', 'bank_transfer', 'bank_transfer', 'cheque', 'mobile_money']
        payment_specs = [
            # (status,    days_after_due,  pay_method_idx)
            ('completed',   -5,  0),  # paid 5 days before due
            ('completed',    0,  1),  # paid on due date
            ('pending',      2,  2),  # pending, 2 days past due
            ('completed',   -3,  3),  # cheque, early payment
            ('processing',   1,  4),  # mobile money, processing
        ]

        created_count = 0
        for invoice, (pay_status, day_offset, method_idx) in zip(eligible_invoices, payment_specs):
            if Payment.objects.filter(invoice=invoice).exists():
                self.stdout.write(warn(f'Payment for invoice {invoice.invoice_number} exists — skipped'))
                continue

            pay_date = invoice.due_date + timedelta(days=day_offset)
            if pay_date > date.today():
                pay_date = date.today() - timedelta(days=1)

            # For partial invoices, pay 50%; for approved, pay full
            if invoice.status == 'partially_paid':
                amount = invoice.amount_paid  # already recorded partial
            else:
                amount = invoice.total_amount

            method = payment_methods[method_idx % len(payment_methods)]

            payment = Payment.objects.create(
                invoice=invoice,
                supplier=invoice.supplier,
                amount=amount,
                currency=invoice.currency,
                payment_method=method,
                payment_date=pay_date,
                transaction_reference=f'TXN-{random.randint(100000, 999999)}',
                bank_name=invoice.supplier.bank_name or 'Equity Bank',
                account_number=invoice.supplier.bank_account or '0190000001',
                status=pay_status,
                initiated_by=finance_user,
                approved_by=approver if pay_status in ('completed', 'processing') else None,
                approved_at=timezone.now() if pay_status in ('completed', 'processing') else None,
                remarks=f'Payment for {invoice.invoice_number}',
            )

            self.stdout.write(ok(
                f'Payment: {payment.payment_reference}  [{pay_status}]  '
                f'{method}  KES {amount:,.2f}'
            ))
            created_count += 1

        self.stdout.write(info(f'{created_count} payment(s) created'))

        # Summary banner
        self.stdout.write('')
        self.stdout.write(head('  DATABASE SUMMARY'))
        self.stdout.write(head('─' * 60))
        summary = [
            ('Users',            User.objects.count()),
            ('Departments',      Department.objects.count()),
            ('Fiscal Years',     FiscalYear.objects.count()),
            ('Budgets',          Budget.objects.count()),
            ('Quarter Budgets',  QuarterBudget.objects.count()),
            ('Budget Line Items',BudgetLineItem.objects.count()),
            ('Suppliers',        Supplier.objects.count()),
            ('Tenders',          Tender.objects.count()),
            ('Tender Bids',      TenderBid.objects.count()),
            ('Requisitions',     Requisition.objects.count()),
            ('Req. Items',       RequisitionItem.objects.count()),
            ('Purchase Orders',  PurchaseOrder.objects.count()),
            ('PO Line Items',    POLineItem.objects.count()),
            ('GRNs',             GoodsReceivedNote.objects.count()),
            ('GRN Line Items',   GRNLineItem.objects.count()),
            ('Invoices',         Invoice.objects.count()),
            ('Payments',         Payment.objects.count()),
        ]
        for label, count in summary:
            bar = '█' * min(count, 40)
            self.stdout.write(f'  {label:<22} {CYAN}{count:>4}{RESET}  {GREEN}{bar}{RESET}')