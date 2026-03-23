const { CosmosClient } = require("@azure/cosmos");
const fs = require('fs');

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });
const databaseId = "laciacoop-db"; // Tu nombre de DB
const containerId = "socios";     // Tu contenedor

async function importData() {
  const socios = JSON.parse(fs.readFileSync('socios_bulk_data.json', 'utf8'));
  const container = client.database(databaseId).container(containerId);

  console.log(`Subiendo ${socios.length} socios...`);
  for (const socio of socios) {
    try {
      await container.items.upsert(socio);
      console.log(`✅ Socio ${socio.nombre} cargado`);
    } catch (e) {
      console.error(`❌ Error en ${socio.nombre}:`, e.message);
    }
  }
}
importData();