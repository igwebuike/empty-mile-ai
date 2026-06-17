from pydantic import BaseModel

class CompanyCreate(BaseModel):
    name: str
    contact_email: str | None = None
class CompanyOut(CompanyCreate):
    id: int
    class Config: from_attributes = True

class DriverCreate(BaseModel):
    name: str
    phone: str | None = None
    status: str = "available"
class DriverOut(DriverCreate):
    id: int
    class Config: from_attributes = True

class TruckCreate(BaseModel):
    company_id: int = 1
    driver_id: int | None = None
    unit_number: str
    truck_type: str = "Box Truck"
    trailer_type: str = "Dry Van"
    capacity_lbs: float = 10000
    current_city: str
    current_state: str
    desired_destination_city: str | None = None
    desired_destination_state: str | None = None
    available_at: str | None = None
    status: str = "available"
    mpg: float = 7.0
class TruckOut(TruckCreate):
    id: int
    class Config: from_attributes = True

class LoadCreate(BaseModel):
    company_id: int | None = 1
    shipper_name: str | None = None
    origin_city: str
    origin_state: str
    destination_city: str
    destination_state: str
    pickup_time: str | None = None
    delivery_time: str | None = None
    trailer_type: str = "Dry Van"
    weight_lbs: float = 0
    rate: float = 0
    loaded_miles: float = 0
    deadhead_miles: float = 0
    status: str = "available"
    notes: str | None = None
class LoadOut(LoadCreate):
    id: int
    class Config: from_attributes = True

class MatchOut(BaseModel):
    id: int | None = None
    truck_id: int
    load_id: int
    score: float
    estimated_profit: float
    estimated_cost: float
    rate_per_mile: float
    empty_miles_saved: float
    explanation: str
    load: LoadOut | None = None
    class Config: from_attributes = True

class ChatRequest(BaseModel):
    message: str
    truck_id: int | None = None
class ChatResponse(BaseModel):
    answer: str
    matches: list[MatchOut] = []

class RouteRequest(BaseModel):
    origin_city: str
    origin_state: str
    destination_city: str
    destination_state: str

class RouteResponse(BaseModel):
    origin: str
    destination: str
    distance_miles: float
    duration_minutes: float
    source: str
    polyline: str | None = None
    warning: str | None = None

class DocumentOut(BaseModel):
    id: int
    doc_type: str
    filename: str
    parsed_summary: str | None = None
    class Config: from_attributes = True
