## Activity Tracking and Session Continuity

This section details how to use the ActivityLog for tracking user interactions and maintaining session continuity.

### New MCP Tools for ActivityLog

You have access to two new MCP tools for managing the ActivityLog:

1.  **`get_recent_activities`**:
    *   **Purpose**: Retrieves recent activities from the ActivityLog.
    *   **Parameters**:
        *   `limit` (integer, optional, default: 3): Number of recent activities to retrieve.
        *   `days_past` (integer, optional, default: 7): How many days back to look for activities.
    *   **Returns**: A list of activity objects.
    *   **Example**: `get_recent_activities(limit=3, days_past=7)`

2.  **`add_activity_log_entry`**:
    *   **Purpose**: Adds a new entry to the ActivityLog.
    *   **Parameters**:
        *   `session_id` (string, required): The current session ID.
        *   `activity_type` (string, required): The type of activity.
        *   `details` (string, required): A brief description of the activity.
        *   `trip_id` (integer, optional): The ID of the trip related to the activity.
        *   `client_id` (integer, optional): The ID of the client related to the activity.
    *   **Returns**: Confirmation of successful logging.
    *   **Example**: `add_activity_log_entry(session_id='Session-20250508-TripPlanning', trip_id=123, activity_type='EditTrip', details='Updated itinerary for Day 3')`

### Standard Activity Types:

When logging activities using `add_activity_log_entry`, use these standard `activity_type` values:

*   `ViewTrip`: When displaying a trip's details.
*   `EditTrip`: When modifying trip details (days, activities, etc.).
*   `CreateTrip`: When creating a new trip.
*   `DeleteTrip`: When deleting a trip.
*   `ViewClient`: When displaying client information.
*   `EditClient`: When modifying client details.
*   `CreateClient`: When creating a new client.
*   `SearchFlights`: When searching for flights or transportation.
*   `BookTransportation`: When adding transportation to a trip.
*   `BookAccommodation`: When adding accommodation to a trip.
*   `SchemaChange`: When modifying database schema.
*   `DatabaseMaintenance`: For database optimizations.
*   `ContinueSession`: When resuming work on a previous activity.

### Activity Logging Protocol:

When the primary *trip* context *changes* (i.e., you start working on a different trip, a new trip is created, or you resume a session on a specific trip):

1.  Log the activity using the `add_activity_log_entry` tool.
2.  **Parameters for `add_activity_log_entry`**:
    *   `session_id`: The `session_id` generated at the start of the conversation.
    *   `trip_id`: The ID of the trip involved (if applicable, otherwise NULL/omit).
    *   `client_id`: The ID of the client involved (if applicable, otherwise NULL/omit).
    *   `activity_type`: One of the Standard Activity Types.
    *   `details`: A brief, clear description of what was changed (e.g., "Added flight to LAX for Hawaii trip", "Updated client 'John Doe' email address").
3.  Include sufficient detail in the `details` field to understand what was changed.

### Granularity Guidelines for Logging:

**Always Log (using `add_activity_log_entry`):**

*   Switching the primary working context to a *different* trip.
*   Creating a new trip (as this establishes a new primary working context).
*   Resuming work on a specific trip via the session continuity mechanism (using `activity_type: 'ContinueSession'`).

**Do Not Log (or log with less priority if unsure):**

*   Routine data retrievals or views of the *current* trip/client that do not change the active context (e.g., re-displaying details of the trip you are already working on).
*   Minor, incremental edits to an existing trip or client (e.g., correcting a typo, adding a single minor activity) unless part of a larger "major update" being saved.
*   Failed operations or validation checks.
*   Temporary calculations or analyses that don't result in persistent data changes.

### Session Continuity Implementation (Post-Confirmation):

When a user confirms they want to continue working based on the `get_recent_activities` prompt (covered in Conversation Start Protocol):

1.  Use information from the selected recent activity to restore context.
2.  Log a continuation activity using `add_activity_log_entry`:
    *   `session_id`: The *new* `session_id` for the current conversation.
    *   `trip_id`: The `trip_id` from the activity being continued.
    *   `client_id`: The `client_id` from the activity being continued (if available).
    *   `activity_type`: `'ContinueSession'`.
    *   `details`: "Resumed work on [trip_name/client_name] from previous activity: [original_activity_type] - [original_details]".
3.  Display the most current information about the trip/client being worked on, typically using the `ComprehensiveTripView`.