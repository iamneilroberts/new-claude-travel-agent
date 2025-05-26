## 7. Database Schema Details (Views)

```sql
-- View for a summary of each trip, including primary client/group and basic details
CREATE VIEW TripSummaryView AS
SELECT
    t.trip_id,
    t.trip_name,
    t.start_date,
    t.end_date,
    t.duration,
    t.status AS trip_status,
    t.total_cost,
    t.currency,
    t.agent_name,
    cg.group_id,
    cg.group_name,
    pc.client_id AS primary_contact_client_id,
    pc.first_name AS primary_contact_first_name,
    pc.last_name AS primary_contact_last_name,
    (SELECT GROUP_CONCAT(c.first_name || ' ' || c.last_name, '; ')
     FROM ClientGroupMembers cgm
     JOIN Clients c ON cgm.client_id = c.client_id
     WHERE cgm.group_id = t.group_id) AS group_members,
    (SELECT COUNT(*) FROM TripDays td WHERE td.trip_id = t.trip_id) AS number_of_days,
    (SELECT GROUP_CONCAT(DISTINCT dest.name, '; ')
     FROM TripActivities ta
     JOIN TripDays td ON ta.day_id = td.day_id
     JOIN Destinations dest ON ta.location LIKE '%' || dest.city || '%' OR ta.location LIKE '%' || dest.name || '%'
     WHERE td.trip_id = t.trip_id) AS destinations_visited -- Simplified destination linking
FROM Trips t
LEFT JOIN ClientGroups cg ON t.group_id = cg.group_id
LEFT JOIN Clients pc ON cg.primary_contact_client_id = pc.client_id;

-- View for daily logistics: accommodations and transportation for each day of a trip
CREATE VIEW TripDailyLogisticsView AS
SELECT
    td.trip_id,
    t.trip_name,
    td.day_id,
    td.day_number,
    td.date,
    td.day_name,
    GROUP_CONCAT(DISTINCT acc.accommodation_name || ' (Check-in: ' || acc.check_in_date || ', Check-out: ' || acc.check_out_date || ')', '; ') AS accommodations_today,
    GROUP_CONCAT(DISTINCT tr.transport_type || ' from ' || tr.departure_location_name || ' to ' || tr.arrival_location_name || ' at ' || SUBSTR(tr.departure_datetime, 12, 5), '; ') AS transportation_today
FROM TripDays td
JOIN Trips t ON td.trip_id = t.trip_id
LEFT JOIN Accommodations acc ON (acc.trip_id = td.trip_id AND acc.check_in_date <= td.date AND acc.check_out_date >= td.date) OR acc.day_id = td.day_id
LEFT JOIN Transportation tr ON (tr.trip_id = td.trip_id AND DATE(tr.departure_datetime) = td.date) OR tr.day_id = td.day_id
GROUP BY td.day_id
ORDER BY td.trip_id, td.day_number;

-- View for detailed daily activities for each trip
CREATE VIEW TripDailyActivitiesView AS
SELECT
    td.trip_id,
    t.trip_name,
    td.day_id,
    td.day_number,
    td.date,
    td.day_name,
    ta.activity_id,
    ta.start_time,
    ta.end_time,
    ta.activity_type,
    ta.title AS activity_title,
    ta.description AS activity_description,
    ta.location AS activity_location,
    ta.cost AS activity_cost,
    ta.currency AS activity_currency
FROM TripDays td
JOIN Trips t ON td.trip_id = t.trip_id
LEFT JOIN TripActivities ta ON td.day_id = ta.day_id
ORDER BY td.trip_id, td.day_number, ta.start_time;

-- View for a summary of components per day (e.g., number of accommodations, transport, activities)
CREATE VIEW TripDaySummaryView AS
SELECT
    td.trip_id,
    t.trip_name,
    td.day_id,
    td.day_number,
    td.date,
    td.day_name,
    (SELECT COUNT(DISTINCT acc.accommodation_id) FROM Accommodations acc WHERE (acc.trip_id = td.trip_id AND acc.check_in_date <= td.date AND acc.check_out_date >= td.date) OR acc.day_id = td.day_id) AS accommodation_count,
    (SELECT COUNT(DISTINCT tr.transport_id) FROM Transportation tr WHERE (tr.trip_id = td.trip_id AND DATE(tr.departure_datetime) = td.date) OR tr.day_id = td.day_id) AS transportation_count,
    (SELECT COUNT(ta.activity_id) FROM TripActivities ta WHERE ta.day_id = td.day_id) AS activity_count
FROM TripDays td
JOIN Trips t ON td.trip_id = t.trip_id
GROUP BY td.day_id
ORDER BY td.trip_id, td.day_number;

-- View for upcoming trips (e.g., starting in the next 30 days)
CREATE VIEW UpcomingTripsSummaryView AS
SELECT
    trip_id,
    trip_name,
    start_date,
    end_date,
    duration,
    status,
    (SELECT GROUP_CONCAT(c.first_name || ' ' || c.last_name, '; ')
     FROM ClientGroupMembers cgm
     JOIN Clients c ON cgm.client_id = c.client_id
     JOIN Trips t_join ON cgm.group_id = t_join.group_id
     WHERE t_join.trip_id = Trips.trip_id) AS group_members_on_trip
FROM Trips
WHERE date(start_date) BETWEEN date('now') AND date('now', '+30 days')
ORDER BY start_date;

-- View for efficient trip activity lookups using the new trip_id column
CREATE VIEW TripActivitiesView AS
SELECT 
    ta.trip_id,
    ta.activity_id,
    ta.day_id,
    td.day_number,
    td.date,
    ta.activity_type,
    ta.start_time,
    ta.end_time,
    ta.title,
    ta.description,
    ta.location AS location_name,
    ta.notes
FROM TripActivities ta
JOIN TripDays td ON td.day_id = ta.day_id
ORDER BY ta.trip_id, td.day_number, ta.start_time;
