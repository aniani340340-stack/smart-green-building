# 🏠 Smart Net-Zero Energy Green Building (3D Interactive Simulation)

An interactive, high-fidelity **3D Architectural & IoT Simulation** of a **2-Floor Net-Zero Energy Green Building**. Built for college/school engineering syllabus demonstration, science exhibitions, and teacher presentations.

---

## 🌟 Quick Launch

Simply double-click:
```bash
open-project.bat
```
*Or directly double-click `index.html` to open in Google Chrome, Microsoft Edge, or Mozilla Firefox.*

---

## 🎯 Project Core Concept
The building minimizes grid electricity usage by maximizing passive architecture, on-site solar renewable generation, and closed-loop IoT sensor automation:
$$\text{Net-Zero Equation: } E_{\text{Generated (Solar)}} \ge E_{\text{Consumed (Building Loads)}}$$

---

## 🎬 6 Guided Walkthrough Scenes (Exact Match to Syllabus & Design)

1. **Scene 1: Building Introduction & 2-Floor Architectural Cutaway**
   - 2-floor sustainable villa model with an open cutaway facade.
   - Ground floor: Smart living/study room with IoT sensors & actuators.
   - First floor: Master loft with cantilever terrace & energy storage battery cabinet.
   - Rooftop: Solar PV array, green roof garden, and rainwater catchment.

2. **Scene 2: Solar Photovoltaic Generation & Energy Storage**
   - 6 angled monocrystalline solar panels tilted at 28° toward the sun.
   - Golden solar photon particles cascade from the sun onto the panels.
   - Clean DC electricity flows along conduits into the Lithium-Ion Battery Unit (ESS).

3. **Scene 3: Smart Lighting Automation (LDR + PIR Daylight Harvesting)**
   - **LDR (Light Dependent Resistor)** measures ambient sunlight illumination (Lux).
   - **PIR (Passive Infrared)** detects human motion/presence.
   - **Dual-Condition Logic:**
     $$\text{LED}_{\text{ON}} = (\text{Lux} < 300\text{ lx}) \land (\text{Occupancy} = \text{True})$$
   - Prevents electricity wastage during bright daylight or in unoccupied rooms.

4. **Scene 4: Microclimate Temperature Control & Cross-Ventilation (DHT11 + Window + Opposite-Wall Exhaust)**
   - **DHT11 Sensor** continuously monitors indoor temperature and humidity.
   - When temperature rises $\ge 28^\circ\text{C}$:
     - **SG90 Servo Window** on the right wall pivots open $45^\circ$ for fresh cross-breeze intake.
     - **Industrial Wall Exhaust Fan** on the **opposite (left) wall** activates to emit internal warm air outwards.
     - **DC Ceiling Fan** circulates indoor air.
     - Amber exhaust airflow particles stream outwards through the left wall, proving heat extraction.

5. **Scene 5: Green Roof Thermal Insulation & Passive Cooling**
   - Sedum succulents and turf vegetation absorb intense solar radiation.
   - Exploded strata mode reveals the 4 engineering layers:
     1. Vegetation layer (Evapotranspiration cooling: $-5^\circ\text{C}$ to $-8^\circ\text{C}$)
     2. Engineered soil / substrate layer
     3. Filter fleece & drainage core
     4. Root barrier & waterproof membrane over structural concrete slab

6. **Scene 6: Rainwater Harvesting & Filtration Reservoir**
   - Sloped roof eaves with perimeter drainage gutters.
   - Downpipe with first-flush sediment filter.
   - Transparent ground-level collection reservoir with real-time water volume gauge (0 to 100 Liters).
   - Harvested rainwater recycled for garden landscaping and toilet flushing.

---

## 👨‍🏫 Live Demonstration Script for Teachers & Examiners

When demonstrating to your teacher, use the **Live Demo Triggers** panel on the right:

| Test | Action | What Happens | What to Say |
|---|---|---|---|
| **1. Daylight Test** | Click **"Cover LDR Hand"** | LDR Lux drops to 45 Lux $\rightarrow$ Room LED turns **ON** instantly. | *"Respected Teacher, the LDR detects that daylight is insufficient. When daylight is restored, it turns off automatically to conserve power."* |
| **2. Motion Test** | Click **"Toggle PIR Motion"** | Avatar disappears $\rightarrow$ Room LED turns **OFF** even in the dark. | *"Our dual-condition logic ensures electricity is never wasted when the room is empty."* |
| **3. Temperature Test** | Click **"Heat DHT11 (34°C)"** | Temperature spikes $\rightarrow$ Servo window opens $45^\circ$ on right wall $\rightarrow$ Exhaust fan on opposite left wall activates and emits internal warm air outside! | *"When indoor microclimate overheats, the microcontroller triggers cross-ventilation: the right window brings in fresh air while the opposite-wall exhaust fan extracts internal heat outdoors."* |
| **4. Rainwater Test** | Toggle **"Rainfall Weather"** | Rain falls $\rightarrow$ Downpipe streams water $\rightarrow$ Tank water level rises. | *"Rainfall is captured from the roof, filtered, and stored on-site to achieve water neutrality."* |

---

## 📚 Syllabus Alignment (Units 1 to 5)

- **Unit 1: Energy-Efficient Building Architecture** — Net-Zero building envelope, cutaway cross-section, thermal mass, and solar passive design.
- **Unit 2: Solar Energy & Passive Cooling** — Photovoltaic cells, tilt angles, energy balance equations, and solar storage.
- **Unit 3: Temperature & Cross-Ventilation** — Microclimate closed loop with DHT11, SG90 servo louvers, and DC fan ventilation.
- **Unit 4: Smart Lighting & Daylight Harvesting** — Analog LDR voltage divider, PIR infrared presence detection, and boolean energy-saving control.
- **Unit 5: Green Roofs & Sustainability** — Extensive vegetated roofs, urban heat island mitigation, stormwater retention, and rainwater recycling.

---

## ⚡ Optional Hardware Implementation (Arduino / ESP32 Code)

If building the physical miniature tabletop model:

### Pinout Mapping:
- **LDR Sensor:** Analog Pin `A0` (with 10k$\Omega$ pull-down resistor)
- **PIR Motion Sensor:** Digital Pin `D2`
- **DHT11 Temperature Sensor:** Digital Pin `D4`
- **SG90 Servo Motor (Window):** PWM Pin `D5`
- **DC Fan (Relay / MOSFET):** Digital Pin `D6`
- **Room LED Lights:** PWM Pin `D9`

### Sample Arduino Sketch:
```cpp
#include <Servo.h>
#include <DHT.h>

#define LDR_PIN       A0
#define PIR_PIN       2
#define DHT_PIN       4
#define SERVO_PIN     5
#define FAN_PIN       6
#define LED_PIN       9

DHT dht(DHT_PIN, DHT11);
Servo windowServo;

void setup() {
  Serial.begin(9600);
  dht.begin();
  windowServo.attach(SERVO_PIN);
  pinMode(PIR_PIN, INPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  windowServo.write(0); // Window initially closed
}

void loop() {
  int ldrValue = analogRead(LDR_PIN);
  int pirMotion = digitalRead(PIR_PIN);
  float temp = dht.readTemperature();

  // 1. Smart Lighting Logic: Dark (< 300) AND Motion Detected
  if (ldrValue < 300 && pirMotion == HIGH) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }

  // 2. Microclimate & Passive Window Logic: Temp >= 28.0 C
  if (temp >= 28.0) {
    windowServo.write(45);    // Open window
    digitalWrite(FAN_PIN, HIGH); // Turn fan on
  } else {
    windowServo.write(0);     // Close window
    digitalWrite(FAN_PIN, LOW);  // Turn fan off
  }

  delay(500);
}
```

