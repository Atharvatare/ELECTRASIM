from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import cmath
import math
from ..power_systems.abcd import TransmissionLineCalculator
from .auth import get_current_user, User

router = APIRouter(prefix="/power-systems", tags=["power-systems"])

# --- Request & Response Schemas ---
class ABCDRequest(BaseModel):
    model: str  # "short", "medium_pi", "medium_t", "long"
    voltage_r_ll_kv: float
    power_mw: float
    power_factor: float
    pf_type: str
    r_total: float
    x_total: float
    g_total: float = 0.0
    b_total: float = 0.0
    length_km: float = 100.0

class FaultRequest(BaseModel):
    fault_type: str  # "three_phase", "l_g", "l_l", "l_l_g"
    r1: float
    x1: float
    r2: float
    x2: float
    r0: float
    x0: float
    vf_kv: float = 11.0  # Prefault L-L voltage
    rf: float = 0.0      # Fault resistance
    xf: float = 0.0      # Fault reactance

class LoadFlowRequest(BaseModel):
    # Optional parameters to override defaults
    max_iterations: int = 5
    v1_mag: float = 1.05
    v2_mag: float = 1.03
    p2_gen: float = 0.5
    p3_load: float = -0.8
    q3_load: float = -0.4

@router.post("/transmission")
def calculate_transmission_line(req: ABCDRequest, current_user: User = Depends(get_current_user)):
    try:
        res = TransmissionLineCalculator.calculate(
            model=req.model,
            voltage_r_ll_kv=req.voltage_r_ll_kv,
            power_mw=req.power_mw,
            power_factor=req.power_factor,
            pf_type=req.pf_type,
            r_total=req.r_total,
            x_total=req.x_total,
            g_total=req.g_total,
            b_total=req.b_total,
            length_km=req.length_km
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation error: {str(e)}")

@router.post("/fault")
def calculate_fault(req: FaultRequest, current_user: User = Depends(get_current_user)):
    try:
        # Symmetrical components fault analysis
        Z1 = complex(req.r1, req.x1)
        Z2 = complex(req.r2, req.x2)
        Z0 = complex(req.r0, req.x0)
        Zf = complex(req.rf, req.xf)
        
        # Base voltage LN
        Vf = (req.vf_kv * 1000.0) / math.sqrt(3.0) + 0j
        
        ft = req.fault_type.lower()
        if ft == "three_phase":
            # Symmetrical fault: If1 = Vf / (Z1 + Zf)
            if1 = Vf / (Z1 + Zf)
            if2 = 0j
            if0 = 0j
            # Fault current magnitude is |If1|
            if_a = if1
            if_b = if1 * cmath.rect(1.0, -2.0 * math.pi / 3.0)
            if_c = if1 * cmath.rect(1.0, 2.0 * math.pi / 3.0)
            fault_current_a = abs(if_a)
            fault_current_b = abs(if_b)
            fault_current_c = abs(if_c)
        elif ft == "l_g":
            # LG fault: If1 = If2 = If0 = Vf / (Z1 + Z2 + Z0 + 3*Zf)
            if0 = Vf / (Z1 + Z2 + Z0 + 3.0 * Zf)
            if1 = if0
            if2 = if0
            # Phase currents: Ia = 3*If0, Ib = 0, Ic = 0 (assuming phase A is faulted)
            if_a = 3.0 * if0
            if_b = 0j
            if_c = 0j
            fault_current_a = abs(if_a)
            fault_current_b = 0.0
            fault_current_c = 0.0
        elif ft == "l_l":
            # LL fault (phases B to C): If1 = Vf / (Z1 + Z2 + Zf), If2 = -If1, If0 = 0
            if1 = Vf / (Z1 + Z2 + Zf)
            if2 = -if1
            if0 = 0j
            # Phase currents: Ia = 0, Ib = -j * sqrt(3) * If1, Ic = j * sqrt(3) * If1
            # Using sequence transformation:
            # Ib = a^2*If1 + a*If2 = (a^2 - a)*If1 = -j*sqrt(3)*If1
            a = cmath.rect(1.0, 2.0 * math.pi / 3.0)
            a2 = cmath.rect(1.0, -2.0 * math.pi / 3.0)
            if_a = 0j
            if_b = a2 * if1 + a * if2
            if_c = a * if1 + a2 * if2
            fault_current_a = 0.0
            fault_current_b = abs(if_b)
            fault_current_c = abs(if_c)
        elif ft == "l_l_g":
            # LLG fault (phases B and C to ground):
            # Parallel sequence networks
            Z_parallel = (Z2 * (Z0 + 3.0 * Zf)) / (Z2 + Z0 + 3.0 * Zf)
            if1 = Vf / (Z1 + Z_parallel)
            # Current division
            if2 = -if1 * (Z0 + 3.0 * Zf) / (Z2 + Z0 + 3.0 * Zf)
            if0 = -if1 * Z2 / (Z2 + Z0 + 3.0 * Zf)
            
            # Phase currents
            a = cmath.rect(1.0, 2.0 * math.pi / 3.0)
            a2 = cmath.rect(1.0, -2.0 * math.pi / 3.0)
            if_a = if0 + if1 + if2
            if_b = if0 + a2 * if1 + a * if2
            if_c = if0 + a * if1 + a2 * if2
            fault_current_a = abs(if_a)
            fault_current_b = abs(if_b)
            fault_current_c = abs(if_c)
        else:
            raise ValueError(f"Unknown fault type: {req.fault_type}")
            
        return {
            "sequence_currents": {
                "positive": {"real": if1.real, "imag": if1.imag, "mag": abs(if1)},
                "negative": {"real": if2.real, "imag": if2.imag, "mag": abs(if2)},
                "zero": {"real": if0.real, "imag": if0.imag, "mag": abs(if0)}
            },
            "phase_currents_a": round(fault_current_a, 2),
            "phase_currents_b": round(fault_current_b, 2),
            "phase_currents_c": round(fault_current_c, 2),
            "neutral_fault_current": round(3.0 * abs(if0), 2) if ft in ("l_g", "l_l_g") else 0.0
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/load-flow")
def run_load_flow(req: LoadFlowRequest, current_user: User = Depends(get_current_user)):
    try:
        # 3-Bus Gauss-Seidel load flow solver
        # Base parameters
        V1 = req.v1_mag + 0j
        V2 = req.v2_mag + 0j
        V3 = 1.0 + 0j # Initial guess PQ bus
        
        # Default line impedances (pu)
        z12 = 0.02 + 0.06j
        z13 = 0.03 + 0.09j
        z23 = 0.02 + 0.06j
        
        y12 = 1.0 / z12
        y13 = 1.0 / z13
        y23 = 1.0 / z23
        
        # Y-Bus formulation
        Y11 = y12 + y13
        Y22 = y12 + y23
        Y33 = y13 + y23
        
        Y12 = Y21 = -y12
        Y13 = Y31 = -y13
        Y23 = Y32 = -y23
        
        P2 = req.p2_gen
        P3 = req.p3_load
        Q3 = req.q3_load
        
        # Iteration tracking
        history = []
        
        v1_val = V1
        v2_val = V2
        v3_val = V3
        
        for k in range(req.max_iterations):
            # 1. Update Bus 3 (PQ Bus)
            # V3 = (1/Y33) * [ (P3 - jQ3)/V3* - (Y31*V1 + Y32*V2) ]
            v3_new = (1.0 / Y33) * (((P3 - 1j * Q3) / v3_val.conjugate()) - (Y31 * v1_val + Y32 * v2_val))
            
            # 2. Update Bus 2 (PV Bus)
            # First, estimate Q2: Q2 = -Imag( V2* * (Y21*V1 + Y22*V2 + Y23*V3) )
            q2_est = -((v2_val.conjugate() * (Y21 * v1_val + Y22 * v2_val + Y23 * v3_new)).imag)
            
            # V2 temp calculation
            v2_temp = (1.0 / Y22) * (((P2 - 1j * q2_est) / v2_val.conjugate()) - (Y21 * v1_val + Y23 * v3_new))
            # Restrict magnitude to specified V2 mag
            v2_new = cmath.rect(req.v2_mag, cmath.phase(v2_temp))
            
            v2_val = v2_new
            v3_val = v3_new
            
            history.append({
                "iteration": k + 1,
                "V1": {"mag": abs(v1_val), "angle": math.degrees(cmath.phase(v1_val))},
                "V2": {"mag": abs(v2_val), "angle": math.degrees(cmath.phase(v2_val))},
                "V3": {"mag": abs(v3_val), "angle": math.degrees(cmath.phase(v3_val))},
                "Q2_est": round(q2_est, 4)
            })
            
        # Slack bus power calculation after convergence
        # S1 = V1 * (Y11*V1 + Y12*V2 + Y13*V3)*
        I1 = Y11 * v1_val + Y12 * v2_val + Y13 * v3_val
        S1 = v1_val * I1.conjugate()
        
        # Line Flow calculations (Bus i to k: S_ik = V_i * (V_i - V_k)* * y_ik*)
        S12 = v1_val * ((v1_val - v2_val) * y12).conjugate()
        S13 = v1_val * ((v1_val - v3_val) * y13).conjugate()
        S23 = v2_val * ((v2_val - v3_val) * y23).conjugate()
        
        return {
            "final_voltages": [
                {"bus": 1, "mag": round(abs(v1_val), 4), "angle": round(math.degrees(cmath.phase(v1_val)), 2)},
                {"bus": 2, "mag": round(abs(v2_val), 4), "angle": round(math.degrees(cmath.phase(v2_val)), 2)},
                {"bus": 3, "mag": round(abs(v3_val), 4), "angle": round(math.degrees(cmath.phase(v3_val)), 2)}
            ],
            "slack_power": {"P": round(S1.real, 4), "Q": round(S1.imag, 4)},
            "line_flows": [
                {"path": "Bus 1 -> Bus 2", "P": round(S12.real, 4), "Q": round(S12.imag, 4)},
                {"path": "Bus 1 -> Bus 3", "P": round(S13.real, 4), "Q": round(S13.imag, 4)},
                {"path": "Bus 2 -> Bus 3", "P": round(S23.real, 4), "Q": round(S23.imag, 4)}
            ],
            "iterations": history
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ThreePhaseRequest(BaseModel):
    connection: str  # "star" or "delta"
    v_ll: float      # Line-to-line RMS voltage (V)
    z_a_r: float     # Phase A (or AB) resistance (ohms)
    z_a_x: float     # Phase A (or AB) reactance (ohms)
    z_b_r: float     # Phase B (or BC) resistance (ohms)
    z_b_x: float     # Phase B (or BC) reactance (ohms)
    z_c_r: float     # Phase C (or CA) resistance (ohms)
    z_c_x: float     # Phase C (or CA) reactance (ohms)
    frequency: float = 50.0
    target_pf: float = 0.95

@router.post("/three-phase")
def calculate_three_phase(req: ThreePhaseRequest, current_user: User = Depends(get_current_user)):
    try:
        V_ll = req.v_ll
        Za = complex(req.z_a_r, req.z_a_x)
        Zb = complex(req.z_b_r, req.z_b_x)
        Zc = complex(req.z_c_r, req.z_c_x)
        f = req.frequency
        t_pf = req.target_pf

        # Phase sequence components
        # Phase A as reference angle 0
        if req.connection.lower() == "star":
            # Phase voltages (Line-to-Neutral)
            V_ln = V_ll / math.sqrt(3.0)
            Va = cmath.rect(V_ln, 0.0)
            Vb = cmath.rect(V_ln, -2.0 * math.pi / 3.0)
            Vc = cmath.rect(V_ln, 2.0 * math.pi / 3.0)

            # Phase/Line currents
            Ia = Va / Za if abs(Za) > 1e-6 else 0j
            Ib = Vb / Zb if abs(Zb) > 1e-6 else 0j
            Ic = Vc / Zc if abs(Zc) > 1e-6 else 0j
            In = Ia + Ib + Ic # Neutral current

            # Apparent power per phase
            Sa = Va * Ia.conjugate()
            Sb = Vb * Ib.conjugate()
            Sc = Vc * Ic.conjugate()

            P_total = Sa.real + Sb.real + Sc.real
            Q_total = Sa.imag + Sb.imag + Sc.imag

            # Pack response details
            phases = [
                {
                    "name": "Phase A",
                    "voltage": {"mag": round(abs(Va), 2), "angle": round(math.degrees(cmath.phase(Va)), 1)},
                    "current": {"mag": round(abs(Ia), 3), "angle": round(math.degrees(cmath.phase(Ia)), 1)},
                    "P": round(Sa.real, 2), "Q": round(Sa.imag, 2)
                },
                {
                    "name": "Phase B",
                    "voltage": {"mag": round(abs(Vb), 2), "angle": round(math.degrees(cmath.phase(Vb)), 1)},
                    "current": {"mag": round(abs(Ib), 3), "angle": round(math.degrees(cmath.phase(Ib)), 1)},
                    "P": round(Sb.real, 2), "Q": round(Sb.imag, 2)
                },
                {
                    "name": "Phase C",
                    "voltage": {"mag": round(abs(Vc), 2), "angle": round(math.degrees(cmath.phase(Vc)), 1)},
                    "current": {"mag": round(abs(Ic), 3), "angle": round(math.degrees(cmath.phase(Ic)), 1)},
                    "P": round(Sc.real, 2), "Q": round(Sc.imag, 2)
                }
            ]
            neutral = {"mag": round(abs(In), 3), "angle": round(math.degrees(cmath.phase(In)), 1)}

        else: # Delta
            # Line-to-line voltages
            Vab = cmath.rect(V_ll, math.pi / 6.0) # 30 deg
            Vbc = cmath.rect(V_ll, -math.pi / 2.0) # -90 deg
            Vca = cmath.rect(V_ll, 5.0 * math.pi / 6.0) # 150 deg

            # Delta branch currents
            Iab = Vab / Za if abs(Za) > 1e-6 else 0j
            Ibc = Vbc / Zb if abs(Zb) > 1e-6 else 0j
            Ica = Vca / Zc if abs(Zc) > 1e-6 else 0j

            # Line currents (KCL)
            Ia = Iab - Ica
            Ib = Ibc - Iab
            Ic = Ica - Ibc

            # Apparent power per branch
            Sab = Vab * Iab.conjugate()
            Sbc = Vbc * Ibc.conjugate()
            Sca = Vca * Ica.conjugate()

            P_total = Sab.real + Sbc.real + Sca.real
            Q_total = Sab.imag + Sbc.imag + Sca.imag

            phases = [
                {
                    "name": "Phase AB",
                    "voltage": {"mag": round(abs(Vab), 2), "angle": round(math.degrees(cmath.phase(Vab)), 1)},
                    "current": {"mag": round(abs(Iab), 3), "angle": round(math.degrees(cmath.phase(Iab)), 1)},
                    "P": round(Sab.real, 2), "Q": round(Sab.imag, 2)
                },
                {
                    "name": "Phase BC",
                    "voltage": {"mag": round(abs(Vbc), 2), "angle": round(math.degrees(cmath.phase(Vbc)), 1)},
                    "current": {"mag": round(abs(Ibc), 3), "angle": round(math.degrees(cmath.phase(Ibc)), 1)},
                    "P": round(Sbc.real, 2), "Q": round(Sbc.imag, 2)
                },
                {
                    "name": "Phase CA",
                    "voltage": {"mag": round(abs(Vca), 2), "angle": round(math.degrees(cmath.phase(Vca)), 1)},
                    "current": {"mag": round(abs(Ica), 3), "angle": round(math.degrees(cmath.phase(Ica)), 1)},
                    "P": round(Sca.real, 2), "Q": round(Sca.imag, 2)
                }
            ]
            neutral = {"mag": 0.0, "angle": 0.0} # No neutral wire in Delta

        # S total
        S_total = math.sqrt(P_total**2 + Q_total**2)
        pf = P_total / S_total if S_total > 1e-6 else 1.0

        # Capacitor sizing for Power Factor Correction (PFC)
        # Target Q = P * tan(acos(target_pf))
        # Required Qc = Q_total - Q_target
        c_required_mfd = 0.0
        q_target = 0.0
        q_c = 0.0
        if pf < t_pf and P_total > 0:
            theta_old = math.acos(max(0.0, min(1.0, pf)))
            theta_new = math.acos(max(0.0, min(1.0, t_pf)))
            q_target = P_total * math.tan(theta_new)
            q_c = max(0.0, Q_total - q_target)
            
            # Assuming Delta connected 3-phase capacitor bank
            # Q_c_phase = Q_c / 3 = V_ll^2 * (2 * pi * f * C)
            q_c_phase = q_c / 3.0
            omega = 2.0 * math.pi * f
            c_val = q_c_phase / (omega * V_ll**2) if omega * V_ll**2 > 1e-6 else 0.0
            c_required_mfd = c_val * 1e6 # convert to microFarads

        return {
            "connection": req.connection,
            "total_power": {
                "P": round(P_total, 2),
                "Q": round(Q_total, 2),
                "S": round(S_total, 2),
                "pf": round(pf, 3)
            },
            "pfc": {
                "target_pf": t_pf,
                "q_c_required_vars": round(q_c, 2),
                "cap_per_phase_mfd": round(c_required_mfd, 2)
            },
            "phases": phases,
            "neutral_current": neutral,
            "line_currents": {
                "Ia": {"mag": round(abs(Ia), 3), "angle": round(math.degrees(cmath.phase(Ia)), 1)},
                "Ib": {"mag": round(abs(Ib), 3), "angle": round(math.degrees(cmath.phase(Ib)), 1)},
                "Ic": {"mag": round(abs(Ic), 3), "angle": round(math.degrees(cmath.phase(Ic)), 1)}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"3-phase analysis error: {str(e)}")
