// Split large SQL files into smaller chunks for D1 import
const fs = require('fs');

function splitSQLFile(filename, chunkSize = 50) {
  console.log(`📦 Splitting ${filename} into chunks of ${chunkSize} records...`);
  
  const content = fs.readFileSync(filename, 'utf8');
  
  // Extract the INSERT statement structure
  const [header, valuesSection] = content.split('VALUES\n');
  const values = valuesSection.replace(/;$/, '').split(',\n');
  
  console.log(`🔢 Found ${values.length} records to process`);
  
  const chunks = [];
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    const chunkSQL = header + 'VALUES\n' + chunk.join(',\n') + ';';
    chunks.push(chunkSQL);
  }
  
  console.log(`✂️ Created ${chunks.length} chunks`);
  
  // Write chunk files
  const baseName = filename.replace('.sql', '');
  chunks.forEach((chunk, index) => {
    const chunkFilename = `${baseName}_chunk_${index + 1}.sql`;
    fs.writeFileSync(chunkFilename, chunk);
    console.log(`📝 Written ${chunkFilename}`);
  });
  
  return chunks.length;
}

// Split both files
const airportChunks = splitSQLFile('airports_data.sql', 50);
const cityChunks = splitSQLFile('cities_data.sql', 50);

console.log('\n🚀 To load data, run:');
for (let i = 1; i <= airportChunks; i++) {
  console.log(`wrangler d1 execute travel_assistant --file=airports_data_chunk_${i}.sql`);
}
for (let i = 1; i <= cityChunks; i++) {
  console.log(`wrangler d1 execute travel_assistant --file=cities_data_chunk_${i}.sql`);
}