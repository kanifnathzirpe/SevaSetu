"""
Seed script to add demo queue and appointment data for doctor portal testing.
This script is idempotent - it checks for existing seed data before creating new records.
"""
import sys
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database connection (use Docker service name when running in container)
DATABASE_URL = "postgresql+psycopg2://sevasetu:sevasetu@db:5432/sevasetu"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def seed_queue_data():
    db = SessionLocal()
    try:
        print("Starting seed data creation...")

        # Use doctor ID 41 (Dr. Anjali Deshpande) as the demo doctor
        doctor_id = 41
        
        # Use existing patient IDs (69-73 from our query)
        patient_ids = [69, 70, 71, 72, 73]
        
        # Check if seed data already exists for this doctor (tokens 1-12)
        existing_seed = db.execute(
            text(f"SELECT COUNT(*) FROM appointments WHERE doctor_id = {doctor_id} AND token_number BETWEEN 1 AND 12")
        ).scalar()
        
        if existing_seed >= 12:
            print(f"Seed data already exists ({existing_seed} records). Skipping seed.")
            return
        
        # Create today's queue appointments (5 waiting patients)
        today = date.today()
        start_time = datetime.combine(today, time(9, 30))
        
        queue_patients = [
            {"patient_id": patient_ids[0], "token": 1, "time": start_time, "reason": "Follow-up consultation"},
            {"patient_id": patient_ids[1], "token": 2, "time": start_time + timedelta(minutes=15), "reason": "Fever and cough"},
            {"patient_id": patient_ids[2], "token": 3, "time": start_time + timedelta(minutes=30), "reason": "Routine consultation"},
            {"patient_id": patient_ids[3], "token": 4, "time": start_time + timedelta(minutes=45), "reason": "Medication follow-up"},
            {"patient_id": patient_ids[4], "token": 5, "time": start_time + timedelta(minutes=60), "reason": "General consultation"},
        ]
        
        for idx, appt_data in enumerate(queue_patients):
            appt_time = appt_data["time"].replace(tzinfo=timezone.utc)
            db.execute(
                text("""
                    INSERT INTO appointments 
                    (patient_id, doctor_id, scheduled_at, appointment_type, status, reason, token_number, queue_position, diagnosis, notes, created_at, updated_at)
                    VALUES 
                    (:patient_id, :doctor_id, :scheduled_at, 'in_person', 'scheduled', :reason, :token, :token, '', '', NOW(), NOW())
                """),
                {
                    "patient_id": appt_data["patient_id"],
                    "doctor_id": doctor_id,
                    "scheduled_at": appt_time,
                    "reason": appt_data['reason'],
                    "token": appt_data["token"],
                }
            )
            print(f"Created waiting appointment: Token {appt_data['token']} for patient {appt_data['patient_id']}")
        
        # Create 2 completed appointments for today
        completed_patients = [
            {"patient_id": patient_ids[0], "token": 6, "time": start_time - timedelta(minutes=30), "reason": "Follow-up"},
            {"patient_id": patient_ids[1], "token": 7, "time": start_time - timedelta(minutes=15), "reason": "Routine consultation"},
        ]
        
        for appt_data in completed_patients:
            appt_time = appt_data["time"].replace(tzinfo=timezone.utc)
            db.execute(
                text("""
                    INSERT INTO appointments 
                    (patient_id, doctor_id, scheduled_at, appointment_type, status, reason, token_number, queue_position, diagnosis, notes, created_at, updated_at)
                    VALUES 
                    (:patient_id, :doctor_id, :scheduled_at, 'in_person', 'completed', :reason, :token, :token, 'Consultation completed', 'Follow-up notes', NOW(), NOW())
                """),
                {
                    "patient_id": appt_data["patient_id"],
                    "doctor_id": doctor_id,
                    "scheduled_at": appt_time,
                    "reason": appt_data['reason'],
                    "token": appt_data["token"],
                }
            )
            print(f"Created completed appointment: Token {appt_data['token']} for patient {appt_data['patient_id']}")
        
        # Create appointments across multiple dates for "All" filter testing
        base_date = today - timedelta(days=5)
        multi_date_patients = [
            {"patient_id": patient_ids[2], "date": base_date, "reason": "Check-up"},
            {"patient_id": patient_ids[3], "date": base_date + timedelta(days=1), "reason": "Follow-up"},
            {"patient_id": patient_ids[4], "date": base_date + timedelta(days=2), "reason": "Consultation"},
            {"patient_id": patient_ids[0], "date": base_date + timedelta(days=3), "reason": "Review"},
            {"patient_id": patient_ids[1], "date": base_date + timedelta(days=4), "reason": "Check-up"},
        ]
        
        for idx, appt_data in enumerate(multi_date_patients):
            appt_time = datetime.combine(appt_data["date"], time(10, 0)).replace(tzinfo=timezone.utc)
            token = 8 + idx
            db.execute(
                text("""
                    INSERT INTO appointments 
                    (patient_id, doctor_id, scheduled_at, appointment_type, status, reason, token_number, queue_position, diagnosis, notes, created_at, updated_at)
                    VALUES 
                    (:patient_id, :doctor_id, :scheduled_at, 'in_person', 'completed', :reason, :token, :token, 'Consultation completed', 'Follow-up notes', NOW(), NOW())
                """),
                {
                    "patient_id": appt_data["patient_id"],
                    "doctor_id": doctor_id,
                    "scheduled_at": appt_time,
                    "reason": appt_data['reason'],
                    "token": token,
                }
            )
            print(f"Created multi-date appointment: {appt_data['date']} - Token {token}")
        
        db.commit()
        print(f"\nSeed data creation complete!")
        print(f"- 5 waiting appointments for today")
        print(f"- 2 completed appointments for today")
        print(f"- 5 appointments across multiple dates for 'All' filter testing")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating seed data: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_queue_data()
