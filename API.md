# REST API Documentation

All endpoints are served with prefix `/api/v1`. Communication is performed using standard JSON payload schemas.

---

## 1. Authentication Router (`/auth`)

### 1.1 Register User
- **Method**: `POST`
- **Path**: `/auth/register`
- **Request Body**:
  ```json
  {
    "name": "Atharva Tare",
    "email": "atharva@company.com",
    "password": "securepassword123",
    "role": "Admin"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "name": "Atharva Tare",
      "email": "atharva@company.com",
      "role": "Admin"
    }
  }
  ```

### 1.2 Login User
- **Method**: `POST`
- **Path**: `/auth/login`
- **Request Body**:
  ```json
  {
    "email": "atharva@company.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK)**: JWT Token dict matching Register payload.

---

## 2. Circuits Router

### 2.1 Save Circuit Schematic
- **Method**: `POST`
- **Path**: `/projects/{project_id}/circuits`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "name": "RC Low-Pass Filter",
    "schematic_json": { "nodes_coordinates": [] },
    "netlist_json": {
      "components": [
        { "id": "V1", "type": "dc_source", "value": 10.0, "nodes": [1, 0] },
        { "id": "R1", "type": "resistor", "value": 1000.0, "nodes": [1, 2] },
        { "id": "C1", "type": "capacitor", "value": 0.00001, "nodes": [2, 0] }
      ],
      "nodes_count": 2
    }
  }
  ```
- **Response (200 OK)**: Saved circuit metadata details.

### 2.2 Solve DC Operating Point
- **Method**: `POST`
- **Path**: `/circuits/{circuit_id}/simulate/dc`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "voltages": { "0": 0.0, "1": 10.0, "2": 10.0 },
    "currents": { "V1": 0.0, "R1": 0.0, "C1": 0.0 },
    "power": { "V1": 0.0, "R1": 0.0, "C1": 0.0 },
    "converged": true
  }
  ```

### 2.3 Solve Transient Time Series
- **Method**: `POST`
- **Path**: `/circuits/{circuit_id}/simulate/transient`
- **Request Body**:
  ```json
  {
    "t_stop": 0.02,
    "step": 0.0002
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "time": [0.0, 0.0002, 0.0004],
    "voltages": {
      "0": [0.0, 0.0, 0.0],
      "1": [10.0, 10.0, 10.0],
      "2": [0.0, 0.198, 0.392]
    },
    "currents": {
      "R1": [0.01, 0.0098, 0.0096]
    }
  }
  ```

---

## 3. Machine Studio Router (`/machines`)

### 3.1 Analyze DC Motor
- **Method**: `POST`
- **Path**: `/machines/dc-motor`
- **Request Body**:
  ```json
  {
    "project_id": 1,
    "machine_type": "DC_Motor",
    "inputs": {
      "voltage": 220.0,
      "current": 10.0,
      "armature_resistance": 0.5,
      "speed_rpm": 1500.0
    }
  }
  ```
- **Response (200 OK)**: Output metrics list including gross_torque, back_emf, efficiency, total_losses.

---

## 4. Power Electronics Router (`/power-electronics`)

### 4.1 Simulate Converter Waveforms
- **Method**: `POST`
- **Path**: `/power-electronics/simulate`
- **Request Body**:
  ```json
  {
    "converter_type": "bridge_rectifier",
    "inputs": {
      "is_controlled": true,
      "voltage_rms": 120.0,
      "frequency": 60.0,
      "load_r": 10.0,
      "firing_angle_deg": 30.0
    }
  }
  ```
- **Response (200 OK)**: Calculated rms_voltage, ripple_factor, and waveforms arrays mapping input_voltage, output_voltage, and time.

---

## 5. AI Assistant Router (`/ai`)

### 5.1 Ask Engineering Questions
- **Method**: `POST`
- **Path**: `/ai/ask`
- **Request Body**:
  ```json
  {
    "project_id": 1,
    "question": "Calculate motor efficiency."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "answer": "### Local Motor Efficiency Calculation...\nPin = V * I...",
    "steps": ["Parsed motor specs", "Divided mechanical output by electrical input"]
  }
  ```
