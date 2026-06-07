import math
import cmath

class TransformerAnalyzer:
    @staticmethod
    def analyze(
        v1_nominal: float, 
        v2_nominal: float, 
        load_kva: float, 
        load_pf: float, 
        pf_type: str = "Lagging",  # Lagging or Leading
        r1: float = 0.2, 
        x1: float = 0.6, 
        r2: float = 0.005, 
        x2: float = 0.015, 
        rc: float = 5000.0, 
        xm: float = 1500.0
    ):
        """
        Calculates Single Phase Transformer characteristics using the equivalent circuit model.
        - v1_nominal (V, Primary Rated Voltage)
        - v2_nominal (V, Secondary Rated Voltage)
        - load_kva (kVA, operating load)
        - load_pf (Power factor, 0.0 to 1.0)
        - pf_type (Lagging, Leading, or Unity)
        - r1, x1: Primary winding resistance and leakage reactance (Ohms)
        - r2, x2: Secondary winding resistance and leakage reactance (Ohms)
        - rc: Core loss resistance (Ohms)
        - xm: Magnetizing reactance (Ohms)
        """
        if v1_nominal <= 0 or v2_nominal <= 0:
            return {"error": "Nominal voltages must be greater than 0."}
        if load_kva < 0:
            return {"error": "Load kVA cannot be negative."}
            
        # Turns ratio a = V1 / V2
        a = v1_nominal / v2_nominal
        
        # Referred secondary parameters to primary side
        r2_referred = r2 * (a ** 2)
        x2_referred = x2 * (a ** 2)
        
        req = r1 + r2_referred
        xeq = x1 + x2_referred
        z_eq = complex(req, xeq)
        
        # Load power factor angle
        pf_angle = math.acos(load_pf)
        if pf_type == "Lagging":
            pf_angle = -pf_angle
        elif pf_type == "Unity":
            pf_angle = 0.0
            
        # Rated load current on secondary
        # S = V2 * I2 => I2 = S / V2
        s_va = load_kva * 1000.0
        i2_mag = s_va / v2_nominal if v2_nominal > 0 else 0.0
        
        # Load current referred to primary: I2' = I2 / a
        i2_referred_mag = i2_mag / a
        
        # Express referred secondary current as a phasor relative to secondary voltage V2'
        # Let secondary voltage phasor V2' = a * V2_nominal = V1_nominal + j0
        v2_referred = complex(v1_nominal, 0.0)
        i2_referred = cmath.rect(i2_referred_mag, pf_angle)
        
        # Primary voltage: V1 = V2' + I2' * Z_eq
        v1 = v2_referred + i2_referred * z_eq
        v1_mag = abs(v1)
        
        # Voltage Regulation = (|V1| - |V2'|) / |V2'| * 100%
        # Since V2' nominal voltage referred to primary is v1_nominal:
        regulation = ((v1_mag - v1_nominal) / v1_nominal) * 100.0
        
        # Core Loss (Iron Loss) Pi = V1^2 / Rc
        p_iron = (v1_mag ** 2) / rc if rc > 0 else 0.0
        
        # Copper Loss P_cu = I2'^2 * R_eq
        p_copper = (i2_referred_mag ** 2) * req
        
        # Output Power P_out = S_load * PF
        p_out = s_va * load_pf
        
        # Total Loss
        total_losses = p_iron + p_copper
        
        # Input Power
        p_in = p_out + total_losses
        
        # Efficiency
        efficiency = (p_out / p_in) * 100.0 if p_in > 0 else 0.0
        efficiency = max(0.0, min(100.0, efficiency))
        
        return {
            "turns_ratio": round(a, 3),
            "referred_r2": round(r2_referred, 4),
            "referred_x2": round(x2_referred, 4),
            "equivalent_resistance": round(req, 4),
            "equivalent_reactance": round(xeq, 4),
            "primary_voltage": round(v1_mag, 1),
            "secondary_current": round(i2_mag, 2),
            "referred_secondary_current": round(i2_referred_mag, 2),
            "iron_loss": round(p_iron, 1),
            "copper_loss": round(p_copper, 1),
            "total_losses": round(total_losses, 1),
            "voltage_regulation": round(regulation, 2),
            "efficiency": round(efficiency, 2),
            "output_power": round(p_out, 1)
        }
