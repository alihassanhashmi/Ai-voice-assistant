from sqlalchemy.orm import Session
from .models.conversation import Order, Reservation
from .utils.id_generator import generate_order_id, generate_reservation_id

def create_order(db: Session, items: str, quantity: int, customer_name: str):
    order = Order(items=items, quantity=quantity, customer_name=customer_name)
    db.add(order)
    db.commit()
    db.refresh(order)

    # Generate pretty order_id
    order.order_id = generate_order_id(order.id)
    db.commit()
    db.refresh(order)

    return order

def create_reservation(db: Session, customer_name: str, datetime_str: str, people: int):
    reservation = Reservation(customer_name=customer_name, datetime=datetime_str, people=people)
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    # Generate pretty reservation_id
    reservation.reservation_id = generate_reservation_id(reservation.id)
    db.commit()
    db.refresh(reservation)

    return reservation
