const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('deleteDoc', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Obtenemos los parámetros y los decodificamos por seguridad
        const socioId = request.query.get('socioId');
        const docType = decodeURIComponent(request.query.get('docType'));
        const fileName = decodeURIComponent(request.query.get('fileName'));

        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("documentos-socios");
            
            // Construimos el nombre exacto del blob
            const blobName = `${socioId}/${docType}_${fileName}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            // Intentamos borrar el archivo
            await blockBlobClient.delete();

            context.log(`Archivo eliminado: ${blobName}`);

            return { 
                status: 200, 
                jsonBody: { message: "Archivo eliminado físicamente con éxito" } 
            };
        } catch (error) {
            context.error("Error al borrar blob:", error.message);
            return { 
                status: 500, 
                body: `No se pudo eliminar el archivo: ${error.message}` 
            };
        }
    }
});