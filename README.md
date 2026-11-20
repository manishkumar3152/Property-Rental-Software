# PropRent ERP — Enterprise Property Rental Management & Collection System

A production-ready, multi-owner Property Rental Management ERP built with **React 19, Vite, Node.js, Express.js, MongoDB, and Mongoose**. Designed for enterprise scalability, strict multi-owner data isolation, automated monthly recurring rent generation, dynamic server-side late fine calculation, Razorpay online payments, Meta WhatsApp Business Cloud API reminders, and automated PDF rent receipt generation.

---

## 1. System Architecture & Tech Stack

```
                             ┌───────────────────────────────────────┐
                             │       React 19 + Vite Frontend        │
                             │  (Tailwind CSS, Lucide, Recharts)     │
                             └───────────────────┬───────────────────┘
                                                 │ HTTP / REST
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │          Express.js API Server        │
                             │   (JWT, RBAC, Owner Isolation, Helmet)│
                             └───┬───────────────┬───────────────────┘
                                 │               │
            ┌────────────────────┼───────────────┼────────────────────┐
            │                    │               │                    │
            ▼                    ▼               ▼                    ▼
┌──────────────────┐   ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│  MongoDB Atlas   │   │  Razorpay Route  │  │  WhatsApp    │  │  node-cron   │
│   (16 Mongoose   │   │  Orders, Checkout│  │  Cloud API   │  │  Daily fines │
│     Models)      │   │   & Webhooks     │  │  Reminders   │  │  Monthly rent│
└──────────────────┘   └──────────────────┘  └──────────────┘  └──────────────┘
```

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React Icons, Recharts, Axios.
- **Backend:** Node.js (v24), Express.js (v5), Mongoose (v9), Helmet, CORS, Morgan, Express-Rate-Limit, PDFKit, node-cron.
- **Database:** MongoDB with 16 indexed models, compound unique keys, and transactional audit trails.
- **Payment Gateway:** Razorpay Orders API, Razorpay Checkout, Webhook HMAC signature validation on raw body, and Razorpay Route linked-account settlement.
- **Messaging:** Meta WhatsApp Business Cloud API v18.0 with individual template dispatch and delivery tracking.
- **Timezone:** Standardized on `Asia/Kolkata` (IST).

---

## 2. Default Demo Login Credentials

The database comes pre-seeded with 3 Property Owners, 50 Properties, 50 Tenants, 50 Agreements, 100 Rent Invoices, 62 Payment records, and 62 Receipts.

| Role | Email Address | Password | Profile / Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@propertyerp.com` | `Admin@12345` | Full unrestricted access across all owners and properties |
| **Property Owner 1** | `rajesh.sharma@example.com` | `Owner@12345` | Rajesh Sharma (`OWN-001`) — 18 Commercial Properties |
| **Property Owner 2** | `priya.patel@example.com` | `Owner@12345` | Priya Patel (`OWN-002`) — 16 Residential Properties |
| **Property Owner 3** | `vikram.malhotra@example.com` | `Owner@12345` | Vikram Malhotra (`OWN-003`) — 16 Industrial / Warehouses |
| **Staff / Manager** | `manager@propertyerp.com` | `Staff@12345` | Operations manager with fine-grained module permissions |

*Tenants access the portal publicly via their secure token link (e.g. `/pay/:token`) or via the Public Tenant Portal at `/tenant-portal` using their 10-digit mobile number.*

---

## 3. Key Modules & Business Logic

### 3.1 Strict Multi-Owner Data Isolation
- Enforced at the middleware and database query layer (`server/middleware/rbac.js`).
- If an authenticated user has the role `owner`, `req.ownerFilter = { ownerId: req.user.ownerId }` is strictly injected into every MongoDB query.
- Route parameters and request payloads attempting to access or modify records belonging to other owners return `403 Forbidden` with a security audit event.

### 3.2 Dynamic Late Payment Fine Calculation
- Fines are calculated strictly on the server based on the payment date or calculation timestamp—**never trusting the client clock**.
- Formula:
  $$\text{Days Late} = \lfloor(\text{Current Date} - \text{Due Date}) / 86400000\rfloor$$
  $$\text{Chargeable Days} = \max(0, \text{Days Late} - \text{Grace Period})$$
  $$\text{Late Fine} = \min(\text{Chargeable Days} \times \text{Daily Rate}, \text{Max Cap})$$
- Fine accumulation **freezes immediately upon payment confirmation**.
- If a tenant opens an older payment URL after the due date, the backend recalculates the latest fine before creating the Razorpay order. Fines cannot be bypassed.
- Manual fine adjustments require an admin reason and are permanently recorded in the `AuditLog` collection.

### 3.3 Lease Agreement Expiry & 10% Renewal Escalation
- Supports standard 11-month agreements and custom durations.
- Automatically flags agreements entering their final 30 days as `Expiring`.
- Renewal logic automatically calculates the suggested escalated rent:
  $$\text{New Rent} = \text{Previous Rent} + \left(\text{Previous Rent} \times \frac{\text{Increment Percentage}}{100}\right)$$
- Requires explicit admin/owner approval before creating the renewed agreement and archiving previous agreement history.

### 3.4 Cryptographically Secure Public Payment Links
- Public URLs use cryptographically generated 64-character random hex tokens:
  `http://localhost:5173/pay/c69f84e2be59eb84...`
- Never exposes MongoDB ObjectIds, tenant Aadhaar numbers, or private details on public links.
- Public page recalculates current dues on the fly, provides one-click Razorpay checkout, and serves immediate digital PDF receipts.

### 3.5 Automated Cron Background Jobs (`node-cron`)
- **Daily at 00:30 AM IST (`30 0 * * *`):** Scans all unpaid invoices, calculates accrued daily late fines, updates overdue statuses, and detects expiring leases.
- **Monthly on 1st at 00:05 AM IST (`5 0 1 * *`):** Bulk-generates recurring rent invoices for all active agreements with unique composite database locks (`{ agreementId: 1, invoiceMonth: 1 }`).
- Manual test triggers are available directly on the Settings page.

---

## 4. Razorpay Gateway & Webhook Setup

### 4.1 Environment Variables
Set your Razorpay credentials in `server/.env`:
```env
RAZORPAY_KEY_ID=rzp_test_yourKeyHere
RAZORPAY_KEY_SECRET=yourSecretHere
RAZORPAY_WEBHOOK_SECRET=yourWebhookSecretHere
```

### 4.2 Webhook Configuration
1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/) > **Settings** > **Webhooks**.
2. Click **Add New Webhook**.
3. Set Webhook URL to: `https://yourdomain.com/api/webhooks/razorpay`.
4. Enter the Secret matching `RAZORPAY_WEBHOOK_SECRET`.
5. Select the following Active Events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `transfer.processed` (if using Razorpay Route)
   - `transfer.failed`
6. The webhook receiver verifies signatures on the **raw body buffer** and implements idempotency checking via the `WebhookEvent` model.

### 4.3 Sandbox / Test Simulation Mode
If using mock or test keys (`rzp_test_mock...`), the application seamlessly activates an integrated test checkout modal allowing end-to-end testing of payment verification, receipt creation, and owner ledger crediting without requiring real bank accounts.

---

## 5. Meta WhatsApp Business Cloud API Setup

### 5.1 Environment Variables
Set your credentials in `server/.env`:
```env
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_meta_business_account_id
WHATSAPP_ACCESS_TOKEN=your_permanent_system_user_token
WHATSAPP_VERIFY_TOKEN=your_chosen_webhook_verify_token
```

### 5.2 Template Setup
Create the following approved templates in the Meta WhatsApp Business Manager:
1. `rent_invoice_generated`
   ```
   Hello {{1}}, your rent invoice for {{2}} is generated.
   Rent Month: {{3}}
   Due Date: {{4}}
   Total Payable: {{5}}
   Pay securely here: {{6}}
   ```
2. `rent_overdue_reminder`
3. `payment_success_receipt`
4. `agreement_expiry_alert`

*In local development without Meta keys, the system operates in fallback simulation mode: logs the message to console and saves the delivery state to `WhatsAppMessage`.*

---

## 6. REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/login` — Sign in (returns JWT token and user profile)
- `GET /api/auth/me` — Get current logged-in user details
- `PUT /api/auth/update-password` — Change password

### Properties (`/api/properties`)
- `GET /api/properties` — List properties (scoped to owner if logged in as owner)
- `GET /api/properties/:id` — Get single property with agreement & invoice history
- `POST /api/properties` — Create new property (auto IDs `PROP-1001`+)
- `PUT /api/properties/:id` — Update property (includes ownership transfer audit)
- `DELETE /api/properties/:id` — Delete property (safeguard: marks Inactive if financial history exists)

### Owners (`/api/owners`)
- `GET /api/owners` — List all registered landlords (Super Admin only)
- `GET /api/owners/:id` — Get owner profile and ledger summary
- `POST /api/owners` — Onboard new owner
- `PUT /api/owners/:id` — Update owner details
- `PUT /api/owners/:id/route-account` — Update Razorpay Route linked account

### Tenants (`/api/tenants`)
- `GET /api/tenants` — List tenants (scoped to owner)
- `GET /api/tenants/:id` — Get tenant KYC and rental records
- `POST /api/tenants` — Register new tenant and map to property
- `PUT /api/tenants/:id` — Update tenant details
- `DELETE /api/tenants/:id` — Deactivate tenant (checks outstanding balances)

### Rental Agreements (`/api/agreements`)
- `GET /api/agreements` — List agreements
- `GET /api/agreements/:id` — Get agreement details
- `GET /api/agreements/:id/pdf` — Stream agreement PDF document
- `POST /api/agreements` — Create new agreement (checks overlapping leases)
- `POST /api/agreements/:id/renew` — Renew agreement with rent escalation
- `POST /api/agreements/:id/terminate` — Early lease termination

### Rent Invoicing (`/api/rent`)
- `GET /api/rent` — List invoices with summary totals
- `GET /api/rent/preview-bulk` — Preview bulk invoice generation for a month
- `POST /api/rent/generate-single` — Generate single invoice for an agreement
- `POST /api/rent/generate-bulk` — Batch generate invoices for all active agreements
- `POST /api/rent/:id/recalculate-fine` — Recalculate dynamic server-side late fine
- `POST /api/rent/:id/adjust-fine` — Manually override fine with audit reason

### Payments & Receipts (`/api/payments`, `/api/receipts`)
- `GET /api/payments` — List payment transactions
- `POST /api/payments/manual` — Record offline payment (cash, cheque, bank transfer)
- `GET /api/receipts` — List official receipts
- `GET /api/receipts/:id/pdf` — Stream official PDF receipt
- `POST /api/receipts/:id/duplicate` — Issue duplicate receipt with watermark

### WhatsApp Gateway (`/api/whatsapp`)
- `POST /api/whatsapp/send-single` — Dispatch WhatsApp payment link for an invoice
- `POST /api/whatsapp/send-bulk` — Bulk dispatch individual payment links to tenants
- `GET /api/whatsapp/logs` — View WhatsApp delivery status logs
- `POST /api/whatsapp/retry/:id` — Retry failed message

### Advanced Reports (`/api/reports`)
- `GET /api/reports/owner-wise` — Owner-wise rent collection report
- `GET /api/reports/property-wise` — Property income realization report
- `GET /api/reports/tenant-wise/:id` — Tenant ledger report
- `GET /api/reports/monthly-rent` — Monthly collection trends
- `GET /api/reports/pending` — Pending invoices report
- `GET /api/reports/overdue` — Overdue invoices report
- `GET /api/reports/fine-collection` — Fines accrued & collected report
- `GET /api/reports/agreement-expiry` — Leases expiring report
- `GET /api/reports/agreement-renewal` — Renewal history & escalations
- `GET /api/reports/razorpay-transactions` — Gateway transaction report
- `GET /api/reports/owner-settlements` — Landlord settlement report
- `GET /api/reports/property-occupancy` — Occupancy vs vacancy rate

### Public Tenant Endpoints (`/api/public`)
- `GET /api/public/pay/:token` — Fetch invoice and live recalculated fine by token
- `POST /api/public/pay/:token/order` — Create Razorpay order
- `POST /api/public/pay/:token/verify` — Verify signature and confirm payment
- `GET /api/public/tenant-portal?phone=9876543210` — Lookup tenant status by phone

---

## 7. Local Development Setup Guide

### Prerequisites
- Node.js (v18 or higher; v24 recommended)
- MongoDB running locally on `mongodb://127.0.0.1:27017`

### Step 1: Install Backend Dependencies
```bash
cd server
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `MONGO_URI=mongodb://127.0.0.1:27017/property_rental_erp`.

### Step 3: Seed Database
Populate 3 Owners, 50 Properties, 50 Tenants, 50 Agreements, Invoices, and demo accounts:
```bash
npm run seed
```

### Step 4: Start Backend API Server
```bash
npm start
# Server listens on http://localhost:4000
```

### Step 5: Install Frontend Dependencies & Start Client
In a new terminal:
```bash
cd client
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Step 6: Verify End-to-End Suite
In the `server` directory, run the automated test suite:
```bash
node test/system_test.js
```

---

## 8. Production Deployment Guide

### Architecture
- Run backend using **PM2** process manager.
- Serve built frontend assets via **Nginx** reverse proxy.
- Use **MongoDB Atlas** with replica sets for production database durability.
- Configure HTTPS with Let's Encrypt SSL certificates.

### PM2 Backend Configuration (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'proprent-backend',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
```

### Nginx Reverse Proxy Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/proprent-erp/client/dist;
    index index.html;

    # Static frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 9. Security & Compliance Checklist
- [x] Passwords hashed with bcrypt (salt rounds = 10).
- [x] JWT tokens with 30-day expiry.
- [x] Database query-level data isolation for property owners.
- [x] Razorpay webhook HMAC-SHA256 signature verification on raw request body.
- [x] Idempotent payment processing via unique Webhook event deduplication.
- [x] No sensitive tenant information (Aadhaar, PAN) exposed on public payment pages.
- [x] Dynamic server-side fine calculation preventing client-side price tampering.
- [x] Immutable audit trail for administrative fine adjustments and ownership transfers.
- [x] Financial safeguards preventing deletion of properties/tenants with existing transactions.
