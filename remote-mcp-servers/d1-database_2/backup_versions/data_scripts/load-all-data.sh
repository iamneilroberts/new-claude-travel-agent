#!/bin/bash

echo "🛫 Loading all airport data to D1 database..."

# Load all airport chunks
for i in {1..86}; do
    echo "Loading airports chunk $i/86..."
    wrangler d1 execute travel_assistant --remote --file=airports_data_chunk_$i.sql
done

echo "🏙️ Loading all city data to D1 database..."

# Load all city chunks  
for i in {1..80}; do
    echo "Loading cities chunk $i/80..."
    wrangler d1 execute travel_assistant --remote --file=cities_data_chunk_$i.sql
done

echo "✅ All data loaded! Testing database..."

# Test the database
echo "📊 Airport count:"
wrangler d1 execute travel_assistant --remote --command="SELECT COUNT(*) as total_airports FROM airports;"

echo "📊 City count:"
wrangler d1 execute travel_assistant --remote --command="SELECT COUNT(*) as total_cities FROM cities;"

echo "🔍 Testing Denver and Mobile lookups:"
wrangler d1 execute travel_assistant --remote --command="SELECT iata_code, name, city, country FROM airports WHERE city LIKE '%Denver%' OR city LIKE '%Mobile%' LIMIT 10;"

echo "🎉 D1 database setup complete!"