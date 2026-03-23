const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('deleteDoc', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const socioId = request.query.get('socioId');
        const docType = request.query.get('docType');
        const fileName = request.query.get('fileName');

        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("documentos-socios");
            
            const blobName = `${socioId}/${docType}_${fileName}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.delete();

            return { status: 200, jsonBody: { message: "Archivo eliminado físicamente" } };
        } catch (error) {
            context.error("Error al borrar blob:", error);
            return { status: 500, body: "No se pudo eliminar el archivo del Storage" };
        }
    }
});