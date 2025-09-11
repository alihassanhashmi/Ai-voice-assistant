from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from . import database
from .models.order import Order
from .models.reservation import Reservation
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from .langchain import resolve_issue_with_guidelines, add_document_to_vectorstore
from fastapi import HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import os
import shutil
from fastapi import UploadFile, File, Form
from .models.user import User
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import Depends, HTTPException, status
from .auth import get_current_user
from jose import JWTError, jwt
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from . import database
from .models.user import User  # Add this import
from .auth import get_password_hash, verify_password, create_access_token, get_current_user, oauth2_scheme
# Add this import for JWTError and jwt
app = FastAPI()

# JWT settings
SECRET_KEY = "your_super_secret_key"  # Replace with a secure, random key in production
ALGORITHM = "HS256"  # Add this line to define the algorithm

UPLOAD_DIR = "uploaded_documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)
# Make sure your CORS middleware allows file uploads
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/admin/upload-document")
async def upload_document(file: UploadFile = File(...)):
    try:
        # Save the file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the document for RAG
        result = add_document_to_vectorstore(file_path)
        
        return {
            "message": "File uploaded and processed successfully",
            "filename": file.filename,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
    finally:
        file.file.close()

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
class MenuInquiryRequest(BaseModel):
    question: str

@app.post("/menu-inquiry")
def menu_inquiry(request: MenuInquiryRequest, db: Session = Depends(get_db)):
    """
    Handle menu-related questions using RAG
    """
    try:
        # Use your existing RAG system
        response = resolve_issue_with_guidelines(request.question)
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing menu inquiry: {str(e)}")
# ========================= ADMIN ENDPOINTS =========================
class UpdateOrderStatus(BaseModel):
    status: str 

 # 'delivered' or 'canceled'

# ================= Admin Endpoints =================
@app.get("/admin/orders")
def get_all_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Now only authenticated users can access this
    orders = db.query(Order).all()
    return {"orders": [ 
        {
            "id": o.id,
            "customer_name": o.customer_name,
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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
class CustomerCancelRequest(BaseModel):
    customer_name: str
# Add this to your main.py
# Add this to your main.py after the admin endpoints

class CustomerCancelRequest(BaseModel):
    customer_name: str

@app.patch("/customer/orders/{order_id}/cancel")
def customer_cancel_order(
    order_id: int, 
    cancel_request: CustomerCancelRequest, 
    db: Session = Depends(get_db)
):
    """
    Customer-facing endpoint to cancel their own order with name verification
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify customer name matches (case-insensitive)
    if order.customer_name.lower() != cancel_request.customer_name.lower():
        raise HTTPException(
            status_code=403, 
            detail="Order not found for this customer name"
        )

    # Check if order is already canceled
    if order.status == "canceled":
        raise HTTPException(
            status_code=400, 
            detail="Order is already canceled"
        )

    # Check if order can be canceled (within 5 minutes)
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    if (now - order.created_at) > timedelta(minutes=5):
        raise HTTPException(
            status_code=400, 
            detail="Order cannot be canceled after 5 minutes"
        )
    
    # Update order status
    order.status = "canceled"
    db.commit()
    db.refresh(order)
    
    return {
        "message": f"Order #{order.id} has been canceled successfully",
        "order": {
            "id": order.id,
            "customer_name": order.customer_name,
            "item": order.item,
            "quantity": order.quantity,
            "status": order.status,
            "created_at": order.created_at
        }
    }

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    restaurant_name: str

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        restaurant_name=user.restaurant_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create restaurant-specific database
    restaurant_db_path = f"restaurant_{db_user.id}.db"
    # Code to create separate database would go here
    
    return {"message": "User created successfully", "user_id": db_user.id}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user