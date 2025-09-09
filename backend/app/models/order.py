from sqlalchemy import Column, Integer, String, DateTime
import datetime
from ..database import Base

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    item = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    status = Column(String, default="pending") # pending, preparing, ready, delivered
    created_at = Column(DateTime, default=datetime.datetime.utcnow) 