# Geo-Track Test Cases & Validation Spec

## Session State Management

### Test 1: Clock In → Active Session
```
POST /location/clock-in
{ latitude, longitude }
→ 201 Created
→ session.state = "ACTIVE"
```

### Test 2: Clock Out → Block Further Tracking
```
POST /location/clock-out
→ 200 OK
→ session.state = "ENDED"

POST /location (after clock out)
→ 403 Forbidden: "SessionNotActive"
```

### Test 3: Pause/Resume Session
```
POST /location/pause
→ session.state = "PAUSED"

POST /location/resume
→ session.state = "ACTIVE"
```

---

## False Travel Detection

### Test 4: Movement < 50m → Ignored
```
Log 1: lat/lng A at t=0
Log 2: lat/lng B at t=10s (distance=30m)
→ log.validated = false
→ log.validation_reason = "distance_below_threshold"
```

### Test 5: Speed < 1 km/h → Ignored
```
Log 1: lat/lng A at t=0
Log 2: lat/lng B at t=180s (distance=40m, speed=0.8 km/h)
→ log.validated = false
→ log.validation_reason = "speed_below_threshold"
```

### Test 6: Move > 50m → Valid Travel
```
Log 1: lat/lng A at t=0
Log 2: lat/lng B at t=60s (distance=500m)
→ log.validated = true
→ log.distance_delta = 500
→ log.speed_kmh = 30
```

### Test 7: Idle > 5 min → Stop Tracking
```
Last log: t=0
New request: t=360s (6 min)
→ Skip API update
→ or return idle warning
```

---

## Journey Logic

### Test 8: Start Journey with Transport Mode
```
POST /location
{
  activity: "JOURNEY_START",
  transport_mode: "Car"
}
→ log.activity = "JOURNEY_START"
→ log.transport_mode = "Car"
```

### Test 9: Transport Mode Options
```
Valid modes: ["Car", "Bike", "Taxi", "Train", "Bus", "Flight"]

POST /expenses { transport_mode: "Car" } → 201
POST /expenses { transport_mode: "Train" } → 201
POST /expenses { transport_mode: "Horse" } → 400: InvalidTransportMode
```

---

## Multi-Leg Journey

### Test 10: Leg 2 Start = Leg 1 End
```
Leg 1: startLocation: "Mumbai", endLocation: "Nashik"
Leg 2: startLocation: (auto from leg 1 end)
         endLocation: "Pune"
→ Leg 2.start = "Nashik" (auto-populated)
```

### Test 11: Multi-Leg No GPS Override
```
User in Mumbai starts leg 2
GPS shows current location: Pune
→ Use Leg 1 end location (Nashik), NOT GPS
```

---

## Train Station Validation

### Test 12: Train within 10km → Allow
```
User at lat/lng
Train station at 6km away
→ POST /expenses { transport_mode: "Train" } → 201
```

### Test 13: Train > 10km → Block
```
User at lat/lng
Nearest station at 12km
→ POST /expenses { transport_mode: "Train" } → 400: NoTrainStationNearby
```

---

## Expense Validation

### Test 14: Expense Without Session → Blocked
```
No active session
POST /expenses → 403: SessionNotActive
```

### Test 15: Expense Without Journey → Blocked (optional)
```
Journey required for expense
→ 400: NoJourneyExists (if enforced)
```

### Test 16: Distance < 100m → Blocked
```
POST /expenses { distance_km: 0.05 }
→ 400: DistanceTooShort
```

### Test 17: Valid Expense Submission
```
Active session + journey + valid distance
POST /expenses { distance_km: 15 }
→ 201 Created
```

---

## Idle API Optimization

### Test 18: No Movement > 5min → No API Call
```
Last log at 10:00 AM
New GPS update at 10:06 AM
→ Skip tracking API
→ Return idle warning to client
```

---

## Battery Tracking

### Test 19: Battery Captured with Each Log
```
POST /location { battery: 85 }
→ log.battery = 85
→ Updated in users table
```

### Test 20: Battery NOT Cached Old Value
```
First log: battery=80
Second log: battery not sent
→ Use NEW battery value (don't cache old)
```

---

## False Activity Prevention

### Test 21: Travel Logs Without Movement → Blocked
```
Move < 50m repeatedly
→ Logs marked validated=false
```

### Test 22: Journey Without Session → Blocked
```
No clock-in
POST location { activity: "JOURNEY_START" }
→ 403: SessionNotActive
```

---

## Logging Requirements

Every event log should include:
```json
{
  "lat": 19.076,
  "lng": 72.8777,
  "distance_delta": 500,
  "speed_kmh": 30,
  "battery": 85,
  "session_state": "ACTIVE",
  "timestamp": "2026-04-18T10:00:00Z"
}
```

---

## API Endpoints Summary

| Endpoint | Method | Auth | Validation |
|----------|--------|------|-----------|
| /location | POST | Token | Session + Movement |
| /location | GET | Token | - |
| /location/clock-in | POST | Token | - |
| /location/clock-out | Token | - | Active |
| /location/pause | POST | Token | Active |
| /location/resume | POST | Token | Paused |
| /expenses | POST | Token | Session + Distance |
| /expenses | GET | Token | - |