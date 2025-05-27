-- Drop the existing view if it exists, to ensure a clean update
DROP VIEW IF EXISTS TripDailyLogisticsView;

-- Create the new refined view
CREATE VIEW TripDailyLogisticsView AS
    WITH DailyAccommodations AS (
        SELECT
            td.day_id,
            GROUP_CONCAT(a.name, ' | ') AS accommodation_names,
            GROUP_CONCAT(CAST(a.accommodation_id AS TEXT), ',') AS accommodation_ids
        FROM TripDays td
        LEFT JOIN Accommodations a ON td.trip_id = a.trip_id AND td.date >= a.check_in_date AND td.date < a.check_out_date
        GROUP BY td.day_id
    ),
    DirectTransportationItems AS (
        SELECT
            td.day_id,
            tr.transport_type || ': ' || COALESCE(tr.provider, '') || ' from ' || COALESCE(tr.departure_location, '') || ' to ' || COALESCE(tr.arrival_location, '') AS summary_text,
            CAST(tr.transport_id AS TEXT) AS id_text
        FROM TripDays td
        JOIN Transportation tr ON td.trip_id = tr.trip_id AND (tr.day_id = td.day_id OR DATE(tr.departure_datetime) = td.date)
    ),
    ActivityTransportationItems AS (
        SELECT
            ta.day_id,
            ta.title || COALESCE(CASE WHEN ta.description IS NOT NULL AND ta.description != '' THEN ' (' || ta.description || ')' ELSE '' END, '') AS summary_text,
            'activity:' || CAST(ta.activity_id AS TEXT) AS id_text
        FROM TripActivities ta
        WHERE (ta.title LIKE '%travel%' OR ta.title LIKE '%drive%' OR ta.title LIKE '%flight%' OR ta.title LIKE '%airport%' OR ta.title LIKE '%departure%' OR ta.title LIKE '%shuttle%' OR ta.title LIKE '%transfer%' OR ta.title LIKE '%arrive%' OR ta.title LIKE '%depart%' OR ta.title LIKE '%bus%' OR ta.title LIKE '%train%' OR ta.title LIKE '%taxi%' OR ta.title LIKE '%rental car%' OR ta.title LIKE '%pickup%' OR ta.title LIKE '%dropoff%')
           OR (ta.description LIKE '%travel%' OR ta.description LIKE '%drive%' OR ta.description LIKE '%flight%' OR ta.description LIKE '%airport%' OR ta.description LIKE '%departure%' OR ta.description LIKE '%shuttle%' OR ta.description LIKE '%transfer%' OR ta.description LIKE '%arrive%' OR ta.description LIKE '%depart%' OR ta.description LIKE '%bus%' OR ta.description LIKE '%train%' OR ta.description LIKE '%taxi%' OR ta.description LIKE '%rental car%' OR ta.description LIKE '%pickup%' OR ta.description LIKE '%dropoff%')
    ),
    AggregatedDailyTransportation AS (
        SELECT
            day_id,
            GROUP_CONCAT(summary_text, ' | ') AS transportation_summary,
            GROUP_CONCAT(id_text, ',') AS transportation_ids
        FROM (
            SELECT day_id, summary_text, id_text FROM DirectTransportationItems
            UNION
            SELECT day_id, summary_text, id_text FROM ActivityTransportationItems
        ) AS AllTransportationItems
        GROUP BY day_id
    )
    SELECT
        t.trip_id,
        t.trip_name,
        td.day_id,
        td.day_number,
        td.date AS day_date,
        td.day_name,
        da.accommodation_names,
        da.accommodation_ids,
        adt.transportation_summary,
        adt.transportation_ids
    FROM
        Trips t
    JOIN TripDays td ON t.trip_id = td.trip_id
    LEFT JOIN DailyAccommodations da ON td.day_id = da.day_id
    LEFT JOIN AggregatedDailyTransportation adt ON td.day_id = adt.day_id
    ORDER BY
        t.trip_id,
        td.day_number;
