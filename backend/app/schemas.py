from pydantic import BaseModel, Field

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
    unit_number: str = "TX-104"
    truck_type: str = "Box Truck"
    trailer_type: str = "Dry Van"
    capacity_lbs: float = 10000
    current_city: str = "Houston"
    current_state: str = "TX"
    desired_destination_city: str | None = "Dallas"
    desired_destination_state: str | None = "TX"
    available_at: str | None = "Tomorrow 9 AM"
    status: str = "available"
    mpg: float = 7.0
class TruckOut(TruckCreate):
    id: int
    class Config: from_attributes = True

class LoadCreate(BaseModel):
    company_id: int | None = 1
    shipper_name: str | None = "Demo Broker"
    origin_city: str = "Houston"
    origin_state: str = "TX"
    destination_city: str = "Dallas"
    destination_state: str = "TX"
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
    message: str = "Find the best return load."
    truck_id: int | None = None
class ChatResponse(BaseModel):
    answer: str
    matches: list[MatchOut] = []

class RouteRequest(BaseModel):
    origin_city: str = "Houston"
    origin_state: str = "TX"
    destination_city: str = "Dallas"
    destination_state: str = "TX"

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


class GenerateLoadsRequest(BaseModel):
    origin_city: str = "Houston"
    origin_state: str = "TX"
    destination_city: str | None = "Dallas"
    trailer_type: str = "Dry Van"
    count: int = 18

class MessageSendRequest(BaseModel):
    to: str = "demo@example.com"
    subject: str | None = None
    body: str = "Empty Mile AI message"

class MessageSendResponse(BaseModel):
    status: str
    channel: str
    detail: str | None = None
    to: str | None = None
    subject: str | None = None
    provider_response: dict | None = None

class VoiceExtractRequest(BaseModel):
    transcript: str = "Truck 104 is empty in Houston and needs a return load to Dallas."

class VoiceExtractResponse(BaseModel):
    unit_number: str
    current_city: str
    current_state: str
    desired_destination_city: str
    desired_destination_state: str
    trailer_type: str
    available_at: str
    prompt: str


class DocumentPacketRequest(BaseModel):
    to: str = "broker@example.com"
    subject: str | None = None
    body: str | None = None
    carrier_name: str = "Demo Logistics LLC"
    dispatcher_name: str = "Dispatcher"
    lane: str = "Houston TX to Dallas TX"
