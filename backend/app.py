import os
import math
import random
import secrets
import time
import logging
import base64
import json
import textwrap
import csv
import sqlite3
import tempfile
import threading
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from collections import defaultdict, deque
from datetime import date, datetime, timedelta
from io import BytesIO, StringIO
from functools import wraps
from contextlib import closing
from flask import Flask, request, jsonify, session, make_response, send_file
from flask_cors import CORS
from sqlalchemy import desc, func, text, inspect
from werkzeug.security import check_password_hash, generate_password_hash
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdf_canvas

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

from database import engine, SessionLocal, Base, DB_PATH, DATABASE_URL
from models import (Student, FeeComponent, Installment, Payment, ReminderLog, AdminUser, AuditLog, Notification,
                    FeeExtensionRequest, NoDuesCertificateRequest)
from seed import seed_database

SQLITE_DB_PATH = (DATABASE_URL[len("sqlite:///"):] if DATABASE_URL.startswith("sqlite:///") else DB_PATH)

logger = logging.getLogger(__name__)


def _normalize_sms_number(phone):
    raw = str(phone or "").strip()
    digits = "".join(char for char in raw if char.isdigit())
    if raw.startswith("+") and 8 <= len(digits) <= 15:
        return f"+{digits}"
    if digits.startswith("00") and 8 <= len(digits[2:]) <= 15:
        return f"+{digits[2:]}"
    if len(digits) == 10:
        country_code = os.environ.get("SMS_DEFAULT_COUNTRY_CODE", "+91").strip()
        country_digits = "".join(char for char in country_code if char.isdigit())
        if country_digits:
            return f"+{country_digits}{digits}"
    return None


def _send_payment_confirmation_sms(student, amount, balance_due, receipt_no):
    """Submit a payment confirmation SMS through Twilio when credentials are configured."""
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "").strip()
    messaging_service_sid = os.environ.get("TWILIO_MESSAGING_SERVICE_SID", "").strip()
    to_number = _normalize_sms_number(student.phone)
    body = (
        f"Payment received: Rs {amount:,.2f}. Receipt {receipt_no}. "
        f"Remaining fee balance: Rs {balance_due:,.2f}. - College Accounts"
    )

    result = {"status": "not_configured", "to": to_number or str(student.phone or ""), "body": body}
    if not (account_sid and auth_token and (from_number or messaging_service_sid)):
        return result
    if not to_number:
        result["status"] = "invalid_phone"
        return result

    payload = {"To": to_number, "Body": body}
    if messaging_service_sid:
        payload["MessagingServiceSid"] = messaging_service_sid
    else:
        payload["From"] = from_number
    credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        data=urlencode(payload).encode("utf-8"),
        headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            provider_response = json.loads(response.read().decode("utf-8"))
        result.update({"status": "queued", "provider_status": provider_response.get("status")})
    except HTTPError as error:
        logger.warning("Payment SMS provider rejected the request (HTTP %s)", error.code)
        result["status"] = "failed"
    except (URLError, TimeoutError, ValueError) as error:
        logger.warning("Payment SMS provider request failed: %s", type(error).__name__)
        result["status"] = "failed"
    except Exception as error:
        logger.warning("Payment SMS provider request failed: %s", type(error).__name__)
        result["status"] = "failed"
    return result

# Initialize database schema and seed data
Base.metadata.create_all(bind=engine)
# SQLite create_all does not add fields to an existing installation; add safe nullable/defaulted fields.
student_columns = {column["name"] for column in inspect(engine).get_columns("students")}
admin_columns = {column["name"] for column in inspect(engine).get_columns("admin_users")}
with engine.begin() as conn:
    if "password_hash" not in student_columns:
        conn.execute(text("ALTER TABLE students ADD COLUMN password_hash VARCHAR(255)"))
    if "is_active" not in student_columns:
        conn.execute(text("ALTER TABLE students ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"))
    if "fee_concession" not in student_columns:
        conn.execute(text("ALTER TABLE students ADD COLUMN fee_concession FLOAT NOT NULL DEFAULT 0"))
    if "created_at" not in admin_columns:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN created_at DATETIME"))
    if "last_login" not in admin_columns:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN last_login DATETIME"))
if os.environ.get("APP_ENV", "development").lower() != "production" and os.environ.get("SEED_DEMO_DATA", "true").lower() == "true":
    seed_database()

app = Flask(__name__)
app_env = os.environ.get("APP_ENV", "development").lower()
configured_secret = os.environ.get("SECRET_KEY")
if app_env == "production" and not configured_secret:
    raise RuntimeError("SECRET_KEY must be configured in production")
app.config.update(
    SECRET_KEY=configured_secret or secrets.token_urlsafe(48),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "true" if app_env == "production" else "false").lower() == "true",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    MAX_CONTENT_LENGTH=110 * 1024 * 1024,
)
allowed_origins = [origin.strip() for origin in os.environ.get("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

# Best-effort process-local login throttling; use a shared limiter (e.g. Redis) behind multi-worker production deployments.
_login_attempts = defaultdict(deque)

def _audit(db, action, record_type=None, record_id=None):
    db.add(AuditLog(user_id=session.get("user_id"), username=session.get("username", "system"), action=action,
                    record_type=record_type, record_id=str(record_id) if record_id is not None else None))

def _authenticated(role=None):
    if not session.get("user_id"):
        return False
    if role is not None and session.get("role") != role:
        return False
    db = SessionLocal()
    try:
        if session.get("role") == "ADMIN":
            active = db.query(AdminUser.id).filter(AdminUser.id == session.get("user_id"), AdminUser.is_active.is_(True)).first()
        elif session.get("role") == "STUDENT":
            active = db.query(Student.id).filter(Student.id == session.get("student_id"), Student.is_active.is_(True)).first()
        else:
            active = None
        if not active:
            session.clear()
            return False
        return True
    finally:
        db.close()

@app.before_request
def protect_api():
    if not request.path.startswith("/api/") or request.path in ("/api/health", "/api/auth/login", "/api/auth/csrf", "/api/auth/session"):
        return None
    if request.path == "/api/auth/logout":
        pass
    elif not _authenticated():
        return jsonify({"error": "Authentication required"}), 401
    else:
        student_paths = ("/api/me", "/api/me/", "/api/me/payments", "/api/me/receipts/")
        if session.get("role") == "STUDENT":
            if not (any(request.path == p or request.path.startswith(p) for p in student_paths) or (request.path == "/api/payments" and request.method == "POST")):
                return jsonify({"error": "Administrator access required"}), 403
        elif session.get("role") != "ADMIN":
            return jsonify({"error": "Administrator access required"}), 403
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.path != "/api/auth/login":
        supplied = request.headers.get("X-CSRF-Token", "")
        expected = session.get("csrf_token", "")
        if not expected or not secrets.compare_digest(supplied, expected):
            return jsonify({"error": "CSRF token missing or invalid"}), 403
    return None

@app.route("/api/auth/csrf", methods=["GET"])
def csrf_token():
    token = session.setdefault("csrf_token", secrets.token_urlsafe(32))
    return jsonify({"csrf_token": token})

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = data.get("password", "")
    if not isinstance(password, str) or not username or len(username) > 80 or len(password) > 256:
        return jsonify({"error": "Enter a valid username and password"}), 400
    key = (request.remote_addr or "unknown", username.casefold())
    now = time.time()
    while _login_attempts[key] and now - _login_attempts[key][0] > 900:
        _login_attempts[key].popleft()
    if len(_login_attempts[key]) >= 8:
        return jsonify({"error": "Too many login attempts. Try again in 15 minutes."}), 429
    db = SessionLocal()
    try:
        admin = db.query(AdminUser).filter(func.lower(AdminUser.username) == username.casefold(), AdminUser.is_active.is_(True)).first()
        student = None if admin else db.query(Student).filter(func.lower(Student.roll_no) == username.casefold(), Student.is_active.is_(True)).first()
        account = admin or student
        password_hash = account.password_hash if account else None
        if not password_hash or not check_password_hash(password_hash, password):
            _login_attempts[key].append(now)
            return jsonify({"error": "Invalid username or password"}), 401
        _login_attempts.pop(key, None)
        session.clear()
        session.permanent = True
        session["role"] = "ADMIN" if admin else "STUDENT"
        session["user_id"] = account.id
        session["username"] = account.username if admin else account.roll_no
        if student:
            session["student_id"] = student.id
        session["csrf_token"] = secrets.token_urlsafe(32)
        if admin:
            account.last_login = datetime.utcnow()
            _audit(db, "login", "admin", account.id)
            db.commit()
        return jsonify({"role": session["role"], "username": session["username"], "csrf_token": session["csrf_token"]})
    finally:
        db.close()

@app.route("/api/auth/session", methods=["GET"])
def auth_session():
    if not _authenticated():
        return jsonify({"authenticated": False}), 200
    return jsonify({"authenticated": True, "role": session["role"], "username": session["username"],
                    "csrf_token": session.get("csrf_token"), "student_id": session.get("student_id")})

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})

@app.route("/api/me", methods=["GET"])
def get_me():
    if session.get("role") != "STUDENT":
        return jsonify({"error": "Student access required"}), 403
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == session.get("student_id"), Student.is_active.is_(True)).first()
        if not student:
            session.clear()
            return jsonify({"error": "Student account is unavailable"}), 401
        return jsonify(student.to_dict(include_details=True))
    finally:
        db.close()

@app.route("/api/me/password", methods=["POST"])
def change_password():
    if session.get("role") != "STUDENT":
        return jsonify({"error": "Student access required"}), 403
    data = request.get_json(silent=True) or {}
    current = data.get("current_password", "")
    new = data.get("new_password", "")
    if not isinstance(new, str) or len(new) < 12 or len(new) > 128 or not any(c.isalpha() for c in new) or not any(c.isdigit() for c in new):
        return jsonify({"error": "New password must be 12-128 characters and include letters and numbers"}), 400
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == session.get("student_id")).first()
        if not student or not student.password_hash or not check_password_hash(student.password_hash, current):
            return jsonify({"error": "Current password is incorrect"}), 400
        student.password_hash = generate_password_hash(new)
        db.add(Notification(student_id=student.id, message="Your student portal password was changed.", notification_type="SECURITY"))
        _audit(db, "password_changed", "student", student.id)
        db.commit()
        return jsonify({"success": True})
    finally:
        db.close()

@app.route("/api/me/payments", methods=["GET"])
def get_my_payments():
    db = SessionLocal()
    try:
        rows = db.query(Payment).filter(Payment.student_id == session.get("student_id")).order_by(desc(Payment.payment_date)).all()
        return jsonify([p.to_dict() for p in rows])
    finally:
        db.close()

@app.route("/api/me/notifications", methods=["GET"])
def get_my_notifications():
    db = SessionLocal()
    try:
        rows = db.query(Notification).filter(Notification.student_id == session.get("student_id")).order_by(desc(Notification.created_at)).limit(100).all()
        return jsonify([item.to_dict() for item in rows])
    finally:
        db.close()

@app.route("/api/me/notifications/<int:notification_id>/read", methods=["POST"])
def mark_my_notification_read(notification_id):
    db = SessionLocal()
    try:
        row = db.query(Notification).filter(Notification.id == notification_id, Notification.student_id == session.get("student_id")).first()
        if not row:
            return jsonify({"error": "Notification not found"}), 404
        row.is_read = True
        db.commit()
        return jsonify({"success": True})
    finally:
        db.close()

@app.route("/api/admin/announcements", methods=["POST"])
def create_announcement():
    data = request.get_json(silent=True) or {}
    message = data.get("message")
    if not isinstance(message, str) or not message.strip() or len(message) > 500:
        return jsonify({"error": "Announcement must be between 1 and 500 characters"}), 400
    db = SessionLocal()
    try:
        query = db.query(Student).filter(Student.is_active.is_(True))
        if data.get("student_id") is not None:
            query = query.filter(Student.id == data["student_id"])
        students = query.all()
        for student in students:
            db.add(Notification(student_id=student.id, message=message.strip(), notification_type="ANNOUNCEMENT"))
        _audit(db, "announcement_created", "students", len(students))
        db.commit()
        return jsonify({"success": True, "recipients": len(students)}), 201
    finally:
        db.close()

@app.route("/api/me/receipts/<receipt_no>", methods=["GET"])
def get_my_receipt(receipt_no):
    return receipt_response(receipt_no, student_id=session.get("student_id"))

@app.route("/api/admin/students/<int:student_id>/status", methods=["POST"])
def set_student_status(student_id):
    data = request.get_json(silent=True) or {}
    if not isinstance(data.get("is_active"), bool):
        return jsonify({"error": "is_active must be a boolean"}), 400
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404
        student.is_active = data["is_active"]
        _audit(db, "student_activated" if student.is_active else "student_deactivated", "student", student.id)
        db.commit()
        return jsonify({"success": True, "is_active": student.is_active})
    finally:
        db.close()

@app.route("/api/admin/students/<int:student_id>/reset-password", methods=["POST"])
def reset_student_password(student_id):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404
        temporary = secrets.token_urlsafe(15)
        student.password_hash = generate_password_hash(temporary)
        _audit(db, "student_password_reset", "student", student.id)
        db.commit()
        return jsonify({"success": True, "temporary_password": temporary})
    finally:
        db.close()

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "College Fee Credit Management System API",
        "timestamp": datetime.utcnow().isoformat()
    })

# -------------------------------------------------------------
# DASHBOARD SUMMARY & ANALYTICS
# -------------------------------------------------------------
@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    db = SessionLocal()
    try:
        students = db.query(Student).all()
        total_students = len(students)
        
        total_expected_fee = sum(s.net_payable for s in students)
        
        all_installments = db.query(Installment).all()
        total_collected = sum(inst.paid_amount for inst in all_installments)
        
        # Calculate overdue amount and count
        overdue_installments = [inst for inst in all_installments if inst.status == "OVERDUE"]
        total_overdue_amount = sum((inst.amount + inst.late_fee - inst.paid_amount) for inst in overdue_installments)
        
        overdue_student_ids = set(inst.student_id for inst in overdue_installments)
        overdue_students_count = len(overdue_student_ids)

        # Net balance due
        total_late_fees = sum(inst.late_fee for inst in overdue_installments)
        total_balance_due = max(0.0, (total_expected_fee + total_late_fees) - total_collected)
        collection_rate = round((total_collected / (total_expected_fee + total_late_fees) * 100), 1) if total_expected_fee > 0 else 0

        # Plan types distribution
        plan_counts = {}
        for s in students:
            plan_counts[s.plan_type] = plan_counts.get(s.plan_type, 0) + 1
        
        plan_distribution = [
            {"name": "Monthly (10 Inst.)", "plan": "MONTHLY", "count": plan_counts.get("MONTHLY", 0)},
            {"name": "Quarterly (4 Inst.)", "plan": "QUARTERLY", "count": plan_counts.get("QUARTERLY", 0)},
            {"name": "Semester (2 Inst.)", "plan": "SEMESTER", "count": plan_counts.get("SEMESTER", 0)},
            {"name": "One-Time (Full)", "plan": "ONE_TIME", "count": plan_counts.get("ONE_TIME", 0)},
            {"name": "Customized Plan", "plan": "CUSTOM", "count": plan_counts.get("CUSTOM", 0)},
        ]

        # Department wise breakdown
        dept_stats = {}
        for s in students:
            d = s.department
            if d not in dept_stats:
                dept_stats[d] = {"department": d, "total": 0.0, "collected": 0.0, "pending": 0.0, "students": 0}
            dept_stats[d]["students"] += 1
            dept_stats[d]["total"] += s.net_payable
            s_paid = sum(inst.paid_amount for inst in s.installments)
            dept_stats[d]["collected"] += s_paid
            dept_stats[d]["pending"] += max(0.0, s.net_payable - s_paid)

        dept_chart_data = list(dept_stats.values())

        # Payment mode breakdown
        all_payments = db.query(Payment).all()
        mode_counts = {}
        for p in all_payments:
            mode_counts[p.payment_mode] = mode_counts.get(p.payment_mode, 0.0) + p.amount
        
        payment_modes_data = [
            {"mode": k, "amount": round(v, 2)} for k, v in mode_counts.items()
        ]

        paid_students = sum(1 for student in students if student.calculate_summary()["status"] == "COMPLETED")
        partially_paid_students = sum(1 for student in students if any(i.status == "PARTIAL" for i in student.installments))
        pending_students = sum(1 for student in students if student.calculate_summary()["status"] != "COMPLETED")

        # Real monthly receipts and scheduled outstanding installments for the latest six months.
        today = datetime.utcnow().date().replace(day=1)
        trend_data = []
        for offset in range(5, -1, -1):
            month_index = today.month - 1 - offset
            year = today.year + month_index // 12
            month = month_index % 12 + 1
            month_start = datetime(year, month, 1)
            month_end = datetime(year + (month == 12), month % 12 + 1 if month < 12 else 1, 1)
            collected = sum(p.amount for p in all_payments if p.payment_date and month_start <= p.payment_date < month_end)
            projected = 0.0
            for inst in all_installments:
                try:
                    due = datetime.strptime(inst.due_date, "%Y-%m-%d")
                except (TypeError, ValueError):
                    continue
                if month_start <= due < month_end:
                    projected += max(0.0, inst.amount + inst.late_fee - inst.paid_amount)
            trend_data.append({"month": month_start.strftime("%b %Y"), "collected": round(collected, 2), "projected": round(projected, 2)})

        return jsonify({
            "metrics": {
                "total_students": total_students,
                "total_expected_fee": round(total_expected_fee, 2),
                "total_collected": round(total_collected, 2),
                "total_balance_due": round(total_balance_due, 2),
                "total_overdue_amount": round(total_overdue_amount, 2),
                "overdue_students_count": overdue_students_count,
                "collection_rate": collection_rate,
                "paid_students": paid_students,
                "partially_paid_students": partially_paid_students,
                "pending_students": pending_students
            },
            "plan_distribution": plan_distribution,
            "department_breakdown": dept_chart_data,
            "payment_modes": payment_modes_data,
            "collection_trend": trend_data
        })
    finally:
        db.close()

# -------------------------------------------------------------
# STUDENTS API
# -------------------------------------------------------------
@app.route("/api/students", methods=["GET"])
def get_students():
    db = SessionLocal()
    try:
        department = request.args.get("department")
        plan_type = request.args.get("plan_type")
        status_filter = request.args.get("status")
        search = request.args.get("search", "").strip().lower()

        query = db.query(Student)

        if department and department != "ALL":
            query = query.filter(Student.department == department)
        if plan_type and plan_type != "ALL":
            query = query.filter(Student.plan_type == plan_type)

        students = query.all()

        results = []
        for s in students:
            data = s.to_dict(include_details=False)
            # Filter by search string
            if search:
                name_match = search in s.name.lower()
                roll_match = search in s.roll_no.lower()
                email_match = search in s.email.lower()
                dept_match = search in s.department.lower()
                if not (name_match or roll_match or email_match or dept_match):
                    continue
            
            # Status filter based on calculated summary
            if status_filter and status_filter != "ALL":
                if data["summary"]["status"] != status_filter:
                    continue

            results.append(data)

        return jsonify(results)
    finally:
        db.close()


@app.route("/api/students/<int:student_id>", methods=["GET"])
def get_student_detail(student_id):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404
        return jsonify(student.to_dict(include_details=True))
    finally:
        db.close()


def _no_dues_eligibility(db, student):
    installments = list(student.installments)
    remaining = sum(max(0.0, inst.amount + inst.late_fee - inst.paid_amount) for inst in installments)
    recorded_payments = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.student_id == student.id
    ).scalar() or 0.0
    has_fee_schedule = bool(installments) or student.net_payable <= 0.01
    eligible = has_fee_schedule and remaining <= 0.01 and recorded_payments + 0.01 >= student.net_payable
    if eligible:
        reason = "All applicable fees are recorded as paid."
    elif not has_fee_schedule:
        reason = "No installment schedule is recorded for this student."
    elif remaining > 0.01:
        reason = "One or more installments still have an outstanding balance."
    else:
        reason = "Recorded payment receipts do not cover the student's net payable fee."
    return {"eligible": eligible, "outstanding_amount": round(remaining, 2), "reason": reason}


def _valid_iso_date(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = date.fromisoformat(value)
        return parsed if parsed.isoformat() == value else None
    except ValueError:
        return None


@app.route("/api/me/fee-extension-requests", methods=["GET", "POST"])
def my_fee_extension_requests():
    student_id = session.get("student_id")
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id, Student.is_active.is_(True)).first()
        if not student:
            return jsonify({"error": "Student account is unavailable"}), 401
        if request.method == "GET":
            rows = db.query(FeeExtensionRequest).filter(
                FeeExtensionRequest.student_id == student.id
            ).order_by(desc(FeeExtensionRequest.requested_at)).all()
            return jsonify([row.to_dict() for row in rows])

        data = request.get_json(silent=True) or {}
        installment_id = data.get("installment_id")
        requested_date = _valid_iso_date(data.get("requested_due_date"))
        reason = data.get("reason", "")
        if not isinstance(reason, str) or not 10 <= len(reason.strip()) <= 1000:
            return jsonify({"error": "Please enter a reason between 10 and 1000 characters"}), 400
        if not requested_date or requested_date <= date.today():
            return jsonify({"error": "Requested extension date must be a valid future date"}), 400
        installment = db.query(Installment).filter(
            Installment.id == installment_id,
            Installment.student_id == student.id,
        ).first()
        if not installment:
            return jsonify({"error": "Installment not found for this student"}), 404
        balance = max(0.0, installment.amount + installment.late_fee - installment.paid_amount)
        if balance <= 0.01 or installment.status == "PAID":
            return jsonify({"error": "Fee extensions can only be requested for an unpaid installment"}), 400
        current_due_date = _valid_iso_date(installment.due_date)
        if current_due_date and requested_date <= current_due_date:
            return jsonify({"error": "Requested date must be later than the installment's current due date"}), 400
        pending = db.query(FeeExtensionRequest.id).filter(
            FeeExtensionRequest.student_id == student.id,
            FeeExtensionRequest.installment_id == installment.id,
            FeeExtensionRequest.status == "PENDING",
        ).first()
        if pending:
            return jsonify({"error": "A pending extension request already exists for this installment"}), 409

        extension = FeeExtensionRequest(
            student_id=student.id,
            installment_id=installment.id,
            requested_amount=balance,
            original_due_date=installment.due_date,
            requested_due_date=requested_date.isoformat(),
            reason=reason.strip(),
        )
        db.add(extension)
        db.add(Notification(student_id=student.id, message=f"Your fee extension request for {installment.title} was submitted for review.", notification_type="REQUEST"))
        db.commit()
        return jsonify(extension.to_dict()), 201
    except Exception:
        db.rollback()
        logger.exception("Fee extension request failed")
        return jsonify({"error": "Unable to process fee extension request"}), 500
    finally:
        db.close()


@app.route("/api/admin/fee-extension-requests", methods=["GET"])
def admin_fee_extension_requests():
    db = SessionLocal()
    try:
        status_filter = request.args.get("status", "ALL").upper()
        query = db.query(FeeExtensionRequest)
        if status_filter in {"PENDING", "APPROVED", "REJECTED"}:
            query = query.filter(FeeExtensionRequest.status == status_filter)
        rows = query.order_by(desc(FeeExtensionRequest.requested_at)).all()
        return jsonify([row.to_dict(include_student=True) for row in rows])
    finally:
        db.close()


@app.route("/api/admin/fee-extension-requests/<int:request_id>/decision", methods=["POST"])
def decide_fee_extension_request(request_id):
    data = request.get_json(silent=True) or {}
    decision = str(data.get("decision", "")).upper()
    remarks = data.get("admin_remarks", "")
    if decision not in {"APPROVED", "REJECTED"}:
        return jsonify({"error": "Decision must be Approved or Rejected"}), 400
    if not isinstance(remarks, str) or len(remarks) > 2000:
        return jsonify({"error": "Admin remarks must be 2000 characters or fewer"}), 400
    db = SessionLocal()
    try:
        extension = db.query(FeeExtensionRequest).filter(FeeExtensionRequest.id == request_id).first()
        if not extension:
            return jsonify({"error": "Extension request not found"}), 404
        if extension.status != "PENDING":
            return jsonify({"error": "This request has already been reviewed"}), 409
        installment = db.query(Installment).filter(Installment.id == extension.installment_id).first()
        student = db.query(Student).filter(Student.id == extension.student_id).first()
        if not installment or not student:
            return jsonify({"error": "The linked student or installment no longer exists"}), 409
        if decision == "APPROVED":
            requested_date = _valid_iso_date(extension.requested_due_date)
            balance = max(0.0, installment.amount + installment.late_fee - installment.paid_amount)
            if balance <= 0.01 or installment.status == "PAID":
                return jsonify({"error": "This installment has been paid; the extension cannot be approved"}), 409
            if not requested_date or requested_date <= date.today():
                return jsonify({"error": "The requested due date has passed and can no longer be approved"}), 409
            current_due_date = _valid_iso_date(installment.due_date)
            if current_due_date and requested_date <= current_due_date:
                return jsonify({"error": "The requested date is no longer later than the current installment due date"}), 409
            installment.due_date = requested_date.isoformat()
            if installment.status == "OVERDUE":
                installment.status = "PENDING"
        extension.status = decision
        extension.admin_remarks = remarks.strip() or None
        extension.reviewed_at = datetime.utcnow()
        extension.reviewed_by = session.get("user_id")
        verb = "approved" if decision == "APPROVED" else "rejected"
        db.add(Notification(student_id=student.id, message=f"Your fee extension request for {installment.title} was {verb}." + (f" Admin note: {extension.admin_remarks}" if extension.admin_remarks else ""), notification_type="REQUEST"))
        _audit(db, f"fee_extension_{decision.lower()}", "fee_extension_request", extension.id)
        db.commit()
        return jsonify({"request": extension.to_dict(include_student=True), "installment": installment.to_dict()})
    except Exception:
        db.rollback()
        logger.exception("Fee extension review failed")
        return jsonify({"error": "Unable to review fee extension request"}), 500
    finally:
        db.close()


@app.route("/api/me/no-dues-requests", methods=["GET", "POST"])
def my_no_dues_requests():
    student_id = session.get("student_id")
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id, Student.is_active.is_(True)).first()
        if not student:
            return jsonify({"error": "Student account is unavailable"}), 401
        eligibility = _no_dues_eligibility(db, student)
        if request.method == "GET":
            rows = db.query(NoDuesCertificateRequest).filter(
                NoDuesCertificateRequest.student_id == student.id
            ).order_by(desc(NoDuesCertificateRequest.requested_at)).all()
            return jsonify({"eligibility": eligibility, "requests": [row.to_dict() for row in rows]})
        if not eligibility["eligible"]:
            return jsonify({"error": eligibility["reason"], "eligibility": eligibility}), 409
        active = db.query(NoDuesCertificateRequest.id).filter(
            NoDuesCertificateRequest.student_id == student.id,
            NoDuesCertificateRequest.status.in_(["PENDING", "APPROVED"]),
        ).first()
        if active:
            return jsonify({"error": "A pending or approved no-dues request already exists"}), 409
        cert_request = NoDuesCertificateRequest(student_id=student.id)
        db.add(cert_request)
        db.add(Notification(student_id=student.id, message="Your no-dues certificate request was submitted for accounts verification.", notification_type="REQUEST"))
        db.commit()
        return jsonify(cert_request.to_dict()), 201
    except Exception:
        db.rollback()
        logger.exception("No-dues request failed")
        return jsonify({"error": "Unable to process no-dues certificate request"}), 500
    finally:
        db.close()


@app.route("/api/admin/no-dues-requests", methods=["GET"])
def admin_no_dues_requests():
    db = SessionLocal()
    try:
        status_filter = request.args.get("status", "ALL").upper()
        query = db.query(NoDuesCertificateRequest)
        if status_filter in {"PENDING", "APPROVED", "REJECTED"}:
            query = query.filter(NoDuesCertificateRequest.status == status_filter)
        rows = query.order_by(desc(NoDuesCertificateRequest.requested_at)).all()
        results = []
        for row in rows:
            data = row.to_dict(include_student=True)
            data["eligibility"] = _no_dues_eligibility(db, row.student)
            results.append(data)
        return jsonify(results)
    finally:
        db.close()


@app.route("/api/admin/no-dues-requests/<int:request_id>/decision", methods=["POST"])
def decide_no_dues_request(request_id):
    data = request.get_json(silent=True) or {}
    decision = str(data.get("decision", "")).upper()
    remarks = data.get("admin_remarks", "")
    if decision not in {"APPROVED", "REJECTED"}:
        return jsonify({"error": "Decision must be Approved or Rejected"}), 400
    if not isinstance(remarks, str) or len(remarks) > 2000:
        return jsonify({"error": "Admin remarks must be 2000 characters or fewer"}), 400
    db = SessionLocal()
    try:
        cert_request = db.query(NoDuesCertificateRequest).filter(NoDuesCertificateRequest.id == request_id).first()
        if not cert_request:
            return jsonify({"error": "No-dues request not found"}), 404
        if cert_request.status != "PENDING":
            return jsonify({"error": "This request has already been reviewed"}), 409
        student = db.query(Student).filter(Student.id == cert_request.student_id).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404
        if decision == "APPROVED":
            eligibility = _no_dues_eligibility(db, student)
            if not eligibility["eligible"]:
                return jsonify({"error": eligibility["reason"], "eligibility": eligibility}), 409
            cert_request.certificate_id = f"NDC-{datetime.utcnow():%Y}-{secrets.token_hex(5).upper()}"
            cert_request.issued_at = datetime.utcnow()
        cert_request.status = decision
        cert_request.admin_remarks = remarks.strip() or None
        cert_request.reviewed_at = datetime.utcnow()
        cert_request.reviewed_by = session.get("user_id")
        verb = "approved" if decision == "APPROVED" else "rejected"
        db.add(Notification(student_id=student.id, message=f"Your no-dues certificate request was {verb}." + (f" Admin note: {cert_request.admin_remarks}" if cert_request.admin_remarks else ""), notification_type="REQUEST"))
        _audit(db, f"no_dues_{decision.lower()}", "no_dues_request", cert_request.id)
        db.commit()
        return jsonify({"request": cert_request.to_dict(include_student=True), "eligibility": _no_dues_eligibility(db, student)})
    except Exception:
        db.rollback()
        logger.exception("No-dues review failed")
        return jsonify({"error": "Unable to review no-dues request"}), 500
    finally:
        db.close()


@app.route("/api/me/no-dues-requests/<int:request_id>/certificate", methods=["GET"])
def download_no_dues_certificate(request_id):
    db = SessionLocal()
    try:
        cert_request = db.query(NoDuesCertificateRequest).filter(
            NoDuesCertificateRequest.id == request_id,
            NoDuesCertificateRequest.student_id == session.get("student_id"),
            NoDuesCertificateRequest.status == "APPROVED",
        ).first()
        if not cert_request:
            return jsonify({"error": "Approved certificate not found"}), 404
        student = db.query(Student).filter(Student.id == session.get("student_id")).first()
        eligibility = _no_dues_eligibility(db, student)
        if not eligibility["eligible"]:
            return jsonify({"error": "The fee ledger no longer confirms full clearance; contact accounts."}), 409

        buffer = BytesIO()
        pdf = pdf_canvas.Canvas(buffer, pagesize=A4)
        page_width, page_height = A4
        pdf.setStrokeColorRGB(0.09, 0.20, 0.38)
        pdf.setLineWidth(2)
        pdf.roundRect(36, 36, page_width - 72, page_height - 72, 12, stroke=1, fill=0)
        logo_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "assets", "hero.png")
        if os.path.isfile(logo_path):
            pdf.drawImage(ImageReader(logo_path), 62, page_height - 130, width=48, height=72, preserveAspectRatio=True, mask="auto", anchor="c")
        pdf.setFillColorRGB(0.06, 0.14, 0.27)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawCentredString(page_width / 2, page_height - 82, "APEX INSTITUTE OF ENGINEERING & TECHNOLOGY")
        pdf.setFont("Helvetica", 10)
        pdf.drawCentredString(page_width / 2, page_height - 102, "Accounts Office | Fee Clearance")
        pdf.setStrokeColorRGB(0.09, 0.20, 0.38)
        pdf.line(62, page_height - 148, page_width - 62, page_height - 148)
        pdf.setFont("Helvetica-Bold", 20)
        pdf.drawCentredString(page_width / 2, page_height - 202, "NO-DUES CERTIFICATE")
        pdf.setFont("Helvetica", 11)
        pdf.drawString(70, page_height - 248, f"Certificate ID: {cert_request.certificate_id}")
        issue_date = cert_request.issued_at.strftime("%d %B %Y") if cert_request.issued_at else date.today().strftime("%d %B %Y")
        pdf.drawRightString(page_width - 70, page_height - 248, f"Issue date: {issue_date}")
        paragraph = (
            f"This is to certify that {student.name} (Roll Number: {student.roll_no}), "
            f"Department of {student.department}, {student.course}, Academic Year "
            f"{student.admission_year}-{student.admission_year + 1}, has cleared all applicable "
            "college fees recorded in the institution's fee ledger as of the issue date."
        )
        y = page_height - 310
        pdf.setFont("Helvetica", 12)
        for line in textwrap.wrap(paragraph, width=78):
            pdf.drawString(70, y, line)
            y -= 22
        pdf.setFont("Helvetica-Oblique", 10)
        pdf.drawString(70, y - 24, "This certificate is issued after verification of the recorded fee ledger.")
        pdf.line(page_width - 240, 132, page_width - 70, 132)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawRightString(page_width - 70, 112, "Authorized Signatory")
        pdf.setFont("Helvetica", 10)
        pdf.drawRightString(page_width - 70, 96, "Accounts Office")
        pdf.save()
        buffer.seek(0)
        return send_file(buffer, mimetype="application/pdf", as_attachment=True,
                         download_name=f"No-Dues-{cert_request.certificate_id}.pdf")
    finally:
        db.close()


@app.route("/api/overdue/students", methods=["GET"])
def get_overdue_students():
    """Return only overdue installment details needed by the defaulters view."""
    db = SessionLocal()
    try:
        students = db.query(Student).all()
        results = []
        for student in students:
            overdue_installments = [
                installment.to_dict()
                for installment in student.installments
                if installment.status == "OVERDUE"
            ]
            if overdue_installments:
                data = student.to_dict(include_details=False)
                data["installments"] = overdue_installments
                results.append(data)
        return jsonify(results)
    finally:
        db.close()


def generate_installments_for_plan(student_id, plan_type, net_amount, start_date=None):
    """Helper to generate installment breakdown based on plan type"""
    if start_date is None:
        start_date = datetime.now()

    installments = []
    if plan_type == "ONE_TIME":
        installments.append(Installment(
            student_id=student_id,
            installment_no=1,
            title="Full Annual Tuition & College Fee",
            due_date=start_date.strftime("%Y-%m-%d"),
            amount=net_amount,
            status="PENDING"
        ))
    elif plan_type == "SEMESTER":
        half = round(net_amount / 2, 2)
        installments.append(Installment(
            student_id=student_id,
            installment_no=1,
            title="Semester 1 Fee Installment",
            due_date=start_date.strftime("%Y-%m-%d"),
            amount=half,
            status="PENDING"
        ))
        sem2_due = (start_date + timedelta(days=120)).strftime("%Y-%m-%d")
        installments.append(Installment(
            student_id=student_id,
            installment_no=2,
            title="Semester 2 Fee Installment",
            due_date=sem2_due,
            amount=round(net_amount - half, 2),
            status="PENDING"
        ))
    elif plan_type == "QUARTERLY":
        quarter = round(net_amount / 4, 2)
        titles = ["Quarter 1 (Term Start)", "Quarter 2 (Mid Term)", "Quarter 3 (Winter Term)", "Quarter 4 (Final Clearance)"]
        for i in range(4):
            due = (start_date + timedelta(days=i * 75)).strftime("%Y-%m-%d")
            amt = quarter if i < 3 else round(net_amount - (quarter * 3), 2)
            installments.append(Installment(
                student_id=student_id,
                installment_no=i + 1,
                title=titles[i],
                due_date=due,
                amount=amt,
                status="PENDING"
            ))
    elif plan_type == "MONTHLY":
        monthly = round(net_amount / 10, 2)
        month_names = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"]
        for i in range(10):
            due = (start_date + timedelta(days=i * 30)).strftime("%Y-%m-%d")
            amt = monthly if i < 9 else round(net_amount - (monthly * 9), 2)
            installments.append(Installment(
                student_id=student_id,
                installment_no=i + 1,
                title=f"Month {i+1} ({month_names[i]}) Installment",
                due_date=due,
                amount=amt,
                status="PENDING"
            ))
    return installments


@app.route("/api/students", methods=["POST"])
def create_student():
    data = request.json or {}
    db = SessionLocal()
    try:
        roll_value = data.get("roll_no", "")
        name = data.get("name", "Student Name")
        if not isinstance(roll_value, str) or not isinstance(name, str) or not name.strip():
            return jsonify({"error": "A valid roll number and student name are required"}), 400
        roll_no = roll_value.strip().upper()
        if not roll_no or len(roll_no) > 50 or len(name.strip()) > 120:
            return jsonify({"error": "Roll number or student name is invalid"}), 400

        existing = db.query(Student).filter(Student.roll_no == roll_no).first()
        admin_name_conflict = db.query(AdminUser).filter(func.lower(AdminUser.username) == roll_no.casefold()).first()
        if existing or admin_name_conflict:
            return jsonify({"error": f"Student with Roll No '{roll_no}' already exists"}), 400

        total_fee = float(data.get("total_fee", 100000.0))
        scholarship_discount = float(data.get("scholarship_discount", 0.0))
        fee_concession = float(data.get("fee_concession", 0.0))
        if not all(map(math.isfinite, (total_fee, scholarship_discount, fee_concession))) or total_fee <= 0 or scholarship_discount < 0 or fee_concession < 0 or scholarship_discount + fee_concession > total_fee:
            return jsonify({"error": "Fee, scholarship and concession amounts are invalid"}), 400
        plan_type = data.get("plan_type", "SEMESTER")
        if plan_type not in {"ONE_TIME", "SEMESTER", "QUARTERLY", "MONTHLY", "CUSTOM"}:
            return jsonify({"error": "Unsupported installment plan"}), 400
        net_payable = max(0.0, total_fee - scholarship_discount - fee_concession)

        initial_password = secrets.token_urlsafe(15)
        student = Student(
            roll_no=roll_no,
            password_hash=generate_password_hash(initial_password),
            is_active=True,
            name=name.strip(),
            email=data.get("email", ""),
            phone=data.get("phone", ""),
            department=data.get("department", "Computer Science & Engg"),
            course=data.get("course", "B.Tech"),
            year_semester=data.get("year_semester", "1st Year / Sem 1"),
            quota=data.get("quota", "Merit"),
            admission_year=int(data.get("admission_year", 2024)),
            total_fee=total_fee,
            scholarship_discount=scholarship_discount,
            fee_concession=fee_concession,
            net_payable=net_payable,
            plan_type=plan_type,
            created_at=datetime.utcnow()
        )
        db.add(student)
        db.flush()

        # Fee Components
        components = data.get("components", [])
        if not isinstance(components, list) or len(components) > 30:
            return jsonify({"error": "Fee components must be a list of at most 30 entries"}), 400
        if not components:
            # Default fee components breakdown
            components = [
                {"category": "Tuition Fee", "amount": round(total_fee * 0.70, 2)},
                {"category": "Lab & Computing Facility", "amount": round(total_fee * 0.15, 2)},
                {"category": "Library & Digital Resources", "amount": round(total_fee * 0.05, 2)},
                {"category": "Examination & Registration", "amount": round(total_fee * 0.05, 2)},
                {"category": "Campus Development Fund", "amount": round(total_fee * 0.05, 2)},
            ]

        for c in components:
            if not isinstance(c, dict) or not isinstance(c.get("category", "Fee Component"), str):
                return jsonify({"error": "Each fee component needs a category and amount"}), 400
            try:
                component_amount = float(c.get("amount", 0.0))
            except (TypeError, ValueError):
                return jsonify({"error": "Fee component amount must be numeric"}), 400
            if not math.isfinite(component_amount) or component_amount < 0 or len(c.get("category", "Fee Component")) > 100:
                return jsonify({"error": "Fee component category or amount is invalid"}), 400
            fc = FeeComponent(
                student_id=student.id,
                category=c.get("category", "Fee Component"),
                amount=component_amount
            )
            db.add(fc)

        # Installments
        custom_installments = data.get("custom_installments", [])
        if plan_type == "CUSTOM":
            if not isinstance(custom_installments, list) or not custom_installments or len(custom_installments) > 24:
                return jsonify({"error": "A custom plan requires 1 to 24 installments"}), 400
            try:
                custom_total = sum(float(item.get("amount", 0)) for item in custom_installments if isinstance(item, dict))
            except (TypeError, ValueError):
                return jsonify({"error": "Custom installment amounts must be numeric"}), 400
            if len(custom_installments) != sum(1 for item in custom_installments if isinstance(item, dict)) or not math.isfinite(custom_total) or abs(custom_total - net_payable) > 0.01:
                return jsonify({"error": "Custom installment total must equal the net payable amount"}), 400
            for idx, item in enumerate(custom_installments):
                try:
                    datetime.strptime(item.get("due_date", ""), "%Y-%m-%d")
                except (TypeError, ValueError):
                    return jsonify({"error": "Installment due dates must use YYYY-MM-DD"}), 400
                if float(item.get("amount", 0)) <= 0 or len(str(item.get("title", "Installment"))) > 100:
                    return jsonify({"error": "Custom installment title or amount is invalid"}), 400
                inst = Installment(
                    student_id=student.id,
                    installment_no=idx + 1,
                    title=item.get("title", f"Installment #{idx+1}"),
                    due_date=item.get("due_date", datetime.now().strftime("%Y-%m-%d")),
                    amount=float(item.get("amount", 0.0)),
                    status="PENDING"
                )
                db.add(inst)
        else:
            generated = generate_installments_for_plan(student.id, plan_type, net_payable)
            for g in generated:
                db.add(g)

        _audit(db, "student_created", "student", student.id)
        db.commit()
        # Return this temporary credential once so the administrator can deliver it securely.
        return jsonify({**student.to_dict(include_details=True), "initial_password": initial_password}), 201
    except Exception:
        db.rollback()
        logger.exception("Student creation failed")
        return jsonify({"error": "Unable to create student account"}), 500
    finally:
        db.close()


@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    data = request.json or {}
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404

        for field in ["name", "email", "phone", "department", "course", "year_semester", "quota"]:
            if field in data:
                if not isinstance(data[field], str) or len(data[field]) > 120:
                    return jsonify({"error": f"Invalid value for {field}"}), 400
                setattr(student, field, data[field])

        fee_fields = {"total_fee", "scholarship_discount", "fee_concession"} & data.keys()
        if fee_fields:
            if any(payment.amount > 0 for payment in student.payments):
                return jsonify({"error": "Fee structure cannot be edited after payments exist; preserve the ledger and contact finance administration"}), 409
            try:
                total = float(data.get("total_fee", student.total_fee))
                scholarship = float(data.get("scholarship_discount", student.scholarship_discount or 0))
                concession = float(data.get("fee_concession", student.fee_concession or 0))
            except (TypeError, ValueError):
                return jsonify({"error": "Fee amounts must be valid numbers"}), 400
            if not all(map(math.isfinite, (total, scholarship, concession))) or total <= 0 or scholarship < 0 or concession < 0 or scholarship + concession > total:
                return jsonify({"error": "Fee, scholarship and concession amounts are invalid"}), 400
            if student.plan_type == "CUSTOM":
                return jsonify({"error": "Custom plan edits require a new custom schedule"}), 400
            student.total_fee = total
            student.scholarship_discount = scholarship
            student.fee_concession = concession
            student.net_payable = total - scholarship - concession
            for installment in list(student.installments):
                db.delete(installment)
            db.flush()
            for installment in generate_installments_for_plan(student.id, student.plan_type, student.net_payable):
                db.add(installment)

        _audit(db, "student_updated", "student", student.id)
        db.commit()
        return jsonify(student.to_dict(include_details=True))
    except Exception:
        db.rollback()
        logger.exception("Student update failed")
        return jsonify({"error": "Unable to update student account"}), 500
    finally:
        db.close()


@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404

        student.is_active = False
        _audit(db, "student_deactivated", "student", student.id)
        db.commit()
        return jsonify({"message": f"Student {student.name} deactivated; ledger records were preserved"})
    finally:
        db.close()


@app.route("/api/students/<int:student_id>/change-plan", methods=["POST"])
def change_installment_plan(student_id):
    data = request.json or {}
    new_plan_type = data.get("plan_type")
    custom_installments = data.get("custom_installments", [])
    
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404

        if new_plan_type not in {"ONE_TIME", "SEMESTER", "QUARTERLY", "MONTHLY", "CUSTOM"}:
            return jsonify({"error": "Unsupported installment plan"}), 400

        # Calculate what has already been paid
        total_paid = sum(inst.paid_amount for inst in student.installments)
        remaining_due = max(0.0, student.net_payable - total_paid)
        if new_plan_type == "CUSTOM" and remaining_due > 0:
            if not isinstance(custom_installments, list) or not custom_installments or len(custom_installments) > 24:
                return jsonify({"error": "A custom plan requires 1 to 24 installments"}), 400
            try:
                custom_total = sum(float(item["amount"]) for item in custom_installments if isinstance(item, dict) and "amount" in item)
            except (TypeError, ValueError):
                return jsonify({"error": "Custom installment amounts must be numeric"}), 400
            if len(custom_installments) != sum(1 for item in custom_installments if isinstance(item, dict) and "amount" in item) or not math.isfinite(custom_total) or abs(custom_total - remaining_due) > 0.01:
                return jsonify({"error": "Custom installment total must equal the remaining balance"}), 400

        # Clear existing un-paid installments
        for inst in list(student.installments):
            if inst.paid_amount == 0 and inst.status != "PAID":
                db.delete(inst)
            elif inst.status == "PARTIAL":
                # Keep what was paid, adjust remaining
                inst.amount = inst.paid_amount
                inst.status = "PAID"

        student.plan_type = new_plan_type
        db.flush()

        # If there is remaining balance, generate new installments for the remaining amount
        if remaining_due > 0:
            if new_plan_type == "CUSTOM" and custom_installments:
                for idx, item in enumerate(custom_installments):
                    try:
                        datetime.strptime(item.get("due_date", ""), "%Y-%m-%d")
                    except (TypeError, ValueError):
                        return jsonify({"error": "Installment due dates must use YYYY-MM-DD"}), 400
                    if float(item["amount"]) <= 0 or len(str(item.get("title", "Installment"))) > 100:
                        return jsonify({"error": "Custom installment title or amount is invalid"}), 400
                    inst = Installment(
                        student_id=student.id,
                        installment_no=idx + 10, # distinguish from prior
                        title=item.get("title", f"Custom Schedule #{idx+1}"),
                        due_date=item.get("due_date", datetime.now().strftime("%Y-%m-%d")),
                        amount=float(item.get("amount", 0.0)),
                        status="PENDING"
                    )
                    db.add(inst)
            else:
                generated = generate_installments_for_plan(student.id, new_plan_type, remaining_due)
                # re-number sequentially
                existing_count = len(student.installments)
                for idx, g in enumerate(generated):
                    g.installment_no = existing_count + idx + 1
                    db.add(g)

        _audit(db, "installment_plan_changed", "student", student.id)
        db.commit()
        return jsonify(student.to_dict(include_details=True))
    except Exception:
        db.rollback()
        logger.exception("Installment plan update failed")
        return jsonify({"error": "Unable to change installment plan"}), 500
    finally:
        db.close()

# -------------------------------------------------------------
# PAYMENTS API
# -------------------------------------------------------------
@app.route("/api/payments", methods=["GET"])
def get_payments():
    db = SessionLocal()
    try:
        student_id = request.args.get("student_id")
        query = db.query(Payment).order_by(desc(Payment.payment_date))

        if student_id:
            query = query.filter(Payment.student_id == int(student_id))

        payments = query.all()
        return jsonify([p.to_dict() for p in payments])
    finally:
        db.close()


@app.route("/api/payments", methods=["POST"])
def record_payment():
    data = request.json or {}
    db = SessionLocal()
    try:
        student_id = data.get("student_id")
        try:
            amount = float(data.get("amount", 0.0))
        except (TypeError, ValueError):
            return jsonify({"error": "Payment amount must be a valid number"}), 400
        if not math.isfinite(amount):
            return jsonify({"error": "Payment amount must be finite"}), 400
        installment_id = data.get("installment_id")
        payment_mode = data.get("payment_mode", "UPI")
        if session.get("role") == "STUDENT":
            # Never trust a client-supplied gateway_verified flag. No signed payment gateway is configured.
            return jsonify({"error": "Online payments are unavailable until a payment gateway is configured and verified server-side"}), 503
        transaction_ref = (data.get("transaction_ref") or "").strip()
        if payment_mode == "UPI" and not transaction_ref:
            return jsonify({"error": "UPI payments require the actual UTR"}), 400
        if not transaction_ref:
            transaction_ref = f"TXN-{random.randint(100000000, 999999999)}"
        remarks = data.get("remarks", "")
        collected_by = data.get("collected_by", "Accounts Desk (Admin)")

        if not student_id or amount <= 0:
            return jsonify({"error": "Valid student ID and payment amount > 0 are required"}), 400

        if session.get("role") == "STUDENT" and int(student_id) != session.get("student_id"):
            return jsonify({"error": "You can only pay your own fees"}), 403
        student = db.query(Student).filter(Student.id == student_id, Student.is_active.is_(True)).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404
        if transaction_ref and db.query(Payment).filter(Payment.transaction_ref == transaction_ref).first():
            return jsonify({"error": "Transaction reference has already been recorded"}), 409
        if amount <= 0 or amount > student.calculate_summary()["balance_due"] + 0.001:
            return jsonify({"error": "Payment exceeds the outstanding balance"}), 400
        if installment_id:
            target_check = db.query(Installment).filter(Installment.id == installment_id, Installment.student_id == student.id).first()
            if not target_check:
                return jsonify({"error": "Installment does not belong to this student"}), 400
        # Generate unique receipt number
        date_str = datetime.now().strftime("%Y%m")
        count = db.query(Payment).count() + 1001
        receipt_no = f"REC-{date_str}-{count}"

        # Allocate payment to installment(s)
        allocations_made = []
        remaining_payment = amount

        if installment_id:
            target_inst = db.query(Installment).filter(Installment.id == installment_id).first()
            if target_inst:
                inst_balance = (target_inst.amount + target_inst.late_fee) - target_inst.paid_amount
                pay_for_this = min(remaining_payment, inst_balance)
                target_inst.paid_amount += pay_for_this
                if target_inst.paid_amount >= (target_inst.amount + target_inst.late_fee):
                    target_inst.status = "PAID"
                    target_inst.paid_date = datetime.now().strftime("%Y-%m-%d")
                else:
                    target_inst.status = "PARTIAL"
                remaining_payment -= pay_for_this
                allocations_made.append((target_inst, pay_for_this))

        # If direct payment or excess amount remains, auto-allocate to oldest unpaid installments
        if remaining_payment > 0:
            unpaid_installments = [
                i for i in student.installments 
                if i.status in ["OVERDUE", "PENDING", "PARTIAL"] and i.paid_amount < (i.amount + i.late_fee)
            ]
            for inst in unpaid_installments:
                if remaining_payment <= 0:
                    break
                inst_balance = (inst.amount + inst.late_fee) - inst.paid_amount
                pay_for_this = min(remaining_payment, inst_balance)
                inst.paid_amount += pay_for_this
                if inst.paid_amount >= (inst.amount + inst.late_fee):
                    inst.status = "PAID"
                    inst.paid_date = datetime.now().strftime("%Y-%m-%d")
                else:
                    inst.status = "PARTIAL"
                remaining_payment -= pay_for_this
                allocations_made.append((inst, pay_for_this))

        payment = Payment(
            receipt_no=receipt_no,
            student_id=student.id,
            installment_id=installment_id if installment_id else (allocations_made[0][0].id if allocations_made else None),
            amount=amount,
            payment_mode=payment_mode,
            transaction_ref=transaction_ref,
            payment_date=datetime.utcnow(),
            collected_by=collected_by,
            remarks=remarks
        )
        db.add(payment)
        db.add(Notification(student_id=student.id, message=f"Payment of Rs {amount:,.2f} recorded. Receipt: {receipt_no}.", notification_type="PAYMENT"))
        _audit(db, "payment_recorded", "payment", receipt_no)
        db.commit()

        sms_result = _send_payment_confirmation_sms(
            student,
            amount,
            sum(max(0.0, item.amount + item.late_fee - item.paid_amount) for item in student.installments),
            receipt_no,
        )
        try:
            db.add(ReminderLog(
                student_id=student.id,
                installment_id=payment.installment_id,
                reminder_type="SMS",
                sent_to=sms_result["to"] or "Unavailable",
                subject="Payment received and remaining fee balance",
                message=sms_result["body"],
                status=sms_result["status"].upper(),
                sent_at=datetime.utcnow(),
            ))
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Payment SMS delivery audit could not be saved")

        return jsonify({
            "success": True,
            "payment": payment.to_dict(),
            "student": student.to_dict(include_details=True),
            "sms": sms_result,
        }), 201
    except Exception:
        db.rollback()
        logger.exception("Payment recording failed")
        return jsonify({"error": "Unable to record payment"}), 500
    finally:
        db.close()


@app.route("/api/payments/receipt/<receipt_no>", methods=["GET"])
def get_receipt(receipt_no):
    return receipt_response(receipt_no)

def receipt_response(receipt_no, student_id=None):
    db = SessionLocal()
    try:
        payment = db.query(Payment).filter(Payment.receipt_no == receipt_no).first()
        if not payment or (student_id is not None and payment.student_id != student_id):
            return jsonify({"error": "Receipt not found"}), 404

        student = payment.student
        prior_paid = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
            Payment.student_id == student.id,
            Payment.id != payment.id,
            Payment.payment_date <= payment.payment_date,
            Payment.id < payment.id,
        ).scalar() or 0.0
        previous_balance = max(0.0, student.net_payable - float(prior_paid))
        return jsonify({
            "receipt": payment.to_dict(),
            "total_fee": student.total_fee,
            "previous_balance": round(previous_balance, 2),
            "remaining_balance": round(max(0.0, previous_balance - payment.amount), 2),
            "academic_year": f"{student.admission_year}-{student.admission_year + 1}",
            "student": {
                "roll_no": student.roll_no,
                "name": student.name,
                "course": student.course,
                "department": student.department,
                "year_semester": student.year_semester,
                "email": student.email,
                "phone": student.phone
            },
            "college_info": {
                "name": "Apex Institute of Engineering & Technology",
                "tagline": "Affiliated to State Technical University | NAAC 'A+' Accredited",
                "address": "Knowledge City, Institutional Area, Sector 12",
                "phone": "+91 11 2899 4500",
                "email": "accounts@apextech.edu.in",
                "tax_id": "PAN: AAACA1234B"
            }
        })
    finally:
        db.close()

# -------------------------------------------------------------
# REMINDERS & OVERDUE MANAGEMENT
# -------------------------------------------------------------
@app.route("/api/reminders/send", methods=["POST"])
def send_reminder():
    data = request.json or {}
    db = SessionLocal()
    try:
        student_id = data.get("student_id")
        installment_id = data.get("installment_id")
        reminder_type = data.get("reminder_type", "Email")
        if reminder_type not in {"Email", "SMS", "WhatsApp"}:
            return jsonify({"error": "Unsupported reminder type"}), 400
        custom_message = data.get("message")

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return jsonify({"error": "Student not found"}), 404

        target_inst = None
        if installment_id:
            target_inst = db.query(Installment).filter(Installment.id == installment_id).first()

        sent_to = student.email if reminder_type == "Email" else student.phone
        subject = f"Official Fee Reminder: Pending College Installment ({student.roll_no})"
        
        if not custom_message:
            due_text = f"Rs {target_inst.balance}" if target_inst else f"Rs {student.calculate_summary()['balance_due']}"
            custom_message = f"Dear {student.name}, this is a gentle reminder that your college fee balance of {due_text} is due for payment. Kindly settle via the student portal or accounts counter to ensure uninterrupted library and examination clearance."

        reminder = ReminderLog(
            student_id=student.id,
            installment_id=installment_id,
            reminder_type=reminder_type,
            sent_to=sent_to,
            subject=subject,
            message=custom_message,
            status="DELIVERED",
            sent_at=datetime.utcnow()
        )
        db.add(reminder)
        db.commit()

        return jsonify({
            "success": True,
            "message": f"{reminder_type} reminder sent successfully to {sent_to}",
            "reminder": reminder.to_dict()
        })
    except Exception:
        db.rollback()
        logger.exception("Reminder logging failed")
        return jsonify({"error": "Unable to create reminder"}), 500
    finally:
        db.close()


@app.route("/api/installments/<int:installment_id>/waive-late-fee", methods=["POST"])
def waive_late_fee(installment_id):
    db = SessionLocal()
    try:
        inst = db.query(Installment).filter(Installment.id == installment_id).first()
        if not inst:
            return jsonify({"error": "Installment not found"}), 404
        
        waived_amt = inst.late_fee
        inst.late_fee = 0.0
        if inst.paid_amount >= inst.amount:
            inst.status = "PAID"
        _audit(db, "late_fee_waived", "installment", inst.id)
        db.commit()

        return jsonify({
            "success": True,
            "message": f"Late fee of Rs {waived_amt} waived successfully.",
            "installment": inst.to_dict()
        })
    finally:
        db.close()


@app.route("/api/installments/<int:installment_id>/extend-due-date", methods=["POST"])
def extend_due_date(installment_id):
    data = request.json or {}
    new_due_date = data.get("new_due_date")
    try:
        datetime.strptime(new_due_date, "%Y-%m-%d")
    except (TypeError, ValueError):
        return jsonify({"error": "Due date must use YYYY-MM-DD format"}), 400
    db = SessionLocal()
    try:
        inst = db.query(Installment).filter(Installment.id == installment_id).first()
        if not inst:
            return jsonify({"error": "Installment not found"}), 404
        
        inst.due_date = new_due_date
        # If new date is in future, adjust overdue status back to pending
        today_str = datetime.now().strftime("%Y-%m-%d")
        if new_due_date >= today_str and inst.status == "OVERDUE":
            inst.status = "PENDING"
            inst.late_fee = 0.0
        _audit(db, "installment_due_date_extended", "installment", inst.id)
        db.commit()

        return jsonify({
            "success": True,
            "message": f"Due date extended to {new_due_date}",
            "installment": inst.to_dict()
        })
    finally:
        db.close()


# Admin finance and data tools
@app.route("/api/admin/reports/finance", methods=["GET"])
def finance_report():
    db = SessionLocal()
    try:
        start, end = request.args.get("from_date"), request.args.get("to_date")
        for value in (start, end):
            if value:
                try: datetime.strptime(value, "%Y-%m-%d")
                except ValueError: return jsonify({"error": "Dates must use YYYY-MM-DD"}), 400
        query = db.query(Payment).join(Student)
        if start: query = query.filter(Payment.payment_date >= datetime.strptime(start, "%Y-%m-%d"))
        if end: query = query.filter(Payment.payment_date < datetime.strptime(end, "%Y-%m-%d") + timedelta(days=1))
        if request.args.get("department"): query = query.filter(Student.department == request.args["department"])
        if request.args.get("payment_mode"): query = query.filter(Payment.payment_mode == request.args["payment_mode"])
        payments = query.order_by(Payment.payment_date.desc()).limit(10000).all()
        students = db.query(Student).filter(Student.is_active.is_(True))
        if request.args.get("department"): students = students.filter(Student.department == request.args["department"])
        balances = []
        for student in students.all():
            summary = student.calculate_summary()
            balances.append({"student_id": student.id, "roll_no": student.roll_no, "name": student.name,
                "department": student.department, "balance_due": summary["balance_due"], "overdue_amount": summary["overdue_amount"]})
        payment_rows = [{**p.to_dict(), "department": p.student.department if p.student else None} for p in payments]
        return jsonify({"payments": payment_rows, "payment_total": round(sum(p.amount for p in payments), 2),
            "balances": balances, "outstanding_total": round(sum(x["balance_due"] for x in balances), 2),
            "overdue_total": round(sum(x["overdue_amount"] for x in balances), 2)})
    finally: db.close()


CSV_COLUMNS = ["roll_no", "name", "email", "phone", "department", "course", "year_semester", "quota", "admission_year", "total_fee", "scholarship_discount", "fee_concession", "plan_type"]

def _parse_student_csv(file):
    if not file or not file.filename.lower().endswith(".csv"):
        return None, [{"row": 0, "error": "Upload a .csv file"}]
    try:
        text_data = file.stream.read(2 * 1024 * 1024 + 1).decode("utf-8-sig")
        if len(text_data.encode("utf-8")) > 2 * 1024 * 1024: raise ValueError("CSV file exceeds 2 MB")
        reader = csv.DictReader(StringIO(text_data))
        if not reader.fieldnames or not set(CSV_COLUMNS).issubset(set(reader.fieldnames)):
            return None, [{"row": 1, "error": "CSV headers must include: " + ", ".join(CSV_COLUMNS)}]
        rows, errors, seen = [], [], set()
        check_db = SessionLocal()
        try:
            existing = {s[0].casefold() for s in check_db.query(Student.roll_no).all()}
            existing.update(name[0].casefold() for name in check_db.query(AdminUser.username).all())
        finally: check_db.close()
        for line, raw in enumerate(reader, start=2):
            row = {k: (raw.get(k) or "").strip() for k in CSV_COLUMNS}
            try:
                roll = row["roll_no"].upper()
                if not roll or len(roll) > 50 or roll.casefold() in existing or roll.casefold() in seen: raise ValueError("Missing or duplicate roll_no")
                seen.add(roll.casefold()); row["roll_no"] = roll
                if not row["name"] or len(row["name"]) > 120: raise ValueError("Valid name is required")
                row["admission_year"] = int(row["admission_year"])
                row["total_fee"] = float(row["total_fee"])
                row["scholarship_discount"] = float(row["scholarship_discount"] or 0)
                row["fee_concession"] = float(row["fee_concession"] or 0)
                if not all(math.isfinite(row[k]) for k in ("total_fee", "scholarship_discount", "fee_concession")) or row["total_fee"] <= 0 or min(row["scholarship_discount"], row["fee_concession"]) < 0 or row["scholarship_discount"] + row["fee_concession"] > row["total_fee"]: raise ValueError("Fee/discount amounts are invalid")
                if row["plan_type"] not in {"ONE_TIME", "SEMESTER", "QUARTERLY", "MONTHLY"}: raise ValueError("plan_type must be ONE_TIME, SEMESTER, QUARTERLY or MONTHLY")
                if row["email"] and (len(row["email"]) > 120 or "@" not in row["email"]): raise ValueError("Email address is invalid")
                rows.append(row)
            except (ValueError, TypeError, OverflowError) as error: errors.append({"row": line, "error": str(error)})
        if not rows and not errors: errors.append({"row": 0, "error": "CSV contains no student rows"})
        return rows, errors
    except (UnicodeDecodeError, ValueError) as error: return None, [{"row": 0, "error": str(error) or "CSV must be UTF-8"}]

@app.route("/api/admin/students/import/preview", methods=["POST"])
def preview_student_import():
    rows, errors = _parse_student_csv(request.files.get("file"))
    if errors: return jsonify({"valid": False, "row_count": len(rows or []), "details": errors}), 400
    return jsonify({"valid": True, "row_count": len(rows), "preview": [{"roll_no": r["roll_no"], "name": r["name"], "department": r["department"], "plan_type": r["plan_type"], "net_payable": round(r["total_fee"] - r["scholarship_discount"] - r["fee_concession"], 2)} for r in rows]})

@app.route("/api/admin/students/import-template", methods=["GET"])
def student_import_template():
    output = BytesIO((",".join(CSV_COLUMNS) + "\nSTU1001,Example Student,student@example.com,9876543210,Computer Science & Engg,B.Tech,1st Year / Sem 1,Merit,2026,100000,0,0,SEMESTER\n").encode("utf-8"))
    return send_file(output, mimetype="text/csv", as_attachment=True, download_name="student-import-template.csv")

@app.route("/api/admin/students/import", methods=["POST"])
def bulk_import_students():
    file = request.files.get("file")
    # Run validation and create within one request. Any invalid row rejects the entire batch.
    rows, errors = _parse_student_csv(file)
    if errors: return jsonify({"error": "CSV validation failed; no students were imported", "details": errors}), 400
    db = SessionLocal(); credentials = []
    try:
        for row in rows:
            password = secrets.token_urlsafe(12); net = row["total_fee"] - row["scholarship_discount"] - row["fee_concession"]
            student = Student(roll_no=row["roll_no"], password_hash=generate_password_hash(password), is_active=True,
                name=row["name"], email=row["email"], phone=row["phone"], department=row["department"], course=row["course"],
                year_semester=row["year_semester"], quota=row["quota"], admission_year=row["admission_year"], total_fee=row["total_fee"],
                scholarship_discount=row["scholarship_discount"], fee_concession=row["fee_concession"], net_payable=net, plan_type=row["plan_type"], created_at=datetime.utcnow())
            db.add(student); db.flush()
            for item in generate_installments_for_plan(student.id, student.plan_type, net): db.add(item)
            _audit(db, "student_imported", "student", student.id)
            credentials.append({"roll_no": student.roll_no, "name": student.name, "temporary_password": password})
        db.commit()
        return jsonify({"imported": len(credentials), "credentials": credentials}), 201
    except Exception:
        db.rollback(); logger.exception("Bulk student import failed")
        return jsonify({"error": "Import failed; no records were committed"}), 500
    finally: db.close()

@app.route("/api/admin/activity", methods=["GET"])
def admin_activity():
    db = SessionLocal()
    try:
        query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
        if request.args.get("action"): query = query.filter(AuditLog.action == request.args["action"])
        if request.args.get("username"): query = query.filter(AuditLog.username.ilike(f"%{request.args['username'][:80]}%"))
        if request.args.get("from_date"):
            try: query = query.filter(AuditLog.created_at >= datetime.strptime(request.args["from_date"], "%Y-%m-%d"))
            except ValueError: return jsonify({"error": "from_date must use YYYY-MM-DD"}), 400
        rows = query.limit(500).all()
        return jsonify([{"id": x.id, "username": x.username, "action": x.action, "record_type": x.record_type, "record_id": x.record_id, "student_id": x.student_id, "created_at": x.created_at.isoformat()} for x in rows])
    finally: db.close()

@app.route("/api/admin/database/backup", methods=["GET"])
def database_backup():
    if not DATABASE_URL.startswith("sqlite"): return jsonify({"error": "In-app backup is currently available for SQLite databases only"}), 501
    if not os.path.exists(SQLITE_DB_PATH): return jsonify({"error": "Database file not found"}), 404
    tmp = tempfile.NamedTemporaryFile(prefix="college-fee-backup-", suffix=".db", delete=False); tmp_path = tmp.name; tmp.close()
    try:
        with closing(sqlite3.connect(SQLITE_DB_PATH)) as source, closing(sqlite3.connect(tmp_path)) as target: source.backup(target)
    except Exception:
        if os.path.exists(tmp_path): os.remove(tmp_path)
        logger.exception("Database backup failed"); return jsonify({"error": "Database backup failed"}), 500
    with open(tmp_path, "rb") as backup_file: backup_data = backup_file.read()
    os.remove(tmp_path)
    return send_file(BytesIO(backup_data), mimetype="application/vnd.sqlite3", as_attachment=True, download_name=f"college-fee-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.db")

@app.route("/api/admin/database/restore", methods=["POST"])
def database_restore():
    if not DATABASE_URL.startswith("sqlite"): return jsonify({"error": "In-app restore is currently available for SQLite databases only"}), 501
    if request.form.get("confirmation") != "RESTORE": return jsonify({"error": "Type RESTORE to confirm database replacement"}), 400
    upload = request.files.get("file")
    if not upload or not upload.filename.lower().endswith((".db", ".sqlite", ".sqlite3")): return jsonify({"error": "Upload a SQLite .db backup file"}), 400
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="college-fee-restore-", suffix=".db", dir=os.path.dirname(SQLITE_DB_PATH), delete=False) as tmp:
            tmp_path = tmp.name; upload.save(tmp)
        if os.path.getsize(tmp_path) > 100 * 1024 * 1024: return jsonify({"error": "Backup file exceeds 100 MB"}), 413
        with closing(sqlite3.connect(tmp_path)) as restored:
            integrity = restored.execute("PRAGMA integrity_check").fetchone()[0]
            tables = {r[0] for r in restored.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if integrity != "ok" or not {"students", "payments", "installments"}.issubset(tables): return jsonify({"error": "Backup is corrupt or is not a College Fee database"}), 400
        backup_dir = os.path.join(os.path.dirname(SQLITE_DB_PATH), "backups"); os.makedirs(backup_dir, exist_ok=True)
        if os.path.exists(SQLITE_DB_PATH):
            safety_path = os.path.join(backup_dir, f"pre-restore-{datetime.now().strftime('%Y%m%d-%H%M%S')}.db")
            with closing(sqlite3.connect(SQLITE_DB_PATH)) as source, closing(sqlite3.connect(safety_path)) as target: source.backup(target)
        engine.dispose(); SessionLocal.remove(); os.replace(tmp_path, SQLITE_DB_PATH); tmp_path = None
        Base.metadata.create_all(bind=engine)
        _login_attempts.clear()
        return jsonify({"success": True, "message": "Database restored. A pre-restore safety backup is stored in backend/backups."})
    except Exception:
        logger.exception("Database restore failed"); return jsonify({"error": "Database restore failed; see backend log"}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path): os.remove(tmp_path)


def run_due_reminders(today=None):
    """Create idempotent in-app reminders and optionally deliver matching SMS messages."""
    today = today or date.today(); db = SessionLocal(); sent = 0
    try:
        offsets = {7: "due_in_7_days", 1: "due_tomorrow", 0: "due_today", -1: "one_day_overdue"}
        candidates = db.query(Installment).join(Student).filter(Student.is_active.is_(True), Installment.status.in_(["PENDING", "PARTIAL", "OVERDUE"])).all()
        for inst in candidates:
            try: due = datetime.strptime(inst.due_date, "%Y-%m-%d").date()
            except (ValueError, TypeError): continue
            days = (due - today).days
            balance = max(0.0, inst.amount + inst.late_fee - inst.paid_amount)
            if days not in offsets or balance <= 0: continue
            key = offsets[days]; subject = f"Automated fee reminder:{key}:installment-{inst.id}"
            if db.query(ReminderLog.id).filter(ReminderLog.installment_id == inst.id, ReminderLog.subject == subject).first(): continue
            student = inst.student
            label = "overdue" if days < 0 else ("due today" if days == 0 else f"due in {days} day(s)")
            message = f"Dear {student.name}, your {inst.title} balance of Rs {balance:,.2f} is {label} (due {inst.due_date}). Pay through the student portal or accounts counter."
            db.add(Notification(student_id=student.id, message=message, notification_type="FEE_REMINDER"))
            reminder = ReminderLog(student_id=student.id, installment_id=inst.id, reminder_type="SMS", sent_to=student.phone or "", subject=subject, message=message, status="IN_APP", sent_at=datetime.utcnow())
            db.add(reminder); db.flush()
            # SMS delivery is optional; the in-app notification is always recorded.
            result = _send_generic_sms(student.phone, message)
            reminder.status = result["status"]
            sent += 1
        db.commit(); return sent
    except Exception:
        db.rollback(); logger.exception("Scheduled fee reminders failed"); return sent
    finally: db.close()

def _send_generic_sms(phone, body):
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip(); auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    sender = os.environ.get("TWILIO_FROM_NUMBER", "").strip(); service = os.environ.get("TWILIO_MESSAGING_SERVICE_SID", "").strip()
    to = _normalize_sms_number(phone)
    if not (account_sid and auth_token and (sender or service)): return {"status": "not_configured"}
    if not to: return {"status": "invalid_phone"}
    payload = {"To": to, "Body": body}; payload["MessagingServiceSid" if service else "From"] = service or sender
    req = Request(f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json", data=urlencode(payload).encode(), headers={"Authorization": "Basic " + base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode(), "Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    try:
        with urlopen(req, timeout=10) as response: json.loads(response.read().decode())
        return {"status": "queued"}
    except Exception as error:
        logger.warning("Reminder SMS failed (%s)", type(error).__name__); return {"status": "failed"}

@app.route("/api/admin/reminders/run", methods=["POST"])
def admin_run_reminders():
    count = run_due_reminders()
    return jsonify({"success": True, "processed": count, "message": f"Processed {count} due reminder(s)."})

@app.route("/api/admin/reports/departments", methods=["GET"])
def finance_departments():
    db = SessionLocal()
    try: return jsonify([r[0] for r in db.query(Student.department).distinct().order_by(Student.department).all() if r[0]])
    finally: db.close()


def _reminder_scheduler():
    while True:
        try: run_due_reminders()
        except Exception: logger.exception("Reminder scheduler iteration failed")
        time.sleep(3600)


def bootstrap_admin_from_environment():
    username = os.environ.get("ADMIN_USERNAME", "").strip()
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not username and not password:
        return
    if not username or len(username) > 80 or len(password) < 12:
        raise RuntimeError("Set both ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters")
    db = SessionLocal()
    try:
        student_conflict = db.query(Student.id).filter(func.lower(Student.roll_no) == username.casefold()).first()
        if student_conflict:
            raise RuntimeError("ADMIN_USERNAME must not match an existing student roll number")
        admin = db.query(AdminUser).filter(func.lower(AdminUser.username) == username.casefold()).first()
        if not admin:
            db.add(AdminUser(username=username, password_hash=generate_password_hash(password), is_active=True))
            db.commit()
    finally:
        db.close()

bootstrap_admin_from_environment()

# One lightweight process-local worker is sufficient for the single-process local launcher.
if os.environ.get("DISABLE_REMINDER_SCHEDULER", "false").lower() != "true":
    threading.Thread(target=_reminder_scheduler, name="fee-reminder-scheduler", daemon=True).start()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 College Fee Credit Management API running on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
