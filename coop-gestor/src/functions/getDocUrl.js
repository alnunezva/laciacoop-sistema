const { app } = require('@azure/functions');
const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');

app.http('getDocUrl', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const blobPath = request.query.get('blobPath'); // Ej: "1/Cedula_identidad_mio.pdf"

        try {
            const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const parts = connString.split(';');
            const accountName = parts.find(p => p.startsWith('AccountName=')).split('=')[1];
            const accountKey = parts.find(p => p.startsWith('AccountKey=')).split('=')[1];
            const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

            const sasToken = generateBlobSASQueryParameters({
                containerName: "documentos-socios",
                blobName: blobPath,
                startsOn: new Date(),
                expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hora
                permissions: BlobSASPermissions.parse("r")
            }, sharedKeyCredential).toString();

            const baseUrl = `https://${accountName}.blob.core.windows.net/documentos-socios/${blobPath}`;
            
            return { status: 200, jsonBody: { url: `${baseUrl}?${sasToken}` } };
        } catch (error) {
            return { status: 500, body: "Error generando token" };
        }
    }
});