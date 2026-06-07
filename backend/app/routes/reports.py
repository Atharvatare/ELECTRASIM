import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db, Report, Project, Circuit, Simulation, Machine
from ..schemas import ReportCreate, ReportResponse
from .auth import get_current_user, User
from ..reports.pdf_generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/generate", response_model=ReportResponse)
def generate_project_report(req: ReportCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify project
    proj = db.query(Project).filter(Project.id == req.project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    circuit_name = "N/A"
    results = {}
    formulas = ["Kirchhoff's Current Law: sum(I) = 0", "Kirchhoff's Voltage Law: sum(V) = 0"]
    
    # 1. Fetch simulation results if specified
    if req.simulation_id:
        sim = db.query(Simulation).filter(Simulation.id == req.simulation_id).first()
        if sim:
            results = sim.results_json or {}
            circuit = db.query(Circuit).filter(Circuit.id == sim.circuit_id).first()
            if circuit:
                circuit_name = circuit.name
                
    # 2. Fetch machine characteristics if specified
    elif req.machine_id:
        machine = db.query(Machine).filter(Machine.id == req.machine_id).first()
        if machine:
            circuit_name = machine.machine_type.replace("_", " ")
            # Format inputs/outputs into results for the report generator
            results = {
                "voltages": {f"Input_{k}": float(v) for k, v in machine.inputs.items() if isinstance(v, (int, float))},
                "currents": {f"Output_{k}": float(v) for k, v in machine.outputs.items() if isinstance(v, (int, float))}
            }
            if machine.machine_type == "DC_Motor":
                formulas = [
                    "Back EMF: Eb = V - Ia * Ra",
                    "Mechanical Power: Pmech = Eb * Ia",
                    "Net Torque: T = Pout / omega",
                    "Efficiency: (%) = (Pout / Pin) * 100"
                ]
            elif machine.machine_type == "Induction_Motor":
                formulas = [
                    "Synchronous Speed: Ns = 120 * f / P",
                    "Slip: s = (Ns - Nr) / Ns",
                    "Developed Torque: T_dev = P_airgap / omega_s",
                    "Efficiency: (%) = (Pout / Pin) * 100"
                ]
            elif machine.machine_type == "Transformer":
                formulas = [
                    "Turns Ratio: a = V1_nom / V2_nom",
                    "Equivalent Resistance: Req = R1 + a^2 * R2",
                    "Voltage Regulation: (%) = (|V1| - |V2'|) / |V2'| * 100",
                    "Efficiency: (%) = (Pout / (Pout + CopperLoss + IronLoss)) * 100"
                ]
                
    # Generate relative filepath
    report_dir = "static/reports"
    os.makedirs(report_dir, exist_ok=True)
    
    filename = f"{report_dir}/report_{req.project_id}_{os.urandom(4).hex()}.pdf"
    
    # Compile PDF
    try:
        ReportGenerator.generate_pdf(
            filename=filename,
            project_name=proj.name,
            author_name=current_user.name,
            circuit_name=circuit_name,
            results=results,
            summary=req.summary,
            formulas=formulas
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile report PDF: {str(e)}")
        
    # Save Report record to database
    db_report = Report(
        project_id=req.project_id,
        name=req.name,
        file_path=filename,
        summary=req.summary
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return db_report

@router.get("/list/{project_id}", response_model=List[ReportResponse])
def list_project_reports(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(Report).filter(Report.project_id == project_id).all()

@router.get("/{report_id}/download")
def download_report_pdf(report_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get report
    report = db.query(Report).join(Project).filter(Report.id == report_id, Project.user_id == current_user.id).first()
    if not report or not report.file_path:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk.")
        
    return FileResponse(report.file_path, media_type="application/pdf", filename=os.path.basename(report.file_path))
