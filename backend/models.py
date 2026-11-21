from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    roll_no = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=False)
    department = Column(String(100), nullable=False)
    course = Column(String(100), nullable=False)
    year_semester = Column(String(50), nullable=False)
    quota = Column(String(50), default="Merit") # Merit, Management, Sports, Scholarship
    admission_year = Column(Integer, default=2024)
    avatar_url = Column(String(255), nullable=True)

    # Fee Details
    total_fee = Column(Float, nullable=False, default=100000.0)
    scholarship_discount = Column(Float, default=0.0)
    fee_concession = Column(Float, nullable=False, default=0.0)
    net_payable = Column(Float, nullable=False, default=100000.0)
    plan_type = Column(String(50), default="SEMESTER") # ONE_TIME, SEMESTER, QUARTERLY, MONTHLY, CUSTOM

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    installments = relationship("Installment", back_populates="student", cascade="all, delete-orphan", order_by="Installment.installment_no")
    fee_components = relationship("FeeComponent", back_populates="student", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="student", cascade="all, delete-orphan", order_by="desc(Payment.payment_date)")
    reminders = relationship("ReminderLog", back_populates="student", cascade="all, delete-orphan", order_by="desc(ReminderLog.sent_at)")
    audit_logs = relationship("AuditLog", back_populates="student", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="student", cascade="all, delete-orphan", order_by="desc(Notification.created_at)")
    fee_extension_requests = relationship("FeeExtensionRequest", back_populates="student", cascade="all, delete-orphan", order_by="desc(FeeExtensionRequest.requested_at)")
    no_dues_requests = relationship("NoDuesCertificateRequest", back_populates="student", cascade="all, delete-orphan", order_by="desc(NoDuesCertificateRequest.requested_at)")

    def calculate_summary(self):
        total_paid = sum(inst.paid_amount for inst in self.installments)
        total_late_fee = sum(inst.late_fee for inst in self.installments if inst.status == "OVERDUE")
        net_expected = self.net_payable + total_late_fee
        balance_due = max(0.0, net_expected - total_paid)
        overdue_amount = sum(
            (inst.amount + inst.late_fee - inst.paid_amount)
            for inst in self.installments
            if inst.status == "OVERDUE"
        )
        paid_percentage = round((total_paid / net_expected * 100), 1) if net_expected > 0 else 100.0
        
        return {
            "total_fee": self.total_fee,
            "scholarship_discount": self.scholarship_discount,
            "fee_concession": self.fee_concession,
            "net_payable": self.net_payable,
            "total_paid": round(total_paid, 2),
            "total_late_fee": round(total_late_fee, 2),
            "balance_due": round(balance_due, 2),
            "overdue_amount": round(overdue_amount, 2),
            "paid_percentage": min(100.0, paid_percentage),
            "status": "COMPLETED" if balance_due <= 0 else ("OVERDUE" if overdue_amount > 0 else "IN_PROGRESS")
        }

    def to_dict(self, include_details=False):
        summary = self.calculate_summary()
        data = {
            "id": self.id,
            "roll_no": self.roll_no,
            "is_active": bool(self.is_active),
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "department": self.department,
            "course": self.course,
            "year_semester": self.year_semester,
            "quota": self.quota,
            "admission_year": self.admission_year,
            "avatar_url": self.avatar_url,
            "total_fee": self.total_fee,
            "scholarship_discount": self.scholarship_discount,
            "fee_concession": self.fee_concession,
            "net_payable": self.net_payable,
            "plan_type": self.plan_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "summary": summary
        }

        if include_details:
            data["fee_components"] = [fc.to_dict() for fc in self.fee_components]
            data["installments"] = [inst.to_dict() for inst in self.installments]
            data["payments"] = [p.to_dict() for p in self.payments]
            data["reminders"] = [r.to_dict() for r in self.reminders]
            data["notifications"] = [n.to_dict() for n in self.notifications]

        return data


class FeeComponent(Base):
    __tablename__ = "fee_components"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    category = Column(String(100), nullable=False) # Tuition, Lab, Examination, Development, Hostel, Transport
    amount = Column(Float, nullable=False)

    student = relationship("Student", back_populates="fee_components")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "category": self.category,
            "amount": self.amount
        }


class Installment(Base):
    __tablename__ = "installments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    installment_no = Column(Integer, nullable=False)
    title = Column(String(100), nullable=False) # e.g. "Installment 1 - Admission & Term 1"
    due_date = Column(String(20), nullable=False) # YYYY-MM-DD
    amount = Column(Float, nullable=False)
    late_fee = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    status = Column(String(30), default="PENDING") # PAID, PENDING, OVERDUE, PARTIAL
    paid_date = Column(String(20), nullable=True) # YYYY-MM-DD
    remarks = Column(Text, nullable=True)

    student = relationship("Student", back_populates="installments")
    payments = relationship("Payment", back_populates="installment")

    def to_dict(self):
        balance = max(0.0, (self.amount + self.late_fee) - self.paid_amount)
        return {
            "id": self.id,
            "student_id": self.student_id,
            "installment_no": self.installment_no,
            "title": self.title,
            "due_date": self.due_date,
            "amount": self.amount,
            "late_fee": self.late_fee,
            "total_due": self.amount + self.late_fee,
            "paid_amount": self.paid_amount,
            "balance": round(balance, 2),
            "status": self.status,
            "paid_date": self.paid_date,
            "remarks": self.remarks
        }


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(50), unique=True, nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    installment_id = Column(Integer, ForeignKey("installments.id"), nullable=True)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), nullable=False) # UPI, Net Banking, Debit/Credit Card, Cash, Cheque/DD
    transaction_ref = Column(String(100), nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    collected_by = Column(String(100), default="Accounts Section (Admin)")
    remarks = Column(Text, nullable=True)

    student = relationship("Student", back_populates="payments")
    installment = relationship("Installment", back_populates="payments")

    def to_dict(self):
        return {
            "id": self.id,
            "receipt_no": self.receipt_no,
            "student_id": self.student_id,
            "student_name": self.student.name if self.student else None,
            "student_roll": self.student.roll_no if self.student else None,
            "installment_id": self.installment_id,
            "installment_title": self.installment.title if self.installment else "Direct / Multi-Installment Allocation",
            "amount": self.amount,
            "payment_mode": self.payment_mode,
            "transaction_ref": self.transaction_ref,
            "payment_date": self.payment_date.strftime("%Y-%m-%d %H:%M:%S") if self.payment_date else None,
            "collected_by": self.collected_by,
            "remarks": self.remarks
        }


class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    installment_id = Column(Integer, ForeignKey("installments.id"), nullable=True)
    reminder_type = Column(String(30), default="Email") # Email, SMS, WhatsApp
    sent_to = Column(String(100), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(30), default="DELIVERED")
    sent_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="reminders")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "installment_id": self.installment_id,
            "reminder_type": self.reminder_type,
            "sent_to": self.sent_to,
            "subject": self.subject,
            "message": self.message,
            "status": self.status,
            "sent_at": self.sent_at.strftime("%Y-%m-%d %H:%M:%S") if self.sent_at else None
        }


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(80), nullable=False)
    action = Column(String(120), nullable=False)
    record_type = Column(String(50), nullable=True)
    record_id = Column(String(80), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    student = relationship("Student", back_populates="audit_logs")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    notification_type = Column(String(40), nullable=False, default="INFO")
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    student = relationship("Student", back_populates="notifications")

    def to_dict(self):
        return {"id": self.id, "student_id": self.student_id, "message": self.message,
                "notification_type": self.notification_type, "is_read": self.is_read,
                "created_at": self.created_at.isoformat() if self.created_at else None}


class FeeExtensionRequest(Base):
    __tablename__ = "fee_extension_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    installment_id = Column(Integer, ForeignKey("installments.id"), nullable=False, index=True)
    requested_amount = Column(Float, nullable=False)
    original_due_date = Column(String(20), nullable=False)
    requested_due_date = Column(String(20), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING", index=True)
    requested_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    admin_remarks = Column(Text, nullable=True)

    student = relationship("Student", back_populates="fee_extension_requests")
    installment = relationship("Installment")

    def to_dict(self, include_student=False):
        data = {
            "id": self.id,
            "student_id": self.student_id,
            "installment_id": self.installment_id,
            "installment_title": self.installment.title if self.installment else None,
            "requested_amount": self.requested_amount,
            "original_due_date": self.original_due_date,
            "requested_due_date": self.requested_due_date,
            "reason": self.reason,
            "status": self.status,
            "requested_at": self.requested_at.isoformat() if self.requested_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "admin_remarks": self.admin_remarks,
        }
        if include_student and self.student:
            data["student"] = {
                "id": self.student.id,
                "name": self.student.name,
                "roll_no": self.student.roll_no,
                "department": self.student.department,
                "phone": self.student.phone,
                "email": self.student.email,
            }
        return data


class NoDuesCertificateRequest(Base):
    __tablename__ = "no_dues_certificate_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="PENDING", index=True)
    requested_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    admin_remarks = Column(Text, nullable=True)
    certificate_id = Column(String(60), unique=True, nullable=True)
    issued_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="no_dues_requests")

    def to_dict(self, include_student=False):
        data = {
            "id": self.id,
            "student_id": self.student_id,
            "status": self.status,
            "requested_at": self.requested_at.isoformat() if self.requested_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "admin_remarks": self.admin_remarks,
            "certificate_id": self.certificate_id,
            "issued_at": self.issued_at.isoformat() if self.issued_at else None,
        }
        if include_student and self.student:
            data["student"] = {
                "id": self.student.id,
                "name": self.student.name,
                "roll_no": self.student.roll_no,
                "department": self.student.department,
                "course": self.student.course,
                "year_semester": self.student.year_semester,
                "admission_year": self.student.admission_year,
                "email": self.student.email,
            }
        return data
