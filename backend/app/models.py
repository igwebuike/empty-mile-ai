from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False, unique=True)
    contact_email = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    trucks = relationship("Truck", back_populates="company")
    loads = relationship("Load", back_populates="company")

class Driver(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True)
    status = Column(String(50), default="available")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Truck(Base):
    __tablename__ = "trucks"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    unit_number = Column(String(50), nullable=False)
    truck_type = Column(String(100), nullable=False)
    trailer_type = Column(String(100), nullable=False)
    capacity_lbs = Column(Float, default=10000)
    current_city = Column(String(100), nullable=False)
    current_state = Column(String(50), nullable=False)
    desired_destination_city = Column(String(100), nullable=True)
    desired_destination_state = Column(String(50), nullable=True)
    available_at = Column(String(80), nullable=True)
    status = Column(String(50), default="available")
    mpg = Column(Float, default=7.0)
    company = relationship("Company", back_populates="trucks")
    driver = relationship("Driver")

class Load(Base):
    __tablename__ = "loads"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    shipper_name = Column(String(150), nullable=True)
    origin_city = Column(String(100), nullable=False)
    origin_state = Column(String(50), nullable=False)
    destination_city = Column(String(100), nullable=False)
    destination_state = Column(String(50), nullable=False)
    pickup_time = Column(String(80), nullable=True)
    delivery_time = Column(String(80), nullable=True)
    trailer_type = Column(String(100), nullable=False)
    weight_lbs = Column(Float, default=0)
    rate = Column(Float, default=0)
    loaded_miles = Column(Float, default=0)
    deadhead_miles = Column(Float, default=0)
    status = Column(String(50), default="available")
    notes = Column(Text, nullable=True)
    company = relationship("Company", back_populates="loads")

class LoadMatch(Base):
    __tablename__ = "load_matches"
    id = Column(Integer, primary_key=True)
    truck_id = Column(Integer, ForeignKey("trucks.id"), nullable=False)
    load_id = Column(Integer, ForeignKey("loads.id"), nullable=False)
    score = Column(Float, default=0)
    estimated_profit = Column(Float, default=0)
    estimated_cost = Column(Float, default=0)
    rate_per_mile = Column(Float, default=0)
    empty_miles_saved = Column(Float, default=0)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    truck = relationship("Truck")
    load = relationship("Load")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    load_id = Column(Integer, ForeignKey("loads.id"), nullable=True)
    doc_type = Column(String(80), nullable=False)
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=True)
    parsed_summary = Column(Text, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class AIMessage(Base):
    __tablename__ = "ai_messages"
    id = Column(Integer, primary_key=True)
    role = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
