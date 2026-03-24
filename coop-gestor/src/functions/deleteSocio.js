const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

// Azure leerá esto desde la pestaña "Configuration" del portal
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

app.http('deleteSocio', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const id = request.query.get('id');

        if (!id) return { status: 400, body: "ID requerido" };

        try {
            const database = client.database("CoopDB");
            const container = database.container("Socios");

            // IMPORTANTE: En tu CosmosDB, el Partition Key es /id
            // Por eso pasamos id dos veces: container.item(id, partitionKey)
            await container.item(id, id).delete();

            return { status: 200, jsonBody: { message: "Socio eliminado" } };
        } catch (error) {
            context.log("Error 500 en Delete:", error.message);
            // Si el error es 404, significa que ya no existe
            if (error.code === 404) return { status: 200, body: "Socio ya eliminado" };
            return { status: 500, body: `Error: ${error.message}` };
        }
    }
});