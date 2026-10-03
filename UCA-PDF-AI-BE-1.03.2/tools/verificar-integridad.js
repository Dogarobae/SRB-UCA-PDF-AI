"use strict";

const path = require("path");
const { APP_INFO, verificarIntegridad } = require("../config/attribution");

try {
    const resultado = verificarIntegridad(path.resolve(__dirname, ".."));
    console.log(`${APP_INFO.name} ${APP_INFO.version}`);
    console.log(APP_INFO.attribution);
    console.log(
        `Integridad verificada: ${resultado.protectedFiles} archivos protegidos.`
    );
} catch (error) {
    console.error(`ERROR DE INTEGRIDAD: ${error.message}`);
    process.exitCode = 1;
}
