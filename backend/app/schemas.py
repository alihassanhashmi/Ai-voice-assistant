from pydantic import BaseModel



class ReservationCreate(BaseModel):
    customer_name: str
    datetime: str
    people: int

class UpdateOrderStatus(BaseModel):
    status: str 


