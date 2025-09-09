from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from . import database
from .models.order import Order
from .models.reservation import Reservation
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from .langchain import resolve_issue_with_guidelines
from fastapi import HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
database.init_db()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class OrderRequest(BaseModel):
    customer_name: str
    phone_number: str
    item: str
    quantity: int = 1


@app.post("/order")
def create_order(order: OrderRequest, db: Session = Depends(get_db)):
    new_order = Order(
        customer_name=order.customer_name,
        phone_number=order.phone_number,
        item=order.item,
        quantity=order.quantity
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return {"message": "Order placed successfully", "order_id": new_order.id}

@app.post("/reservation")
def create_reservation(customer_name: str, time_slot: str, people: int, db: Session = Depends(get_db)):
    # Generate a unique reservation ID
    reservation_id = f"RES{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    
    
    reservation = Reservation(
        reservation_id=reservation_id,
        customer_name=customer_name, 
        time_slot=time_slot,
        people=people
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return {"message": "Reservation created successfully", "reservation_id": reservation.id}

@app.get("/location")
def get_location():
    return {
        "message": "Our restaurant is located at Main Boulevard, Multan City.",
        "map_link": "https://maps.google.com/?q=Main+Boulevard+Multan"
    }
class IssueRequest(BaseModel):
    text: str

@app.post("/resolve-issue")
async def resolve_issue_endpoint(req: IssueRequest):
    """
    Resolve client issue using restaurant guidelines stored in vector store.
    """
    response = resolve_issue_with_guidelines(req.text)
    return {"response": response}
# ... existing imports and endpoints ...

# ========================= ADMIN ENDPOINTS =========================
class UpdateOrderStatus(BaseModel):
    status: str 

 # 'delivered' or 'canceled'

# ================= Admin Endpoints =================
@app.get("/admin/orders")
def get_all_orders(db: Session = Depends(get_db)):
    """
    Get all orders for admin view.
    """
    orders = db.query(Order).all()
    return {"orders": [ 
        {
            "id": o.id,
            "customer_name": o.customer_name,
            "phone_number": o.phone_number,
            "item": o.item,
            "quantity": o.quantity,
            "status": o.status,
            "created_at": o.created_at
        } for o in orders
    ]}

@app.patch("/admin/orders/{order_id}")
def update_order_status(order_id: int, update: UpdateOrderStatus, db: Session = Depends(get_db)):
    """
    Update status of a specific order. Only allow cancel within 5 minutes.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    from datetime import datetime, timedelta
    now = datetime.utcnow()
    
    if update.status.lower() == "canceled":
        if (now - order.created_at) > timedelta(minutes=5):
            raise HTTPException(status_code=400, detail="Order cannot be canceled after 5 minutes")
    
    order.status = update.status.lower()
    db.commit()
    db.refresh(order)
    return {"message": f"Order #{order.id} status updated to {order.status}", "order": {
        "id": order.id,
        "customer_name": order.customer_name,
        "phone_number": order.phone_number,
        "item": order.item,
        "quantity": order.quantity,
        "status": order.status,
        "created_at": order.created_at
    }}
