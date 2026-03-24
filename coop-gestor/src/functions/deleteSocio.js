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
            return { status: 400, body: "ID requerido" };
        }

        try {
            const database = client.database("CoopDB");
            const container = database.container("Socios");

            context.log(`Iniciando eliminación de socio ID: ${id}`);

            // Eliminamos usando ID y Partition Key (que es el mismo ID)
            await container.item(id, id).delete();

            return { 
                status: 200, 
                jsonBody: { message: "Socio eliminado permanentemente de la base de datos" },
                // ESTAS CABECERAS FUERZAN AL NAVEGADOR A NO USAR DATOS VIEJOS
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            };
        } catch (error) {
            context.log(`Error al eliminar socio ${id}:`, error.message);
            
            // Si el socio ya no existe (404), respondemos como éxito para limpiar el frontend
            if (error.code === 404) {
                return { 
                    status: 200, 
                    body: "El socio ya no existía en la base de datos",
                    headers: { 'Cache-Control': 'no-store' }
                };
            }

            return { 
                status: 500, 
                body: `Error interno: ${error.message}` 
            };
        }
    }
});