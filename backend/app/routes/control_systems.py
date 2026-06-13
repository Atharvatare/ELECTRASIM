from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List
from ..control_systems.ss_solvers import StateSpaceSolver
from .auth import get_current_user, User

router = APIRouter(prefix="/control-systems", tags=["control-systems"])

# Input validation schemas
class SystemAnalyzeRequest(BaseModel):
    A: List[List[float]] = Field(..., description="System matrix A (n x n)")
    B: List[List[float]] = Field(..., description="Input matrix B (n x m)")
    C: List[List[float]] = Field(..., description="Output matrix C (p x n)")

class PolePlacementRequest(BaseModel):
    A: List[List[float]] = Field(..., description="System matrix A (n x n)")
    B: List[List[float]] = Field(..., description="Input matrix B (n x 1)")
    desired_poles: List[float] = Field(..., description="Desired closed loop poles list")

@router.post("/analyze")
def analyze_system(req: SystemAnalyzeRequest, current_user: User = Depends(get_current_user)):
    # 1. Safety Checks (Boundary bounds to prevent heavy CPU loads)
    n = len(req.A)
    if n == 0 or n > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="System dimension n must be between 1 and 4 for computational limits."
        )
    for row in req.A:
        if len(row) != n:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Matrix A must be square."
            )
            
    # Verify dimensions for B and C
    if len(req.B) != n:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Matrix B must have {n} rows."
        )
    for row in req.C:
        if len(row) != n:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Matrix C must have {n} columns."
            )

    # Solve
    res = StateSpaceSolver.analyze_system(req.A, req.B, req.C)
    if "error" in res:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])
        
    return res

@router.post("/design-pole")
def design_controller(req: PolePlacementRequest, current_user: User = Depends(get_current_user)):
    n = len(req.A)
    if n == 0 or n > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="System dimension n must be between 1 and 4."
        )
    for row in req.A:
        if len(row) != n:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Matrix A must be square."
            )

    if len(req.B) != n:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Matrix B must have {n} rows."
        )
    for row in req.B:
        if len(row) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Ackermann's formula requires single-input system (B must be n x 1)."
            )

    if len(req.desired_poles) != n:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Desired poles list size must match system dimension {n}."
        )

    res = StateSpaceSolver.design_pole_placement(req.A, req.B, req.desired_poles)
    if "error" in res:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])

    return res
