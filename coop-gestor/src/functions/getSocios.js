const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

// Configuración de Cosmos
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

app.http('getSocios', {
    methods: ['GET'],
    authLevel: 'anonymous', // <--- CAMBIADO A ANONYMOUS
    handler: async (request, context) => {
        try {
            const database = client.database("CoopDB");
            const container = database.container("Socios");

            const { resources: socios } = await container.items
            .query("SELECT c.id, c.nombre, c.rut, c.documentos FROM c")
            .fetchAll();

            return { 
                status: 200, 
                jsonBody: socios,
                headers: { 
                    "Content-Type": "application/json"
                    // Nota: En Static Web Apps no necesitas el Access-Control-Allow-Origin "*" 
                    // porque la API y el Front viven en el mismo dominio.
                } 
            };
        } catch (error) {
            context.log(`Error en Cosmos: ${error.message}`);
            return { 
                status: 500, 
                body: "Error al conectar con la base de datos de LACIACOOP." 
            };
        }
    }
});