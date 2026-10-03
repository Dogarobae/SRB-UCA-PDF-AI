let chatActualId = null;
let chats = [];
let documentosActuales = [];
let documentoActivoId = null;
let respuestaEnCurso = false;
let creacionChatEnCurso = null;
let documentosContraidos = localStorage.getItem("ucaDocumentosContraidos") === "true";

const LIMITE_MENSAJE = 8000;

let chatPendienteRenombrar = null;
let chatPendienteEliminar = null;

/* ------------------- */
/* Elementos */
/* ------------------- */

const chatPanel = document.getElementById("chatPanel");
const textarea = document.getElementById("mensaje");
const contador = document.getElementById("contador");
const botonEnviar = document.getElementById("botonEnviar");
const botonNuevaConversacion = document.getElementById(
    "botonNuevaConversacion"
);

const listaChats = document.getElementById("listaChats");
const historyCount = document.getElementById("historyCount");
const pdfInput = document.getElementById("pdfInput");
const botonAdjuntarPdf = document.getElementById("botonAdjuntarPdf");
const estadoPdf = document.getElementById("estadoPdf");
const documentosLista = document.getElementById("documentosLista");
const botonDeseleccionarPdf = document.getElementById("botonDeseleccionarPdf");
const documentosArea = document.querySelector(".documentos-area");
const botonAlternarDocumentos = document.getElementById("botonAlternarDocumentos");

function actualizarControlesConversacion() {
    const sinChat = !chatActualId;

    // El usuario puede elegir un PDF desde la pantalla de bienvenida.
    // La conversación se crea únicamente después de seleccionar un archivo.
    botonAdjuntarPdf.disabled = respuestaEnCurso;
    pdfInput.disabled = respuestaEnCurso;
    botonDeseleccionarPdf.disabled =
        respuestaEnCurso || sinChat || !documentoActivoId;
    botonAlternarDocumentos.disabled = respuestaEnCurso;
}

function renderizarPantallaBienvenida() {
    chatPanel.innerHTML = "";
    chatPanel.classList.add("inicio");

    const contenedor = document.createElement("div");
    const titulo = document.createElement("h2");
    const descripcion = document.createElement("p");

    contenedor.className = "chat-welcome";
    titulo.textContent = "Adjunta un PDF y comienza la consulta";
    descripcion.textContent =
        "UCA AI procesa el documento de forma local y responde utilizando su contenido.";

    contenedor.append(titulo, descripcion);
    chatPanel.appendChild(contenedor);
}

function prepararPanelParaMensajes() {
    if (!chatPanel.classList.contains("inicio")) {
        return;
    }

    chatPanel.classList.remove("inicio");
    chatPanel.innerHTML = "";
}

function mostrarInicioSinChat() {
    if (respuestaEnCurso) {
        return;
    }

    chatActualId = null;
    documentoActivoId = null;
    documentosActuales = [];

    renderizarPantallaBienvenida();
    renderizarDocumentos([]);
    actualizarEstadoPdf(
        "Adjunta un PDF o escribe una pregunta para crear una conversación."
    );
    renderizarListaChats();
    actualizarControlesConversacion();
    textarea.focus();
}

async function crearChatAutomatico() {
    if (chatActualId) {
        return chatActualId;
    }

    if (creacionChatEnCurso) {
        return creacionChatEnCurso;
    }

    creacionChatEnCurso = (async () => {
        const respuesta = await fetch("/nueva-conversacion", {
            method: "POST"
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                data.error || "No se pudo crear la conversación."
            );
        }

        chatActualId = data.chat.id;
        documentoActivoId = null;
        documentosActuales = [];

        renderizarDocumentos([]);
        actualizarEstadoPdf(
            "Nueva conversación creada automáticamente.",
            "ok"
        );

        await refrescarChats();
        renderizarListaChats();
        actualizarControlesConversacion();

        return chatActualId;
    })();

    try {
        return await creacionChatEnCurso;
    } finally {
        creacionChatEnCurso = null;
    }
}

/* ------------------- */
/* Estado de Ollama */
/* ------------------- */

async function verificarEstado() {
    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");

    try {
        const respuesta = await fetch("/estado");
        const data = await respuesta.json();

        if (data.conectado) {
            dot.classList.remove("offline");
            dot.classList.add("online");
            text.textContent = data.vision?.disponible
                ? "Modelo local listo para consultar PDF"
                : "Ollama activo · falta instalar Qwen3-VL";
        } else {
            dot.classList.remove("online");
            dot.classList.add("offline");
            text.textContent = "Ollama no está disponible";
        }

    } catch (error) {
        dot.classList.remove("online");
        dot.classList.add("offline");
        text.textContent = "Estado no disponible";
    }
}

verificarEstado();
setInterval(verificarEstado, 5000);

/* ------------------- */
/* Utilidades */
/* ------------------- */

function actualizarContador() {
    contador.textContent = `${textarea.value.length} / ${LIMITE_MENSAJE}`;
}

function formatearFecha(fecha) {
    try {
        return new Intl.DateTimeFormat("es-MX", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(fecha));
    } catch {
        return "";
    }
}

function formatearBytes(bytes) {
    const valor = Number(bytes || 0);

    if (valor < 1024) {
        return `${valor} B`;
    }

    if (valor < 1024 * 1024) {
        return `${(valor / 1024).toFixed(1)} KB`;
    }

    return `${(valor / 1024 / 1024).toFixed(1)} MB`;
}

function escaparHtml(texto) {
    const temporal = document.createElement("div");
    temporal.textContent = String(texto ?? "");
    return temporal.innerHTML;
}

function renderizarMarkdownSeguro(texto) {
    const fuente = String(texto ?? "");

    if (!window.marked || !window.DOMPurify) {
        return escaparHtml(fuente).replace(/\n/g, "<br>");
    }

    const html = window.marked.parse(fuente, {
        gfm: true,
        breaks: true
    });

    return window.DOMPurify.sanitize(html, {
        USE_PROFILES: {
            html: true
        },
        FORBID_TAGS: [
            "script",
            "style",
            "iframe",
            "object",
            "embed",
            "form",
            "input",
            "button",
            "textarea",
            "select",
            "option",
            "svg",
            "math"
        ],
        FORBID_ATTR: [
            "style",
            "srcdoc"
        ]
    });
}

function prepararEnlacesMarkdown(contenedor) {
    for (const enlace of contenedor.querySelectorAll("a")) {
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
    }
}

function prepararTablasMarkdown(contenedor) {
    for (const tabla of contenedor.querySelectorAll("table")) {
        if (tabla.parentElement?.classList.contains("markdown-table-wrap")) {
            continue;
        }

        const envoltura = document.createElement("div");
        envoltura.className = "markdown-table-wrap";

        tabla.parentNode.insertBefore(envoltura, tabla);
        envoltura.appendChild(tabla);
    }
}

function establecerContenidoMensaje(elemento, tipo, texto) {
    elemento.classList.remove("markdown");

    if (tipo === "ai") {
        elemento.classList.add("markdown");
        elemento.innerHTML = renderizarMarkdownSeguro(texto);
        prepararEnlacesMarkdown(elemento);
        prepararTablasMarkdown(elemento);
        return;
    }

    elemento.textContent = String(texto ?? "");
}

function establecerEstadoProcesando(enCurso) {
    respuestaEnCurso = Boolean(enCurso);

    textarea.disabled = respuestaEnCurso;
    botonEnviar.disabled = respuestaEnCurso;
    botonNuevaConversacion.disabled = respuestaEnCurso;
    actualizarControlesConversacion();

    botonEnviar.textContent = respuestaEnCurso ? "Consultando..." : "Enviar pregunta";
    textarea.placeholder = respuestaEnCurso
        ? "Ollama está generando la respuesta..."
        : "Adjunta un PDF y escribe una pregunta...";

    documentosLista.classList.toggle("bloqueado", respuestaEnCurso);

    for (const control of documentosLista.querySelectorAll("button")) {
        control.disabled = respuestaEnCurso;
    }

    for (const info of documentosLista.querySelectorAll(".documento-info")) {
        info.tabIndex = respuestaEnCurso ? -1 : 0;
        info.setAttribute("aria-disabled", String(respuestaEnCurso));
    }
}


function actualizarPanelDocumentos() {
    const cantidad = documentosActuales.length;
    const hayDocumentos = cantidad > 0;

    documentosArea.classList.toggle(
        "contraida",
        hayDocumentos && documentosContraidos
    );

    botonAlternarDocumentos.hidden = !hayDocumentos;
    botonAlternarDocumentos.setAttribute(
        "aria-expanded",
        String(hayDocumentos && !documentosContraidos)
    );
    botonAlternarDocumentos.textContent = documentosContraidos
        ? `Mostrar archivos (${cantidad})`
        : "Ocultar archivos";
}

function alternarPanelDocumentos() {
    if (documentosActuales.length === 0) {
        return;
    }

    documentosContraidos = !documentosContraidos;
    localStorage.setItem(
        "ucaDocumentosContraidos",
        String(documentosContraidos)
    );
    actualizarPanelDocumentos();
}

function renderizarDocumentos(documentos = []) {
    documentosActuales = Array.isArray(documentos) ? documentos : [];
    documentosLista.innerHTML = "";

    if (documentosActuales.length === 0) {
        documentoActivoId = null;
        documentosLista.classList.remove("con-documentos");
        documentosArea.classList.remove("contraida");
        actualizarPanelDocumentos();
        actualizarControlesConversacion();
        return;
    }

    documentosLista.classList.add("con-documentos");
    actualizarPanelDocumentos();

    for (const documento of documentosActuales) {
        const item = document.createElement("div");
        const info = document.createElement("div");
        const nombre = document.createElement("span");
        const meta = document.createElement("span");
        const acciones = document.createElement("div");
        const analizar = document.createElement("button");
        const eliminar = document.createElement("button");

        item.className = "documento-item";

        if (documento.id === documentoActivoId) {
            item.classList.add("activo");
        }

        info.className = "documento-info";
        nombre.className = "documento-nombre";
        meta.className = "documento-meta";
        acciones.className = "documento-acciones";
        analizar.className = "documento-accion documento-analizar";
        eliminar.className = "documento-accion documento-eliminar";

        nombre.textContent = documento.nombre || "Documento PDF";

        const paginas = documento.totalPaginas || 0;
        const visuales = documento.paginasAnalizadasVisualmente || 0;
        const modo = documento.modoLectura || "nativa";
        const estadoLectura = documento.lecturaParcial
            ? "lectura parcial"
            : `lectura ${modo}`;

        const etiquetaActivo = documento.id === documentoActivoId
            ? " · activo"
            : "";

        meta.textContent = `${paginas} páginas · ${formatearBytes(documento.bytes)} · ${estadoLectura}` +
            (visuales > 0 ? ` · visión ${visuales}/${paginas}` : "") +
            etiquetaActivo;

        analizar.type = "button";
        analizar.disabled = respuestaEnCurso;
        analizar.textContent = "◉";
        analizar.title = "Reprocesar PDF con Qwen3-VL Instruct";
        analizar.setAttribute(
            "aria-label",
            `Analizar visualmente ${documento.nombre || "PDF"}`
        );
        analizar.addEventListener(
            "click",
            () => reprocesarDocumento(documento.id)
        );

        eliminar.type = "button";
        eliminar.disabled = respuestaEnCurso;
        eliminar.textContent = "×";
        eliminar.title = "Eliminar PDF del chat";
        eliminar.setAttribute(
            "aria-label",
            `Eliminar ${documento.nombre || "PDF"}`
        );
        eliminar.addEventListener(
            "click",
            () => eliminarDocumento(documento.id)
        );

        info.tabIndex = respuestaEnCurso ? -1 : 0;
        info.setAttribute("aria-disabled", String(respuestaEnCurso));
        info.title = documento.id === documentoActivoId
            ? "Quitar la selección de este documento"
            : `Usar ${documento.nombre || "este PDF"} en las respuestas`;
        info.addEventListener("click", () => activarDocumento(documento.id));
        info.addEventListener("keydown", evento => {
            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                activarDocumento(documento.id);
            }
        });

        info.append(nombre, meta);
        acciones.append(analizar, eliminar);
        item.append(info, acciones);
        documentosLista.appendChild(item);
    }

    actualizarPanelDocumentos();
    actualizarControlesConversacion();
}

function agregarMensaje(tipo, texto) {
    prepararPanelParaMensajes();

    const div = document.createElement("div");

    div.classList.add("message", tipo);
    establecerContenidoMensaje(div, tipo, texto);

    chatPanel.appendChild(div);
    chatPanel.scrollTop = chatPanel.scrollHeight;

    return div;
}

function renderizarMensajes(mensajes) {
    chatPanel.innerHTML = "";
    chatPanel.classList.remove("inicio");

    if (!mensajes || mensajes.length === 0) {
        renderizarPantallaBienvenida();
        return;
    }

    for (const mensaje of mensajes) {
        const tipo = mensaje.role === "user"
            ? "user"
            : mensaje.role === "assistant"
                ? "ai"
                : "system";

        agregarMensaje(tipo, mensaje.content);
    }
}

/* ------------------- */
/* Historial de chats */
/* ------------------- */

function crearBotonAccion(simbolo, titulo, clases = []) {
    const boton = document.createElement("button");

    boton.type = "button";
    boton.className = "history-action";

    for (const clase of clases) {
        boton.classList.add(clase);
    }

    boton.textContent = simbolo;
    boton.title = titulo;
    boton.setAttribute("aria-label", titulo);

    return boton;
}

function renderizarListaChats() {
    listaChats.innerHTML = "";
    historyCount.textContent = chats.length;

    if (chats.length === 0) {
        const vacio = document.createElement("div");

        vacio.className = "history-empty";
        vacio.textContent = "No hay conversaciones guardadas.";

        listaChats.appendChild(vacio);
        return;
    }

    for (const chat of chats) {
        const item = document.createElement("div");
        const botonPrincipal = document.createElement("button");
        const titulo = document.createElement("span");
        const meta = document.createElement("span");
        const acciones = document.createElement("div");

        const botonRenombrar = crearBotonAccion(
            "✎",
            "Renombrar conversación"
        );

        const botonEliminar = crearBotonAccion(
            "×",
            "Eliminar conversación",
            ["delete"]
        );

        item.className = "history-item";

        if (chat.id === chatActualId) {
            item.classList.add("activo");
        }

        botonPrincipal.type = "button";
        botonPrincipal.className = "history-main";

        titulo.className = "history-title";
        titulo.textContent = chat.titulo || "Nueva conversación";

        meta.className = "history-meta";
        const totalDocumentos = chat.totalDocumentos || 0;
        const textoDocumentos = totalDocumentos > 0
            ? ` · ${totalDocumentos} PDF`
            : "";

        meta.textContent =
            `${chat.totalMensajes || 0} mensajes${textoDocumentos} · ${formatearFecha(
                chat.actualizadoEn
            )}`;

        botonPrincipal.append(titulo, meta);

        acciones.className = "history-actions";
        acciones.append(botonRenombrar, botonEliminar);

        botonPrincipal.title = chat.id === chatActualId
            ? "Volver a pulsar para cerrar esta conversación"
            : "Abrir conversación";

        botonPrincipal.addEventListener("click", () => {
            if (respuestaEnCurso) {
                return;
            }

            if (chat.id === chatActualId) {
                mostrarInicioSinChat();
                return;
            }

            cargarChat(chat.id);
        });

        botonRenombrar.addEventListener("click", (evento) => {
            evento.stopPropagation();
            abrirModalRenombrar(chat);
        });

        botonEliminar.addEventListener("click", (evento) => {
            evento.stopPropagation();
            abrirModalEliminar(chat);
        });

        item.append(botonPrincipal, acciones);
        listaChats.appendChild(item);
    }
}

async function refrescarChats() {
    const respuesta = await fetch("/chats");
    const data = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(data.error || "No se pudieron cargar los chats.");
    }

    chats = data.chats || [];
    renderizarListaChats();

    return chats;
}

async function cargarChat(chatId) {
    if (!chatId) {
        mostrarInicioSinChat();
        return;
    }

    try {
        const respuesta = await fetch(
            `/chats/${encodeURIComponent(chatId)}`
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.error || "No se pudo abrir la conversación.");
        }

        chatActualId = data.chat.id;
        documentoActivoId = data.chat.documentoActivoId || null;

        renderizarMensajes(data.chat.mensajes);
        renderizarDocumentos(data.chat.documentos);

        if ((data.chat.documentos || []).length > 0) {
            const activo = data.chat.documentos.find(
                documento => documento.id === documentoActivoId
            );

            actualizarEstadoPdf(
                `${data.chat.documentos.length} PDF adjunto(s). Documento activo: ${activo?.nombre || "sin seleccionar"}.`,
                "ok"
            );
        } else {
            actualizarEstadoPdf("Máximo 20 MB. Admite texto, escaneos, tablas y gráficas.");
        }

        renderizarListaChats();

    } catch (error) {
        chatPanel.innerHTML = "";
        renderizarDocumentos([]);
        actualizarEstadoPdf("No se pudieron cargar los PDF del chat.", "error");
        agregarMensaje("system", `Error al cargar chat: ${error.message}`);
    }
}

async function cargarChatsIniciales() {
    try {
        // Al abrir o recargar UCA AI, se conserva el historial visible,
        // pero no se selecciona automáticamente ninguna conversación.
        await refrescarChats();
        mostrarInicioSinChat();

    } catch (error) {
        chatPanel.innerHTML = "";

        agregarMensaje(
            "system",
            `No se pudieron cargar las conversaciones: ${error.message}`
        );
    }
}

/* ------------------- */
/* Documentos PDF */
/* ------------------- */

function actualizarEstadoPdf(texto, tipo = "") {
    estadoPdf.textContent = texto;
    estadoPdf.classList.remove("error", "ok");

    if (tipo) {
        estadoPdf.classList.add(tipo);
    }
}

async function desactivarDocumento() {
    if (!chatActualId || !documentoActivoId || respuestaEnCurso) {
        return;
    }

    try {
        const respuesta = await fetch(
            `/chats/${encodeURIComponent(chatActualId)}/documentos/desactivar`,
            { method: "POST" }
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.error || "No se pudo quitar la selección del documento.");
        }

        documentoActivoId = null;
        renderizarDocumentos(documentosActuales);
        actualizarEstadoPdf(
            `${documentosActuales.length} PDF adjunto(s). Ningún documento activo.`,
            "ok"
        );
    } catch (error) {
        actualizarEstadoPdf(error.message, "error");
    }
}

async function activarDocumento(documentoId) {
    if (!chatActualId || !documentoId || respuestaEnCurso) {
        return;
    }

    if (documentoId === documentoActivoId) {
        await desactivarDocumento();
        return;
    }

    const documento = documentosActuales.find(item => item.id === documentoId);

    try {
        const respuesta = await fetch(
            `/chats/${encodeURIComponent(chatActualId)}/documentos/${encodeURIComponent(documentoId)}/activar`,
            { method: "POST" }
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.error || "No se pudo seleccionar el documento.");
        }

        documentoActivoId = documentoId;
        renderizarDocumentos(documentosActuales);
        actualizarEstadoPdf(
            `Documento activo: ${documento?.nombre || "PDF seleccionado"}.`,
            "ok"
        );
    } catch (error) {
        actualizarEstadoPdf(error.message, "error");
    }
}

async function subirPdfSeleccionado() {
    if (respuestaEnCurso) {
        return;
    }

    const archivo = pdfInput.files?.[0];

    if (!archivo) {
        return;
    }

    if (!/\.pdf$/i.test(archivo.name) && archivo.type !== "application/pdf") {
        actualizarEstadoPdf("Sólo se permiten archivos PDF.", "error");
        pdfInput.value = "";
        return;
    }

    if (archivo.size > 20 * 1024 * 1024) {
        actualizarEstadoPdf("El PDF supera el límite de 20 MB.", "error");
        pdfInput.value = "";
        return;
    }

    if (!chatActualId) {
        botonAdjuntarPdf.disabled = true;
        botonAdjuntarPdf.textContent = "Creando conversación...";
        actualizarEstadoPdf(
            "Creando una conversación nueva para adjuntar el PDF..."
        );

        try {
            await crearChatAutomatico();
        } catch (error) {
            actualizarEstadoPdf(
                `No se pudo crear la conversación: ${error.message}`,
                "error"
            );
            botonAdjuntarPdf.textContent = "Adjuntar PDF";
            pdfInput.value = "";
            actualizarControlesConversacion();
            return;
        }
    }

    const formulario = new FormData();
    formulario.append("pdf", archivo);

    botonAdjuntarPdf.disabled = true;
    botonAdjuntarPdf.textContent = "Procesando PDF...";
    actualizarEstadoPdf(
        `Leyendo ${archivo.name}. Si contiene imágenes, el análisis visual puede tardar...`
    );

    try {
        const respuesta = await fetch(
            `/chats/${encodeURIComponent(chatActualId)}/documentos`,
            {
                method: "POST",
                body: formulario
            }
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.error || "No se pudo procesar el PDF.");
        }

        const visuales = data.documento.paginasAnalizadasVisualmente || 0;
        const pendientes = data.documento.paginasPendientesVision || 0;
        const detalleVision = visuales > 0
            ? ` ${visuales} página(s) analizada(s) visualmente.`
            : "";

        const detallePendiente = pendientes > 0
            ? ` Lectura parcial: faltan ${pendientes} página(s) visuales.`
            : "";

        actualizarEstadoPdf(
            `${data.documento.nombre}: ${data.documento.caracteres.toLocaleString("es-MX")} caracteres disponibles.` +
            detalleVision +
            detallePendiente,
            pendientes > 0 ? "error" : "ok"
        );

        await refrescarChats();
        await cargarChat(chatActualId);

    } catch (error) {
        actualizarEstadoPdf(error.message, "error");

    } finally {
        botonAdjuntarPdf.disabled = respuestaEnCurso;
        botonAdjuntarPdf.textContent = "Adjuntar PDF";
        pdfInput.value = "";
    }
}

async function reprocesarDocumento(documentoId) {
    if (!chatActualId || !documentoId) {
        return;
    }

    const documento = documentosActuales.find(item => item.id === documentoId);

    try {
        actualizarEstadoPdf(
            `Analizando visualmente ${documento?.nombre || "documento"}...`
        );

        const respuesta = await fetch(
            `/chats/${encodeURIComponent(chatActualId)}/documentos/${encodeURIComponent(documentoId)}/reprocesar`,
            { method: "POST" }
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                data.error || "No se pudo reprocesar el documento."
            );
        }

        actualizarEstadoPdf(
            `${data.documento.nombre}: lectura ${data.documento.modoLectura}; ` +
            `${data.documento.paginasAnalizadasVisualmente || 0}/${data.documento.totalPaginas || 0} páginas con lectura visual.`,
            data.documento.lecturaParcial ? "error" : "ok"
        );

        await refrescarChats();
        await cargarChat(chatActualId);

    } catch (error) {
        actualizarEstadoPdf(error.message, "error");
    }
}

async function eliminarDocumento(documentoId) {
    if (!chatActualId || !documentoId) {
        return;
    }

    const documento = documentosActuales.find(item => item.id === documentoId);

    try {
        actualizarEstadoPdf(
            `Eliminando ${documento?.nombre || "documento"}...`
        );

        const respuesta = await fetch(
            `/chats/${encodeURIComponent(chatActualId)}/documentos/${encodeURIComponent(documentoId)}`,
            { method: "DELETE" }
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.error || "No se pudo eliminar el documento.");
        }

        actualizarEstadoPdf("Documento eliminado del chat.", "ok");
        await refrescarChats();
        await cargarChat(chatActualId);

    } catch (error) {
        actualizarEstadoPdf(error.message, "error");
    }
}

botonAdjuntarPdf.addEventListener("click", () => {
    if (!respuestaEnCurso) {
        pdfInput.click();
    }
});

pdfInput.addEventListener("change", subirPdfSeleccionado);
botonDeseleccionarPdf.addEventListener("click", desactivarDocumento);
botonAlternarDocumentos.addEventListener("click", alternarPanelDocumentos);

/* ------------------- */
/* Enviar mensaje */
/* ------------------- */

async function enviar() {
    if (respuestaEnCurso) {
        return;
    }

    const mensaje = textarea.value.trim();

    if (!mensaje) {
        agregarMensaje("system", "Escribe un mensaje antes de enviarlo.");
        return;
    }

    if (mensaje.length > LIMITE_MENSAJE) {
        agregarMensaje(
            "system",
            `El mensaje supera el límite de ${LIMITE_MENSAJE} caracteres.`
        );
        return;
    }

    if (!chatActualId) {
        try {
            await crearChatAutomatico();
        } catch (error) {
            agregarMensaje(
                "system",
                `No se pudo crear la conversación: ${error.message}`
            );
            return;
        }
    }

    agregarMensaje("user", mensaje);

    textarea.value = "";
    actualizarContador();

    const mensajeIA = agregarMensaje("ai", "Generando respuesta...");

    establecerEstadoProcesando(true);

    try {
        const respuesta = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mensaje,
                chatId: chatActualId,
                documentoId: documentoActivoId,
                usarDocumento: Boolean(documentoActivoId)
            })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                data.error || "No se pudo conectar con Ollama."
            );
        }

        establecerContenidoMensaje(
            mensajeIA,
            "ai",
            data.respuesta || "Ollama no devolvió una respuesta."
        );

        if (
            data.documentos &&
            Object.prototype.hasOwnProperty.call(data.documentos, "documentoActivoId")
        ) {
            documentoActivoId = data.documentos.documentoActivoId || null;
            renderizarDocumentos(documentosActuales);
        }

        if (data.documentos?.adjuntos > 0) {
            if (data.documentos.contextoIncluido) {
                const nombres = Array.isArray(data.documentos.nombresUsados)
                    ? data.documentos.nombresUsados.join(", ")
                    : "documento activo";

                actualizarEstadoPdf(
                    `PDF usado: ${nombres} · ${data.documentos.caracteresContexto.toLocaleString("es-MX")} caracteres de contexto.`,
                    "ok"
                );
            } else {
                actualizarEstadoPdf(
                    "El PDF sigue adjunto, pero esta pregunta no requirió contexto documental."
                );
            }
        }

        await refrescarChats();

    } catch (error) {
        mensajeIA.classList.remove("markdown");
        mensajeIA.textContent = `Error: ${error.message}`;

    } finally {
        establecerEstadoProcesando(false);
        verificarEstado();
    }
}

botonEnviar.addEventListener("click", enviar);

textarea.addEventListener("input", function() {
    actualizarContador();

    if (
        !respuestaEnCurso &&
        !chatActualId &&
        textarea.value.trim().length > 0
    ) {
        crearChatAutomatico().catch(error => {
            actualizarEstadoPdf(
                `No se pudo crear la conversación: ${error.message}`,
                "error"
            );
        });
    }
});

textarea.addEventListener("keydown", function(evento) {
    if (evento.ctrlKey && evento.key === "Enter") {
        evento.preventDefault();

        if (!respuestaEnCurso) {
            enviar();
        }
    }
});

/* ------------------- */
/* Nueva conversación */
/* ------------------- */

const modalConfirmacion = document.getElementById("modalConfirmacion");
const botonCancelarNueva = document.getElementById(
    "cancelarNuevaConversacion"
);

const botonConfirmarNueva = document.getElementById(
    "confirmarNuevaConversacion"
);

function nuevaConversacion() {
    modalConfirmacion.classList.add("activo");
}

function cerrarModalConfirmacion() {
    modalConfirmacion.classList.remove("activo");
}

botonNuevaConversacion.addEventListener("click", nuevaConversacion);
botonCancelarNueva.addEventListener("click", cerrarModalConfirmacion);

modalConfirmacion.addEventListener("click", function(evento) {
    if (evento.target === modalConfirmacion) {
        cerrarModalConfirmacion();
    }
});

botonConfirmarNueva.addEventListener("click", async function() {
    botonConfirmarNueva.disabled = true;
    botonConfirmarNueva.textContent = "Creando...";

    try {
        const respuesta = await fetch("/nueva-conversacion", {
            method: "POST"
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                data.error || "No se pudo crear la conversación."
            );
        }

        chatActualId = data.chat.id;
        documentoActivoId = null;
        renderizarDocumentos([]);
        actualizarEstadoPdf("Máximo 20 MB. Admite texto, escaneos, tablas y gráficas.");

        await refrescarChats();
        await cargarChat(chatActualId);

        textarea.focus();

        cerrarModalConfirmacion();

    } catch (error) {
        agregarMensaje(
            "system",
            `No se pudo crear la conversación: ${error.message}`
        );

    } finally {
        botonConfirmarNueva.disabled = false;
        botonConfirmarNueva.textContent = "Crear nueva conversación";
    }
});

/* ------------------- */
/* Renombrar chat */
/* ------------------- */

const modalRenombrar = document.getElementById("modalRenombrar");
const inputTituloChat = document.getElementById("inputTituloChat");
const botonCancelarRenombrar = document.getElementById("cancelarRenombrar");
const botonConfirmarRenombrar = document.getElementById("confirmarRenombrar");

function abrirModalRenombrar(chat) {
    chatPendienteRenombrar = chat.id;

    inputTituloChat.value = chat.titulo || "";

    modalRenombrar.classList.add("activo");

    setTimeout(() => {
        inputTituloChat.focus();
        inputTituloChat.select();
    }, 50);
}

function cerrarModalRenombrar() {
    modalRenombrar.classList.remove("activo");
    chatPendienteRenombrar = null;
}

botonCancelarRenombrar.addEventListener("click", cerrarModalRenombrar);

modalRenombrar.addEventListener("click", function(evento) {
    if (evento.target === modalRenombrar) {
        cerrarModalRenombrar();
    }
});

inputTituloChat.addEventListener("keydown", function(evento) {
    if (evento.key === "Enter") {
        confirmarRenombrar();
    }
});

async function confirmarRenombrar() {
    const titulo = inputTituloChat.value.trim();

    if (!chatPendienteRenombrar) {
        return;
    }

    if (!titulo) {
        inputTituloChat.focus();
        return;
    }

    botonConfirmarRenombrar.disabled = true;
    botonConfirmarRenombrar.textContent = "Guardando...";

    try {
        const respuesta = await fetch(
            `/chats/${encodeURIComponent(chatPendienteRenombrar)}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ titulo })
            }
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                data.error || "No se pudo cambiar el nombre."
            );
        }

        await refrescarChats();
        cerrarModalRenombrar();

    } catch (error) {
        agregarMensaje(
            "system",
            `No se pudo renombrar la conversación: ${error.message}`
        );

    } finally {
        botonConfirmarRenombrar.disabled = false;
        botonConfirmarRenombrar.textContent = "Guardar nombre";
    }
}

botonConfirmarRenombrar.addEventListener(
    "click",
    confirmarRenombrar
);

/* ------------------- */
/* Eliminar chat */
/* ------------------- */

const modalEliminar = document.getElementById("modalEliminar");
const textoEliminar = document.getElementById("textoEliminar");
const botonCancelarEliminar = document.getElementById("cancelarEliminar");
const botonConfirmarEliminar = document.getElementById("confirmarEliminar");

function abrirModalEliminar(chat) {
    chatPendienteEliminar = chat.id;

    textoEliminar.textContent =
        `La conversación "${chat.titulo}" se eliminará permanentemente.`;

    modalEliminar.classList.add("activo");
}

function cerrarModalEliminar() {
    modalEliminar.classList.remove("activo");
    chatPendienteEliminar = null;
}

botonCancelarEliminar.addEventListener("click", cerrarModalEliminar);

modalEliminar.addEventListener("click", function(evento) {
    if (evento.target === modalEliminar) {
        cerrarModalEliminar();
    }
});

botonConfirmarEliminar.addEventListener("click", async function() {
    const chatEliminado = chatPendienteEliminar;

    if (!chatEliminado) {
        return;
    }

    botonConfirmarEliminar.disabled = true;
    botonConfirmarEliminar.textContent = "Eliminando...";

    try {
        const respuesta = await fetch(
            `/chats/${encodeURIComponent(chatEliminado)}`,
            {
                method: "DELETE"
            }
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                data.error || "No se pudo eliminar la conversación."
            );
        }

        await refrescarChats();

        if (chatActualId === chatEliminado) {
            if (data.chatActualId) {
                chatActualId = data.chatActualId;
                await cargarChat(chatActualId);
            } else {
                mostrarInicioSinChat();
            }
        }

        cerrarModalEliminar();

    } catch (error) {
        agregarMensaje(
            "system",
            `No se pudo eliminar la conversación: ${error.message}`
        );

    } finally {
        botonConfirmarEliminar.disabled = false;
        botonConfirmarEliminar.textContent = "Eliminar conversación";
    }
});

/* ------------------- */
/* Modal de información */
/* ------------------- */

const abrirEmpresa = document.getElementById("abrirEmpresa");
const cerrarEmpresa = document.getElementById("cerrarEmpresa");
const modalEmpresa = document.getElementById("modalEmpresa");

abrirEmpresa.addEventListener("click", function() {
    modalEmpresa.classList.add("activo");
});

cerrarEmpresa.addEventListener("click", function() {
    modalEmpresa.classList.remove("activo");
});

modalEmpresa.addEventListener("click", function(evento) {
    if (evento.target === modalEmpresa) {
        modalEmpresa.classList.remove("activo");
    }
});

document.addEventListener("keydown", function(evento) {
    if (evento.key === "Escape") {
        modalEmpresa.classList.remove("activo");
        modalConfirmacion.classList.remove("activo");
        modalRenombrar.classList.remove("activo");
        modalEliminar.classList.remove("activo");
    }
});

/* ------------------- */
/* Información de la aplicación */
/* ------------------- */

async function cargarInformacionAplicacion() {
    try {
        const respuesta = await fetch("/api/app-info", { cache: "no-store" });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.integrity?.ok) {
            throw new Error(data.error || "La integridad de la aplicación no pudo verificarse.");
        }

        const version = document.getElementById("versionAplicacion");
        const firma = document.getElementById("firmaAplicacion");

        if (version) {
            version.textContent = data.version;
        }

        if (firma) {
            firma.textContent = data.attribution;
        }
    } catch (error) {
        const text = document.getElementById("statusText");
        const dot = document.getElementById("statusDot");

        if (dot) {
            dot.classList.remove("online");
            dot.classList.add("offline");
        }

        if (text) {
            text.textContent = "Integridad de la entrega no verificada";
        }

        console.error(error);
    }
}

/* ------------------- */
/* Inicio */
/* ------------------- */

actualizarContador();
renderizarDocumentos([]);
actualizarControlesConversacion();
cargarInformacionAplicacion();
cargarChatsIniciales();
