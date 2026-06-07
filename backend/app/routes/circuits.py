from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..database import get_db, Project, Circuit, Simulation
from ..schemas import ProjectCreate, ProjectResponse, CircuitCreate, CircuitResponse, SimulationCreate, SimulationResponse
from .auth import get_current_user, User
from ..simulation.mna import CircuitSolver

router = APIRouter(prefix="", tags=["circuits"])

# --- Project Routes ---
@router.post("/projects", response_model=ProjectResponse)
def create_project(project_in: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_project = Project(
        user_id=current_user.id,
        name=project_in.name,
        description=project_in.description
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.user_id == current_user.id).all()

@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# --- Circuit Routes ---
@router.post("/projects/{project_id}/circuits", response_model=CircuitResponse)
def create_circuit(project_id: int, circuit_in: CircuitCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify project belongs to user
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    new_circuit = Circuit(
        project_id=project_id,
        name=circuit_in.name,
        schematic_json=circuit_in.schematic_json,
        netlist_json=circuit_in.netlist_json
    )
    db.add(new_circuit)
    db.commit()
    db.refresh(new_circuit)
    return new_circuit

@router.get("/projects/{project_id}/circuits", response_model=List[CircuitResponse])
def list_circuits(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Circuit).filter(Circuit.project_id == project_id).all()

# --- Simulation Trigger Routes ---
@router.post("/circuits/{circuit_id}/simulate/dc")
def run_dc_simulation(circuit_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get circuit
    circuit = db.query(Circuit).join(Project).filter(Circuit.id == circuit_id, Project.user_id == current_user.id).first()
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
        
    netlist = circuit.netlist_json
    if not netlist or "components" not in netlist:
        raise HTTPException(status_code=400, detail="Circuit netlist is empty or invalid.")
        
    components = netlist.get("components", [])
    nodes_count = netlist.get("nodes_count", 0)
    
    # Solve DC
    results = CircuitSolver.solve_dc(components, nodes_count)
    if "error" in results:
        raise HTTPException(status_code=400, detail=results["error"])
        
    # Save simulation history
    db_sim = Simulation(
        circuit_id=circuit_id,
        sim_type="DC",
        parameters={"nodes_count": nodes_count},
        results_json=results
    )
    db.add(db_sim)
    db.commit()
    
    return results

@router.post("/circuits/{circuit_id}/simulate/transient")
def run_transient_simulation(circuit_id: int, params: Dict[str, Any], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    circuit = db.query(Circuit).join(Project).filter(Circuit.id == circuit_id, Project.user_id == current_user.id).first()
    if not circuit:
        raise HTTPException(status_code=404, detail="Circuit not found")
        
    netlist = circuit.netlist_json
    if not netlist or "components" not in netlist:
        raise HTTPException(status_code=400, detail="Circuit netlist is empty or invalid.")
        
    components = netlist.get("components", [])
    nodes_count = netlist.get("nodes_count", 0)
    
    # Parameters for solver
    t_stop = float(params.get("t_stop", 0.01))
    step = float(params.get("step", 5e-5))
    
    # Solve Transient
    results = CircuitSolver.solve_transient(components, nodes_count, t_stop=t_stop, step=step)
    
    db_sim = Simulation(
        circuit_id=circuit_id,
        sim_type="Transient",
        parameters={"t_stop": t_stop, "step": step},
        results_json=results
    )
    db.add(db_sim)
    db.commit()
    
    return results
