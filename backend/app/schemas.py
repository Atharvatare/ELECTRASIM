from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- Auth Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "Student"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserBase

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Circuit Schemas ---
class CircuitBase(BaseModel):
    name: str
    schematic_json: Dict[str, Any]
    netlist_json: Optional[Dict[str, Any]] = None

class CircuitCreate(CircuitBase):
    pass

class CircuitResponse(CircuitBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Simulation Schemas ---
class SimulationBase(BaseModel):
    sim_type: str  # DC, AC, Transient
    parameters: Dict[str, Any]

class SimulationCreate(SimulationBase):
    circuit_id: int

class SimulationResponse(SimulationBase):
    id: int
    circuit_id: int
    results_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Machine Schemas ---
class MachineBase(BaseModel):
    machine_type: str  # DC_Motor, Induction_Motor, Synchronous_Motor, Transformer
    inputs: Dict[str, Any]

class MachineCreate(MachineBase):
    project_id: int

class MachineResponse(MachineBase):
    id: int
    project_id: int
    outputs: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Power Electronics Schemas ---
class PowerElectronicsSimRequest(BaseModel):
    converter_type: str  # half_wave_rectifier, full_wave_rectifier, bridge_rectifier, inverter, chopper
    inputs: Dict[str, Any]

class PowerElectronicsSimResponse(BaseModel):
    converter_type: str
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]
    waveforms: Dict[str, Any]

# --- AI Schemas ---
class AIChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: Optional[datetime] = None

class AIAskRequest(BaseModel):
    project_id: int
    netlist: Optional[Dict[str, Any]] = None
    question: str

class AIAskResponse(BaseModel):
    answer: str
    steps: Optional[List[str]] = None

# --- Report Schemas ---
class ReportCreate(BaseModel):
    project_id: int
    name: str
    summary: Optional[str] = None
    circuit_id: Optional[int] = None
    machine_id: Optional[int] = None
    simulation_id: Optional[int] = None

class ReportResponse(BaseModel):
    id: int
    project_id: int
    name: str
    file_path: Optional[str] = None
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
