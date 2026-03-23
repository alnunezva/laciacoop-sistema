const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

app.http('saveSocio', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            
            if (!body || !body.id) {
                return { status: 400, body: "ID de socio requerido" };
            }

            const database = client.database("CoopDB");
            const container = database.container("Socios");

            // Azure Cosmos DB requiere que el ID sea un string
            // y a veces "upsert" es mejor para actualizar o crear
            const { resource: updatedItem } = await container.items.upsert(body);

            return { 
                status: 200, 
                jsonBody: { message: "Socio guardado correctamente", id: updatedItem.id } 
            };
        } catch (error) {
            context.log(`Error al guardar: ${error.message}`);
            return { status: 500, body: "Error al actualizar la base de datos." };
        }
    }
});