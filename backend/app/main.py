from fastapi import FastAPI, Depends, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from .database import Base, engine, get_db
from .config import get_settings
from . import models, schemas
from .matching import calculate_match
from .ai import generate_dispatcher_answer
from .maps import compute_route
from .heuristics import generate_demo_loads, STATE_BY_CITY
from .messaging import send_email, send_sms
import re

settings = get_settings()
Base.metadata.create_all(bind=engine)
app = FastAPI(title=settings.app_name, version="1.0.0")

# CORS FIX FOR RENDER + BROWSER PREFLIGHTS
# Render/Vite frontends send OPTIONS preflight requests before POST/GET calls.
# Use CORS_ORIGINS="*" for MVP testing, or set it to a comma-separated list of frontend URLs.
# Example production value:
# CORS_ORIGINS=https://empty-mile-ai.onrender.com,https://yourdomain.com,http://localhost:5173
cors_origin_list = [o.strip() for o in (settings.cors_origins or "*").split(",") if o.strip()]
allow_all_origins = "*" in cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else cors_origin_list,
    allow_credentials=False if allow_all_origins else True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)



def extract_voice_details(transcript: str):
    text = transcript or ""
    lower = text.lower()
    unit_match = re.search(r"(?:truck|unit)\s*#?\s*([A-Za-z]{0,3}[- ]?\d{2,5})", text, re.I)
    origin_match = re.search(r"(?:empty in|in|at|from)\s+([A-Z][a-zA-Z .-]+?)(?:\s+(?:at|tomorrow|today|going|heading|to|with|dry|reefer|flatbed|box|power)|[,.]|$)", text, re.I)
    dest_match = re.search(r"(?:to|toward|back to|heading to|going to)\s+([A-Z][a-zA-Z .-]+?)(?:\s+(?:at|tomorrow|today|with|dry|reefer|flatbed|box|power)|[,.]|$)", text, re.I)
    trailer = "Dry Van"
    if "reefer" in lower: trailer = "Reefer"
    elif "flatbed" in lower: trailer = "Flatbed"
    elif "power only" in lower: trailer = "Power Only"
    elif "box truck" in lower or "box" in lower: trailer = "Box Truck"
    origin = (origin_match.group(1).strip().title() if origin_match else "Houston")
    destination = (dest_match.group(1).strip().title() if dest_match else "Dallas")
    unit = (unit_match.group(1).replace(" ", "-").upper() if unit_match else "TX-104")
    if unit.isdigit(): unit = f"TX-{unit}"
    return {
        "unit_number": unit,
        "current_city": origin,
        "current_state": STATE_BY_CITY.get(origin, "TX"),
        "desired_destination_city": destination,
        "desired_destination_state": STATE_BY_CITY.get(destination, "TX"),
        "trailer_type": trailer,
        "available_at": "Tomorrow 9 AM",
        "prompt": f"{text}\n\nExtracted by Empty Mile AI: truck {unit}, origin {origin}, destination {destination}, equipment {trailer}. Generate and rank return loads, then provide broker and driver next steps."
    }

def seed(db: Session):
    if db.query(models.Company).count() > 0:
        return
    company = models.Company(name="Demo Logistics LLC", contact_email="dispatch@example.com")
    db.add(company); db.flush()
    driver = models.Driver(name="James Carter", phone="+1-555-0100")
    db.add(driver); db.flush()
    truck = models.Truck(company_id=company.id, driver_id=driver.id, unit_number="TX-101", truck_type="Box Truck", trailer_type="Dry Van", capacity_lbs=12000, current_city="Houston", current_state="TX", desired_destination_city="Dallas", desired_destination_state="TX", available_at="Tomorrow 8:00 AM", mpg=8)
    db.add(truck)
    loads = [
        models.Load(company_id=company.id, shipper_name="Lone Star Foods", origin_city="Houston", origin_state="TX", destination_city="Dallas", destination_state="TX", pickup_time="Tomorrow 10:00 AM", delivery_time="Tomorrow 4:00 PM", trailer_type="Dry Van", weight_lbs=8000, rate=950, loaded_miles=239, notes="Palletized food products."),
        models.Load(company_id=company.id, shipper_name="Austin Retail Supply", origin_city="Houston", origin_state="TX", destination_city="Austin", destination_state="TX", pickup_time="Tomorrow 9:00 AM", delivery_time="Tomorrow 1:00 PM", trailer_type="Dry Van", weight_lbs=6000, rate=700, loaded_miles=165, notes="Good fallback if Dallas lane is unavailable."),
        models.Load(company_id=company.id, shipper_name="DFW Medical Supply", origin_city="Sugar Land", origin_state="TX", destination_city="Fort Worth", destination_state="TX", pickup_time="Tomorrow 11:30 AM", delivery_time="Tomorrow 6:30 PM", trailer_type="Dry Van", weight_lbs=5000, rate=1100, loaded_miles=275, deadhead_miles=20, notes="High-value medical supplies, appointment delivery."),
    ]
    db.add_all(loads)
    db.commit()

@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        seed(db)
    finally:
        db.close()


@app.options("/{rest_of_path:path}")
def preflight_handler(rest_of_path: str):
    # Extra safety for Render/browser preflight requests. CORSMiddleware handles this,
    # but this keeps OPTIONS from ever returning 400 during MVP testing.
    return Response(status_code=204)

@app.get("/")
def root():
    return {"status": "ok", "app": settings.app_name, "docs": "/docs", "health": "/health"}

@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}

@app.get("/dashboard")
@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    trucks = db.query(models.Truck).count()
    loads = db.query(models.Load).filter(models.Load.status == "available").count()
    matches = db.query(models.LoadMatch).count()
    recovered = db.query(func.coalesce(func.sum(models.LoadMatch.estimated_profit), 0)).scalar() or 0
    empty_saved = db.query(func.coalesce(func.sum(models.LoadMatch.empty_miles_saved), 0)).scalar() or 0
    return {"trucks": trucks, "available_loads": loads, "matches": matches, "estimated_revenue_recovered": round(recovered, 2), "empty_miles_saved": round(empty_saved, 2)}

@app.post("/companies", response_model=schemas.CompanyOut)
def create_company(payload: schemas.CompanyCreate, db: Session = Depends(get_db)):
    row = models.Company(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@app.get("/trucks", response_model=list[schemas.TruckOut])
def list_trucks(db: Session = Depends(get_db)):
    return db.query(models.Truck).order_by(models.Truck.id.desc()).all()

@app.post("/trucks", response_model=schemas.TruckOut)
def create_truck(payload: schemas.TruckCreate, db: Session = Depends(get_db)):
    row = models.Truck(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@app.get("/loads", response_model=list[schemas.LoadOut])
def list_loads(db: Session = Depends(get_db)):
    return db.query(models.Load).order_by(models.Load.id.desc()).all()

@app.post("/loads", response_model=schemas.LoadOut)
def create_load(payload: schemas.LoadCreate, db: Session = Depends(get_db)):
    row = models.Load(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@app.post("/match/{truck_id}", response_model=list[schemas.MatchOut])
async def match_truck(truck_id: int, db: Session = Depends(get_db)):
    truck = db.get(models.Truck, truck_id)
    if not truck:
        return []
    loads = db.query(models.Load).filter(models.Load.status == "available").all()
    results = []
    for load in loads:
        # Use Google Routes for loaded miles when a Maps key is configured; fallback miles keep the demo working.
        loaded_route = await compute_route(load.origin_city, load.origin_state, load.destination_city, load.destination_state)
        deadhead_route = await compute_route(truck.current_city, truck.current_state, load.origin_city, load.origin_state)
        data = calculate_match(truck, load, {"loaded_miles": loaded_route.get("distance_miles"), "deadhead_miles": deadhead_route.get("distance_miles")})
        match = models.LoadMatch(**data)
        db.add(match)
        db.flush()
        data["id"] = match.id
        data["load"] = load
        results.append(data)
    db.commit()
    return sorted(results, key=lambda x: x["score"], reverse=True)

@app.post("/chat", response_model=schemas.ChatResponse)
async def chat(payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    truck = db.get(models.Truck, payload.truck_id) if payload.truck_id else db.query(models.Truck).first()
    matches = []
    if truck:
        loads = db.query(models.Load).filter(models.Load.status == "available").all()
        for load in loads:
            loaded_route = await compute_route(load.origin_city, load.origin_state, load.destination_city, load.destination_state)
            deadhead_route = await compute_route(truck.current_city, truck.current_state, load.origin_city, load.origin_state)
            data = calculate_match(truck, load, {"loaded_miles": loaded_route.get("distance_miles"), "deadhead_miles": deadhead_route.get("distance_miles")})
            data["load"] = load
            matches.append(data)
        matches = sorted(matches, key=lambda x: x["score"], reverse=True)
    summaries = [f"Score {m['score']}: Load {m['load'].origin_city} to {m['load'].destination_city}, rate ${m['load'].rate}, profit ${m['estimated_profit']}. {m['explanation']}" for m in matches]
    answer = await generate_dispatcher_answer(payload.message, summaries)
    db.add(models.AIMessage(role="user", content=payload.message))
    db.add(models.AIMessage(role="assistant", content=answer))
    db.commit()
    return {"answer": answer, "matches": matches[:5]}

@app.post("/route", response_model=schemas.RouteResponse)
async def route(payload: schemas.RouteRequest):
    return await compute_route(payload.origin_city, payload.origin_state, payload.destination_city, payload.destination_state)

@app.post("/api/routes/calculate", response_model=schemas.RouteResponse)
async def route_api(payload: schemas.RouteRequest):
    return await compute_route(payload.origin_city, payload.origin_state, payload.destination_city, payload.destination_state)

# API aliases for the pitch/demo UI and future integrations
@app.get("/api/trucks", response_model=list[schemas.TruckOut])
def api_list_trucks(db: Session = Depends(get_db)):
    return list_trucks(db)

@app.post("/api/trucks", response_model=schemas.TruckOut)
def api_create_truck(payload: schemas.TruckCreate, db: Session = Depends(get_db)):
    return create_truck(payload, db)

@app.get("/api/loads", response_model=list[schemas.LoadOut])
def api_list_loads(db: Session = Depends(get_db)):
    return list_loads(db)

@app.post("/api/loads", response_model=schemas.LoadOut)
def api_create_load(payload: schemas.LoadCreate, db: Session = Depends(get_db)):
    return create_load(payload, db)

@app.post("/api/ai/dispatcher", response_model=schemas.ChatResponse)
async def api_dispatcher(payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    return await chat(payload, db)


@app.post("/api/voice/extract", response_model=schemas.VoiceExtractResponse)
def api_voice_extract(payload: schemas.VoiceExtractRequest):
    return extract_voice_details(payload.transcript)

@app.post("/api/loads/generate", response_model=list[schemas.LoadOut])
def api_generate_loads(payload: schemas.GenerateLoadsRequest, db: Session = Depends(get_db)):
    # Keep the demo clean: remove old AI-generated test loads for this lane before adding fresh ones.
    db.query(models.Load).filter(
        models.Load.notes.like("AI-generated test load%"),
        models.Load.origin_city == payload.origin_city,
        models.Load.origin_state == payload.origin_state,
        models.Load.destination_city == payload.destination_city,
        models.Load.trailer_type == payload.trailer_type,
    ).delete(synchronize_session=False)
    count = max(1, min(payload.count, 16))
    rows = generate_demo_loads(payload.origin_city, payload.origin_state, payload.destination_city, payload.trailer_type, count)
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows

@app.post("/api/messages/email", response_model=schemas.MessageSendResponse)
async def api_send_email(payload: schemas.MessageSendRequest):
    return await send_email(payload.to, payload.subject or "Empty Mile AI Load Inquiry", payload.body)

@app.post("/api/messages/sms", response_model=schemas.MessageSendResponse)
async def api_send_sms(payload: schemas.MessageSendRequest):
    return await send_sms(payload.to, payload.body)

@app.post("/documents", response_model=schemas.DocumentOut)
async def upload_document(doc_type: str = Form(...), load_id: int | None = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    summary = f"Uploaded {file.filename} as {doc_type}. Size: {len(content)} bytes. OCR/parser can be connected next."
    row = models.Document(load_id=load_id, doc_type=doc_type, filename=file.filename, parsed_summary=summary)
    db.add(row); db.commit(); db.refresh(row)
    return row


@app.get("/documents", response_model=list[schemas.DocumentOut])
@app.get("/api/documents", response_model=list[schemas.DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    return db.query(models.Document).order_by(models.Document.id.desc()).all()

@app.post("/api/documents/upload", response_model=schemas.DocumentOut)
async def api_upload_document(doc_type: str = Form(...), load_id: int | None = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await upload_document(doc_type, load_id, file, db)

@app.post("/api/documents/send-packet", response_model=schemas.MessageSendResponse)
async def api_send_document_packet(payload: schemas.DocumentPacketRequest, db: Session = Depends(get_db)):
    docs = db.query(models.Document).order_by(models.Document.id.desc()).limit(50).all()
    doc_lines = "\n".join([f"- {d.doc_type}: {d.filename}" for d in docs]) or "- No documents uploaded yet."
    body = payload.body or f"""Hello,

Please see the carrier document packet summary from Empty Mile AI.

Carrier: {payload.carrier_name}
Dispatcher: {payload.dispatcher_name}
Load/Lane: {payload.lane}

Documents on file:
{doc_lines}

Empty Mile AI can resend individual files or rate confirmations as needed.

Thank you."""
    return await send_email(payload.to, payload.subject or f"Carrier packet - {payload.carrier_name}", body)
