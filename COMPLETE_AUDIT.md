# COMPLETE UI + FLOW AUDIT REPORT

## Phase 0: Complete System Audit

### ISSUES IDENTIFIED

| # | File | Line | Issue | Impact |
|---|------|------|-------|--------|
| 1 | LocationTrackingStateManager.kt | 43-44 | Uses local `_trackingState` - NOT synced with backend | UI shows wrong tracking state |
| 2 | MapViewModel.kt | 312-318 | Uses `locationTrackingStateManager.trackingState` | Shows "Traveling" based on local state, not backend |
| 3 | MeetingBottomSheet.kt | 105-1127 | Uses `isTracking` from local state | Journey state not from backend |
| 4 | LocationTrackerService.kt | 80-84 | Threshold 200m vs backend 50m | Inconsistent logging |
| 5 | LocationTrackerService.kt | 274-306 | Local idle detection (15 min) | Different from backend 5 min |
| 6 | MapScreen.kt | 325 | Comment shows tracking logic issue | UI logic not aligned |
| 7 | TripExpenseScreen.kt | - | Shows generic "Transport Mode" | Not showing "Journey via {mode}" |
| 8 | LocationRepository.kt | - | No batteryStale handling | No stale indicator |
| 9 | LocationTrackingStateManager.kt | 210-214 | Only updates from service running | Not from backend response |

---

### ROOT CAUSE ANALYSIS

**The Android app uses LOCAL state** (LocationTrackingStateManager._trackingState) 
instead of **BACKEND response** (validated, idle_state_flag, session_state).

---

### FILES MODIFIED IN PREVIOUS SESSIONS (Working)

✅ LocationLog.kt - Added TrackingUIState model
✅ Locations.kt - Added validation fields to DTO
✅ LocationMapper.kt - Maps all new fields
✅ TripExpenseScreen.kt - Added Car/Taxi/Auto
✅ MultiLegTripExpenseScreen.kt - Added transport grid
✅ tracking.service.js (backend) - All validation logic

---

### REMAINING ISSUES TO FIX

1. **LocationTrackingStateManager** - Needs backend sync
2. **MapViewModel** - Needs to use TrackingUIState
3. **Journey flow messages** - Show transport mode
4. **Battery display** - Add stale indicator
5. **Session control** - After clock-out disable UI

---

## PROOF OF BACKEND WORKING

Backend correctly returns:
- `validated: true/false`
- `idle_state_flag: true/false`
- `session_state: ACTIVE/ENDED`
- `battery_stale: true/false`
- `validation_reason: string`
- `location_confidence: HIGH/MEDIUM/LOW`

Android DTOs now have these fields mapped.

---

## RECOMMENDED APPROACH

Since backend is working correctly and Android DTOs/mappers are updated, 
the remaining work is to USE these fields in UI components.

The key issue is: **UI components need to consume TrackingUIState instead of local trackingState**

---

## STATUS: AUDIT COMPLETE

Next: Implement fixes for remaining issues.