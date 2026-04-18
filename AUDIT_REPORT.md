# SYSTEM AUDIT REPORT

## Phase 0: FULL SYSTEM AUDIT

---

### ANDROID CODEBASE - Issues Found

| # | File | Line | Issue |
|---|------|------|-------|
| 1 | LocationTrackingStateManager.kt | 43-44 | Uses local `_trackingState` - NOT synced with backend |
| 2 | MapViewModel.kt | 312-318 | Shows "Traveling" based on local state, not backend validation |
| 3 | MeetingBottomSheet.kt | 105-1127 | Uses `isTracking` from local state, not backend |
| 4 | LocationTrackerService.kt | 80-84 | Threshold 200m - different from backend 50m |
| 5 | TripExpenseScreen.kt | - | No display of validation_status |
| 6 | LocationRepository | - | No battery_stale handling in UI |

---

### BACKEND - Response Fields (Verified Working)

| Field | Status | Description |
|-------|--------|-------------|
| validated | ✅ | TRUE/FALSE - true = valid movement |
| validation_reason | ✅ | Reason if invalid |
| idle_state_flag | ✅ | true = idle |
| battery_stale | ✅ | true = battery data old |
| session_state | ✅ | ACTIVE/ENDED/PAUSED |

---

### MISMATCHES (UI vs Backend)

1. **Tracking State Display**
   - Android: Shows based on `LocationTrackingStateManager.trackingState` (local)
   - Backend: Should use `validated` field from last log
   - **Issue**: UI can show "Traveling" when backend marks movement as INVALID

2. **Battery Display**
   - Android: Shows local battery
   - Backend: Has `battery_stale` flag from server
   - **Issue**: No stale indicator in UI

3. **Session State**
   - Android: Uses local tracking state
   - Backend: Returns actual session state
   - **Issue**: UI can allow actions when session ended

4. **Idle Detection**
   - Android: Local 5 min timer
   - Backend: Returns `idle_state_flag`
   - **Issue**: Should use backend flag

---

### ✅ ALREADY CORRECT

- Multi-leg chaining (line 146 MultiLegExpenseViewModel.kt)
- Transport mode "Auto" (added earlier)

---

## Required Fixes

### 1. TrackingStateManager - Add Backend Sync
### 2. MapViewModel - Use validation_status from API
### 3. BatteryUI - Add stale indicator
### 4. SessionControl - Sync with backend
### 5. LocationTrackerService - Align thresholds

---

**Audit Complete** ✅