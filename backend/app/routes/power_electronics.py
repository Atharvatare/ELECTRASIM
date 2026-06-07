from fastapi import APIRouter, Depends, HTTPException
from ..schemas import PowerElectronicsSimRequest, PowerElectronicsSimResponse
from .auth import get_current_user, User
from ..power_electronics.rectifiers import RectifierSimulator
from ..power_electronics.inverters import InverterSimulator
from ..power_electronics.choppers import ChopperSimulator

router = APIRouter(prefix="/power-electronics", tags=["power-electronics"])

@router.post("/simulate", response_model=PowerElectronicsSimResponse)
def simulate_power_converter(req: PowerElectronicsSimRequest, current_user: User = Depends(get_current_user)):
    converter = req.converter_type.lower()
    inputs = req.inputs
    
    try:
        if converter in ("half_wave_rectifier", "full_wave_rectifier", "bridge_rectifier"):
            topology = "half_wave" if converter == "half_wave_rectifier" else ("full_wave" if converter == "full_wave_rectifier" else "bridge")
            res = RectifierSimulator.simulate(
                topology=topology,
                is_controlled=inputs.get("is_controlled", False),
                voltage_rms=float(inputs["voltage_rms"]),
                frequency=float(inputs["frequency"]),
                load_r=float(inputs["load_r"]),
                firing_angle_deg=float(inputs.get("firing_angle_deg", 0.0))
            )
            
        elif converter == "inverter":
            res = InverterSimulator.simulate(
                inverter_type=inputs.get("inverter_type", "square_wave"),
                vdc=float(inputs["vdc"]),
                frequency=float(inputs["frequency"]),
                load_r=float(inputs["load_r"]),
                modulation_index=float(inputs.get("modulation_index", 0.8)),
                carrier_frequency=float(inputs.get("carrier_frequency", 1000.0))
            )
            
        elif converter in ("buck", "boost", "buck_boost", "chopper"):
            topology = inputs.get("topology", "buck")
            if converter in ("buck", "boost", "buck_boost"):
                topology = converter
                
            res = ChopperSimulator.simulate(
                topology=topology,
                vin=float(inputs["vin"]),
                duty_cycle=float(inputs["duty_cycle"]),
                frequency=float(inputs["frequency"]),
                load_r=float(inputs["load_r"]),
                inductance_h=float(inputs.get("inductance_h", 1e-3)),
                capacitance_f=float(inputs.get("capacitance_f", 100e-6))
            )
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported converter type: {converter}")
            
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing input parameter: {str(e)}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid parameter data types. Must be numeric.")
        
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
        
    # Return mapping
    # Note: res contains 'waveforms' and other fields.
    # We strip 'waveforms' out of outputs for pure metrics, and assign to respective keys.
    outputs = {k: v for k, v in res.items() if k != "waveforms"}
    
    return PowerElectronicsSimResponse(
        converter_type=req.converter_type,
        inputs=inputs,
        outputs=outputs,
        waveforms=res["waveforms"]
    )
