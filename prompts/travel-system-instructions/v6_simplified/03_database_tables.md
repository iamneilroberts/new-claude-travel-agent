|
## 6. Database Schema Details (Tables)

```sql
CREATE TABLE Clients (
    client_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT, -- State or Province
    postal_code TEXT,
    country TEXT DEFAULT 'United States',
    date_of_birth TEXT, -- YYYY-MM-DD
    passport_number TEXT,
    passport_expiry TEXT, -- YYYY-MM-DD
    preferences TEXT, -- JSON string or free text for travel preferences
    notes TEXT, -- General notes about the client
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ClientGroups (
    group_id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL UNIQUE, -- e.g., "Smith Family Vacation", "Corporate Retreat XYZ"
    description TEXT,
    primary_contact_client_id INTEGER, -- Optional: link to a main contact client
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_contact_client_id) REFERENCES Clients(client_id) ON DELETE SET NULL
);

CREATE TABLE ClientGroupMembers (
    group_member_id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    role_in_group TEXT, -- e.g., "Lead Traveler", "Spouse", "Child", "Organizer"
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES ClientGroups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE,
    UNIQUE (group_id, client_id) -- Ensures a client is not added to the same group multiple times
);

CREATE TABLE Trips (
    trip_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_name TEXT NOT NULL,
    group_id INTEGER, -- Link to ClientGroups if it's a group trip
    start_date TEXT NOT NULL, -- YYYY-MM-DD
    end_date TEXT NOT NULL, -- YYYY-MM-DD
    duration INTEGER, -- Calculated in days, can be set by trigger or application logic
    status TEXT DEFAULT 'Planned', -- e.g., Planned, Confirmed, In Progress, Completed, Cancelled
    description TEXT,
    total_cost REAL, -- Estimated or actual total cost
    currency TEXT DEFAULT 'USD',
    paid_amount REAL DEFAULT 0,
    balance_due REAL, -- Calculated: total_cost - paid_amount
    agent_name TEXT, -- Travel agent handling the trip
    agent_contact TEXT, -- Agent's email or phone
    special_requests TEXT,
    notes TEXT, -- General notes about the trip
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES ClientGroups(group_id) ON DELETE SET NULL
);

CREATE TABLE TripDays (
    day_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL, -- e.g., 1, 2, 3...
    date TEXT NOT NULL, -- YYYY-MM-DD, should fall within Trip's start_date and end_date
    day_name TEXT, -- e.g., "Arrival in Paris", "Exploring Rome"
    description TEXT, -- Overview of the day's plan
    notes TEXT, -- Specific notes for the day
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    UNIQUE (trip_id, day_number), -- Ensures day numbers are unique per trip
    UNIQUE (trip_id, date) -- Ensures dates are unique per trip
);

CREATE TABLE TripActivities (
    activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    day_id INTEGER NOT NULL,
    start_time TEXT,
    end_time TEXT,
    activity_type TEXT,
    activity_title TEXT NOT NULL,
    description TEXT,
    location_name TEXT,
    destination_id INTEGER,
    latitude REAL,
    longitude REAL,
    booking_reference TEXT,
    cost REAL,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    is_hidden_gem BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (day_id) REFERENCES TripDays(day_id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id)
);

CREATE TABLE Accommodations (
    accommodation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    trip_day_id INTEGER, -- Link to specific day if needed
    accommodation_name TEXT NOT NULL,
    accommodation_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    phone TEXT,
    email TEXT,
    check_in_date TEXT,
    check_in_time TEXT,
    check_out_date TEXT,
    check_out_time TEXT,
    booking_reference TEXT,
    confirmation_number TEXT,
    room_details TEXT,
    rating TEXT,
    amenities TEXT,
    website TEXT,
    price_per_night REAL,
    total_cost REAL,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    status TEXT DEFAULT 'Planned',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (trip_day_id) REFERENCES TripDays(day_id) ON DELETE SET NULL
);

CREATE TABLE Transportation (
    transportation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    trip_day_id INTEGER,
    type TEXT NOT NULL, -- e.g., Flight, Train, Car Rental, Ferry, Taxi, Bus
    provider_name TEXT,
    booking_reference TEXT,
    confirmation_number TEXT,
    seat_assignment TEXT,
    
    -- Departure details
    departure_location TEXT,
    departure_time TEXT,
    departure_datetime TEXT,
    departure_terminal TEXT,
    departure_gate TEXT,
    
    -- Arrival details
    arrival_location TEXT,
    arrival_time TEXT,
    arrival_datetime TEXT,
    arrival_terminal TEXT,
    arrival_gate TEXT,
    
    -- Additional details
    flight_number TEXT,
    aircraft_type TEXT,
    duration TEXT,
    details TEXT,
    cost REAL,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    status TEXT DEFAULT 'Planned',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (trip_day_id) REFERENCES TripDays(day_id) ON DELETE SET NULL
);

CREATE TABLE Destinations (
    destination_id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_name TEXT NOT NULL,
    city TEXT,
    region TEXT,
    country TEXT NOT NULL,
    description TEXT,
    attractions TEXT,
    weather_info TEXT,
    practical_info TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (destination_name, country)
);

CREATE TABLE DiningRecommendations (
    recommendation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_id INTEGER, -- Link to a general destination
    trip_id INTEGER, -- Link to a specific trip if recommendation is trip-specific
    day_id INTEGER, -- Link to a specific day if recommendation is for a particular day
    restaurant_name TEXT NOT NULL,
    cuisine_type TEXT,
    price_range TEXT, -- e.g., $, $$, $$$
    address TEXT,
    phone TEXT,
    website TEXT,
    rating REAL, -- e.g., 4.5
    notes TEXT, -- Personal notes or why it's recommended
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE SET NULL,
    FOREIGN KEY (day_id) REFERENCES TripDays(day_id) ON DELETE SET NULL
);

CREATE TABLE ToursAndExcursions (
    tour_id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_id INTEGER, -- Link to a general destination
    trip_id INTEGER, -- Link to a specific trip if tour is part of it
    day_id INTEGER, -- Link to a specific day if tour is scheduled
    tour_name TEXT NOT NULL,
    tour_operator TEXT,
    description TEXT,
    duration TEXT, -- e.g., "4 hours", "Full day"
    start_time TEXT, -- HH:MM
    meeting_point TEXT,
    cost REAL,
    currency TEXT DEFAULT 'USD',
    booking_reference TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Available', -- e.g., Available, Booked, Confirmed, Cancelled
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE SET NULL,
    FOREIGN KEY (day_id) REFERENCES TripDays(day_id) ON DELETE SET NULL
);

CREATE TABLE TravelDocuments (
    document_id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    trip_id INTEGER,
    document_type TEXT NOT NULL, -- e.g., Passport Scan, Visa, Flight Ticket, Hotel Voucher
    file_name TEXT, -- Original file name
    file_path TEXT, -- Path to stored file (if applicable, consider security)
    storage_url TEXT, -- URL if stored in cloud storage
    issue_date TEXT, -- YYYY-MM-DD
    expiry_date TEXT, -- YYYY-MM-DD
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE
);

CREATE TABLE Payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    client_id INTEGER, -- Who made the payment, if specific client
    payment_date TEXT NOT NULL, -- YYYY-MM-DD
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT, -- e.g., Credit Card, Bank Transfer, Check
    transaction_reference TEXT, -- e.g., Transaction ID, Check Number
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE SET NULL
);

CREATE TABLE CommunicationLog (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    trip_id INTEGER,
    communication_datetime TEXT DEFAULT CURRENT_TIMESTAMP, -- YYYY-MM-DD HH:MM:SS
    communication_type TEXT, -- e.g., Email, Phone Call, Meeting
    subject TEXT,
    summary TEXT NOT NULL, -- Detailed summary of the communication
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_date TEXT, -- YYYY-MM-DD
    agent_name TEXT, -- Agent who handled the communication
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE SET NULL,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE SET NULL
);

CREATE TABLE Feedback (
    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    client_id INTEGER,
    submission_date TEXT DEFAULT CURRENT_TIMESTAMP, -- YYYY-MM-DD
    rating_overall INTEGER, -- e.g., 1-5 or 1-10
    rating_accommodations INTEGER,
    rating_transportation INTEGER,
    rating_activities INTEGER,
    rating_agent_service INTEGER,
    comments_positive TEXT,
    comments_negative TEXT,
    suggestions TEXT,
    permission_to_share BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE SET NULL
);

CREATE TABLE TripDrivingAnalysis (
    analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    day_number INTEGER, -- Optional: if analysis is for a specific day's drive
    segment_name TEXT NOT NULL, -- e.g., "Drive from Airport to Hotel", "Scenic Coastal Route"
    origin_location TEXT,
    destination_location TEXT,
    estimated_duration_minutes INTEGER, -- Driving time without stops
    estimated_distance_km REAL,
    route_summary TEXT, -- Brief description of the route
    points_of_interest_json TEXT, -- JSON array of {name, lat, lon, description}
    traffic_considerations TEXT,
    road_conditions TEXT,
    safety_notes TEXT, -- e.g., "Mountainous roads, drive carefully"
    risk_assessment TEXT, -- e.g., Low, Medium, High based on factors
    alternative_routes_summary TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE
);

CREATE TABLE ActivityLog (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT, -- Could be agent ID or system process
    action_type TEXT NOT NULL, -- e.g., CREATE_CLIENT, UPDATE_TRIP, DELETE_ACTIVITY
    target_entity TEXT, -- e.g., Clients, Trips, TripActivities
    target_id INTEGER, -- ID of the entity affected
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    details_json TEXT, -- JSON object with before/after values or summary of change
    ip_address TEXT, -- Optional: for web-based systems
    status TEXT DEFAULT 'SUCCESS', -- SUCCESS, FAILURE
    error_message TEXT -- If status is FAILURE
);

-- Triggers for updated_at timestamps
CREATE TRIGGER UpdateClientsUpdatedAt
AFTER UPDATE ON Clients
FOR EACH ROW
BEGIN
    UPDATE Clients SET updated_at = CURRENT_TIMESTAMP WHERE client_id = OLD.client_id;
END;

CREATE TRIGGER UpdateClientGroupsUpdatedAt
AFTER UPDATE ON ClientGroups
FOR EACH ROW
BEGIN
    UPDATE ClientGroups SET updated_at = CURRENT_TIMESTAMP WHERE group_id = OLD.group_id;
END;

CREATE TRIGGER UpdateClientGroupMembersUpdatedAt
AFTER UPDATE ON ClientGroupMembers
FOR EACH ROW
BEGIN
    UPDATE ClientGroupMembers SET updated_at = CURRENT_TIMESTAMP WHERE group_member_id = OLD.group_member_id;
END;

CREATE TRIGGER UpdateTripsUpdatedAt
AFTER UPDATE ON Trips
FOR EACH ROW
BEGIN
    UPDATE Trips SET updated_at = CURRENT_TIMESTAMP WHERE trip_id = OLD.trip_id;
    -- Optionally, recalculate duration or balance_due here if not handled by application
    UPDATE Trips SET duration = (JULIANDAY(NEW.end_date) - JULIANDAY(NEW.start_date)) + 1 WHERE trip_id = OLD.trip_id;
    UPDATE Trips SET balance_due = IFNULL(NEW.total_cost, 0) - IFNULL(NEW.paid_amount, 0) WHERE trip_id = OLD.trip_id;
END;

CREATE TRIGGER UpdateTripDaysUpdatedAt
AFTER UPDATE ON TripDays
FOR EACH ROW
BEGIN
    UPDATE TripDays SET updated_at = CURRENT_TIMESTAMP WHERE day_id = OLD.day_id;
END;

CREATE TRIGGER UpdateTripActivitiesUpdatedAt
AFTER UPDATE ON TripActivities
FOR EACH ROW
BEGIN
    UPDATE TripActivities SET updated_at = CURRENT_TIMESTAMP WHERE activity_id = OLD.activity_id;
END;

CREATE TRIGGER UpdateAccommodationsUpdatedAt
AFTER UPDATE ON Accommodations
FOR EACH ROW
BEGIN
    UPDATE Accommodations SET updated_at = CURRENT_TIMESTAMP WHERE accommodation_id = OLD.accommodation_id;
END;

CREATE TRIGGER UpdateTransportationUpdatedAt
AFTER UPDATE ON Transportation
FOR EACH ROW
BEGIN
    UPDATE Transportation SET updated_at = CURRENT_TIMESTAMP WHERE transport_id = OLD.transport_id;
END;

CREATE TRIGGER UpdateDestinationsUpdatedAt
AFTER UPDATE ON Destinations
FOR EACH ROW
BEGIN
    UPDATE Destinations SET updated_at = CURRENT_TIMESTAMP WHERE destination_id = OLD.destination_id;
END;

CREATE TRIGGER UpdateDiningRecommendationsUpdatedAt
AFTER UPDATE ON DiningRecommendations
FOR EACH ROW
BEGIN
    UPDATE DiningRecommendations SET updated_at = CURRENT_TIMESTAMP WHERE recommendation_id = OLD.recommendation_id;
END;

CREATE TRIGGER UpdateToursAndExcursionsUpdatedAt
AFTER UPDATE ON ToursAndExcursions
FOR EACH ROW
BEGIN
    UPDATE ToursAndExcursions SET updated_at = CURRENT_TIMESTAMP WHERE tour_id = OLD.tour_id;
END;

CREATE TRIGGER UpdateTravelDocumentsUpdatedAt
AFTER UPDATE ON TravelDocuments
FOR EACH ROW
BEGIN
    UPDATE TravelDocuments SET updated_at = CURRENT_TIMESTAMP WHERE document_id = OLD.document_id;
END;

CREATE TRIGGER UpdatePaymentsUpdatedAt
AFTER UPDATE ON Payments
FOR EACH ROW
BEGIN
    UPDATE Payments SET updated_at = CURRENT_TIMESTAMP WHERE payment_id = OLD.payment_id;
END;

CREATE TRIGGER UpdateCommunicationLogUpdatedAt
AFTER UPDATE ON CommunicationLog
FOR EACH ROW
BEGIN
    UPDATE CommunicationLog SET updated_at = CURRENT_TIMESTAMP WHERE log_id = OLD.log_id;
END;

CREATE TRIGGER UpdateFeedbackUpdatedAt
AFTER UPDATE ON Feedback
FOR EACH ROW
BEGIN
    UPDATE Feedback SET updated_at = CURRENT_TIMESTAMP WHERE feedback_id = OLD.feedback_id;
END;

CREATE TRIGGER UpdateTripDrivingAnalysisUpdatedAt
AFTER UPDATE ON TripDrivingAnalysis
FOR EACH ROW
BEGIN
    UPDATE TripDrivingAnalysis SET updated_at = CURRENT_TIMESTAMP WHERE analysis_id = OLD.analysis_id;
END;

-- Trigger to auto-calculate trip duration and balance_due on INSERT
CREATE TRIGGER TripsInsertDefaults
AFTER INSERT ON Trips
FOR EACH ROW
BEGIN
    UPDATE Trips
    SET duration = (JULIANDAY(NEW.end_date) - JULIANDAY(NEW.start_date)) + 1,
        balance_due = IFNULL(NEW.total_cost, 0) - IFNULL(NEW.paid_amount, 0)
    WHERE trip_id = NEW.trip_id;
END;

-- Trigger to update trip balance_due when a new payment is made
CREATE TRIGGER UpdateTripBalanceAfterPayment
AFTER INSERT ON Payments
FOR EACH ROW
BEGIN
    UPDATE Trips
    SET paid_amount = IFNULL(paid_amount, 0) + NEW.amount,
        balance_due = IFNULL(total_cost, 0) - (IFNULL(paid_amount, 0) + NEW.amount)
    WHERE trip_id = NEW.trip_id;
END;

-- Trigger to adjust trip balance_due when a payment is updated
CREATE TRIGGER AdjustTripBalanceAfterPaymentUpdate
AFTER UPDATE OF amount ON Payments
FOR EACH ROW
BEGIN
    UPDATE Trips
    SET paid_amount = IFNULL(paid_amount, 0) - OLD.amount + NEW.amount,
        balance_due = IFNULL(total_cost, 0) - (IFNULL(paid_amount, 0) - OLD.amount + NEW.amount)
    WHERE trip_id = NEW.trip_id;
END;

-- Trigger to adjust trip balance_due when a payment is deleted
CREATE TRIGGER AdjustTripBalanceAfterPaymentDelete
AFTER DELETE ON Payments
FOR EACH ROW
BEGIN
    UPDATE Trips
    SET paid_amount = IFNULL(paid_amount, 0) - OLD.amount,
        balance_due = IFNULL(total_cost, 0) - (IFNULL(paid_amount, 0) - OLD.amount)
    WHERE trip_id = OLD.trip_id;
END;

```

## 8. Database Schema Details (Observations)

*   **Normalization**: The schema is reasonably normalized to reduce data redundancy. For example, client information is stored once in `Clients` and referenced elsewhere.
*   **Flexibility**: Many fields are optional (allow NULLs) to accommodate varying levels of detail for different trips or clients.
*   **Date Handling**: Dates are stored as TEXT in 'YYYY-MM-DD' format, and datetimes as 'YYYY-MM-DD HH:MM'. This is standard for SQLite and simplifies querying, though care must be taken for date comparisons and calculations (SQLite's date/time functions are useful here).
*   **Cascading Deletes**: Used strategically (e.g., deleting a `Trip` will delete its associated `TripDays`, `TripActivities`, etc.). This simplifies data management but requires caution. Some foreign keys use `ON DELETE SET NULL` where appropriate (e.g., `ClientGroups.primary_contact_client_id`).
*   **Timestamps**: `created_at` and `updated_at` fields are common for tracking record changes. Triggers are implemented to automatically update `updated_at` fields.
*   **JSON Usage**: Some fields (e.g., `Clients.preferences`, `TripDrivingAnalysis.points_of_interest_json`) use TEXT to store JSON. This offers flexibility but makes querying specific JSON attributes more complex (requires SQLite's JSON functions).
*   **Linking**:
    *   `Accommodations` and `Transportation` can be linked directly to a `Trips` (for overall trip arrangements) or to a specific `TripDays` (for daily itinerary items).
    *   `DiningRecommendations` and `ToursAndExcursions` can be linked to `Destinations` (general recommendations), `Trips` (trip-specific), or `TripDays` (day-specific).
*   **Calculated Fields**: Some fields like `Trips.duration` and `Trips.balance_due` are intended to be calculated. Triggers are set up to handle these calculations automatically on INSERT or UPDATE of relevant fields.
*   **Status Fields**: Many tables include a `status` field (e.g., `Trips.status`, `Accommodations.status`). Consistent use of predefined status values (e.g., 'Planned', 'Confirmed', 'Cancelled') is important for application logic.
*   **Unique Constraints**: Used to enforce data integrity (e.g., `Clients.email`, `ClientGroups.group_name`, `TripDays` uniqueness on `(trip_id, day_number)` and `(trip_id, date)`).
*   **ActivityLog**: Provides an audit trail for significant changes. The `details_json` can store a snapshot of changes.
*   **Client Groups**: The `ClientGroups` and `ClientGroupMembers` tables allow for organizing clients into groups for trips, which is useful for family vacations or corporate travel.