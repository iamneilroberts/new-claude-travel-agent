# Database Schema Reference

## Core Tables

### Clients
- `client_id` (INTEGER, PK): Unique identifier
- `first_name`, `last_name`, `email`, `phone`, `address`, `city`, `state`, `postal_code`, `country`
- `date_of_birth`, `passport_number`, `passport_expiry`
- `preferences` (TEXT): JSON travel preferences
- `notes`, `created_at`, `updated_at`

### Trips
- `trip_id` (INTEGER, PK): Unique identifier
- `trip_name`, `start_date`, `end_date`, `duration`
- `status`: Planned, Booked, Completed, Cancelled
- `description`, `total_cost`, `currency`, `paid_amount`, `balance_due`
- `agent_name`, `agent_contact`, `special_requests`, `notes`
- `group_id` (FK): Links to Groups table
- `created_at`, `updated_at`

### TripParticipants
Links clients to trips:
- `trip_id` (FK) + `client_id` (FK) = Composite PK
- `created_at`

### Groups
- `group_id` (INTEGER, PK): Unique identifier
- `group_name`, `description`, `created_at`, `updated_at`

### GroupMembers
Links clients to groups:
- `group_id` (FK) + `client_id` (FK) = Composite PK
- `created_at`

## Trip Component Tables

### Accommodations
- `accommodation_id` (INTEGER, PK)
- `trip_id` (FK), `day_number`
- `hotel_name`, `check_in_date`, `check_out_date`
- `confirmation_number`, `room_type`, `rate_per_night`, `total_cost`
- `notes`, `created_at`, `updated_at`

### TripActivities
- `activity_id` (INTEGER, PK)
- `trip_id` (FK) - Direct link to trip for efficient queries
- `day_id` (FK) - Links to specific day
- `activity_type`, `description`, `start_time`, `end_time`
- `location`, `title`, `booking_reference`
- `cost`, `currency`, `notes`, `created_at`, `updated_at`

### Transportation
- `transport_id` (INTEGER, PK)
- `trip_id` (FK), `day_number`
- `transport_type`, `departure_location`, `arrival_location`
- `departure_time`, `arrival_time`, `carrier`
- `booking_reference`, `cost`, `notes`, `created_at`, `updated_at`

## Activity Log
- `log_id` (INTEGER, PK)
- `trip_id`, `client_id`, `action_type`
- `details` (JSON), `user_id`, `created_at`

## Key Views

### TripSummaryView
Comprehensive trip overview with participant names and group info

### TripDailyLogisticsView
Day-by-day accommodations and transportation

### TripDailyActivitiesView
Activities organized by trip and day

### TripDaySummaryView
Count of components per day (accommodations, transport, activities)

### UpcomingTripsSummaryView
Trips starting in next 30 days

### TripActivitiesView
Efficient trip activity lookups using the new trip_id column

## Database Relationships
```
Clients ←→ TripParticipants → Trips
   ↓                            ↑
GroupMembers → Groups ──────────┘
                               ↓
            Accommodations, TripActivities, Transportation
```

## Important Notes
- All trips link to clients via TripParticipants
- TripActivities now has direct trip_id for efficient queries (e.g., `SELECT * FROM TripActivities WHERE trip_id = ?`)
- Component tables (Accommodations, TripActivities, Transportation) link to trips directly
- Views provide denormalized data for common queries
- Activity logs track all system actions
- Dates stored as TEXT in YYYY-MM-DD format
- Times include timezone info when relevant