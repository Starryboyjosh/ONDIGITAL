/**
 * ONDIGITAL - Pantalla final
 *
 * Vito se queda en el centro y voltea a ver cada capacidad: el nodo al que
 * mira abre su propia tarjeta, la sostiene un ciclo y la vuelve a cerrar.
 */
(() => {
    "use strict";

    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (selector) => document.querySelector(selector);

    /* Cada tarjeta respira un momento y deja una pausa antes del siguiente nodo. */
    const CICLO = 5600;
    const PAUSA_ENTRE_CAPACIDADES = 2400;

    /* El orden del arreglo es el recorrido de la mirada: horario desde arriba. */
    const capacidades = [
        {
            id: "webs",
            marca: "#D8A24A",
            titulo: "Webs y plataformas",
            texto: "Portales, e-commerce y SaaS con una base clara para crecer.",
            tags: ["Portales", "E-commerce", "SaaS"],
            visual: "webs",
            mirada: { x: 0.85, y: -0.5 }
        },
        {
            id: "apps",
            marca: "#8477E6",
            titulo: "Apps móviles",
            texto: "Flujos simples en iOS y Android, con avisos push y uso sin señal.",
            tags: ["iOS", "Android", "Notificaciones"],
            visual: "apps",
            mirada: { x: 0.85, y: 0.5 }
        },
        {
            id: "auto",
            marca: "#E0B368",
            titulo: "Automatización",
            texto: "APIs, reportes y procesos que quitan trabajo manual cada día.",
            tags: ["APIs", "Reportes", "Integraciones"],
            visual: "auto",
            mirada: { x: 0, y: 1 }
        },
        {
            id: "sistemas",
            marca: "#B98A3E",
            titulo: "Sistemas a medida",
            texto: "Paneles e integraciones adaptados a cómo opera cada negocio.",
            tags: ["Paneles", "Inventario", "Facturación"],
            visual: "sistemas",
            mirada: { x: -0.85, y: 0.5 }
        },
        {
            id: "ia",
            marca: "#9B8CFF",
            titulo: "IA aplicada · Vito",
            etiqueta: "IA aplicada con Vito",
            texto: "Un asistente que trabaja sobre los datos reales del negocio.",
            tags: ["Vito", "Datos reales", "En español"],
            visual: "ia",
            mirada: { x: -0.85, y: -0.5 }
        }
    ];

    /* Escenas SVG: escalan limpio en un monitor grande y pesan casi nada. */
    const marco = (contenido) =>
        `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" fill="none" font-family="ui-monospace, Consolas, monospace">${contenido}</svg>`;

    const graficos = {
        webs: marco(`
            <defs>
                <linearGradient id="vizAreaWeb" x1="0" y1="58" x2="0" y2="152" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#9B8CFF" stop-opacity=".32"/>
                    <stop offset="1" stop-color="#9B8CFF" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <rect width="320" height="34" fill="rgba(167, 143, 222,.07)"/>
            <path d="M0 34h320" stroke="rgba(167, 143, 222,.2)"/>
            <circle cx="20" cy="17" r="3.8" fill="#E0B368"/>
            <circle cx="34" cy="17" r="3.8" fill="#8477E6"/>
            <circle cx="48" cy="17" r="3.8" fill="#9B8CFF"/>
            <rect x="66" y="11" width="140" height="12" rx="6" fill="rgba(245, 241, 254,.1)"/>
            <rect x="264" y="11" width="42" height="12" rx="6" fill="rgba(108, 53, 237,.42)"/>
            <rect x="16" y="50" width="52" height="9" rx="4.5" fill="rgba(245, 241, 254,.26)"/>
            <rect x="16" y="68" width="40" height="6" rx="3" fill="rgba(245, 241, 254,.13)"/>
            <rect x="16" y="82" width="48" height="6" rx="3" fill="rgba(245, 241, 254,.13)"/>
            <rect x="16" y="96" width="34" height="6" rx="3" fill="rgba(245, 241, 254,.13)"/>
            <rect x="16" y="110" width="44" height="6" rx="3" fill="rgba(245, 241, 254,.13)"/>
            <path d="M84 44v124" stroke="rgba(167, 143, 222,.16)"/>
            <g stroke="rgba(167, 143, 222,.12)">
                <path d="M100 156h204"/><path d="M100 130h204"/><path d="M100 104h204"/><path d="M100 78h204"/>
            </g>
            <path d="M100 142 134 122 168 130 202 96 236 106 270 72 304 56V156H100Z" fill="url(#vizAreaWeb)"/>
            <path class="viz-linea" d="M100 142 134 122 168 130 202 96 236 106 270 72 304 56" stroke="#9B8CFF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="304" cy="56" r="4.6" fill="#9B8CFF" class="viz-late"/>
        `),

        apps: marco(`
            <g stroke="rgba(87, 36, 208,.6)" stroke-width="1.6" stroke-dasharray="4 6" stroke-linecap="round">
                <path class="viz-corre" d="M120 74h34"/>
                <path class="viz-corre" d="M120 108h34"/>
            </g>
            <g transform="rotate(-4 72 90)">
                <rect x="26" y="14" width="90" height="152" rx="19" fill="#0A130E" stroke="rgba(87, 36, 208,.78)" stroke-width="2"/>
                <rect x="58" y="24" width="26" height="4.5" rx="2.25" fill="rgba(245, 241, 254,.34)"/>
                <rect x="38" y="42" width="62" height="9" rx="4.5" fill="rgba(245, 241, 254,.26)"/>
                <rect x="38" y="60" width="66" height="30" rx="9" fill="rgba(108, 53, 237,.24)" stroke="rgba(108, 53, 237,.52)"/>
                <path d="M46 80l10-11 9 7 11-13" stroke="#C9AF7A" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="38" y="98" width="46" height="6" rx="3" fill="rgba(245, 241, 254,.15)"/>
                <rect x="38" y="110" width="58" height="6" rx="3" fill="rgba(245, 241, 254,.15)"/>
                <rect x="38" y="130" width="66" height="22" rx="11" fill="rgba(155, 140, 255,.18)" stroke="rgba(155, 140, 255,.55)"/>
                <text x="71" y="144.5" fill="#CBBCFF" font-size="9" letter-spacing=".1em" text-anchor="middle">ENVIAR</text>
            </g>
            <g>
                <rect x="156" y="34" width="148" height="52" rx="13" fill="rgba(13, 52, 33,.9)" stroke="rgba(167, 143, 222,.24)"/>
                <rect x="170" y="48" width="24" height="24" rx="8" fill="rgba(155, 140, 255,.2)" stroke="rgba(155, 140, 255,.55)"/>
                <path d="M177 60l4.5 4.5 8-9" stroke="#9B8CFF" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="206" y="50" width="76" height="7" rx="3.5" fill="rgba(245, 241, 254,.42)"/>
                <rect x="206" y="63" width="52" height="6" rx="3" fill="rgba(245, 241, 254,.17)"/>
            </g>
            <g>
                <rect x="156" y="96" width="148" height="52" rx="13" fill="rgba(13, 52, 33,.9)" stroke="rgba(167, 143, 222,.24)"/>
                <rect x="170" y="110" width="24" height="24" rx="8" fill="rgba(108, 53, 237,.24)" stroke="rgba(108, 53, 237,.55)"/>
                <path d="M182 116v12M176 122h12" stroke="#C9AF7A" stroke-width="2.2" stroke-linecap="round"/>
                <rect x="206" y="112" width="62" height="7" rx="3.5" fill="rgba(245, 241, 254,.42)"/>
                <rect x="206" y="125" width="80" height="6" rx="3" fill="rgba(245, 241, 254,.17)"/>
            </g>
            <g class="viz-late">
                <circle cx="290" cy="30" r="11" fill="#9B8CFF"/>
                <text x="290" y="34" fill="#0F1B15" font-size="11" font-weight="700" text-anchor="middle">3</text>
            </g>
        `),

        auto: marco(`
            <g stroke="#E0B368" stroke-width="1.8" stroke-linecap="round" opacity=".75">
                <path class="viz-corre" d="M72 90h44" stroke-dasharray="6 8"/>
                <path class="viz-corre" d="M116 90c18 0 14-44 34-44" stroke-dasharray="6 8"/>
                <path class="viz-corre" d="M116 90c18 0 14 44 34 44" stroke-dasharray="6 8"/>
                <path class="viz-corre" d="M194 46c26 0 20 44 42 44" stroke-dasharray="6 8"/>
                <path class="viz-corre" d="M194 134c26 0 20-44 42-44" stroke-dasharray="6 8"/>
            </g>
            <g>
                <rect x="30" y="68" width="44" height="44" rx="12" fill="#0C1610" stroke="#9B8CFF" stroke-width="2"/>
                <path d="M42 90h20M52 80v20" stroke="#9B8CFF" stroke-width="2.4" stroke-linecap="round"/>
            </g>
            <g>
                <rect x="150" y="26" width="44" height="40" rx="11" fill="#101C16" stroke="#D8A24A" stroke-width="2"/>
                <path d="M160 46h10v10h-10zM176 38h10v18h-10z" fill="#D8A24A" opacity=".85"/>
            </g>
            <g>
                <rect x="150" y="114" width="44" height="40" rx="11" fill="#101C16" stroke="#8477E6" stroke-width="2"/>
                <path d="M160 140l8-10 8 6 8-14" stroke="#8477E6" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
            <g>
                <rect class="viz-late" x="230" y="60" width="64" height="60" rx="17" fill="none" stroke="#E0B368" stroke-width="1.4" opacity=".5"/>
                <rect x="236" y="66" width="52" height="48" rx="13" fill="rgba(155,140,255,.18)" stroke="#E0B368" stroke-width="2"/>
                <path d="M250 90l8 9 17-19" stroke="#E0B368" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        `),

        sistemas: marco(`
            <rect width="320" height="34" fill="rgba(155,140,255,.12)"/>
            <path d="M0 34h320" stroke="rgba(167, 143, 222,.22)"/>
            <text x="16" y="21" fill="#B8A6E8" font-size="10" letter-spacing=".14em">INVENTARIO</text>
            <text x="304" y="21" fill="rgba(245, 241, 254,.72)" font-size="10" letter-spacing=".08em" text-anchor="end">HNL</text>
            <g stroke="rgba(167, 143, 222,.1)">
                <path d="M8 76h304"/><path d="M8 108h304"/><path d="M8 140h304"/>
            </g>
            <g font-size="11">
                <rect x="8" y="48" width="304" height="28" rx="7" fill="rgba(155,140,255,.14)" stroke="rgba(155,140,255,.34)"/>
                <circle cx="22" cy="62" r="3.5" fill="#B98A3E"/>
                <text x="34" y="66" fill="rgba(245, 241, 254,.92)">Resina compuesta</text>
                <text x="196" y="66" fill="rgba(214, 205, 240,.86)" text-anchor="end">48 u</text>
                <text x="300" y="66" fill="#9B8CFF" text-anchor="end">L 12,400</text>

                <circle cx="22" cy="93" r="3.5" fill="rgba(108, 53, 237,.75)"/>
                <text x="34" y="97" fill="rgba(245, 241, 254,.86)">Guantes nitrilo</text>
                <text x="196" y="97" fill="rgba(214, 205, 240,.86)" text-anchor="end">120 u</text>
                <text x="300" y="97" fill="rgba(245, 241, 254,.86)" text-anchor="end">L 3,180</text>

                <circle cx="22" cy="124" r="3.5" fill="rgba(155,140,255,.7)"/>
                <text x="34" y="128" fill="rgba(245, 241, 254,.86)">Anestesia local</text>
                <text x="196" y="128" fill="rgba(214, 205, 240,.86)" text-anchor="end">36 u</text>
                <text x="300" y="128" fill="rgba(245, 241, 254,.86)" text-anchor="end">L 7,950</text>

                <circle cx="22" cy="155" r="3.5" fill="rgba(224,168,61,.7)"/>
                <text x="34" y="159" fill="rgba(245, 241, 254,.86)">Fresas diamante</text>
                <text x="196" y="159" fill="rgba(214, 205, 240,.86)" text-anchor="end">9 u</text>
                <text x="300" y="159" fill="rgba(224,168,61,.85)" text-anchor="end">L 1,620</text>
            </g>
        `),

        ia: marco(`
            <g>
                <rect x="140" y="18" width="164" height="40" rx="14" fill="rgba(108, 53, 237,.22)" stroke="rgba(108, 53, 237,.52)"/>
                <text x="288" y="43" fill="#E8E0FF" font-size="12" text-anchor="end">¿Ventas de hoy?</text>
            </g>
            <g>
                <rect x="16" y="70" width="228" height="82" rx="16" fill="rgba(155, 140, 255,.13)" stroke="rgba(155, 140, 255,.46)"/>
                <circle cx="40" cy="92" r="12" fill="#9B8CFF"/>
                <circle cx="36" cy="89.5" r="1.9" fill="#0F1B15"/>
                <circle cx="44" cy="89.5" r="1.9" fill="#0F1B15"/>
                <path d="M35 96q5 4.5 10 0" stroke="#0F1B15" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                <text x="60" y="88" fill="#C9BBFF" font-size="10" letter-spacing=".14em">VITO</text>
                <text x="60" y="106" fill="#ECE7FF" font-size="13">L 48,200 · 31 facturas</text>
                <g class="viz-escribe" fill="#9B8CFF">
                    <rect x="60" y="122" width="5" height="5" rx="2.5"/>
                    <rect x="71" y="122" width="5" height="5" rx="2.5"/>
                    <rect x="82" y="122" width="5" height="5" rx="2.5"/>
                </g>
                <g class="viz-late" fill="#9B8CFF" opacity=".6">
                    <rect x="184" y="124" width="4" height="10" rx="2"/>
                    <rect x="194" y="120" width="4" height="18" rx="2"/>
                    <rect x="204" y="116" width="4" height="26" rx="2"/>
                    <rect x="214" y="121" width="4" height="16" rx="2"/>
                    <rect x="224" y="125" width="4" height="8" rx="2"/>
                </g>
            </g>
        `)
    };

    /* Cada nodo tiene su tarjeta: se llena una vez y solo se abre o se cierra. */
    (() => {
        const robot = $(".robot-logo-large");
        const pupilas = [...document.querySelectorAll(".robot-pupil")];
        if (!robot) return;

        const nodos = capacidades
            .map((capacidad) => {
                const shell = document.querySelector(`.nodo-shell[data-capacidad="${capacidad.id}"]`);
                if (!shell) return null;

                const boton = shell.querySelector(".nodo");
                const titulo = shell.querySelector(".tarjeta-titulo");
                const texto = shell.querySelector(".tarjeta-texto");
                const tags = shell.querySelector(".tarjeta-tags");
                if (!boton || !titulo || !texto || !tags) return null;

                titulo.textContent = capacidad.titulo;
                texto.textContent = capacidad.texto;
                tags.innerHTML = capacidad.tags.map((tag) => `<li>${tag}</li>`).join("");
                boton.setAttribute("aria-label", `Ver ${capacidad.etiqueta || capacidad.titulo}`);

                return {
                    capacidad,
                    shell,
                    boton,
                    visual: shell.querySelector(".tarjeta-visual")
                };
            })
            .filter(Boolean);

        if (!nodos.length) return;

        let indice = 0;
        let siguienteCambio = 0;
        let pausaManual = false;
        let pausaPuntero = false;

        const estado = $("#pie-estado");
        const detener = () => {
            clearTimeout(siguienteCambio);
            siguienteCambio = 0;
        };

        const pintarEstado = () => {
            if (!estado) return;
            if (reducido) {
                estado.textContent = "";
                estado.classList.remove("pausado");
                return;
            }
            const enPausa = pausaManual || pausaPuntero;
            estado.textContent = enPausa ? "En pausa · espacio para seguir" : "Espacio · pausar";
            estado.classList.toggle("pausado", enPausa);
        };

        const orientar = (capacidad) => {
            /* Con movimiento reducido Vito no voltea: el giro seria un corte seco. */
            if (reducido) return;
            const miradaX = capacidad.mirada.x * 5.2;
            const miradaY = capacidad.mirada.y * 3.2;
            robot.style.setProperty("--vito-tilt-x", `${(5 - capacidad.mirada.y * 2.4).toFixed(2)}deg`);
            robot.style.setProperty("--vito-tilt-y", `${(capacidad.mirada.x * 8).toFixed(2)}deg`);
            pupilas.forEach((pupila) => {
                pupila.style.setProperty("--mirada-x", `${miradaX.toFixed(2)}px`);
                pupila.style.setProperty("--mirada-y", `${miradaY.toFixed(2)}px`);
            });
        };

        const ocultarActual = () => {
            const actual = nodos[indice];
            actual.shell.classList.remove("activo");
            actual.boton.setAttribute("aria-expanded", "false");
            orientar({ mirada: { x: 0, y: 0 } });
        };

        const mostrar = (nuevoIndice) => {
            indice = (nuevoIndice + nodos.length) % nodos.length;
            const actual = nodos[indice];

            nodos.forEach((nodo, posicion) => {
                const activo = posicion === indice;
                nodo.shell.classList.toggle("activo", activo);
                nodo.boton.setAttribute("aria-expanded", String(activo));
            });

            /* Se repinta al abrir para que los trazos del grafico vuelvan a correr. */
            if (actual.visual) actual.visual.innerHTML = graficos[actual.capacidad.visual];
            orientar(actual.capacidad);
        };

        /* Nada se reprograma con movimiento reducido ni en pausa: la tarjeta 0 se queda. */
        const programarSiguiente = () => {
            detener();
            if (reducido || pausaManual || pausaPuntero) return;
            siguienteCambio = window.setTimeout(() => {
                ocultarActual();
                siguienteCambio = window.setTimeout(() => {
                    mostrar(indice + 1);
                    programarSiguiente();
                }, PAUSA_ENTRE_CAPACIDADES);
            }, CICLO);
        };

        nodos.forEach((nodo, posicion) => {
            const abrir = () => {
                if (posicion !== indice || !nodo.shell.classList.contains("activo")) mostrar(posicion);
            };

            const activar = () => {
                abrir();
                programarSiguiente();
            };

            nodo.boton.addEventListener("click", activar);
            nodo.boton.addEventListener("focus", activar);

            /* El puntero encima detiene la cadena; al salir vuelve a correr. */
            nodo.shell.addEventListener("pointerenter", () => {
                if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
                abrir();
                pausaPuntero = true;
                detener();
                pintarEstado();
            });

            nodo.shell.addEventListener("pointerleave", () => {
                if (!pausaPuntero) return;
                pausaPuntero = false;
                pintarEstado();
                programarSiguiente();
            });
        });

        /* WCAG 2.2.2: contenido que se mueve solo necesita una forma de pararlo. */
        window.addEventListener("keydown", (evento) => {
            if (evento.code !== "Space" && evento.key !== " ") return;
            const foco = evento.target;
            if (foco instanceof Element && foco.closest("button, a, input, textarea, select")) return;
            evento.preventDefault();
            pausaManual = !pausaManual;
            pintarEstado();
            if (pausaManual) detener();
            else programarSiguiente();
        });

        mostrar(0);
        pintarEstado();
        programarSiguiente();
    })();

    /* Gestos de Vito: parpadeo organico, pausado y prescindible con movimiento reducido. */
    if (!reducido) {
        const parpadear = () => {
            document.querySelectorAll(".robot-eye-group").forEach((ojo) => ojo.classList.add("parpadea"));
            window.setTimeout(() => {
                document.querySelectorAll(".robot-eye-group").forEach((ojo) => ojo.classList.remove("parpadea"));
            }, 200);
            window.setTimeout(parpadear, 3000 + Math.random() * 4200);
        };
        window.setTimeout(parpadear, 1900);
    }

    /* Cursor y pantalla completa siguen siendo utilidades de la pieza de exhibicion. */
    (() => {
        let temporizador = 0;
        const esconder = () => document.body.classList.add("sin-cursor");
        const mostrar = () => {
            document.body.classList.remove("sin-cursor");
            clearTimeout(temporizador);
            temporizador = window.setTimeout(esconder, 3000);
        };
        window.addEventListener("mousemove", mostrar, { passive: true });
        temporizador = window.setTimeout(esconder, 3000);
    })();

    (() => {
        const alternar = () => {
            if (document.fullscreenElement) {
                document.exitFullscreen?.();
            } else {
                document.documentElement.requestFullscreen?.().catch(() => {});
            }
        };
        window.addEventListener("keydown", (evento) => {
            if (!evento.shiftKey) return;
            if (evento.key === "f" || evento.key === "F") alternar();
        });
        window.addEventListener("dblclick", (evento) => {
            const destino = evento.target;
            if (destino instanceof Element && destino.closest(".nodo, .nodo-tarjeta")) return;
            alternar();
        });
    })();

    /* La pantalla del aula no debe dormirse a media defensa. */
    (() => {
        let bloqueo = null;
        const pedir = () => {
            navigator.wakeLock
                ?.request("screen")
                .then((concedido) => {
                    bloqueo = concedido;
                    bloqueo.addEventListener?.("release", () => { bloqueo = null; });
                })
                .catch(() => {});
        };

        pedir();
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && (!bloqueo || bloqueo.released)) pedir();
        });
    })();
})();
