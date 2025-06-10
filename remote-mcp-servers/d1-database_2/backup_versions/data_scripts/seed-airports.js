// Script to seed D1 database with airport and city data from OpenFlights
// Run with: node seed-airports.js

const seedAirportsData = async () => {
  console.log('🛫 Starting airport data seeding...');
  
  try {
    // Fetch airports data from OpenFlights
    console.log('📥 Fetching airports data from OpenFlights...');
    const airportsResponse = await fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat');
    const airportsCSV = await airportsResponse.text();
    
    // Fetch airlines data for context
    console.log('📥 Fetching airlines data from OpenFlights...');
    const airlinesResponse = await fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat');
    const airlinesCSV = await airlinesResponse.text();
    
    // Parse airports CSV
    const airports = [];
    const cities = new Map(); // Use Map to avoid duplicates
    
    const airportLines = airportsCSV.split('\n');
    console.log(`📊 Processing ${airportLines.length} airport records...`);
    
    for (const line of airportLines) {
      if (!line.trim()) continue;
      
      // Parse CSV line with proper quote handling
      const fields = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim()); // Add last field
      
      if (fields.length < 14) continue;
      
      const airport = {
        id: fields[0],
        name: fields[1]?.replace(/^"|"$/g, ''),
        city: fields[2]?.replace(/^"|"$/g, ''),
        country: fields[3]?.replace(/^"|"$/g, ''),
        iata: fields[4]?.replace(/^"|"$/g, ''),
        icao: fields[5]?.replace(/^"|"$/g, ''),
        latitude: parseFloat(fields[6]) || 0,
        longitude: parseFloat(fields[7]) || 0,
        elevation: parseInt(fields[8]) || 0,
        timezone: fields[9]?.replace(/^"|"$/g, ''),
        dst: fields[10]?.replace(/^"|"$/g, ''),
        tzName: fields[11]?.replace(/^"|"$/g, ''),
        type: fields[12]?.replace(/^"|"$/g, ''),
        source: fields[13]?.replace(/^"|"$/g, '')
      };
      
      // Skip if no valid IATA code
      if (!airport.iata || airport.iata === '\\N' || airport.iata.length !== 3) {
        continue;
      }
      
      // Determine country code from country name
      const countryCode = getCountryCode(airport.country);
      if (!countryCode) continue;
      
      // Extract state/province for US and Canada
      let stateProvince = null;
      if (countryCode === 'US' || countryCode === 'CA') {
        // Try to extract state from city name if it contains comma
        const cityParts = airport.city.split(',');
        if (cityParts.length > 1) {
          stateProvince = cityParts[1].trim();
          airport.city = cityParts[0].trim();
        }
      }
      
      // Determine if it's a major airport (heuristic based on name and type)
      const isMajor = airport.type === 'airport' && (
        airport.name.includes('International') ||
        airport.name.includes('Regional') ||
        majorAirportCodes.includes(airport.iata)
      );
      
      const isHub = hubAirportCodes.includes(airport.iata);
      
      airports.push({
        iata_code: airport.iata,
        icao_code: airport.icao === '\\N' ? null : airport.icao,
        name: airport.name,
        city: airport.city,
        state_province: stateProvince,
        country: airport.country,
        country_code: countryCode,
        latitude: airport.latitude,
        longitude: airport.longitude,
        elevation: airport.elevation,
        timezone: airport.tzName === '\\N' ? null : airport.tzName,
        type: airport.type || 'airport',
        is_major: isMajor ? 1 : 0,
        is_hub: isHub ? 1 : 0
      });
      
      // Add city to cities map (avoid duplicates)
      const cityKey = `${airport.city}-${countryCode}`;
      if (!cities.has(cityKey)) {
        cities.set(cityKey, {
          name: airport.city,
          state_province: stateProvince,
          country: airport.country,
          country_code: countryCode,
          latitude: airport.latitude,
          longitude: airport.longitude,
          population: null, // We'll need another data source for this
          is_capital: isCapitalCity(airport.city, countryCode),
          primary_airport_iata: airport.iata,
          timezone: airport.tzName === '\\N' ? null : airport.tzName
        });
      }
    }
    
    console.log(`✅ Processed ${airports.length} airports and ${cities.size} cities`);
    
    // Output data for manual insertion (since we can't directly connect to D1 from here)
    console.log('\n🔧 Generating SQL INSERT statements...');
    
    // Generate airports INSERT statements
    let airportSQL = 'INSERT OR REPLACE INTO airports (iata_code, icao_code, name, city, state_province, country, country_code, latitude, longitude, elevation, timezone, type, is_major, is_hub) VALUES\n';
    const airportValues = airports.map(airport => {
      const values = [
        `'${airport.iata_code}'`,
        airport.icao_code ? `'${airport.icao_code}'` : 'NULL',
        `'${airport.name.replace(/'/g, "''")}'`,
        `'${airport.city.replace(/'/g, "''")}'`,
        airport.state_province ? `'${airport.state_province.replace(/'/g, "''")}'` : 'NULL',
        `'${airport.country.replace(/'/g, "''")}'`,
        `'${airport.country_code}'`,
        airport.latitude,
        airport.longitude,
        airport.elevation,
        airport.timezone ? `'${airport.timezone.replace(/'/g, "''")}'` : 'NULL',
        `'${airport.type}'`,
        airport.is_major,
        airport.is_hub
      ];
      return `(${values.join(', ')})`;
    });
    
    airportSQL += airportValues.join(',\n') + ';';
    
    // Generate cities INSERT statements  
    let citySQL = 'INSERT OR REPLACE INTO cities (name, state_province, country, country_code, latitude, longitude, population, is_capital, primary_airport_iata, timezone) VALUES\n';
    const cityValues = Array.from(cities.values()).map(city => {
      const values = [
        `'${city.name.replace(/'/g, "''")}'`,
        city.state_province ? `'${city.state_province.replace(/'/g, "''")}'` : 'NULL',
        `'${city.country.replace(/'/g, "''")}'`,
        `'${city.country_code}'`,
        city.latitude,
        city.longitude,
        'NULL', // population - we'd need another data source
        city.is_capital ? 1 : 0,
        `'${city.primary_airport_iata}'`,
        city.timezone ? `'${city.timezone.replace(/'/g, "''")}'` : 'NULL'
      ];
      return `(${values.join(', ')})`;
    });
    
    citySQL += cityValues.join(',\n') + ';';
    
    // Write to files
    const fs = require('fs');
    fs.writeFileSync('airports_data.sql', airportSQL);
    fs.writeFileSync('cities_data.sql', citySQL);
    
    console.log('✅ SQL files generated:');
    console.log('  - airports_data.sql');
    console.log('  - cities_data.sql');
    console.log('\n🚀 Next steps:');
    console.log('  1. Run: wrangler d1 execute d1-database --file=airports_data.sql');
    console.log('  2. Run: wrangler d1 execute d1-database --file=cities_data.sql');
    
  } catch (error) {
    console.error('❌ Error seeding airport data:', error);
  }
};

// Helper function to map country names to ISO codes
function getCountryCode(countryName) {
  const countryMap = {
    'United States': 'US', 'Canada': 'CA', 'United Kingdom': 'GB', 'Germany': 'DE',
    'France': 'FR', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL', 'Australia': 'AU',
    'Japan': 'JP', 'China': 'CN', 'India': 'IN', 'Brazil': 'BR', 'Mexico': 'MX',
    'Russia': 'RU', 'South Korea': 'KR', 'Argentina': 'AR', 'Chile': 'CL', 'Peru': 'PE',
    'Colombia': 'CO', 'Venezuela': 'VE', 'Ecuador': 'EC', 'Bolivia': 'BO', 'Uruguay': 'UY',
    'Paraguay': 'PY', 'Guyana': 'GY', 'Suriname': 'SR', 'French Guiana': 'GF',
    'Turkey': 'TR', 'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', 'Egypt': 'EG',
    'South Africa': 'ZA', 'Nigeria': 'NG', 'Kenya': 'KE', 'Ethiopia': 'ET',
    'Thailand': 'TH', 'Vietnam': 'VN', 'Singapore': 'SG', 'Malaysia': 'MY',
    'Indonesia': 'ID', 'Philippines': 'PH', 'New Zealand': 'NZ'
    // Add more as needed...
  };
  
  return countryMap[countryName] || null;
}

// Major airport codes (heuristic)
const majorAirportCodes = [
  'ATL', 'DFW', 'LAX', 'ORD', 'JFK', 'LGA', 'EWR', 'SFO', 'LAS', 'SEA',
  'MIA', 'MCO', 'PHX', 'IAH', 'DEN', 'MSP', 'DTW', 'BOS', 'PHL', 'CLT',
  'LHR', 'CDG', 'FRA', 'AMS', 'MAD', 'FCO', 'MUC', 'ZUR', 'VIE', 'CPH',
  'NRT', 'ICN', 'PEK', 'PVG', 'HKG', 'SIN', 'BKK', 'KUL', 'CGK', 'MNL',
  'SYD', 'MEL', 'BNE', 'PER', 'YYZ', 'YVR', 'GRU', 'GIG', 'SCL', 'LIM',
  'BOG', 'CCS', 'UIO', 'LPB', 'MVD', 'ASU', 'GEO', 'PBM', 'CAY'
];

// Hub airport codes
const hubAirportCodes = [
  'ATL', 'DFW', 'ORD', 'LAX', 'JFK', 'SFO', 'LHR', 'CDG', 'FRA', 'AMS',
  'NRT', 'ICN', 'PEK', 'SIN', 'DXB', 'DOH', 'IST', 'SYD', 'YYZ', 'GRU'
];

// Capital cities (partial list)
function isCapitalCity(cityName, countryCode) {
  const capitals = {
    'US': ['Washington'], 'CA': ['Ottawa'], 'GB': ['London'], 'FR': ['Paris'],
    'DE': ['Berlin'], 'IT': ['Rome'], 'ES': ['Madrid'], 'NL': ['Amsterdam'],
    'AU': ['Canberra'], 'JP': ['Tokyo'], 'CN': ['Beijing'], 'IN': ['New Delhi'],
    'BR': ['Brasilia'], 'MX': ['Mexico City'], 'RU': ['Moscow']
    // Add more as needed...
  };
  
  return capitals[countryCode]?.some(capital => 
    cityName.toLowerCase().includes(capital.toLowerCase())
  ) || false;
}

if (require.main === module) {
  seedAirportsData();
}

module.exports = { seedAirportsData };