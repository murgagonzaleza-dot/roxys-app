const URL_BACKEND = "https://script.google.com/macros/s/AKfycbwe05nXJvFHFccc80P0RhugUPZcyMBbIdd4JVAUvdeNVLgyTRR3OlvWeVk-Q0yExI-nOA/exec";
const nombreCajero = document.getElementById("nombreCajero");
const marcarAsistencia = document.getElementById("marcarAsistencia");
const mensaje = document.getElementById("mensaje");

async function enviar(nombre, accion = "PRESENTE", sessionId = "", operationId = "") {
    const respuesta = await fetch(URL_BACKEND, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ nombre, accion, sessionId, operationId })
    });
    return await respuesta.json();
}

async function registrarMarcacion() {
    const nombre = nombreCajero.value.trim();

    if (!nombre) {
        mensaje.textContent = "Ingresa tu nombre completo.";
        nombreCajero.focus();
        return;
    }

    if (nombre.length < 3) {
        mensaje.textContent = "Ingresa un nombre completo válido.";
        nombreCajero.focus();
        return;
    }

    marcarAsistencia.disabled = true;
    marcarAsistencia.textContent = "CONSULTANDO...";
    mensaje.textContent = "";

    try {
        const resultado = await enviar(nombre);

        if (resultado.estado === "PENDIENTE") {
            abrirDashboard(nombre, resultado.sessionId, resultado.operationId, "ENTREGA");
            window.close();
            return;
        }

        if (resultado.estado === "YA_ACTIVO") {
            abrirDashboard(nombre, resultado.sessionId, "", "NORMAL");
            window.close();
            return;
        }

        if (resultado.estado === "ERROR") {
            throw new Error(resultado.mensaje);
        }

        abrirDashboard(nombre, resultado.sessionId, "", "NORMAL");
        window.close();
    } catch (error) {
        mensaje.textContent = error.message || "No se pudo registrar la marcación.";
        marcarAsistencia.disabled = false;
        marcarAsistencia.textContent = "MARCACIÓN";
    }
}

function abrirDashboard(nombre, sessionId, operationId, modo) {
    const url = chrome.runtime.getURL(
        "dashboard.html?cajero=" + encodeURIComponent(nombre) +
        "&sessionId=" + encodeURIComponent(sessionId) +
        "&operationId=" + encodeURIComponent(operationId) +
        "&modo=" + encodeURIComponent(modo)
    );

    chrome.tabs.create({
        url: url
    });
}

marcarAsistencia.addEventListener("click", registrarMarcacion);
nombreCajero.addEventListener("keydown", evento => {
    if (evento.key === "Enter") registrarMarcacion();
});