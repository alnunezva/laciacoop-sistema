module.exports = async function (context, req) {
    const user = req.body.clientPrincipal;
    const roles = [];

    // Lista de correos autorizados como Administradores
    const admins = [
        "debora.fuenzalida@cooplacia.cl",
        "margarita.mendez@cooplacia.cl",
        "alvaro.nunez@cooplacia.cl"
    ];

    if (user && user.userDetails) {
        // 1. Todos los que tengan @cooplacia son usuarios
        if (user.userDetails.endsWith("@cooplacia.cl")) {
            roles.push("authenticated");
        }
        
        // 2. Si es uno de los 3 jefes, es administrator
        if (admins.includes(user.userDetails.toLowerCase())) {
            roles.push("administrator");
        }
    }

    context.res = {
        status: 200,
        body: { roles }
    };
};