from datetime import datetime, timedelta
from database import SessionLocal, Base, engine
from models import Student, FeeComponent, Installment, Payment, ReminderLog

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Student).count() > 0:
        db.close()
        return

    today = datetime.now()
    d_fmt = lambda days: (today + timedelta(days=days)).strftime("%Y-%m-%d")
    dt_fmt = lambda days: (today + timedelta(days=days))

    students_data = [
        {
            "roll_no": "2024CS101",
            "name": "Aarav Sharma",
            "email": "aarav.sharma@college.edu",
            "phone": "+91 98765 43210",
            "department": "Computer Science & Engg",
            "course": "B.Tech Computer Science",
            "year_semester": "2nd Year / Sem 4",
            "quota": "Merit",
            "admission_year": 2024,
            "total_fee": 100000.0,
            "scholarship_discount": 0.0,
            "net_payable": 100000.0,
            "plan_type": "MONTHLY",
            "components": [
                ("Tuition Fee", 70000.0),
                ("Lab & Computing Fee", 15000.0),
                ("Library & Digital Resources", 5000.0),
                ("Examination & Registration", 5000.0),
                ("Student Activity & Sports", 5000.0)
            ],
            "installments": [
                (1, "Month 1 (Aug)", d_fmt(-90), 10000.0, 0.0, 10000.0, "PAID", d_fmt(-88), "Paid via UPI"),
                (2, "Month 2 (Sep)", d_fmt(-60), 10000.0, 0.0, 10000.0, "PAID", d_fmt(-59), "Paid via Net Banking"),
                (3, "Month 3 (Oct)", d_fmt(-30), 10000.0, 0.0, 10000.0, "PAID", d_fmt(-28), "Paid via Debit Card"),
                (4, "Month 4 (Nov)", d_fmt(-5), 10000.0, 0.0, 10000.0, "PAID", d_fmt(-4), "Paid via UPI"),
                (5, "Month 5 (Dec)", d_fmt(-1), 10000.0, 250.0, 0.0, "OVERDUE", None, "Reminder SMS sent"),
                (6, "Month 6 (Jan)", d_fmt(25), 10000.0, 0.0, 0.0, "PENDING", None, None),
                (7, "Month 7 (Feb)", d_fmt(55), 10000.0, 0.0, 0.0, "PENDING", None, None),
                (8, "Month 8 (Mar)", d_fmt(85), 10000.0, 0.0, 0.0, "PENDING", None, None),
                (9, "Month 9 (Apr)", d_fmt(115), 10000.0, 0.0, 0.0, "PENDING", None, None),
                (10, "Month 10 (May)", d_fmt(145), 10000.0, 0.0, 0.0, "PENDING", None, None),
            ],
            "payments": [
                ("REC-2024-1001", 1, 10000.0, "UPI", "UPI-88492019401", dt_fmt(-88), "Month 1 Installment"),
                ("REC-2024-1002", 2, 10000.0, "Net Banking", "HDFC-N9849210", dt_fmt(-59), "Month 2 Installment"),
                ("REC-2024-1003", 3, 10000.0, "Debit/Credit Card", "CARD-VISA-9941", dt_fmt(-28), "Month 3 Installment"),
                ("REC-2024-1004", 4, 10000.0, "UPI", "UPI-77492011029", dt_fmt(-4), "Month 4 Installment"),
            ],
            "reminders": [
                ("SMS", "+91 98765 43210", "Fee Alert: Month 5 Installment Overdue", "Dear Aarav, Month 5 fee installment of Rs 10,000 was due yesterday. Please pay immediately to avoid extra late fee.", dt_fmt(-1))
            ]
        },
        {
            "roll_no": "2024CS102",
            "name": "Ananya Patel",
            "email": "ananya.patel@college.edu",
            "phone": "+91 98220 11234",
            "department": "Computer Science & Engg",
            "course": "B.Tech Computer Science",
            "year_semester": "2nd Year / Sem 4",
            "quota": "Merit",
            "admission_year": 2024,
            "total_fee": 120000.0,
            "scholarship_discount": 10000.0,
            "net_payable": 110000.0,
            "plan_type": "SEMESTER",
            "components": [
                ("Tuition Fee", 85000.0),
                ("Lab & Computing Fee", 15000.0),
                ("Library & Digital Resources", 5000.0),
                ("Development Fund", 10000.0),
                ("Examination & Registration", 5000.0)
            ],
            "installments": [
                (1, "Semester 1 Installment", d_fmt(-75), 55000.0, 0.0, 55000.0, "PAID", d_fmt(-74), "Full Sem 1 cleared"),
                (2, "Semester 2 Installment", d_fmt(45), 55000.0, 0.0, 0.0, "PENDING", None, "Due before sem end exams"),
            ],
            "payments": [
                ("REC-2024-1005", 1, 55000.0, "Net Banking", "ICICI-NET-4029104", dt_fmt(-74), "Semester 1 Full Fee"),
            ],
            "reminders": []
        },
        {
            "roll_no": "2023ME204",
            "name": "Rohan Verma",
            "email": "rohan.verma@college.edu",
            "phone": "+91 97110 55432",
            "department": "Mechanical Engineering",
            "course": "B.Tech Mechanical",
            "year_semester": "3rd Year / Sem 6",
            "quota": "Management",
            "admission_year": 2023,
            "total_fee": 90000.0,
            "scholarship_discount": 0.0,
            "net_payable": 90000.0,
            "plan_type": "QUARTERLY",
            "components": [
                ("Tuition Fee", 60000.0),
                ("Workshop & Lab Consumables", 15000.0),
                ("Library & Book Bank", 5000.0),
                ("Examination Fee", 5000.0),
                ("Industrial Visit & Training", 5000.0)
            ],
            "installments": [
                (1, "Quarter 1 (Term Start)", d_fmt(-100), 22500.0, 0.0, 22500.0, "PAID", d_fmt(-98), "Paid at accounts counter"),
                (2, "Quarter 2 (Mid Term)", d_fmt(-40), 22500.0, 0.0, 22500.0, "PAID", d_fmt(-39), "Paid via UPI"),
                (3, "Quarter 3 (Winter)", d_fmt(-10), 22500.0, 500.0, 0.0, "OVERDUE", None, "Grace period ended; late penalty applied"),
                (4, "Quarter 4 (Final)", d_fmt(50), 22500.0, 0.0, 0.0, "PENDING", None, None),
            ],
            "payments": [
                ("REC-2024-1006", 1, 22500.0, "Cash", "CASH-CNTR-092", dt_fmt(-98), "Quarter 1 cleared at counter"),
                ("REC-2024-1007", 2, 22500.0, "UPI", "UPI-3349281048", dt_fmt(-39), "Quarter 2 cleared via GPay"),
            ],
            "reminders": [
                ("Email", "rohan.verma@college.edu", "Notice: Quarter 3 Fee Overdue", "Dear Rohan, your Quarter 3 fee of Rs 22,500 (+ Rs 500 late fee) is overdue. Kindly clear it at the earliest.", dt_fmt(-8))
            ]
        },
        {
            "roll_no": "2024EC115",
            "name": "Priya Sundaram",
            "email": "priya.sundaram@college.edu",
            "phone": "+91 94441 98765",
            "department": "Electronics & Comm Engg",
            "course": "B.Tech ECE",
            "year_semester": "1st Year / Sem 2",
            "quota": "Scholarship",
            "admission_year": 2024,
            "total_fee": 110000.0,
            "scholarship_discount": 20000.0,
            "net_payable": 90000.0,
            "plan_type": "ONE_TIME",
            "components": [
                ("Tuition Fee", 75000.0),
                ("Electronics & Embedded Lab", 15000.0),
                ("Library Resources", 5000.0),
                ("Development Fund", 10000.0),
                ("Examination & University Fee", 5000.0)
            ],
            "installments": [
                (1, "Full Annual Fee (One-Time)", d_fmt(-80), 90000.0, 0.0, 90000.0, "PAID", d_fmt(-80), "Full payment upfront with 5% waiver"),
            ],
            "payments": [
                ("REC-2024-1008", 1, 90000.0, "Net Banking", "SBI-NEFT-8849201", dt_fmt(-80), "Full Annual Payment Cleared"),
            ],
            "reminders": []
        },
        {
            "roll_no": "2023AI308",
            "name": "Vikrant Singh",
            "email": "vikrant.singh@college.edu",
            "phone": "+91 99887 66554",
            "department": "AI & Data Science",
            "course": "B.Tech AI & Data Science",
            "year_semester": "3rd Year / Sem 5",
            "quota": "Merit",
            "admission_year": 2023,
            "total_fee": 130000.0,
            "scholarship_discount": 10000.0,
            "net_payable": 120000.0,
            "plan_type": "MONTHLY",
            "components": [
                ("Tuition Fee", 80000.0),
                ("AI Supercomputing & GPU Lab", 25000.0),
                ("Library & Research Journals", 10000.0),
                ("Certification & Hackathon Support", 10000.0),
                ("Examination & Registration", 5000.0)
            ],
            "installments": [
                (1, "Month 1 (Aug)", d_fmt(-90), 12000.0, 0.0, 12000.0, "PAID", d_fmt(-89), "Paid"),
                (2, "Month 2 (Sep)", d_fmt(-60), 12000.0, 0.0, 12000.0, "PAID", d_fmt(-58), "Paid"),
                (3, "Month 3 (Oct)", d_fmt(-30), 12000.0, 600.0, 0.0, "OVERDUE", None, "Pending 30 days overdue"),
                (4, "Month 4 (Nov)", d_fmt(-1), 12000.0, 200.0, 0.0, "OVERDUE", None, "Overdue 1 day"),
                (5, "Month 5 (Dec)", d_fmt(28), 12000.0, 0.0, 0.0, "PENDING", None, None),
                (6, "Month 6 (Jan)", d_fmt(58), 12000.0, 0.0, 0.0, "PENDING", None, None),
                (7, "Month 7 (Feb)", d_fmt(88), 12000.0, 0.0, 0.0, "PENDING", None, None),
                (8, "Month 8 (Mar)", d_fmt(118), 12000.0, 0.0, 0.0, "PENDING", None, None),
                (9, "Month 9 (Apr)", d_fmt(148), 12000.0, 0.0, 0.0, "PENDING", None, None),
                (10, "Month 10 (May)", d_fmt(178), 12000.0, 0.0, 0.0, "PENDING", None, None),
            ],
            "payments": [
                ("REC-2024-1009", 1, 12000.0, "UPI", "UPI-9920194821", dt_fmt(-89), "Month 1 Installment"),
                ("REC-2024-1010", 2, 12000.0, "Net Banking", "AXIS-7729104", dt_fmt(-58), "Month 2 Installment"),
            ],
            "reminders": [
                ("WhatsApp", "+91 99887 66554", "Urgent: College Fee Dues", "Dear Vikrant, two installments (Oct and Nov) totaling Rs 24,000 are pending. Please pay to avoid hall ticket hold.", dt_fmt(-2))
            ]
        },
        {
            "roll_no": "2024MBA012",
            "name": "Sneha Kulkarni",
            "email": "sneha.kulkarni@college.edu",
            "phone": "+91 98450 33211",
            "department": "Management Studies",
            "course": "MBA (Finance & Analytics)",
            "year_semester": "1st Year / Sem 2",
            "quota": "Management",
            "admission_year": 2024,
            "total_fee": 160000.0,
            "scholarship_discount": 10000.0,
            "net_payable": 150000.0,
            "plan_type": "SEMESTER",
            "components": [
                ("Tuition Fee", 110000.0),
                ("Executive Case Studies & HBS Sim", 20000.0),
                ("Corporate Leadership & Grooming", 15000.0),
                ("Library & Bloomberg Terminal Access", 10000.0),
                ("Examination & Convocation Fee", 5000.0)
            ],
            "installments": [
                (1, "Semester 1 Installment", d_fmt(-85), 75000.0, 0.0, 75000.0, "PAID", d_fmt(-84), "Paid via Cheque"),
                (2, "Semester 2 Installment", d_fmt(40), 75000.0, 0.0, 0.0, "PENDING", None, "Due before term start"),
            ],
            "payments": [
                ("REC-2024-1011", 1, 75000.0, "Cheque/DD", "CHQ-KOTAK-552109", dt_fmt(-84), "Semester 1 cleared via Cheque"),
            ],
            "reminders": []
        },
        {
            "roll_no": "2024CE105",
            "name": "Mohammed Farhan",
            "email": "m.farhan@college.edu",
            "phone": "+91 93901 88231",
            "department": "Civil Engineering",
            "course": "B.Tech Civil",
            "year_semester": "2nd Year / Sem 3",
            "quota": "Merit",
            "admission_year": 2024,
            "total_fee": 95000.0,
            "scholarship_discount": 0.0,
            "net_payable": 95000.0,
            "plan_type": "CUSTOM",
            "components": [
                ("Tuition Fee", 65000.0),
                ("Survey & Material Testing Lab", 15000.0),
                ("CAD & Structural Software License", 8000.0),
                ("Library & Book Bank", 4000.0),
                ("Examination Fee", 3000.0)
            ],
            "installments": [
                (1, "Part 1 - Initial Registration", d_fmt(-70), 40000.0, 0.0, 40000.0, "PAID", d_fmt(-68), "Full part 1 paid"),
                (2, "Part 2 - Mid Term Installment", d_fmt(-15), 30000.0, 300.0, 15000.0, "OVERDUE", None, "Partially paid Rs 15,000; Rs 15,000 + 300 overdue"),
                (3, "Part 3 - Final Term Clearance", d_fmt(60), 25000.0, 0.0, 0.0, "PENDING", None, "Scheduled for final term"),
            ],
            "payments": [
                ("REC-2024-1012", 1, 40000.0, "UPI", "UPI-6629104820", dt_fmt(-68), "Part 1 initial fee cleared"),
                ("REC-2024-1013", 2, 15000.0, "Cash", "CASH-CNTR-119", dt_fmt(-20), "Part payment of Part 2"),
            ],
            "reminders": [
                ("SMS", "+91 93901 88231", "Balance Due for Installment #2", "Dear Mohammed, remaining balance of Rs 15,300 for Installment 2 is overdue. Please settle promptly.", dt_fmt(-5))
            ]
        },
        {
            "roll_no": "2024MCA009",
            "name": "Divya Nair",
            "email": "divya.nair@college.edu",
            "phone": "+91 98471 22900",
            "department": "Computer Applications",
            "course": "MCA",
            "year_semester": "1st Year / Sem 1",
            "quota": "Merit",
            "admission_year": 2024,
            "total_fee": 85000.0,
            "scholarship_discount": 5000.0,
            "net_payable": 80000.0,
            "plan_type": "QUARTERLY",
            "components": [
                ("Tuition Fee", 55000.0),
                ("Cloud Lab & Server Access", 12000.0),
                ("Library & Digital Journals", 6000.0),
                ("Examination & Lab Evaluation", 4000.0),
                ("Soft Skills & Interview Prep", 3000.0)
            ],
            "installments": [
                (1, "Quarter 1", d_fmt(-50), 20000.0, 0.0, 20000.0, "PAID", d_fmt(-48), "Cleared"),
                (2, "Quarter 2", d_fmt(15), 20000.0, 0.0, 0.0, "PENDING", None, "Due in 15 days"),
                (3, "Quarter 3", d_fmt(80), 20000.0, 0.0, 0.0, "PENDING", None, None),
                (4, "Quarter 4", d_fmt(140), 20000.0, 0.0, 0.0, "PENDING", None, None),
            ],
            "payments": [
                ("REC-2024-1014", 1, 20000.0, "UPI", "UPI-1102938475", dt_fmt(-48), "Quarter 1 Fee Cleared"),
            ],
            "reminders": []
        }
    ]

    for s_info in students_data:
        student = Student(
            roll_no=s_info["roll_no"],
            name=s_info["name"],
            email=s_info["email"],
            phone=s_info["phone"],
            department=s_info["department"],
            course=s_info["course"],
            year_semester=s_info["year_semester"],
            quota=s_info["quota"],
            admission_year=s_info["admission_year"],
            total_fee=s_info["total_fee"],
            scholarship_discount=s_info["scholarship_discount"],
            net_payable=s_info["net_payable"],
            plan_type=s_info["plan_type"],
            created_at=today - timedelta(days=120)
        )
        db.add(student)
        db.flush()

        # Fee Components
        for comp_name, comp_amt in s_info["components"]:
            fc = FeeComponent(
                student_id=student.id,
                category=comp_name,
                amount=comp_amt
            )
            db.add(fc)

        # Installments
        inst_objects = {}
        for inst_tuple in s_info["installments"]:
            num, title, due, amt, late, paid, status, paid_date, rem = inst_tuple
            inst = Installment(
                student_id=student.id,
                installment_no=num,
                title=title,
                due_date=due,
                amount=amt,
                late_fee=late,
                paid_amount=paid,
                status=status,
                paid_date=paid_date,
                remarks=rem
            )
            db.add(inst)
            db.flush()
            inst_objects[num] = inst

        # Payments
        for p_tuple in s_info["payments"]:
            rec_no, inst_num, amt, mode, tx_ref, p_date, rem = p_tuple
            inst_id = inst_objects[inst_num].id if inst_num in inst_objects else None
            payment = Payment(
                receipt_no=rec_no,
                student_id=student.id,
                installment_id=inst_id,
                amount=amt,
                payment_mode=mode,
                transaction_ref=tx_ref,
                payment_date=p_date,
                collected_by="Accounts Section (Admin)",
                remarks=rem
            )
            db.add(payment)

        # Reminders
        for r_tuple in s_info["reminders"]:
            r_type, sent_to, subj, msg, sent_at = r_tuple
            rem = ReminderLog(
                student_id=student.id,
                reminder_type=r_type,
                sent_to=sent_to,
                subject=subj,
                message=msg,
                status="DELIVERED",
                sent_at=sent_at
            )
            db.add(rem)

    db.commit()
    db.close()
