// FRONTEND CONTRACT UPDATES - Required UI Changes
// ============================================

// 1. LOCATION PICKER COMPONENT
// Required features:
{
  "locationPicker": {
    "searchAutocomplete": {
      "provider": "Google Places API",
      "endpoint": "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      "required": true,
      "fields": ["place_id", "description", "structured_formatting"]
    },
    "draggablePin": {
      "enabled": true,
      "onDragEnd": "Reverse geocode new position",
      "visual": "Custom marker with accuracy indicator"
    },
    "reverseGeocoding": {
      "enabled": true,
      "provider": "Google Geocoding API",
      "onLocationSelect": "Populate address fields"
    }
  }
}

// 2. LEG FLOW - Auto-fill next leg start
// Implementation:
{
  "legFlow": {
    "autoFillNextLegStart": true,
    "behavior": "leg[n].start = leg[n-1].end",
    "UI": {
      "showPreviousEnd": "Display previous leg end as next leg start (read-only)",
      "disableStartInput": "For leg > 1, start location is auto-filled",
      "allowOverride": false // STRICT MODE: No manual override
    }
  }
}

// 3. TRANSPORT MODE - Required before journey start
{
  "transportMode": {
    "required": true,
    "enforcement": "Cannot start journey without transport mode",
    "UI": {
      "showOnJourneyStart": true,
      "persistSelection": "Store in session for duration of journey",
      "validation": "Throw error if missing on JOURNEY_START activity"
    }
  }
}

// API CONTRACT - Required Fields
// ==============================

// POST /api/location
{
  "required": ["latitude", "longitude"],
  "optional": {
    "accuracy": "GPS accuracy in meters (max: 30)",
    "battery": "Battery percentage (0-100)",
    "timestamp": "Client timestamp for battery freshness check",
    "activity": "CLOCK_IN, CLOCK_OUT, JOURNEY_START, JOURNEY_END, MEETING_START, MEETING_END, TRACKING",
    "transport_mode": "Car, Bike, Taxi, Train, Bus, Flight",
    "sessionState": "Client-side session state (for validation)"
  }
}

// POST /api/expenses
{
  "required": [
    "start_location",
    "travel_date",
    "distance_km",
    "transport_mode",
    "amount_spent"
  ],
  "validation": {
    "sessionActive": "Must have active session",
    "journeyExists": "Must have JOURNEY_START log for travel_date",
    "validLogs": "At least 2 validated tracking logs",
    "minDistance": ">= 100m total travel distance"
  },
  "multiLeg": {
    "leg[n].start": "Auto-filled from leg[n-1].end",
    "transport_mode": "Required per leg or parent"
  }
}

// POST /api/location/clock-in
{
  "required": ["latitude", "longitude"],
  "creates": "Active session (SESSION_STATE = 'ACTIVE')"
}

// POST /api/location/clock-out
{
  "required": ["latitude", "longitude"],
  "effect": "Ends session, stops all tracking"
}

// ERROR CODES
// ===========
{
  "SessionNotActive": "Session not active. Please clock in first.",
  "InvalidMovement": "Movement validation failed - distance/speed/accuracy requirements not met",
  "IdleState": "Tracking paused - no valid movement for 5 minutes. Resume on movement > 50m",
  "InvalidBatteryData": "Battery data stale or invalid",
  "NoJourneyExists": "No journey found for today. Please start a journey before submitting expenses.",
  "InsufficientValidLogs": "At least 2 valid travel logs required for expense",
  "InsufficientTravelDistance": "Total travel distance must be at least 100m",
  "TrainValidationFailed": "No train station within 10km radius"
}