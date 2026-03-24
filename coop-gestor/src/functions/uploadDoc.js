const { app } = require('@azure/functions');
const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');

app.http('uploadDoc', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const socioId = request.query.get('socioId');
        const docType = request.query.get('docType');
        const fileName = request.query.get('fileName');
        const fileContent = await request.arrayBuffer();

        try {
            const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const blobServiceClient = BlobServiceClient.fromConnectionString(connString);
            const containerClient = blobServiceClient.getContainerClient("documentos-socios");
            await containerClient.createIfNotExists();

            const blobName = `${socioId}/${docType}_${fileName}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.uploadData(Buffer.from(fileContent));

            // --- GENERACIÓN DEL SAS TOKEN (EXPIRA EN 1 HORA) ---
            const sasOptions = {
                containerName: "documentos-socios",
                blobName: blobName,
                startsOn: new Date(),
                expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hora
                permissions: BlobSASPermissions.parse("r") // Solo lectura
            };

            // Extraemos los datos de la conexión para firmar
            const parts = connString.split(';');
            const accountName = parts.find(p => p.startsWith('AccountName=')).split('=')[1];
            const accountKey = parts.find(p => p.startsWith('AccountKey=')).split('=')[1];
            const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

            const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
            const sasUrl = `${blockBlobClient.url}?${sasToken}`;

            return { status: 200, jsonBody: { message: "Ok", url: sasUrl } };
        } catch (error) {
            return { status: 500, body: error.message };
        }
    }
});