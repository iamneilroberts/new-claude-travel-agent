-- Create airports table with comprehensive airport data
CREATE TABLE IF NOT EXISTS airports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  iata_code TEXT UNIQUE NOT NULL, -- 3-letter IATA code (DEN, MOB, etc.)
  icao_code TEXT, -- 4-letter ICAO code
  name TEXT NOT NULL, -- Airport name
  city TEXT NOT NULL, -- Primary city served
  state_province TEXT, -- State/Province (for US/Canada mainly)
  country TEXT NOT NULL, -- Country name
  country_code TEXT NOT NULL, -- 2-letter country code (US, CA, etc.)
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  elevation INTEGER, -- Elevation in feet
  timezone TEXT, -- Timezone name (America/Denver, etc.)
  type TEXT DEFAULT 'airport', -- airport, heliport, seaplane_base, etc.
  is_major BOOLEAN DEFAULT 0, -- Major commercial airports
  is_hub BOOLEAN DEFAULT 0, -- Major airline hubs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create cities table for broader city searches
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- City name
  state_province TEXT, -- State/Province
  country TEXT NOT NULL, -- Country name  
  country_code TEXT NOT NULL, -- 2-letter country code
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  population INTEGER, -- City population
  is_capital BOOLEAN DEFAULT 0, -- Capital city flag
  primary_airport_iata TEXT, -- Primary serving airport
  timezone TEXT, -- Timezone name
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (primary_airport_iata) REFERENCES airports(iata_code)
);

-- Create indexes for fast searches
CREATE INDEX IF NOT EXISTS idx_airports_iata ON airports(iata_code);
CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city);
CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country_code);
CREATE INDEX IF NOT EXISTS idx_airports_location ON airports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_airports_major ON airports(is_major);

CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_code);
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_cities_airport ON cities(primary_airport_iata);

-- Create a view that joins cities with their airports
CREATE VIEW IF NOT EXISTS city_airports AS
SELECT 
  c.name as city_name,
  c.state_province,
  c.country,
  c.country_code,
  c.latitude as city_lat,
  c.longitude as city_lng,
  c.population,
  c.timezone as city_timezone,
  a.iata_code,
  a.icao_code,
  a.name as airport_name,
  a.latitude as airport_lat,
  a.longitude as airport_lng,
  a.elevation,
  a.is_major,
  a.is_hub,
  -- Calculate distance between city center and airport
  ROUND(
    3959 * acos(
      cos(radians(c.latitude)) * cos(radians(a.latitude)) * 
      cos(radians(a.longitude) - radians(c.longitude)) + 
      sin(radians(c.latitude)) * sin(radians(a.latitude))
    ), 1
  ) as distance_miles
FROM cities c
LEFT JOIN airports a ON c.primary_airport_iata = a.iata_code
UNION ALL
-- Also include nearby airports (within 50 miles)
SELECT 
  c.name as city_name,
  c.state_province,
  c.country,
  c.country_code,
  c.latitude as city_lat,
  c.longitude as city_lng,
  c.population,
  c.timezone as city_timezone,
  a.iata_code,
  a.icao_code,
  a.name as airport_name,
  a.latitude as airport_lat,
  a.longitude as airport_lng,
  a.elevation,
  a.is_major,
  a.is_hub,
  ROUND(
    3959 * acos(
      cos(radians(c.latitude)) * cos(radians(a.latitude)) * 
      cos(radians(a.longitude) - radians(c.longitude)) + 
      sin(radians(c.latitude)) * sin(radians(a.latitude))
    ), 1
  ) as distance_miles
FROM cities c, airports a
WHERE c.primary_airport_iata != a.iata_code
AND (
  3959 * acos(
    cos(radians(c.latitude)) * cos(radians(a.latitude)) * 
    cos(radians(a.longitude) - radians(c.longitude)) + 
    sin(radians(c.latitude)) * sin(radians(a.latitude))
  )
) <= 50
ORDER BY distance_miles;