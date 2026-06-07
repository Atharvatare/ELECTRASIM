import math
import numpy as np

class InverterSimulator:
    @staticmethod
    def simulate(
        inverter_type: str,     # square_wave, spwm
        vdc: float, 
        frequency: float, 
        load_r: float,
        modulation_index: float = 0.8,     # only for spwm (0.0 to 1.0)
        carrier_frequency: float = 1000.0, # carrier triangular wave frequency (Hz)
        cycles_to_plot: float = 2.0
    ):
        """
        Simulates single-phase full-bridge inverters.
        """
        if vdc <= 0 or frequency <= 0 or load_r <= 0:
            return {"error": "DC voltage, frequency, and load resistance must be positive."}
            
        t_stop = cycles_to_plot / frequency
        t_steps = 1000
        t_arr = np.linspace(0, t_stop, t_steps)
        omega = 2.0 * math.pi * frequency
        
        v_output = []
        i_output = []
        
        # 1. Square Wave Inverter
        if inverter_type == "square_wave":
            # RMS fundamental: V1_rms = 4 * Vdc / (sqrt(2) * pi) ~ 0.9003 * Vdc
            v1_rms = (4.0 * vdc) / (math.sqrt(2.0) * math.pi)
            vrms = vdc
            # THD of square wave = sqrt((Vrms/V1_rms)^2 - 1) ~ 48.34%
            thd = math.sqrt((vrms / v1_rms)**2 - 1.0) * 100.0
            
            for t in t_arr:
                # Square wave: +Vdc for first half-period, -Vdc for second half-period
                val = vdc if math.sin(omega * t) >= 0 else -vdc
                v_output.append(float(val))
                i_output.append(float(val / load_r))
                
            # Odd Harmonics for Square Wave: V_h = 4*Vdc / (h*pi)
            harmonics = []
            for h in range(1, 12, 2):
                vh_peak = (4.0 * vdc) / (h * math.pi)
                harmonics.append({
                    "harmonic": h,
                    "frequency": h * frequency,
                    "amplitude": round(vh_peak / math.sqrt(2.0), 2)  # RMS amplitude
                })
                
        # 2. Sinusoidal PWM (SPWM)
        else:
            # For linear range (ma <= 1.0), fundamental RMS is ma * Vdc
            # If bipolar SPWM, RMS output is Vdc, and fundamental peak is ma * Vdc.
            # Thus V1_rms = ma * Vdc / sqrt(2)
            ma = max(0.0, min(1.2, modulation_index))
            v1_rms = (ma * vdc) / math.sqrt(2.0)
            
            # For SPWM, the total RMS voltage includes switching harmonics.
            # For bipolar SPWM, the output is always +Vdc or -Vdc, so total RMS = Vdc.
            vrms = vdc
            thd = math.sqrt(max(0.0, (vrms / v1_rms)**2 - 1.0)) * 100.0
            
            for t in t_arr:
                # Reference sine wave (modulating signal)
                v_ref = ma * math.sin(omega * t)
                
                # Carrier triangular wave (frequency = fc)
                # Triangle wave of amplitude 1.0, period T = 1/fc
                t_carrier = t % (1.0 / carrier_frequency)
                period_carrier = 1.0 / carrier_frequency
                if t_carrier < period_carrier / 2.0:
                    v_carrier = -1.0 + 4.0 * (t_carrier / period_carrier)
                else:
                    v_carrier = 3.0 - 4.0 * (t_carrier / period_carrier)
                    
                # Bipolar PWM comparison
                val = vdc if v_ref >= v_carrier else -vdc
                v_output.append(float(val))
                i_output.append(float(val / load_r))
                
            # For SPWM harmonics, they cluster around carrier frequency fc and its multiples
            harmonics = [
                {"harmonic": 1, "frequency": frequency, "amplitude": round(v1_rms, 2)}
            ]
            # Add clusters around carrier (e.g. fc, fc - 2f, fc + 2f)
            # This is a simplification of SPWM Bessel spectra
            harmonics.append({"harmonic": int(carrier_frequency/frequency), "frequency": carrier_frequency, "amplitude": round(0.4 * vdc, 2)})
            harmonics.append({"harmonic": int((carrier_frequency - 2*frequency)/frequency), "frequency": carrier_frequency - 2*frequency, "amplitude": round(0.2 * vdc, 2)})
            harmonics.append({"harmonic": int((carrier_frequency + 2*frequency)/frequency), "frequency": carrier_frequency + 2*frequency, "amplitude": round(0.2 * vdc, 2)})
            
        return {
            "total_rms_voltage": round(vrms, 2),
            "fundamental_rms_voltage": round(v1_rms, 2),
            "output_frequency": round(frequency, 1),
            "thd": round(thd, 2),
            "harmonics": harmonics,
            "waveforms": {
                "time": t_arr.tolist(),
                "output_voltage": v_output,
                "output_current": i_output
            }
        }
