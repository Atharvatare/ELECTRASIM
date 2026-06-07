from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db, Machine, Project
from ..schemas import MachineCreate, MachineResponse
from .auth import get_current_user, User
from ..machines.dc_motor import DCMotorAnalyzer
from ..machines.induction_motor import InductionMotorAnalyzer
from ..machines.synchronous_motor import SynchronousMotorAnalyzer
from ..machines.transformer import TransformerAnalyzer

router = APIRouter(prefix="/machines", tags=["machines"])

@router.post("/dc-motor", response_model=MachineResponse)
def analyze_dc_motor(machine_in: MachineCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify project
    proj = db.query(Project).filter(Project.id == machine_in.project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    inputs = machine_in.inputs
    try:
        outputs = DCMotorAnalyzer.analyze(
            voltage=float(inputs["voltage"]),
            current=float(inputs["current"]),
            armature_resistance=float(inputs["armature_resistance"]),
            speed_rpm=float(inputs["speed_rpm"]),
            constant_losses=float(inputs.get("constant_losses", 50.0))
        )
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing input parameter: {str(e)}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid parameter types. Must be numeric.")
        
    if "error" in outputs:
        raise HTTPException(status_code=400, detail=outputs["error"])
        
    db_machine = Machine(
        project_id=machine_in.project_id,
        machine_type="DC_Motor",
        inputs=inputs,
        outputs=outputs
    )
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine

@router.post("/induction-motor", response_model=MachineResponse)
def analyze_induction_motor(machine_in: MachineCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == machine_in.project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    inputs = machine_in.inputs
    try:
        outputs = InductionMotorAnalyzer.analyze(
            voltage=float(inputs["voltage"]),
            frequency=float(inputs["frequency"]),
            poles=int(inputs["poles"]),
            rotor_speed=float(inputs["rotor_speed"]),
            r1=float(inputs.get("r1", 0.5)),
            x1=float(inputs.get("x1", 1.2)),
            r2=float(inputs.get("r2", 0.4)),
            x2=float(inputs.get("x2", 1.0)),
            xm=float(inputs.get("xm", 25.0)),
            rotational_losses=float(inputs.get("rotational_losses", 150.0))
        )
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing input parameter: {str(e)}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid parameter types.")
        
    if "error" in outputs:
        raise HTTPException(status_code=400, detail=outputs["error"])
        
    db_machine = Machine(
        project_id=machine_in.project_id,
        machine_type="Induction_Motor",
        inputs=inputs,
        outputs=outputs
    )
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine

@router.post("/synchronous-motor", response_model=MachineResponse)
def analyze_synchronous_motor(machine_in: MachineCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == machine_in.project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    inputs = machine_in.inputs
    try:
        outputs = SynchronousMotorAnalyzer.analyze(
            voltage=float(inputs["voltage"]),
            frequency=float(inputs["frequency"]),
            poles=int(inputs["poles"]),
            excitation_voltage=float(inputs["excitation_voltage"]),
            torque_angle_deg=float(inputs["torque_angle_deg"]),
            xs=float(inputs.get("xs", 8.0)),
            ra=float(inputs.get("ra", 0.4)),
            rotational_losses=float(inputs.get("rotational_losses", 200.0))
        )
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing input parameter: {str(e)}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid parameter types.")
        
    if "error" in outputs:
        raise HTTPException(status_code=400, detail=outputs["error"])
        
    db_machine = Machine(
        project_id=machine_in.project_id,
        machine_type="Synchronous_Motor",
        inputs=inputs,
        outputs=outputs
    )
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine

@router.post("/transformer", response_model=MachineResponse)
def analyze_transformer(machine_in: MachineCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == machine_in.project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    inputs = machine_in.inputs
    try:
        outputs = TransformerAnalyzer.analyze(
            v1_nominal=float(inputs["v1_nominal"]),
            v2_nominal=float(inputs["v2_nominal"]),
            load_kva=float(inputs["load_kva"]),
            load_pf=float(inputs["load_pf"]),
            pf_type=inputs.get("pf_type", "Lagging"),
            r1=float(inputs.get("r1", 0.2)),
            x1=float(inputs.get("x1", 0.6)),
            r2=float(inputs.get("r2", 0.005)),
            x2=float(inputs.get("x2", 0.015)),
            rc=float(inputs.get("rc", 5000.0)),
            xm=float(inputs.get("xm", 1500.0))
        )
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing input parameter: {str(e)}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid parameter types.")
        
    if "error" in outputs:
        raise HTTPException(status_code=400, detail=outputs["error"])
        
    db_machine = Machine(
        project_id=machine_in.project_id,
        machine_type="Transformer",
        inputs=inputs,
        outputs=outputs
    )
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine
