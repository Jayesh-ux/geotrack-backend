# ANDROID APP UI SPECIFICATION - Required Changes
# For: kindareadyapp (Kotlin/Android)

## 1. LOCATION PICKER (Google Places Autocomplete)
### Required Implementation:
- Add Google Places Autocomplete to address/location search
- Make pin draggable on map
- On drag end → reverse geocode → update address fields
- Show live coordinates display

### API Endpoints:
- Autocomplete: `https://maps.googleapis.com/maps/api/place/autocomplete/json`
- Geocoding: `https://maps.googleapis.com/maps/api/geocode/json`

### UI Components:
- SearchTextField with autocomplete dropdown
- Draggable map marker
- Coordinates display (lat, lng)
- Address preview

---

## 2. MULTI-LEG FLOW FIX
### Current Issue:
Leg 2 asks for current GPS location ❌

### Fix Required:
```
Leg 1: Start = user input, End = user input
Leg 2: Start = Leg1.End (auto-filled), End = user input
Leg 3: Start = Leg2.End (auto-filled), End = user input
...
```

### Implementation:
- For leg > 1: Hide/disable start location input
- Auto-populate start from previous leg's end
- Store end location → use as next leg's start
- UI: Show "Continues from: [previous end]"

---

## 3. TRANSPORT MODE DISPLAY
### Current:
"Agent started journey" ❌

### Required:
"Journey via {Car | Bike | Taxi | Train | Bus | Flight}"

### Implementation:
- Fetch transport_mode from journey start log
- Display mode icon + text in UI
- Block journey start if mode not selected

---

## 4. FALSE TRAVEL UI FIX
### Issue:
Showing "Traveling" when no valid movement ❌

### Required States:
| Condition | UI Display |
|-----------|------------|
| Valid movement | "Traveling" + progress |
| No movement (idle) | "Idle" |
| No valid logs | "No movement detected" |
| Session ended | "Session Ended" |

### Implementation:
- Check last log's validated field
- If false → show "Idle" or "No movement"
- Sync with backend tracking state API

---

## 5. CLOCK-IN/CLOCK-OUT CONSISTENCY
### After CLOCK_OUT:
- NO tracking logs allowed
- NO journey can be started
- NO expenses allowed
- UI shows "Session Ended"

### Implementation:
- On clock-out → clear local session state
- Disable all tracking buttons
- Show end timestamp
- Clear active journey

---

## 6. BATTERY DISPLAY
### Required:
- Show current battery % in real-time
- Sync with backend battery data
- Handle stale battery (grey out or show warning)
- Display battery icon with %

### Implementation:
- Fetch from LocationRepository
- Update UI on each location update
- Show "Battery: XX%" in status bar

---

## 7. API OPTIMIZATION
### Required Changes:
1. **Idle Detection**: Don't call tracking API when idle
2. **Resume on Movement**: Only resume when movement > 50m
3. **Debounce**: 2-second debounce on location updates

### Implementation:
- Check `isIdle()` before API call
- Use `POST /api/location/tracking-state` to check state
- Use WorkManager for background with constraints

---

## 8. FAILSAFE UI
### When tracking paused:
- Show message: "Tracking paused - move to clear area"
- Show "Resume" button
- Require 50m movement to resume

---

## 9. SESSION STATE UI
### Required Display:
- Active: Green indicator + "Tracking"
- Paused: Yellow indicator + "Paused"
- Idle: Orange indicator + "Idle"
- Ended: Red indicator + "Session Ended"

---

## 10. EXPENSE VALIDATION UI
### Block expense submission if:
- No journey for today
- Less than 2 valid logs
- Total distance < 100m

### Show error messages:
- "Start a journey before submitting expenses"
- "Need at least 2 valid movement logs"
- "Total travel distance must be at least 100m"

---

## API CONTRACT SUMMARY

### New Endpoints:
```
GET  /api/location/tracking-state  → { isActive, isPaused, wasIdle }
POST /api/location/resume-tracking → { latitude, longitude }
```

### Location Log Response (enhanced):
```json
{
  "validated": boolean,
  "location_confidence": "HIGH|MEDIUM|LOW",
  "is_initial": boolean,
  "validation_reason": string,
  "idle_state_flag": boolean,
  "battery_stale": boolean
}
```

---

## TEST CHECKLIST

- [ ] Location picker with autocomplete
- [ ] Draggable pin updates address
- [ ] Multi-leg auto-fills start from previous end
- [ ] Transport mode shown in journey
- [ ] Idle state shows "Idle" not "Traveling"
- [ ] Clock-out disables tracking
- [ ] Battery % displays in UI
- [ ] Tracking pauses on 3 invalid / poor accuracy
- [ ] Resume requires 50m movement
- [ ] Expense blocked without valid journey