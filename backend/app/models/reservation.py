import datetime
from sqlalchemy import Column, Integer, String, DateTime
from ..database import Base  # Changed from .base to ..database

class Reservation(Base):
    __tablename__ = "reservations"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    reservation_id = Column(String, unique=True, index=True)  # Human-readable ID
    customer_name = Column(String, nullable=False)
    time_slot = Column(String, nullable=False)  # renamed from datetime to avoid clash
    people = Column(Integer, default=1)
    status = Column(String, default="confirmed")  # confirmed, cancelled, completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)