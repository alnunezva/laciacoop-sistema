const { app } = require('@azure/functions');
const { StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');

app.http('getDocUrl', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Obtenemos la ruta del blob y la decodificamos (para manejar tildes y espacios)
        const rawBlobPath = request.query.get('blobPath'); 
        const blobPath = decodeURIComponent(rawBlobPath);

        try {
            const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const parts = connString.split(';');
            const accountName = parts.find(p => p.startsWith('AccountName=')).split('=')[1];
            const accountKey = parts.find(p => p.startsWith('AccountKey=')).split('=')[1];
            
            const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

            // Configuramos el tiempo de inicio un poco antes para evitar problemas de sincronización de reloj
            const startTime = new Date();
            startTime.setMinutes(startTime.getMinutes() - 5); 

            const expiryTime = new Date();
            expiryTime.setHours(expiryTime.getHours() + 1);

            const sasToken = generateBlobSASQueryParameters({
                containerName: "documentos-socios",
                blobName: blobPath,
                startsOn: startTime,
                expiresOn: expiryTime,
                permissions: BlobSASPermissions.parse("r"),
                contentType: "application/pdf", // Sugerimos el tipo de contenido
                contentDisposition: "inline"    // Para que se abra en el navegador
            }, sharedKeyCredential).toString();

            const baseUrl = `https://${accountName}.blob.core.windows.net/documentos-socios/${encodeURIComponent(blobPath)}`;
            
            return { 
                status: 200, 
                jsonBody: { url: `${baseUrl}?${sasToken}` } 
            };
        } catch (error) {
            context.log("Error SAS:", error.message);
            return { status: 500, body: "Error generando acceso seguro" };
        }
    }
});