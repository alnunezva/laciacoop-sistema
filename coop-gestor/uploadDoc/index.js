const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    const { socioId, docType, fileName } = req.query;
    const fileContent = req.body; // El archivo binario

    if (!fileContent || !socioId || !docType) {
        context.res = { status: 400, body: "Faltan datos para la subida" };
        return;
    }

    try {
        // Conexión con el Almacenamiento (Variable de entorno en Azure)
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("documentos-socios");
        
        // Creamos una ruta organizada: socio_123/Solicitud_incorporacion.pdf
        const blobName = `${socioId}/${docType}_${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.upload(fileContent, fileContent.length);

        context.res = {
            status: 200,
            body: { message: "Archivo subido", url: blockBlobClient.url }
        };
    } catch (error) {
        context.log.error(error);
        context.res = { status: 500, body: "Error al subir a Azure Storage" };
    }
};