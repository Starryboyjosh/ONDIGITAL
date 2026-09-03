/**
 * ONDIGITAL · Configuración del modo presentación
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ESTE ARCHIVO ES EL ÚNICO INTERRUPTOR DEL AUTO-SCROLL.
 *
 * Se cambia editando este archivo en el servidor y recargando la página. No
 * existe ningún botón, enlace, parámetro de URL, atajo de teclado ni valor
 * guardado en el navegador que lo encienda: si `autoScroll` es `false`, el
 * motor de presentación no registra ni un solo evento y la landing se comporta
 * exactamente como siempre.
 *
 * Uso previsto: dejar la landing sola en un monitor, desplazándose de arriba a
 * abajo en bucle mientras la pantalla de marca corre en el otro monitor
 * (`pantalla-final/`).
 *
 *   1. Poner `autoScroll: true` aquí, en la copia que sirve ese monitor.
 *   2. Abrir index.html en ese monitor y ponerlo en pantalla completa (F11).
 *   3. Dejar el archivo en `false` en la copia pública del sitio.
 *
 * ══════════════════════════════════════════════════════════════════════════
 */
window.ONDIGITAL_PRESENTACION = Object.freeze({

    /** Sí / no. El interruptor. Solo se cambia aquí, en el servidor. */
    autoScroll: false,

    /** Velocidad de recorrido. 42 px/s recorre la landing completa en ~4 min. */
    velocidadPxPorSegundo: 102,

    /** Pausa sobre el hero antes de arrancar y después de cada vuelta. */
    pausaInicioMs: 4500,

    /** Pausa sobre el formulario de contacto antes de volver al inicio. */
    pausaFinalMs: 7000,

    /** Duración del fundido a negro que separa una vuelta de la siguiente. */
    fundidoMs: 700,

    /**
     * Si alguien toca la pantalla o mueve la rueda, el recorrido se detiene y
     * se reanuda solo después de este tiempo sin interacción. En 0 nunca cede
     * el control.
     */
    reanudarTrasInactividadMs: 15000,

    /** Oculta el cursor y la barra de desplazamiento mientras recorre. */
    ocultarCursor: true,

    /**
     * Si el sistema operativo del equipo pide movimiento reducido, no arranca.
     * Ponerlo en `false` solo en la máquina de exhibición, donde el recorrido
     * automático es justamente lo que se quiere.
     */
    respetarMovimientoReducido: true
});
