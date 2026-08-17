/**
 * ONDIGITAL · Motor de presentación (auto-scroll)
 *
 * Recorre la landing de arriba a abajo, espera sobre el contacto, funde a negro
 * y vuelve a empezar. Pensado para dejar el sitio solo en un monitor.
 *
 * El interruptor vive en presentacion.config.js, que se edita en el servidor.
 * Este archivo NO expone ninguna forma de encenderlo desde el navegador: si el
 * modo está apagado, sale antes de registrar un solo escuchador, y los valores
 * de configuración se copian a constantes locales en el arranque para que
 * tocar `window.ONDIGITAL_PRESENTACION` después no cambie nada.
 */
(() => {
    "use strict";

    const config = window.ONDIGITAL_PRESENTACION;
    if (!config || config.autoScroll !== true) return;

    const numero = (valor, porDefecto) => (Number.isFinite(valor) && valor >= 0 ? valor : porDefecto);
    const VELOCIDAD = Math.max(4, numero(config.velocidadPxPorSegundo, 42));
    const PAUSA_INICIO = numero(config.pausaInicioMs, 4500);
    const PAUSA_FINAL = numero(config.pausaFinalMs, 7000);
    const FUNDIDO = numero(config.fundidoMs, 700);
    const REANUDAR = numero(config.reanudarTrasInactividadMs, 15000);
    const OCULTAR_CURSOR = config.ocultarCursor !== false;
    const RESPETAR_MOVIMIENTO = config.respetarMovimientoReducido !== false;

    if (RESPETAR_MOVIMIENTO && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        console.info(
            "[ONDIGITAL] Modo presentación activo, pero el sistema pide movimiento reducido. " +
            "Para el equipo de exhibición, poner respetarMovimientoReducido: false en presentacion.config.js."
        );
        return;
    }

    const raiz = document.documentElement;
    raiz.classList.add("modo-presentacion");
    if (OCULTAR_CURSOR) raiz.classList.add("modo-presentacion--sin-cursor");

    const fundido = document.createElement("div");
    fundido.className = "presentacion-fundido";
    fundido.setAttribute("aria-hidden", "true");
    fundido.style.transitionDuration = `${FUNDIDO}ms`;

    const alturaMaxima = () => Math.max(0, raiz.scrollHeight - window.innerHeight);
    const dormir = (ms) => new Promise((listo) => setTimeout(listo, ms));

    let posicion = 0;
    let corriendo = false;
    let pausadoPorUsuario = false;
    let temporizadorReanudar = 0;
    let raf = 0;
    let ultimoCuadro = 0;

    /* El usuario tomó el control: soltamos el recorrido y esperamos a que se
       aburra. Nunca al revés — no hay forma de encender el modo desde aquí. */
    const cederControl = () => {
        pausadoPorUsuario = true;
        clearTimeout(temporizadorReanudar);
        if (REANUDAR <= 0) return;
        temporizadorReanudar = setTimeout(() => {
            posicion = window.scrollY;
            pausadoPorUsuario = false;
        }, REANUDAR);
    };

    ["wheel", "touchstart", "pointerdown", "keydown"].forEach((evento) => {
        window.addEventListener(evento, cederControl, { passive: true });
    });

    document.addEventListener("visibilitychange", () => {
        // Al volver de una pestaña oculta el reloj saltó: resincronizamos para
        // no arrastrar un salto de varios segundos de recorrido.
        if (!document.hidden) {
            ultimoCuadro = 0;
            posicion = window.scrollY;
        }
    });

    /** Avanza hasta el final de la página. Resuelve cuando toca el fondo. */
    const recorrer = () => new Promise((listo) => {
        ultimoCuadro = 0;

        const paso = (ahora) => {
            if (!corriendo) return listo();

            if (!ultimoCuadro) ultimoCuadro = ahora;
            const dt = Math.min((ahora - ultimoCuadro) / 1000, 0.1);
            ultimoCuadro = ahora;

            if (pausadoPorUsuario) {
                raf = requestAnimationFrame(paso);
                return;
            }

            // El alto cambia mientras se revelan secciones (content-visibility),
            // así que el fondo se recalcula en cada cuadro, no una sola vez.
            const tope = alturaMaxima();
            posicion = Math.min(posicion + VELOCIDAD * dt, tope);
            window.scrollTo(0, posicion);

            if (posicion >= tope - 0.5) return listo();
            raf = requestAnimationFrame(paso);
        };

        raf = requestAnimationFrame(paso);
    });

    /** Espera a que el usuario deje de interactuar antes de seguir el guion. */
    const esperarInactividad = async () => {
        while (corriendo && pausadoPorUsuario) await dormir(400);
    };

    const volverAlInicio = async () => {
        fundido.classList.add("visible");
        await dormir(FUNDIDO);
        window.scrollTo(0, 0);
        posicion = 0;
        await dormir(220);
        fundido.classList.remove("visible");
        await dormir(FUNDIDO);
    };

    const bucle = async () => {
        while (corriendo) {
            await esperarInactividad();
            await dormir(PAUSA_INICIO);
            if (!corriendo) return;

            await recorrer();
            if (!corriendo) return;

            await dormir(PAUSA_FINAL);
            await esperarInactividad();
            if (!corriendo) return;

            await volverAlInicio();
        }
    };

    const arrancar = () => {
        document.body.appendChild(fundido);
        window.scrollTo(0, 0);
        posicion = 0;
        corriendo = true;
        bucle();
    };

    if (document.readyState === "complete") {
        arrancar();
    } else {
        window.addEventListener("load", arrancar, { once: true });
    }

    window.addEventListener("pagehide", () => {
        corriendo = false;
        cancelAnimationFrame(raf);
    });
})();
