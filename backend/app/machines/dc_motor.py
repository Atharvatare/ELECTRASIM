import math

class DCMotorAnalyzer:
    @staticmethod
    def analyze(voltage: float, current: float, armature_resistance: float, speed_rpm: float, constant_losses: float = 50.0):
        """
        Calculates DC Motor characteristics.
        - voltage (V)
        - current (A)
        - armature_resistance (Ohms)
        - speed_rpm (RPM)
        - constant_losses (W) - frictional, windage, and core losses
        """
        if speed_rpm <= 0:
            return {"error": "Speed must be greater than 0 RPM for analysis."}
        
        # Power Input
        p_in = voltage * current
        
        # Armature Copper Loss
        p_cu = (current ** 2) * armature_resistance
        
        # Back EMF: Eb = V - I * Ra
        eb = voltage - current * armature_resistance
        
        # Electromagnetic Power developed
        p_developed = eb * current
        
        # Net mechanical power output
        p_out = max(0.0, p_developed - constant_losses)
        
        # Total losses
        total_losses = p_cu + constant_losses
        
        # Speed in rad/s
        omega = (2.0 * math.pi * speed_rpm) / 60.0
        
        # Torque T = P_developed / omega
        torque_gross = p_developed / omega if omega > 0 else 0.0
        torque_net = p_out / omega if omega > 0 else 0.0
        
        # Efficiency
        efficiency = (p_out / p_in) * 100.0 if p_in > 0 else 0.0
        efficiency = max(0.0, min(100.0, efficiency))
        
        return {
            "back_emf": round(eb, 2),
            "power_input": round(p_in, 2),
            "power_output": round(p_out, 2),
            "copper_losses": round(p_cu, 2),
            "constant_losses": round(constant_losses, 2),
            "total_losses": round(total_losses, 2),
            "gross_torque": round(torque_gross, 2),
            "net_torque": round(torque_net, 2),
            "efficiency": round(efficiency, 2)
        }
