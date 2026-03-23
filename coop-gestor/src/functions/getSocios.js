const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

// Cargamos las llaves desde las variables de entorno
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

app.http('getSocios', {
    methods: ['GET'],
    authLevel: 'function',
    handler: async (request, context) => {
        try {
            const database = client.database("CoopDB");
            const container = database.container("Socios");

            // Traemos todos los socios
            const { resources: socios } = await container.items
                .query("SELECT * FROM c")
                .fetchAll();

            return { 
                status: 200, 
                jsonBody: socios,
                headers: { 
                    "Access-Control-Allow-Origin": "*", // ¡Vital para que tu Front Lindo no falle!
                    "Content-Type": "application/json"
                } 
            };
        } catch (error) {
            context.log(`Error: ${error.message}`);
            return { status: 500, body: "Error al conectar con la base de datos." };
        }
    }
});