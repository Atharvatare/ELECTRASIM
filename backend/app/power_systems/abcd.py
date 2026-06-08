import cmath
import math

class TransmissionLineCalculator:
    @staticmethod
    def calculate(
        model: str,              # "short", "medium_pi", "medium_t", "long"
        voltage_r_ll_kv: float,  # Receiving end Line-to-Line voltage in kV
        power_mw: float,         # Receiving end 3-phase active power in MW
        power_factor: float,     # Receiving end load power factor
        pf_type: str,            # "lagging" or "leading"
        r_total: float,          # Total line resistance in Ohms
        x_total: float,          # Total line inductive reactance in Ohms
        g_total: float = 0.0,    # Total line shunt conductance in Siemens
        b_total: float = 0.0,    # Total line shunt susceptance in Siemens
        length_km: float = 100.0
    ):
        # 1. Complex impedances/admittances
        Z = complex(r_total, x_total)
        Y = complex(g_total, b_total)
        
        # 2. Receiving end calculations
        # LN receiving end voltage
        Vr = (voltage_r_ll_kv * 1000.0) / math.sqrt(3.0) + 0j
        
        # Power factor angle
        theta_r = math.acos(power_factor)
        if pf_type.lower() == "lagging":
            theta_r = -theta_r
            
        # Receiving end current
        # P = 3 * Vr * Ir * pf  => Ir = P / (3 * Vr * pf)
        # Ir phase is theta_r
        ir_mag = (power_mw * 1e6) / (3.0 * abs(Vr) * power_factor)
        Ir = cmath.rect(ir_mag, theta_r)
        
        # 3. ABCD Parameters based on model
        if model == "short":
            A = D = 1.0 + 0j
            B = Z
            C = 0.0 + 0j
        elif model == "medium_pi":
            A = D = 1.0 + (Y * Z) / 2.0
            B = Z
            C = Y * (1.0 + (Y * Z) / 4.0)
        elif model == "medium_t":
            A = D = 1.0 + (Y * Z) / 2.0
            B = Z * (1.0 + (Y * Z) / 4.0)
            C = Y
        else: # long line hyperbolic
            # Propagation constant per unit length
            # Let's say Z and Y are total.
            # gamma * l = sqrt(Z * Y)
            # Zc = sqrt(Z / Y)
            gamma_l = cmath.sqrt(Z * Y)
            if abs(Y) == 0:
                # Fallback to short line if Y is 0
                A = D = 1.0 + 0j
                B = Z
                C = 0.0 + 0j
            else:
                Zc = cmath.sqrt(Z / Y)
                A = D = cmath.cosh(gamma_l)
                B = Zc * cmath.sinh(gamma_l)
                C = cmath.sinh(gamma_l) / Zc
                
        # 4. Sending end voltage and current
        Vs = A * Vr + B * Ir
        Is = C * Vr + D * Ir
        
        # Line-to-line sending voltage
        voltage_s_ll_kv = (abs(Vs) * math.sqrt(3.0)) / 1000.0
        
        # 5. Voltage Regulation
        # VR = (|Vs| / |A| - |Vr|) / |Vr| * 100
        vr = ((abs(Vs) / abs(A)) - abs(Vr)) / abs(Vr) * 100.0
        
        # 6. Efficiency
        # Pin = 3 * Re(Vs * conj(Is))
        # Pout = power_mw * 1e6
        p_in = 3.0 * (Vs * Is.conjugate()).real
        p_out = power_mw * 1e6
        efficiency = (p_out / p_in) * 100.0 if p_in > 0 else 0.0
        
        # Loss
        loss_mw = (p_in - p_out) / 1e6
        
        # Sending end power factor
        theta_s = cmath.phase(Vs) - cmath.phase(Is)
        pf_sending = math.cos(theta_s)
        
        return {
            "abcd": {
                "A": {"real": A.real, "imag": A.imag},
                "B": {"real": B.real, "imag": B.imag},
                "C": {"real": C.real, "imag": C.imag},
                "D": {"real": D.real, "imag": D.imag}
            },
            "sending_voltage_ll_kv": round(voltage_s_ll_kv, 3),
            "sending_current_a": round(abs(Is), 3),
            "voltage_regulation_pct": round(vr, 2),
            "efficiency_pct": round(efficiency, 2),
            "losses_mw": round(loss_mw, 3),
            "sending_power_factor": round(pf_sending, 4),
            "sending_power_factor_type": "lagging" if theta_s > 0 else "leading",
            "phasors": {
                "Vr": {"mag": abs(Vr), "phase_deg": math.degrees(cmath.phase(Vr))},
                "Ir": {"mag": abs(Ir), "phase_deg": math.degrees(cmath.phase(Ir))},
                "Vs": {"mag": abs(Vs), "phase_deg": math.degrees(cmath.phase(Vs))},
                "Is": {"mag": abs(Is), "phase_deg": math.degrees(cmath.phase(Is))}
            }
        }
