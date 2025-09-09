from datetime import datetime

def generate_order_id(db_id: int) -> str:
    return f"ORD-{datetime.now().strftime('%Y%m%d')}-{db_id:04d}"

def generate_reservation_id(db_id: int) -> str:
    return f"RES-{datetime.now().strftime('%Y%m%d')}-{db_id:04d}"
