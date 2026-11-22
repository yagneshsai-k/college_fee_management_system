# College Fee Credit Management System

A modern, institutional-grade College ERP web application designed to manage student tuition fees, flexible installment plans, fee credits, automated overdue recovery, and real-time student self-service tracking.

---

## 1. Problem Statement & Solution

### The Challenge
Most higher-education institutions require students to pay an annual tuition fee (e.g., ₹1,00,000 to ₹1,50,000). While some families can afford a lump-sum payment at admission, many students require structured installments (monthly payments of ₹8,000–₹10,000, quarterly terms, or semester-wise credits).
Institutions managing these credit arrangements through manual registers or disjointed spreadsheets face severe operational hurdles:
- Inaccurate balance calculations and lost payment records
- Inability to track pending and past-due installments across academic departments
- Lack of transparency for parents and students regarding payment deadlines
- Delayed overdue follow-ups and revenue leakages

### The Solution
The **College Fee Credit Management System** centralizes all fee management in one unified platform:
- **Flexible Installment Plans**: One-Time (5% discount), Semester (2 terms), Quarterly (4 terms), Monthly (10 terms), and Custom Schedules.
- **Dual ERP Portal**: Accounts Admin management desk + Student Self-Service portal.
- **Real-Time Automated Ledger**: Automatic distribution of payments across oldest dues and pending installments.
- **Overdue & Delinquency Tracker**: Aging reports (<30 days, 30–60 days, 60+ days), late penalty calculation, and 1-click SMS/Email reminder dispatch.
- **Printable Fee Receipts**: Receipts are generated from saved counter payment records and can be printed or saved as PDF.

---

## 2. Technology Stack

- **Frontend**: React 18/19 with TypeScript (Vite bundler)
- **Styling**: Tailwind CSS (Executive Navy-Blue & Slate ERP Theme)
- **Backend**: Python Flask REST APIs with Flask-CORS
- **Database**: SQLite with SQLAlchemy ORM (Pure Python mode)
- **Icons**: Lucide React
- **Data Visualizations & Charts**: Recharts (Area charts, Bar charts, Donut charts)

---

## 3. Project Directory Structure

```text
College-Fee-Management/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # ERP Top header with role switcher
│   │   │   ├── Sidebar.tsx            # Clean institutional navigation
│   │   │   ├── DashboardView.tsx      # Executive metrics, charts & collection velocity
│   │   │   ├── StudentsView.tsx       # Student roster, filters & fee progress
│   │   │   ├── StudentDetailModal.tsx # Full student ledger & installment matrix
│   │   │   ├── AddStudentModal.tsx    # New admission & installment plan wizard
│   │   │   ├── PaymentCollectView.tsx # Staff-recorded counter payments
│   │   │   ├── OverdueView.tsx        # Defaulters aging tracker & alert dispatch
│   │   │   ├── PaymentsView.tsx       # Transaction history & receipts audit
│   │   │   ├── FeeCalculatorView.tsx  # Interactive tuition & installment simulator
│   │   │   ├── StudentPortalView.tsx  # Student self-service dashboard
│   │   │   ├── StudentPayModal.tsx    # Online checkout (UPI, Cards, Net Banking)
│   │   │   ├── ReceiptModal.tsx       # Official printable college fee receipt
│   │   │   └── ReminderModal.tsx      # SMS / WhatsApp / Email notice sender
│   │   ├── types.ts                   # TypeScript data models & interfaces
│   │   ├── api.ts                     # REST API client services
│   │   ├── utils.ts                   # INR Currency & Date formatting helpers
│   │   ├── App.tsx                    # Root state & portal container
│   │   └── main.tsx                   # Application entry point
│   ├── public/
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── .env.example                 # Backend environment template
│   ├── app.py                         # Flask REST API endpoints & CORS
│   ├── models.py                      # SQLAlchemy ORM database models
│   ├── database.py                    # SQLite engine & session setup
│   ├── seed.py                        # Realistic initial data seeder
│   ├── requirements.txt               # Python package dependencies
│   └── college_fee.db                 # SQLite database (auto-generated)
│
├── README.md                          # Documentation & Setup guide
└── .gitignore                         # Version control ignore rules
```

---

## 4. Key Application Features

### 🏢 Accounts Administration Portal
1. **Executive Dashboard**:
   - 4 Live Metric Cards: Total Expected, Total Collected (with % progress), Pending Balance, Overdue Defaulters.
   - Monthly Collection Velocity Area Chart.
   - Department-Wise Fee Performance Bar Chart.
   - Installment Plan Adoption Donut Chart & Payment Mode Breakdown.
2. **Student Roster & Ledgers**:
   - Filter by Department, Credit Plan, and Payment Status.
   - Live fee clearance progress bar for each student.
   - Detailed ledger view with full installment schedule, fee component breakdowns, and payment history.
3. **Fee Collection Counter**:
   - Fast counter collection by Student Roll Number or Name.
   - Auto-allocation to oldest dues or specific installment selection.
   - Payment modes: UPI (staff verified), Net Banking, Card Swipe, Counter Cash, Cheque/DD.
4. **Overdue & Delinquency Tracker**:
   - Identifies students past due dates with late fee penalties.
   - 1-click dispatch of personalized SMS, WhatsApp, and Email notices.
   - Late fee waiver tool and due date extension picker.
5. **Installment Plan Simulator**:
   - Compares One-Time, Semester, Quarterly, and Monthly plans side-by-side with interactive sliders for tuition and scholarships.

### 🎓 Student Self-Service Portal
1. **Personal Dashboard**:
   - Displays student name, roll number, department, quota, and total annual tuition.
   - Progress bar of paid installments and net balance remaining.
   - Next due installment card with countdown and quick pay action.
2. **Online Checkout**:
   - Checkout is disabled until a real payment provider and server-side verification are configured.
   - Students can view counter-recorded payments and their receipts.
3. **Receipts & Invoices Archive**:
   - Download or print official college receipts for any cleared term.

---

## 5. Getting Started & Running the Application

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup (Flask REST API)
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the backend server (starts on http://127.0.0.1:5000)
python app.py
```
*Note: The SQLite database (`college_fee.db`) and realistic seed data (8 diverse students across engineering & management branches) are automatically initialized on startup.*

### Frontend Setup (React + TypeScript)
```bash
cd frontend

# Install packages
npm install

# Start Vite development server (starts on http://localhost:5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser to access the complete application.

---

## 6. REST API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status of API |
| `GET` | `/api/dashboard/stats` | Dashboard metrics, trend charts & breakdown |
| `GET` | `/api/students` | Get students with department/plan/status filters |
| `GET` | `/api/students/<id>` | Full student ledger with installments & receipts |
| `POST` | `/api/students` | Register student with customized installment plan |
| `PUT` | `/api/students/<id>` | Update student profile |
| `DELETE`| `/api/students/<id>` | Remove student record |
| `POST` | `/api/students/<id>/change-plan` | Restructure pending dues to new installment plan |
| `GET` | `/api/payments` | List payment transactions |
| `POST` | `/api/payments` | Record payment & generate official receipt |
| `GET` | `/api/payments/receipt/<receipt_no>` | Get voucher details for printable receipt |
| `POST` | `/api/reminders/send` | Send SMS / Email / WhatsApp fee reminder |
| `POST` | `/api/installments/<id>/waive-late-fee`| Waive late fee penalty |
| `POST` | `/api/installments/<id>/extend-due-date`| Grant due date extension |

---

## 7. License
Developed for educational institutional fee credit management. All rights reserved.


## Authentication, security and production setup

The API now uses signed, HttpOnly session cookies. Every private endpoint requires an authenticated session; administrator routes are restricted to admins, while student routes return only the signed-in student's profile, payments and receipts. Mutating requests require the session CSRF token in `X-CSRF-Token`. Login attempts are throttled per process and IP/username, and responses never include password hashes.

### First administrator and local setup

1. From `backend/`, copy `.env.example` to `.env` and replace `SECRET_KEY`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` with unique values (admin password minimum: 12 characters). The first startup creates the admin only when these variables are set. Existing admin credentials are not overwritten on later restarts.
2. Leave `APP_ENV=development` and `SEED_DEMO_DATA=true` for local demo data. Set `APP_ENV=production` and `SEED_DEMO_DATA=false` for production; production does not seed sample students.
3. In `backend/`, install `pip install -r requirements.txt` and run `python app.py`. In `frontend/`, run `npm install` and `npm run dev`.
4. Admins sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Demo students have no default password; from the Students page choose **Reset password** and securely deliver the one-time temporary password. New admissions return a one-time temporary password once. The student username is their unique roll number.
5. Students can change their own password from the student portal. Passwords require 12 characters and letters plus digits.

`backend/.env` is ignored by Git. Keep `COOKIE_SECURE=true` behind HTTPS and set `FRONTEND_ORIGINS` to the exact trusted origin(s) in production. Set a persistent `SECRET_KEY`; do not rely on the generated development key. Configure `DATABASE_URL` for PostgreSQL and install the included Psycopg driver. `create_all` plus idempotent column additions preserves existing records; back up the database before upgrades. SQLite backup: stop the API and copy `backend/college_fee.db`. PostgreSQL backup/restore: use `pg_dump` / `pg_restore`.

To send payment confirmation SMS messages, configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` in `backend/.env`. Ten-digit numbers are prefixed with `SMS_DEFAULT_COUNTRY_CODE` (defaults to `+91`); international numbers should be stored in E.164 format. Keep Twilio credentials out of Git and restart the backend after changing `.env`. SMS is attempted after a payment is committed and includes the amount, receipt number, and remaining balance. The payment remains recorded if SMS sending fails; SMS submission status is shown in the admin message and saved in the reminder audit log.

### Account and payments behavior

- Deactivation blocks the account immediately and retains fee, payment, receipt and installment history. The legacy `DELETE /api/students/<id>` action is now a soft deactivation.
- Staff counter payments are recorded server-side, checked against the outstanding balance, allocated to installments, and assigned unique receipts. Repeated transaction references are rejected.
- Student checkout is disabled: there is no live payment gateway in this project. Student payment attempts return an explicit unavailable response until a provider is configured with server-side verification/callback handling.
- Payment confirmation texts are submitted through Twilio when configured. The separate Email, SMS and WhatsApp reminder actions still create in-app audit/reminder records and do not contact external providers. No external credentials are bundled.
- The dashboard collection trend now uses persisted receipts and installment due dates. The original annual/monthly chart presentation is retained.
- Student service requests include fee extensions and no-dues certificates. Extension approvals change the linked installment due date; they never mark fees paid. Certificate eligibility is checked from installment balances and recorded payments on the backend, and a PDF is available only after admin approval.
- The student Fee Calendar reads dates and payment statuses from the saved installment schedule. Admin plan changes and due-date extensions appear after the student profile refreshes.

### Student self-service additions

- The student portal's **Fee Calendar** tab shows paid, pending, and overdue installments by date plus upcoming deadline reminders.
- **Requests & Certificates** lets a student request an extension for an unpaid installment and track its status. The pending amount is fetched from the database.
- No-dues requests require a complete saved schedule, zero installment balances, and payment receipts covering the net payable amount. Admin approval rechecks eligibility. The certificate download endpoint also checks student ownership and fee clearance before generating a PDF with the certificate ID and issue date.
- Admins review both request types from **Student Requests**. Approving an extension updates the installment due date and notifies the student; approval/rejection notifications appear in the student portal.

The new request tables are created automatically by SQLAlchemy `create_all` when the backend starts. Existing records are retained. Install the updated Python requirements once with `pip install -r backend/requirements.txt` to add the PDF dependency.

### Finance and data tools

Admins can open **Finance & Data Tools** in the sidebar to view date/department/payment-method filtered collections and current balances, export payment or balance CSV files, validate and import student accounts from the downloadable CSV template, inspect admin activity, and download/restore SQLite backups. CSV imports support ONE_TIME, SEMESTER, QUARTERLY, and MONTHLY plans; invalid batches are rejected as a whole. Each imported account gets a random temporary password displayed once in the admin screen; download and deliver that credentials file securely.

The backend checks installment reminders hourly while running. Students receive in-app notices 7 days before, 1 day before, on the due date, and 1 day overdue, with each installment/notice sent once. SMS is optional and requires the Twilio settings above. The local launcher must remain running for scheduled reminders. Database restore accepts a validated SQLite backup and automatically saves a pre-restore safety copy in `backend/backups/`; the current in-app backup tools support SQLite, not PostgreSQL.

### Additional authenticated endpoints

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Sign in with admin username or student roll number |
| `GET` | `/api/auth/session` | Public | Return current session status and CSRF token |
| `POST` | `/api/auth/logout` | Authenticated | Clear session |
| `GET` | `/api/me` | Student | Own profile and ledger |
| `POST` | `/api/me/password` | Student | Change own password |
| `GET` | `/api/me/payments` | Student | Own payment history |
| `GET` | `/api/me/receipts/<receipt_no>` | Student | Own receipt only |
| `POST` | `/api/admin/students/<id>/reset-password` | Admin | Reset and return one-time temporary password |
| `POST` | `/api/admin/students/<id>/status` | Admin | Activate or deactivate account |
| `POST` | `/api/admin/announcements` | Admin | Create an in-app announcement for active students |
| `GET` | `/api/me/notifications` | Student | Read own in-app notification feed |
| `POST` | `/api/me/notifications/<id>/read` | Student | Mark own notification as read |
| `GET, POST` | `/api/me/fee-extension-requests` | Student | Own extension request history and submission |
| `GET, POST` | `/api/me/no-dues-requests` | Student | Own certificate history, eligibility and submission |
| `GET` | `/api/me/no-dues-requests/<id>/certificate` | Student | Download own approved certificate PDF |
| `GET` | `/api/admin/fee-extension-requests` | Admin | Review fee extension requests |
| `POST` | `/api/admin/fee-extension-requests/<id>/decision` | Admin | Approve/reject; approval updates the installment due date |
| `GET` | `/api/admin/no-dues-requests` | Admin | Review no-dues requests and current fee eligibility |
| `POST` | `/api/admin/no-dues-requests/<id>/decision` | Admin | Approve/reject a certificate request |
| `GET` | `/api/admin/reports/finance` | Admin | Filtered collection and current balance/overdue summary |
| `GET` | `/api/admin/reports/departments` | Admin | Departments available for reports |
| `GET` | `/api/admin/students/import-template` | Admin | Download CSV template |
| `POST` | `/api/admin/students/import/preview` | Admin | Validate CSV without importing |
| `POST` | `/api/admin/students/import` | Admin | Import a validated student batch and issue temporary passwords |
| `GET` | `/api/admin/activity` | Admin | Filtered audit history |
| `GET` | `/api/admin/database/backup` | Admin | Download a consistent SQLite backup |
| `POST` | `/api/admin/database/restore` | Admin | Restore a validated SQLite backup after saving a safety copy |
| `POST` | `/api/admin/reminders/run` | Admin | Run the scheduled reminder check immediately |

Every non-GET API call after login must include `X-CSRF-Token` from login/session response. The frontend API client adds it automatically.

### Remaining deployment work

A real UPI/payment provider, callback signature verification, email/SMS provider integrations, PDF file export, and automated database backup scheduling require external configuration and are not claimed as implemented. Login throttling is process-local; use a shared limiter in multi-worker deployments. Deploy the frontend and API behind HTTPS, set a strong stable secret and exact CORS origins, and run the API under a production WSGI server (Gunicorn on Linux; use a Windows-compatible WSGI server on Windows).
#   c o l l e g e _ f e e _ m a n a g e m e n t _ s y s t e m  
 