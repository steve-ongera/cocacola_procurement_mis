# ProcurePro — Procurement Management System

ProcurePro is a full-stack procurement and supply chain management system designed to help organizations manage purchasing processes efficiently. The system streamlines procurement workflows including supplier management, purchase requests, approvals, and order tracking.

Built using Django REST Framework for the backend API and React (Vite) for the frontend, ProcurePro provides a fast, scalable, and modern web application architecture.

---

## Project Structure

```
procurement/
├── backend/
│   ├── procurement/
│   │   ├── models.py          ← All 16 Django models
│   │   ├── serializers.py     ← DRF serializers (list + detail variants)
│   │   ├── views.py           ← ViewSets with custom actions
│   │   └── urls.py            ← All API routes (one app)
│   ├── core_urls.py           ← Root urls.py (rename to config/urls.py)
│   └── settings_snippet.py   ← Key settings to merge into your settings.py
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                       ← Routing + protected shell
        ├── styles/
        │   └── global_styles.css         ← Full BW design system
        ├── context/
        │   └── AppContext.jsx            ← Auth, Toast, Sidebar contexts
        ├── services/
        │   └── api.js                    ← Full API layer for all endpoints
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.jsx           ← Collapsible drawer sidebar
        │   │   └── Navbar.jsx            ← Top navbar with breadcrumbs
        │   └── common/
        │       └── index.jsx             ← Shared UI primitives
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Budgets.jsx
            ├── Requisitions.jsx          ← Planned + Emergency support
            ├── Tenders.jsx
            ├── PurchaseOrders.jsx
            ├── GRN.jsx
            ├── Invoices.jsx
            ├── Payments.jsx
            ├── Suppliers.jsx
            └── AuditLog.jsx
```

---

## Backend Setup

### 1. Create Django project

```bash
django-admin startproject config .
python manage.py startapp procurement
```

### 2. Install dependencies

```bash
pip install django djangorestframework djangorestframework-simplejwt \
            django-cors-headers django-filter psycopg2-binary
```

### 3. Merge settings

Copy the relevant blocks from `settings_snippet.py` into your `config/settings.py`.

### 4. Wire up URLs

In `config/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('procurement.urls')),
]
```

### 5. Migrate and create superuser

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:3000
```

Set the API base URL if needed:
```bash
# .env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Data Models

| Model              | Purpose                                      |
|--------------------|----------------------------------------------|
| `User`             | Custom user with roles                       |
| `Department`       | Company departments                          |
| `FiscalYear`       | Annual fiscal periods                        |
| `Budget`           | Annual budget per dept / fiscal year         |
| `QuarterBudget`    | Q1–Q4 allocations per budget                 |
| `BudgetLineItem`   | Planned items per quarter                    |
| `Supplier`         | Vendor registry                              |
| `Tender`           | Competitive procurement processes            |
| `TenderBid`        | Supplier bids on tenders                     |
| `Requisition`      | Procurement requests (planned + emergency)   |
| `RequisitionItem`  | Line items on requisitions                   |
| `PurchaseOrder`    | Issued orders to suppliers                   |
| `POLineItem`       | PO line items                                |
| `GoodsReceivedNote`| Delivery records                             |
| `GRNLineItem`      | Items received per delivery                  |
| `Invoice`          | Supplier invoices                            |
| `Payment`          | Payments against invoices                    |
| `AuditLog`         | Full activity trail                          |

---

## API Endpoints (all under `/api/v1/`)

```
POST   auth/login/                     JWT login
POST   auth/refresh/                   Token refresh

GET/POST         budgets/
GET/PATCH/DELETE budgets/{slug}/
POST             budgets/{slug}/submit/
POST             budgets/{slug}/approve/
POST             budgets/{slug}/reject/

GET/POST         requisitions/
POST             requisitions/{slug}/submit/
POST             requisitions/{slug}/hod_approve/
POST             requisitions/{slug}/approve/
POST             requisitions/{slug}/reject/
POST             requisitions/{slug}/convert_to_po/

GET/POST         purchase-orders/
POST             purchase-orders/{slug}/issue/
POST             purchase-orders/{slug}/acknowledge/
POST             purchase-orders/{slug}/cancel/

GET/POST         grns/
POST             grns/{slug}/submit/
POST             grns/{slug}/verify/

GET/POST         tenders/
POST             tenders/{slug}/publish/
POST             tenders/{slug}/award/

GET/POST         invoices/
POST             invoices/{slug}/approve/
POST             invoices/{slug}/dispute/

GET/POST         payments/
POST             payments/{slug}/approve/

GET/POST         suppliers/
POST             suppliers/{slug}/activate/
POST             suppliers/{slug}/blacklist/

GET              dashboard/stats/
GET              dashboard/recent_activity/
GET              dashboard/budget_utilization/
GET              dashboard/monthly_spend/

GET              audit-logs/
```

---

## User Roles

| Role                | Description                                  |
|---------------------|----------------------------------------------|
| `admin`             | Full system access                           |
| `budget_manager`    | Create & manage budgets                      |
| `procurement_officer` | Handle requisitions, POs, GRNs            |
| `approver`          | Approve requisitions, budgets, invoices      |
| `finance`           | Invoices and payments                        |
| `store_keeper`      | GRN creation and verification                |
| `requester`         | Submit requisitions only                     |

---

## Design System (Frontend)

- **Font:** IBM Plex Sans + IBM Plex Mono
- **Palette:** Pure black `#0a0a0a` and white `#ffffff` with neutral grays
- **Components:** Cards, data tables, badges, modals, toolbars, stat cards, progress bars, toasts
- **Layout:** Fixed collapsible sidebar (260px → 64px), fixed top navbar
- **Icons:** Bootstrap Icons 1.11.3 (CDN)
- **No border-radius** — utilitarian / industrial aesthetic