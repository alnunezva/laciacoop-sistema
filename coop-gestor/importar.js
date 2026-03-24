const { CosmosClient } = require("@azure/cosmos");
const fs = require("fs");

// Configuración (Asegúrate de tener estas variables en tu terminal o local.settings.json)
const endpoint = "TU_COSMOS_ENDPOINT"; 
const key = "TU_COSMOS_KEY";
const client = new CosmosClient({ endpoint, key });

async function importar() {
    const database = client.database("CoopDB");
    const container = database.container("Socios");

    // Datos procesados del CSV
    const socios = JSON.parse(fs.readFileSync("./socios_importar.json", "utf-8"));

    console.log(`🚀 Iniciando importación de ${socios.length} socios...`);

    for (const socio of socios) {
        try {
            await container.items.upsert(socio);
            console.log(`✅ Importado: ${socio.nombre}`);
        } catch (error) {
            console.error(`❌ Error con ${socio.nombre}:`, error.message);
        }
    }

    console.log("🏁 ¡Proceso terminado!");
}

importar();