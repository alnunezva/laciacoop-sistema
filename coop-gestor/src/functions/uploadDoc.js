const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

app.http('uploadDoc', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const socioId = request.query.get('socioId');
        const docType = request.query.get('docType');
        const fileName = request.query.get('fileName');
        
        // El cuerpo en V4 se lee como ArrayBuffer para archivos
        const fileContent = await request.arrayBuffer();

        if (!fileContent || !socioId || !docType) {
            return { status: 400, body: "Faltan datos (socioId, docType o archivo)" };
        }

        try {
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient("documentos-socios");
            
            const blobName = `${socioId}/${docType}_${fileName}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.uploadData(fileContent);

            return {
                status: 200,
                jsonBody: { message: "Archivo subido con éxito", url: blockBlobClient.url }
            };
        } catch (error) {
            context.error("Error subiendo a Blob:", error);
            return { status: 500, body: "Error interno al subir a Azure Storage" };
        }
    }
});