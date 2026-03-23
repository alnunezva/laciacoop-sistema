module.exports = async function (context, req) {
    const socioActualizado = req.body;

    if (!socioActualizado || !socioActualizado.id) {
        context.res = { status: 400, body: "Datos insuficientes" };
        return;
    }

    // Aquí iría la conexión a tu Base de Datos (CosmosDB o Table Storage)
    // Por ahora, simulamos que guardamos con éxito
    context.log(`Actualizando socio: ${socioActualizado.nombre}`);

    context.res = {
        status: 200,
        body: { message: "Socio guardado correctamente", id: socioActualizado.id }
    };
};