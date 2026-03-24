const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });

app.http('deleteSocio', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Obtenemos el id y nos aseguramos de que sea un String limpio
        let id = request.query.get('id');

        if (!id) return { status: 400, body: "ID requerido" };
        
        // Convertimos explícitamente a string por si acaso
        id = String(id).trim();

        try {
            const database = client.database("CoopDB");
            const container = database.container("Socios");

            context.log(`Intentando borrar socio con ID exacto: "${id}"`);

            // Usamos el método delete directo sobre el item
            // El primer parámetro es el ID, el segundo es el Partition Key Value
            await container.item(id, id).delete();

            return { 
                status: 200, 
                jsonBody: { message: `Socio ${id} eliminado correctamente` } 
            };
        } catch (error) {
            context.log(`Error al borrar socio ${id}:`, error.message);
            
            // Si el error es 404, para el frontend es un éxito porque ya no existe
            if (error.code === 404) {
                return { status: 200, body: "El socio ya no existe." };
            }

            return { status: 500, body: `Fallo interno: ${error.message}` };
        }
    }
});