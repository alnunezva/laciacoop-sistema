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

        if (!id) return { status: 400, body: "ID requerido" };

        try {
            const container = client.database("CoopDB").container("Socios");

            // 1. Buscamos al socio para obtener su RUT (que es la Partition Key real)
            const { resources: sociosEncontrados } = await container.items
                .query({
                    query: "SELECT c.id, c.rut FROM c WHERE c.id = @id",
                    parameters: [{ name: "@id", value: id }]
                })
                .fetchAll();

            if (sociosEncontrados.length === 0) {
                return { status: 200, body: "El socio ya no existe." };
            }

            const rutSocio = sociosEncontrados[0].rut;

            // 2. Borramos usando el ID y el valor del RUT como Partition Key
            await container.item(id, rutSocio).delete();

            return { 
                status: 200, 
                jsonBody: { message: "Eliminado correctamente" },
                headers: { 'Cache-Control': 'no-store' }
            };
        } catch (error) {
            context.log("Error al eliminar:", error.message);
            return { status: 500, body: error.message };
        }
    }
});