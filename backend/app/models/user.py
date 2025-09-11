from sqlalchemy import Column, Integer, String, DateTime
import datetime
from ..database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    restaurant_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)