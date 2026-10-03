/* Este bloque comentado era un metodo para bloquear modificaciones, si desean descargarlo y ustedes agregar el protector SHA eliminar comentario y bloque No comentado.
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const APP_INFO = Object.freeze({
    name: "UCA AI",
    purpose: "Lector local de PDF",
    version: "B-E 1.03.2",
    edition: "Beta-Escolarizada",
    attribution: "SRB powered this AI."
});

// Esta clave pública verifica el manifiesto firmado de esta entrega.
// La clave privada utilizada para firmarlo no se distribuye con el proyecto.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAQSfiMBLh7/by3AGVssUcs7rztwYwm0qK9cLkxAisMRw=
-----END PUBLIC KEY-----`;

function sha256Archivo(ruta) {
    return crypto
        .createHash("sha256")
        .update(fs.readFileSync(ruta))
        .digest("hex");
}



function rutaSegura(baseDir, relativa) {
    const base = path.resolve(baseDir);
    const absoluta = path.resolve(baseDir, relativa);

    if (absoluta !== base && !absoluta.startsWith(`${base}${path.sep}`)) {
        throw new Error(`Ruta no permitida en el manifiesto: ${relativa}`);
    }

    return absoluta;
}

function verificarIntegridad(baseDir) {
    const manifestPath = path.join(baseDir, "integrity", "attribution.manifest.json");
    const signaturePath = path.join(baseDir, "integrity", "attribution.signature.txt");

    if (!fs.existsSync(manifestPath) || !fs.existsSync(signaturePath)) {
        throw new Error(
            "Faltan los archivos de integridad de la entrega escolar."
        );
    }

    const manifestBytes = fs.readFileSync(manifestPath);
    const signature = Buffer.from(
        fs.readFileSync(signaturePath, "utf8").trim(),
        "base64"
    );

    const firmaValida = crypto.verify(
        null,
        manifestBytes,
        PUBLIC_KEY_PEM,
        signature
    );

    if (!firmaValida) {
        throw new Error(
            "La firma criptográfica del manifiesto de atribución no es válida."
        );
    }

    const manifest = JSON.parse(manifestBytes.toString("utf8"));

    if (
        manifest.product !== APP_INFO.name ||
        manifest.version !== APP_INFO.version ||
        manifest.attribution !== APP_INFO.attribution
    ) {
        throw new Error(
            "Los datos de identidad de la entrega no coinciden con la firma esperada."
        );
    }

    const archivos = manifest.files && typeof manifest.files === "object"
        ? manifest.files
        : {};

    const resultados = [];

    for (const [relativa, hashEsperado] of Object.entries(archivos)) {
        const absoluta = rutaSegura(baseDir, relativa);

        if (!fs.existsSync(absoluta) || !fs.statSync(absoluta).isFile()) {
            throw new Error(`Falta un archivo protegido: ${relativa}`);
        }

        const hashActual = sha256Archivo(absoluta);

        // La interfaz queda editable desde VS Code. El backend, los instaladores,
        // la licencia y la identidad del proyecto continúan comprobándose.
        const archivoEditable =
            relativa === "config/attribution.js" ||
            relativa.startsWith("public/");

        if (archivoEditable) {
            resultados.push({ archivo: relativa, sha256: hashActual });
            continue;
        }

        if (hashActual !== hashEsperado) {
            const ayuda = relativa === "iniciar.bat"
                ? " Para cambiar los nombres del equipo, edita EQUIPO.txt y no iniciar.bat."
                : "";

            throw new Error(
                `El archivo protegido fue modificado: ${relativa}.${ayuda}`
            );
        }

        resultados.push({ archivo: relativa, sha256: hashActual });
    }

    return Object.freeze({
        ok: true,
        verifiedAt: new Date().toISOString(),
        manifestId: String(manifest.manifestId || ""),
        protectedFiles: resultados.length
    });
}

module.exports = {
    APP_INFO,
    verificarIntegridad
};
*/

"use strict";

const APP_INFO = Object.freeze({
    name: "UCA AI",
    purpose: "Lector local de PDF",
    version: "B-E 1.03.2",
    edition: "Beta-Escolarizada",
    attribution: "SRB powered this AI."
});

function verificarIntegridad(baseDir) {
    // Retorna éxito directamente sin verificar firmas ni hashes
    return Object.freeze({
        ok: true,
        verifiedAt: new Date().toISOString(),
        manifestId: "libre",
        protectedFiles: 0
    });
}

module.exports = {
    APP_INFO,
    verificarIntegridad
};
