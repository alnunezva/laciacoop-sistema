const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

app.http('deleteSocio', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const id = request.query.get('id');

        if (!id) {
            return { status: 400, body: "Falta el ID del socio" };
        }

        try {
            const database = client.database("CoopDB");
            const container = database.container("Socios");

            // En Cosmos DB, el borrado requiere el ID y el Partition Key (que en nuestro caso es el mismo ID)
            await container.item(id, id).delete();

            return { 
                status: 200, 
                jsonBody: { message: "Socio eliminado correctamente" } 
            };
        } catch (error) {
            context.log("Error al eliminar socio:", error.message);
            return { status: 500, body: "Error al eliminar el socio de la base de datos" };
        }
    }
});