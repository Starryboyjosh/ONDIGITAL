/**
 * ONDIGITAL Landing PRO
 * Menú · Vito (hero) · partículas · tech slider · chat · equipo · form
 */
(() => {
    "use strict";

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    /* ─── Menú flotante (widget overlay, no empuja el layout) ─── */
    const menuBtn = $(".menu-btn");
    const menu = $("#site-menu");
    const menuWrap = $(".nav-menu");
    const menuScrim = $("#nav-scrim");
    let menuCloseTimer = 0;

    const setMenu = (open) => {
        if (!menu || !menuBtn) return;
        clearTimeout(menuCloseTimer);

        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");

        if (open) {
            menu.hidden = false;
            if (menuScrim) menuScrim.hidden = false;
            // Forzar reflow para que el despliegue (clip-path) anime desde cerrado
            void menu.offsetWidth;
            menu.classList.add("is-open");
            menuScrim?.classList.add("is-open");
            menu.setAttribute("aria-hidden", "false");
            menuScrim?.setAttribute("aria-hidden", "false");
        } else {
            menu.classList.remove("is-open");
            menuScrim?.classList.remove("is-open");
            menu.setAttribute("aria-hidden", "true");
            menuScrim?.setAttribute("aria-hidden", "true");
            // Esperar el despliegue de cierre (~340ms) antes de hidden
            menuCloseTimer = setTimeout(() => {
                if (!menu.classList.contains("is-open")) {
                    menu.hidden = true;
                    if (menuScrim) menuScrim.hidden = true;
                }
            }, 360);
        }
    };

    menuBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        setMenu(!menu?.classList.contains("is-open"));
    });
    menu?.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => setMenu(false));
    });
    menuScrim?.addEventListener("click", () => setMenu(false));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu?.classList.contains("is-open")) {
            setMenu(false);
            menuBtn?.focus();
        }
    });
    document.addEventListener("click", (e) => {
        if (!menu?.classList.contains("is-open")) return;
        const t = e.target;
        if (menuWrap?.contains(t) || menuScrim?.contains(t)) return;
        setMenu(false);
    });

    /* ─── Reveal ─── */
    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-visible");
            revealObs.unobserve(e.target);
        });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    $$(".reveal").forEach((el) => {
        if (prefersReduced) el.classList.add("is-visible");
        else revealObs.observe(el);
    });

    /* ─── Expresiones del logo (scroll) ─── */
    const brandMark = $(".brand-mark");
    const brandMouth = $(".nav-robot-mouth");
    const sectionMoods = [
        { id: "inicio", mood: "delight", mouth: "M140 178 Q180 200 220 178" },
        { id: "servicios", mood: "wow", mouth: "M180 174 m -12 0 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0" },
        { id: "tecnologia", mood: "tecnologia", mouth: "M145 179 C160 198 200 198 215 179" },
        { id: "vito", mood: "vito", mouth: "M138 176 Q180 205 222 176" },
        { id: "equipo", mood: "team", mouth: "M142 178 Q180 204 218 178" },
        { id: "precios", mood: "precios", mouth: "M148 174 m -11 0 a 11 11 0 1 0 22 0 a 11 11 0 1 0 -22 0" },
        { id: "contacto", mood: "contact", mouth: "M146 178 Q180 202 214 178" }
    ].map((s) => ({ ...s, el: document.getElementById(s.id) })).filter((s) => s.el);

    let scrollRaf = 0;
    const updateScrollMood = () => {
        const marker = window.innerHeight * 0.32;
        let current = sectionMoods[0];
        for (const s of sectionMoods) {
            const r = s.el.getBoundingClientRect();
            if (r.top <= marker && r.bottom > marker) current = s;
        }
        if (!current || brandMark?.dataset.expression === current.mood) return;
        brandMark?.setAttribute("data-expression", current.mood);
        brandMouth?.setAttribute("d", current.mouth);
    };
    const onScroll = () => {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
            scrollRaf = 0;
            updateScrollMood();
        });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    updateScrollMood();

    /* ─── Hero Vito: sonrisa cíclica, parpadeo, pop-ups tech, mirada ─── */
    const heroLogo = $(".robot-logo-large");
    const heroStage = $("#hero-vito");
    const heroMouth = heroLogo ? $(".robot-mouth-large", heroLogo) : null;
    const pupils = heroLogo ? $$(".robot-pupil", heroLogo) : [];
    const eyeGroups = heroLogo ? $$(".robot-eye-group", heroLogo) : [];
    const popupLayer = $("#vito-popups");

    // Expresiones de boca (mismo estilo que el logo del nav)
    const heroMoods = [
        { mood: "delight", mouth: "M140 178 Q180 200 220 178" },
        { mood: "wow", mouth: "M180 174 m -12 0 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0" },
        { mood: "tecnologia", mouth: "M145 179 C160 198 200 198 215 179" },
        { mood: "vito", mouth: "M138 176 Q180 205 222 176" },
        { mood: "team", mouth: "M142 178 Q180 204 218 178" },
        { mood: "precios", mouth: "M148 174 m -11 0 a 11 11 0 1 0 22 0 a 11 11 0 1 0 -22 0" },
        { mood: "contact", mouth: "M146 178 Q180 202 214 178" }
    ];

    const setHeroMood = (entry) => {
        if (!heroLogo || !entry) return;
        heroLogo.dataset.mood = entry.mood;
        if (heroMouth) heroMouth.setAttribute("d", entry.mouth);
    };
    setHeroMood(heroMoods[0]);

    const lookAt = (nx, ny) => {
        // nx/ny en [-1, 1] relativos al centro de Vito
        const x = Math.max(-1, Math.min(1, nx));
        const y = Math.max(-1, Math.min(1, ny));
        pupils.forEach((p) => {
            p.style.transform = `translate(${(x * 4.2).toFixed(2)}px, ${(y * 3.2).toFixed(2)}px)`;
        });
        if (heroLogo) {
            // Cabeza se inclina un poco hacia el pop-up
            heroLogo.style.setProperty("--look-x", `${(-y * 5).toFixed(2)}deg`);
            heroLogo.style.setProperty("--look-y", `${(x * 9).toFixed(2)}deg`);
        }
    };
    const lookCenter = () => lookAt(0, 0);

    if (!prefersReduced && heroLogo) {
        // Ciclo de sonrisa / expresión con el tiempo
        let moodIdx = 0;
        const cycleMood = () => {
            moodIdx = (moodIdx + 1) % heroMoods.length;
            setHeroMood(heroMoods[moodIdx]);
            setTimeout(cycleMood, 2800 + Math.random() * 1800);
        };
        setTimeout(cycleMood, 3200);

        // Parpadeo aleatorio
        const scheduleBlink = () => {
            const delay = 2600 + Math.random() * 3400;
            setTimeout(() => {
                eyeGroups.forEach((g) => {
                    g.classList.remove("is-blink");
                    void g.offsetWidth;
                    g.classList.add("is-blink");
                });
                scheduleBlink();
            }, delay);
        };
        scheduleBlink();
    }

    // Pop-ups tech: aparecen alrededor y Vito los mira
    if (!prefersReduced && heroStage && popupLayer) {
        const techBits = [
            { text: "API REST", tone: "blue" },
            { text: "{ json }", tone: "mint" },
            { text: "Flutter", tone: "blue" },
            { text: "SQLite", tone: "mint" },
            { text: "deploy ✓", tone: "mint" },
            { text: "LATAM", tone: "blue" },
            { text: "O(1)", tone: "mint" },
            { text: "HTTPS", tone: "blue" },
            { text: "cache hit", tone: "mint" },
            { text: "Go 1.22", tone: "blue" },
            { text: "IA · Vito", tone: "mint" },
            { text: "+12% ventas", tone: "blue" },
            { text: "webhook", tone: "mint" },
            { text: "SSR", tone: "blue" },
            { text: "HNL ready", tone: "mint" },
            { text: "offline-first", tone: "blue" }
        ];

        // Slots relativos al centro (left%, top%) + dirección de mirada normalizada
        const slots = [
            { left: 8, top: 22, nx: -0.95, ny: -0.55 },
            { left: 92, top: 24, nx: 0.95, ny: -0.5 },
            { left: 4, top: 52, nx: -1, ny: 0.05 },
            { left: 96, top: 54, nx: 1, ny: 0.08 },
            { left: 14, top: 78, nx: -0.75, ny: 0.75 },
            { left: 86, top: 76, nx: 0.75, ny: 0.7 },
            { left: 28, top: 10, nx: -0.45, ny: -0.95 },
            { left: 72, top: 8, nx: 0.45, ny: -1 }
        ];

        let bitIdx = 0;
        let slotIdx = 0;
        let lookTimer = 0;
        let activePop = null;

        const clearLookSoon = (ms = 900) => {
            clearTimeout(lookTimer);
            lookTimer = setTimeout(() => {
                if (!activePop) lookCenter();
            }, ms);
        };

        const spawnPopup = () => {
            // Pausar si el hero no está visible
            const box = heroStage.getBoundingClientRect();
            if (box.bottom < 40 || box.top > window.innerHeight - 40) {
                setTimeout(spawnPopup, 2200);
                return;
            }

            const slot = slots[slotIdx % slots.length];
            slotIdx += 1 + Math.floor(Math.random() * 2);
            const bit = techBits[bitIdx % techBits.length];
            bitIdx += 1;

            const el = document.createElement("span");
            el.className = "vito-popup";
            el.dataset.tone = bit.tone;
            el.style.setProperty("--left", `${slot.left}%`);
            el.style.setProperty("--top", `${slot.top}%`);
            el.style.left = `${slot.left}%`;
            el.style.top = `${slot.top}%`;
            el.textContent = bit.text;
            popupLayer.appendChild(el);
            activePop = el;

            // Vito mira al pop-up
            lookAt(slot.nx, slot.ny);

            requestAnimationFrame(() => {
                el.classList.add("is-on");
            });

            const life = 1700 + Math.random() * 900;
            setTimeout(() => {
                el.classList.add("is-out");
                el.classList.remove("is-on");
                if (activePop === el) activePop = null;
                clearLookSoon(420);
                setTimeout(() => el.remove(), 360);
            }, life);

            setTimeout(spawnPopup, life + 700 + Math.random() * 1100);
        };

        setTimeout(spawnPopup, 900);
    } else if (popupLayer) {
        popupLayer.hidden = true;
    }

    /* ─── Canvas partículas (solo hero) ─── */
    const canvas = $("#hero-canvas");
    if (canvas && !prefersReduced) {
        const ctx = canvas.getContext("2d", { alpha: true });
        let w = 0;
        let h = 0;
        let particles = [];
        let animId = 0;
        let running = true;

        const resize = () => {
            const hero = $(".hero");
            if (!hero) return;
            const rect = hero.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = Math.min(48, Math.floor(w / 28));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                r: 0.4 + Math.random() * 1.2,
                a: 0.06 + Math.random() * 0.18,
                vx: (Math.random() - 0.5) * 0.18,
                vy: -0.1 - Math.random() * 0.22,
                hue: Math.random() > 0.5 ? 160 : 210
            }));
        };

        const draw = () => {
            if (!running) return;
            ctx.clearRect(0, 0, w, h);
            const cx = w * 0.5;
            const cy = h * 0.38;
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                // órbita suave hacia el centro del robot
                const ox = (cx - p.x) * 0.0008;
                const oy = (cy - p.y) * 0.0008;
                p.vx += ox;
                p.vy += oy;
                if (p.y < -10) p.y = h + 10;
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                ctx.beginPath();
                ctx.fillStyle = p.hue > 180
                    ? `rgba(43, 138, 247, ${p.a})`
                    : `rgba(0, 229, 176, ${p.a})`;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
            animId = requestAnimationFrame(draw);
        };

        resize();
        draw();
        window.addEventListener("resize", () => {
            cancelAnimationFrame(animId);
            resize();
            draw();
        }, { passive: true });

        // Pausar fuera de vista
        const heroEl = $(".hero");
        if (heroEl && "IntersectionObserver" in window) {
            new IntersectionObserver(([entry]) => {
                running = entry.isIntersecting;
                if (running) draw();
                else cancelAnimationFrame(animId);
            }, { threshold: 0.05 }).observe(heroEl);
        }
    }



    /* ─── Servicios: parallax 3D controlado por el scroll ─── */
    const initServicesParallax = () => {
        const section = $("#servicios");
        const canvas = $("#services-webgl");
        const hero = $("#inicio");
        if (!section || !canvas) return;

        const services = [
            {
                kicker: "Producto digital",
                title: "Webs y plataformas",
                description: "Portales, e-commerce y SaaS con arquitectura clara, carga rápida y SEO que rinde.",
                tags: ["Next.js", "React", "SEO"],
                accent: "#2B8AF7",
                metric: "Carga < 1 s"
            },
            {
                kicker: "Experiencia móvil",
                title: "Apps móviles",
                description: "Aplicaciones iOS y Android con flujos simples y una base técnica lista para crecer.",
                tags: ["Flutter", "iOS", "Android"],
                accent: "#00E5B0",
                metric: "Una sola base"
            },
            {
                kicker: "Operaciones",
                title: "Automatización",
                description: "APIs, reportes y procesos conectados que quitan trabajo manual y reducen errores.",
                tags: ["APIs", "Webhooks", "RPA"],
                accent: "#8B5CF6",
                metric: "Menos tareas repetidas"
            },
            {
                kicker: "Arquitectura",
                title: "Sistemas a medida",
                description: "Paneles internos e integraciones diseñadas alrededor de la operación, no al revés.",
                tags: ["UX", "Cloud", "Integraciones"],
                accent: "#F59E0B",
                metric: "Hecho para tu flujo"
            },
            {
                kicker: "Inteligencia aplicada",
                title: "IA aplicada · Vito",
                description: "Asistentes y clasificación sobre inventario, citas, ventas y otros módulos del negocio.",
                tags: ["Vito", "LLMs", "Python"],
                accent: "#EC4899",
                metric: "Nube o servidor local"
            }
        ];

        section.style.minHeight = `${(services.length + 1.3) * 100}vh`;

        const nameEl = $("#services-name");
        const kickerEl = $("#services-kicker");
        const descriptionEl = $("#services-description");
        const tagsEl = $("#services-tags");
        const detailEl = $("#services-detail");
        const progressEl = $("#services-progress-fill");
        const servicesVitoEl = $("#services-vito");
        const sourceVito = hero ? $(".robot-logo-large", hero) : null;
        let servicesVito = null;

        // Servicios reutiliza el mismo SVG del hero para que Vito conserve
        // identidad visual, colores y expresiones en toda la landing.
        if (servicesVitoEl && sourceVito) {
            servicesVito = sourceVito.cloneNode(true);
            const idMap = new Map();
            servicesVito.querySelectorAll("[id]").forEach((element, index) => {
                const nextId = `${element.id}-services-${index}`;
                idMap.set(element.id, nextId);
                element.id = nextId;
            });
            servicesVito.querySelectorAll("*").forEach((element) => {
                ["fill", "stroke", "filter", "clip-path", "mask", "href", "xlink:href"].forEach((attribute) => {
                    const value = element.getAttribute(attribute);
                    if (!value) return;
                    const nextValue = value
                        .replace(/url\(#([^\)]+)\)/g, (match, id) => `url(#${idMap.get(id) || id})`)
                        .replace(/^#(.+)$/, (match, id) => `#${idMap.get(id) || id}`);
                    if (nextValue !== value) element.setAttribute(attribute, nextValue);
                });
            });
            servicesVito.dataset.mood = "vito";
            servicesVitoEl.appendChild(servicesVito);
        }

        if (prefersReduced || !window.THREE) {
            section.classList.add("services-static-mode");
            if (hero) {
                hero.style.opacity = "";
                hero.style.transform = "";
                hero.style.visibility = "";
            }
            return;
        }

        let scene;
        let camera;
        let renderer;
        let particleField;
        let cards = [];
        let targetProgress = 0;
        let smoothProgress = 0;
        let sectionTop = 0;
        let travel = 1;
        let visible = false;
        let lastIndex = -1;
        let raf = 0;
        let vitoIndex = -1;
        let vitoHandoffTimer = 0;
        const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
        const clock = new THREE.Clock();

        const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
        const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);

        const roundedRect = (ctx, x, y, w, h, r) => {
            const rr = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + rr, y);
            ctx.arcTo(x + w, y, x + w, y + h, rr);
            ctx.arcTo(x + w, y + h, x, y + h, rr);
            ctx.arcTo(x, y + h, x, y, rr);
            ctx.arcTo(x, y, x + w, y, rr);
            ctx.closePath();
        };

        const wrapText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) => {
            const words = text.split(/\s+/);
            let line = "";
            let lines = 0;
            for (let i = 0; i < words.length; i += 1) {
                const test = `${line}${words[i]} `;
                if (ctx.measureText(test).width > maxWidth && line && lines < maxLines - 1) {
                    ctx.fillText(line.trim(), x, y + lines * lineHeight);
                    line = `${words[i]} `;
                    lines += 1;
                } else {
                    line = test;
                }
            }
            if (line && lines < maxLines) ctx.fillText(line.trim(), x, y + lines * lineHeight);
        };

        const createCardTexture = (service, index) => {
            const texCanvas = document.createElement("canvas");
            texCanvas.width = 1024;
            texCanvas.height = 640;
            const ctx = texCanvas.getContext("2d");

            const bg = ctx.createLinearGradient(0, 0, 1024, 640);
            bg.addColorStop(0, "#10192d");
            bg.addColorStop(.55, "#081121");
            bg.addColorStop(1, "#040915");
            roundedRect(ctx, 4, 4, 1016, 632, 42);
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,.16)";
            ctx.lineWidth = 4;
            ctx.stroke();

            const glow = ctx.createRadialGradient(850, 70, 0, 850, 70, 380);
            glow.addColorStop(0, `${service.accent}55`);
            glow.addColorStop(1, "rgba(0,0,0,0)");
            roundedRect(ctx, 4, 4, 1016, 632, 42);
            ctx.fillStyle = glow;
            ctx.fill();

            ctx.fillStyle = service.accent;
            roundedRect(ctx, 48, 0, 220, 8, 4);
            ctx.fill();

            ["#ff5f57", "#febc2e", "#28c840"].forEach((color, dot) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(60 + dot * 30, 55, 9, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.textAlign = "right";
            ctx.fillStyle = "rgba(220,232,255,.42)";
            ctx.font = "700 25px ui-monospace, monospace";
            ctx.fillText(String(index + 1).padStart(2, "0"), 950, 64);

            ctx.textAlign = "left";
            ctx.fillStyle = service.accent;
            ctx.font = "800 21px ui-monospace, monospace";
            ctx.fillText(service.kicker.toUpperCase(), 58, 145);

            ctx.fillStyle = "#F6F8FF";
            ctx.font = "800 54px system-ui, sans-serif";
            wrapText(ctx, service.title, 58, 220, 790, 62, 2);

            ctx.fillStyle = "rgba(206,219,242,.72)";
            ctx.font = "400 27px system-ui, sans-serif";
            wrapText(ctx, service.description, 58, 345, 850, 40, 3);

            let tx = 58;
            service.tags.forEach((tag) => {
                ctx.font = "700 18px ui-monospace, monospace";
                const width = ctx.measureText(tag).width + 34;
                roundedRect(ctx, tx, 505, width, 44, 12);
                ctx.fillStyle = "rgba(255,255,255,.055)";
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,.12)";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = "rgba(235,242,255,.74)";
                ctx.fillText(tag, tx + 17, 534);
                tx += width + 12;
            });

            ctx.textAlign = "right";
            ctx.fillStyle = service.accent;
            ctx.font = "800 19px ui-monospace, monospace";
            ctx.fillText(service.metric, 950, 535);

            const texture = new THREE.CanvasTexture(texCanvas);
            texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            texture.needsUpdate = true;
            return texture;
        };

        const createParticles = () => {
            const count = window.innerWidth < 700 ? 420 : 900;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i += 1) {
                positions[i * 3] = (Math.random() - .5) * 38;
                positions[i * 3 + 1] = (Math.random() - .5) * 28;
                positions[i * 3 + 2] = (Math.random() - .5) * 26 - 2;
            }
            geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            return new THREE.Points(
                geometry,
                new THREE.PointsMaterial({
                    color: 0x4a8fff,
                    size: .045,
                    transparent: true,
                    opacity: .48,
                    blending: THREE.AdditiveBlending
                })
            );
        };

        const buildScene = () => {
            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x02050c, .032);

            camera = new THREE.PerspectiveCamera(43, 1, .1, 100);
            camera.position.set(0, 0, window.innerWidth < 640 ? 16.8 : 15.2);

            renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true,
                powerPreference: "high-performance"
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
            renderer.setClearColor(0x000000, 0);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.25;

            scene.add(new THREE.AmbientLight(0xffffff, .6));
            const key = new THREE.DirectionalLight(0xffffff, 2.4);
            key.position.set(7, 10, 12);
            scene.add(key);
            const blue = new THREE.PointLight(0x2B8AF7, 4.2, 26);
            blue.position.set(-8, 5, 4);
            scene.add(blue);
            const mint = new THREE.PointLight(0x00E5B0, 3.4, 24);
            mint.position.set(7, -5, 5);
            scene.add(mint);

            const cardWidth = window.innerWidth < 640 ? 3.55 : 4.65;
            const cardHeight = cardWidth * .625;
            services.forEach((service, index) => {
                const geometry = new THREE.PlaneGeometry(cardWidth, cardHeight, 24, 14);
                const base = new Float32Array(geometry.attributes.position.array);
                geometry.userData.base = base;
                const material = new THREE.MeshStandardMaterial({
                    map: createCardTexture(service, index),
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1,
                    metalness: .72,
                    roughness: .16
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.userData.index = index;
                mesh.userData.width = cardWidth;
                mesh.userData.height = cardHeight;
                cards.push(mesh);
                scene.add(mesh);
            });

            particleField = createParticles();
            scene.add(particleField);
            resize();
        };

        const updateLayoutMetrics = () => {
            const rect = section.getBoundingClientRect();
            sectionTop = window.scrollY + rect.top;
            travel = Math.max(1, section.offsetHeight - window.innerHeight);
            targetProgress = clamp((window.scrollY - sectionTop) / travel);
        };

        const resize = () => {
            const width = canvas.clientWidth || window.innerWidth;
            const height = canvas.clientHeight || window.innerHeight;
            renderer.setSize(width, height, false);
            camera.aspect = width / Math.max(1, height);
            camera.position.z = width < 640 ? 16.8 : 15.2;
            camera.updateProjectionMatrix();
            updateLayoutMetrics();
        };

        const renderServiceCopy = (index) => {
            if (index === lastIndex) return;
            lastIndex = index;
            const item = services[index];
            detailEl?.classList.add("is-changing");
            window.setTimeout(() => {
                if (nameEl) nameEl.textContent = item.title;
                if (kickerEl) kickerEl.textContent = item.kicker;
                if (descriptionEl) descriptionEl.textContent = item.description;
                if (tagsEl) tagsEl.innerHTML = item.tags.map((tag) => `<span>${tag}</span>`).join("");
                detailEl?.classList.remove("is-changing");
            }, 100);
        };

        const updateHeroExit = () => {
            if (!hero) return;
            const start = sectionTop - window.innerHeight * .72;
            const entry = clamp((window.scrollY - start) / (window.innerHeight * .72));
            hero.style.opacity = String(1 - entry);
            hero.style.transform = `translateY(${-entry * 70}px) scale(${1 - entry * .025})`;
            hero.style.pointerEvents = entry > .7 ? "none" : "";
            hero.style.visibility = entry > .995 ? "hidden" : "";
        };

        const onScrollServices = () => {
            targetProgress = clamp((window.scrollY - sectionTop) / travel);
            updateHeroExit();
        };

        const updateCards = (progress, elapsed) => {
            const serviceProgress = clamp(progress / .93);
            const activeFloat = serviceProgress * (services.length - 1);
            const activeIndex = Math.min(services.length - 1, Math.max(0, Math.round(activeFloat)));
            const exit = ease((progress - .93) / .07);
            renderServiceCopy(activeIndex);

            if (progressEl) progressEl.style.transform = `scaleX(${progress})`;

            cards.forEach((mesh, index) => {
                const delta = index - activeFloat;
                const angle = .55 - delta * 1.08;
                const radius = window.innerWidth < 640 ? 3.5 : 4.45;
                const mobile = window.innerWidth < 640;
                const x = Math.sin(angle) * radius + (mobile ? 0 : .25);
                const y = delta * (mobile ? 2.18 : 2.5) + Math.sin(angle * 1.4) * .45 - exit * 3.5;
                const z = Math.cos(angle) * radius - 1.15 - Math.abs(delta) * .25 - exit * 2.2;
                mesh.position.set(x, y, z);
                mesh.lookAt(camera.position.x, camera.position.y, camera.position.z);
                mesh.rotation.z += Math.sin(angle) * .12 + delta * .025;

                const focus = Math.exp(-Math.abs(delta) * .82);
                const scale = (.77 + focus * .22) * (1 - exit * .18);
                mesh.scale.setScalar(scale);
                const hasPassed = delta < -.42;
                const upcomingFade = clamp(1.18 - Math.max(0, delta) * .22);
                mesh.material.opacity = hasPassed ? 0 : clamp(upcomingFade * (1 - exit));
                mesh.visible = !hasPassed && mesh.material.opacity > .035 && delta < 4.25;

                const attr = mesh.geometry.attributes.position;
                const base = mesh.geometry.userData.base;
                const bend = .18 + (1 - focus) * .28 + Math.abs(targetProgress - smoothProgress) * 8;
                for (let i = 0; i < attr.count; i += 1) {
                    const bx = base[i * 3];
                    const xNorm = bx / mesh.userData.width;
                    const flex = -Math.pow(xNorm, 2) * bend + Math.sin(xNorm * Math.PI * 2 + elapsed * 2.1 + index) * .025;
                    attr.setZ(i, flex);
                }
                attr.needsUpdate = true;
            });

            if (servicesVito && servicesVitoEl) {
                // Vito está detrás de las tarjetas: se inclina hacia la que llega,
                // se endereza cuando el servicio queda fijo y da un pulso en cada relevo.
                const lean = activeFloat - Math.round(activeFloat);          // -0.5 → 0.5
                const locked = clamp(1 - Math.abs(lean) * 2);                // 1 = servicio asentado
                const thrust = clamp(Math.abs(targetProgress - smoothProgress) * 26);
                const breathe = Math.sin(elapsed * 1.15);

                servicesVitoEl.style.setProperty("--services-vito-x", `${lean * -34 - pointer.x * 16}px`);
                servicesVitoEl.style.setProperty("--services-vito-y", `${breathe * 7 + Math.abs(lean) * 18 - serviceProgress * 24 - exit * 40}px`);
                servicesVitoEl.style.setProperty("--services-vito-lean", `${lean * 7 + pointer.x * 2}deg`);
                servicesVitoEl.style.setProperty("--services-vito-scale", (1 + thrust * .05 - Math.abs(lean) * .07 - exit * .2).toFixed(3));
                servicesVitoEl.style.setProperty("--services-vito-charge", (thrust * .62 + locked * .38).toFixed(3));
                servicesVitoEl.style.setProperty("--services-vito-accent", services[activeIndex].accent);
                servicesVitoEl.style.opacity = String(Math.max(0, .96 - exit * .96));

                if (activeIndex !== vitoIndex) {
                    vitoIndex = activeIndex;
                    servicesVitoEl.classList.remove("is-handoff");
                    void servicesVitoEl.offsetWidth;                          // reinicia las animaciones del pulso
                    servicesVitoEl.classList.add("is-handoff");
                    window.clearTimeout(vitoHandoffTimer);
                    vitoHandoffTimer = window.setTimeout(() => servicesVitoEl.classList.remove("is-handoff"), 740);
                }
            }
        };

        const animateServices = () => {
            raf = requestAnimationFrame(animateServices);
            if (!visible) return;
            const elapsed = clock.getElapsedTime();
            pointer.x += (pointer.tx - pointer.x) * .045;
            pointer.y += (pointer.ty - pointer.y) * .045;
            smoothProgress += (targetProgress - smoothProgress) * .085;

            updateCards(smoothProgress, elapsed);
            camera.position.x += ((pointer.x * .72) - camera.position.x) * .035;
            camera.position.y += ((pointer.y * .48) - camera.position.y) * .035;
            camera.lookAt(0, 0, 0);
            if (particleField) {
                particleField.rotation.y = elapsed * .018 + smoothProgress * .2;
                particleField.rotation.x = smoothProgress * .08;
            }
            renderer.render(scene, camera);
        };

        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) updateLayoutMetrics();
        }, { rootMargin: "120px 0px" });
        observer.observe(section);

        window.addEventListener("scroll", onScrollServices, { passive: true });
        window.addEventListener("resize", resize, { passive: true });
        window.addEventListener("pointermove", (event) => {
            if (!visible) return;
            pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.ty = -((event.clientY / window.innerHeight) * 2 - 1);
        }, { passive: true });

        try {
            buildScene();
            updateLayoutMetrics();
            updateHeroExit();
            visible = section.getBoundingClientRect().top < window.innerHeight && section.getBoundingClientRect().bottom > 0;
            animateServices();
        } catch (error) {
            console.warn("Servicios 3D no disponible; se usa la versión estática.", error);
            cancelAnimationFrame(raf);
            section.classList.add("services-static-mode");
            if (hero) {
                hero.style.opacity = "";
                hero.style.transform = "";
                hero.style.visibility = "";
                hero.style.pointerEvents = "";
            }
        }
    };

    initServicesParallax();

    /* ─── Tecnología: slider horizontal y transición de Vito al dock ─── */
    const initTechJourney = () => {
        const section = $("#tecnologia");
        const sticky = $("#tech-sticky");
        const track = $("#tech-slider-track");
        const windowEl = $("#tech-slider-window");
        const phases = $$('[data-tech-phase]', section || document);
        const dots = $$("#tech-progress-dots i");
        const pathFill = $("#tech-path-fill");
        const home = $("#journey-vito-home");
        const vito = $("#journey-vito");
        const dock = $("#vito-dock-slot");
        const vitoSection = $("#vito");
        if (!section || !sticky || !track || !windowEl || !home || !vito || !dock || !vitoSection || !phases.length) return;

        section.style.minHeight = `${(phases.length + 1.55) * 100}vh`;
        let activeIndex = -1;
        let state = "home";
        let ticking = false;

        const clamp01 = (value) => Math.max(0, Math.min(1, value));
        const setState = (next) => {
            if (state === next) return;
            state = next;
            vito.classList.remove("is-travelling", "is-following", "is-docked");
            if (next === "home") {
                home.appendChild(vito);
                vito.classList.add("is-travelling");
            } else if (next === "follow") {
                document.body.appendChild(vito);
                vito.classList.add("is-following");
            } else {
                dock.appendChild(vito);
                vito.classList.add("is-docked");
            }
        };

        const update = () => {
            ticking = false;
            const rect = section.getBoundingClientRect();
            const travel = Math.max(1, rect.height - window.innerHeight);
            const progress = clamp01(-rect.top / travel);
            const sliderProgress = clamp01(progress / .79);
            const maxShift = Math.max(0, track.scrollWidth - windowEl.clientWidth);
            track.style.transform = `translate3d(${-maxShift * sliderProgress}px,0,0)`;
            if (pathFill) pathFill.style.transform = `scaleX(${sliderProgress})`;

            const floatIndex = sliderProgress * (phases.length - 1);
            const nextIndex = Math.max(0, Math.min(phases.length - 1, Math.round(floatIndex)));
            if (nextIndex !== activeIndex) {
                activeIndex = nextIndex;
                phases.forEach((phase, index) => phase.classList.toggle("is-active", index === activeIndex));
                dots.forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
            }

            const vitoSectionRect = vitoSection.getBoundingClientRect();
            if (vitoSectionRect.top <= window.innerHeight * .72 && vitoSectionRect.bottom > 0) {
                setState("dock");
            } else if (progress >= .82 || rect.bottom <= window.innerHeight * 1.12) {
                setState("follow");
            } else {
                setState("home");
            }

            if (state === "home") {
                const x = 7 + sliderProgress * 70;
                const y = 32 + Math.sin(sliderProgress * Math.PI * 3) * 4;
                vito.style.setProperty("--journey-x", `${x}vw`);
                vito.style.setProperty("--journey-y", `${y}vh`);
                vito.style.setProperty("--journey-tilt", `${Math.sin(sliderProgress * Math.PI * 4) * 7}deg`);
            }
        };

        const requestUpdate = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        };

        vito.classList.add("is-travelling");
        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate, { passive: true });
        requestUpdate();
    };

    initTechJourney();

    /* ─── Vito: conversación de análisis y orden de compra ─── */
    const initVitoChat = () => {
        const demo = $("#vito-chat-demo");
        if (!demo) return;
        const steps = $$('[data-chat-step]', demo);
        let timers = [];
        let loopTimer = 0;

        const clearSequence = () => {
            timers.forEach(clearTimeout);
            timers = [];
            clearTimeout(loopTimer);
        };

        const play = () => {
            clearSequence();
            steps.forEach((step) => step.classList.remove("is-visible"));
            if (prefersReduced) {
                steps.forEach((step) => step.classList.add("is-visible"));
                return;
            }
            const delays = [180, 1250, 2450, 5600, 6900];
            steps.forEach((step, index) => {
                timers.push(setTimeout(() => step.classList.add("is-visible"), delays[index]));
            });
            loopTimer = setTimeout(play, 12000);
        };

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) play();
            else clearSequence();
        }, { threshold: .28 });
        observer.observe(demo);
    };

    initVitoChat();


    /* ─── Equipo: tap en móvil ─── */
    $$(".team-card").forEach((card) => {
        card.addEventListener("click", (e) => {
            // Solo toggle en puntero grueso / touch
            if (window.matchMedia("(hover: hover)").matches) return;
            e.preventDefault();
            const open = card.classList.contains("is-open");
            $$(".team-card.is-open").forEach((c) => c.classList.remove("is-open"));
            if (!open) card.classList.add("is-open");
        });
    });

    /* ─── Carrusel infinito de planes en móvil ─── */
    const setupMobilePricingCarousel = () => {
        const grid = $(".precios-grid");
        if (!grid) return;

        const media = window.matchMedia("(max-width: 740px)");
        const originals = $$(".precio-card:not([data-carousel-clone])", grid);
        if (originals.length < 2) return;

        let state = null;

        const prepareClone = (card) => {
            card.dataset.carouselClone = "true";
            card.setAttribute("aria-hidden", "true");
            card.classList.add("is-visible");
            card.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((element) => {
                element.tabIndex = -1;
            });
            return card;
        };

        const start = () => {
            if (state || !media.matches) return;

            const business = originals.find((card) => card.dataset.plan === "business");
            const ordered = business
                ? [business, ...originals.filter((card) => card !== business)]
                : [...originals];
            grid.classList.add("is-looping");
            ordered.forEach((card) => grid.appendChild(card));

            const before = prepareClone(ordered[ordered.length - 1].cloneNode(true));
            const after = prepareClone(ordered[0].cloneNode(true));
            grid.insertBefore(before, ordered[0]);
            grid.appendChild(after);

            // Las tarjetas asoman a los lados y se anclan al centro de la pista,
            // así que todas las medidas se hacen sobre centros, no sobre bordes.
            const centerOf = (item) => item.offsetLeft + item.offsetWidth / 2 - grid.clientWidth / 2;
            const nearestIndex = () => {
                const items = [...grid.children];
                return items.reduce((closest, item, index) => {
                    const distance = Math.abs(centerOf(item) - grid.scrollLeft);
                    const closestDistance = Math.abs(centerOf(items[closest]) - grid.scrollLeft);
                    return distance < closestDistance ? index : closest;
                }, 0);
            };
            const jumpTo = (item) => {
                grid.scrollTo({ left: centerOf(item), behavior: "auto" });
            };
            const settle = () => {
                const index = nearestIndex();
                if (index === 0) jumpTo(ordered[ordered.length - 1]);
                if (index === grid.children.length - 1) jumpTo(ordered[0]);
            };
            const onScroll = () => {
                clearTimeout(state?.settleTimer);
                state.settleTimer = window.setTimeout(settle, 90);
            };

            grid.addEventListener("scroll", onScroll, { passive: true });
            state = { before, after, onScroll, settleTimer: 0 };
            requestAnimationFrame(() => jumpTo(ordered[0]));
        };

        const stop = () => {
            if (!state) return;
            clearTimeout(state.settleTimer);
            grid.removeEventListener("scroll", state.onScroll);
            state.before.remove();
            state.after.remove();
            originals.forEach((card) => grid.appendChild(card));
            grid.classList.remove("is-looping");
            grid.scrollTo({ left: 0, behavior: "auto" });
            state = null;
        };

        const sync = () => {
            if (media.matches) start();
            else stop();
        };

        sync();
        if (media.addEventListener) media.addEventListener("change", sync);
        else media.addListener(sync);
    };
    setupMobilePricingCarousel();

    /* ─── Tooltips de planes ─── */
    const tip = $("#tip-bubble");
    const showTip = (el, text, x, y) => {
        if (!tip) return;
        tip.textContent = text;
        tip.hidden = false;
        const pad = 12;
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        let left = x + 12;
        let top = y - th - 10;
        if (left + tw > window.innerWidth - pad) left = window.innerWidth - tw - pad;
        if (top < pad) top = y + 18;
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
    };
    const hideTip = () => {
        if (tip) tip.hidden = true;
    };
    $$(".has-tip").forEach((el) => {
        el.addEventListener("pointerenter", (e) => showTip(el, el.dataset.tip || "", e.clientX, e.clientY));
        el.addEventListener("pointermove", (e) => {
            if (tip && !tip.hidden) showTip(el, el.dataset.tip || "", e.clientX, e.clientY);
        });
        el.addEventListener("pointerleave", hideTip);
        el.addEventListener("focus", () => {
            const r = el.getBoundingClientRect();
            showTip(el, el.dataset.tip || "", r.left + r.width / 2, r.top);
        });
        el.addEventListener("blur", hideTip);
    });

    /* ─── Contador de precios ─── */
    const animateCount = (el) => {
        const target = Number(el.dataset.countTo || el.textContent);
        if (!Number.isFinite(target)) return;
        if (prefersReduced) {
            el.textContent = String(target);
            return;
        }
        const start = performance.now();
        const duration = 700;
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            el.textContent = String(Math.round(target * (1 - (1 - t) ** 3)));
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };
    const priceObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.querySelectorAll("[data-count-to]").forEach(animateCount);
            priceObs.unobserve(e.target);
        });
    }, { threshold: 0.3 });
    $$(".precio-card").forEach((c) => priceObs.observe(c));

    /* ─── Planes + contacto (selección, ventajas, autorelleno) ─── */
    const PLANS = {
        starter: {
            id: "starter",
            name: "Starter",
            price: "$19 USD/mes",
            features: [
                "Sistema personalizado",
                "Soporte y correcciones",
                "Actualizaciones mensuales",
                "Mejoras menores",
                "Capacitación básica"
            ]
        },
        business: {
            id: "business",
            name: "Business",
            price: "$49 USD/mes",
            features: [
                "Todo Starter",
                "Infraestructura administrada",
                "Biblioteca de módulos",
                "Alta disponibilidad",
                "Optimización continua",
                "Escalabilidad incluida"
            ]
        },
        enterprise: {
            id: "enterprise",
            name: "Enterprise IA",
            price: "$99 USD/mes",
            features: [
                "Todo Business",
                "Vito integrado",
                "Automatización con IA",
                "Alertas y predicciones",
                "IA en la nube o local",
                "Datos bajo tu control"
            ]
        }
    };
    const PLAN_PROMISE = "En poco tiempo nuestro equipo te contactará para llevar a cabo tu idea.";

    const form = $("#lead-form");
    const note = $("#form-note");
    const success = $("#form-success");
    const successText = $("#form-success-text");
    const planSummary = $("#plan-summary");
    const planSummaryName = $("#plan-summary-name");
    const planSummaryPrice = $("#plan-summary-price");
    const planSummaryList = $("#plan-summary-list");
    const planPromise = $("#plan-promise");

    const getSelectedPlanId = () => {
        const checked = form?.querySelector('input[name="plan"]:checked');
        return checked?.value || "business";
    };

    const renderPlanSummary = (planId, { flash = false } = {}) => {
        const plan = PLANS[planId] || PLANS.business;
        if (planSummary) planSummary.dataset.plan = plan.id;
        if (planSummaryName) planSummaryName.textContent = plan.name;
        if (planSummaryPrice) planSummaryPrice.textContent = plan.price;
        if (planSummaryList) {
            planSummaryList.innerHTML = plan.features
                .map((f) => `<li>${f}</li>`)
                .join("");
        }
        if (planPromise) planPromise.textContent = PLAN_PROMISE;
        if (flash && planSummary && !prefersReduced) {
            planSummary.classList.remove("is-flash");
            void planSummary.offsetWidth;
            planSummary.classList.add("is-flash");
        }
    };

    const selectPlan = (planId, { flash = false } = {}) => {
        const id = PLANS[planId] ? planId : "business";
        const radio = form?.querySelector(`input[name="plan"][value="${id}"]`);
        if (radio) radio.checked = true;
        renderPlanSummary(id, { flash });
        return id;
    };

    // Cambio de plan dentro del formulario
    form?.querySelectorAll('input[name="plan"]').forEach((input) => {
        input.addEventListener("change", () => {
            if (input.checked) renderPlanSummary(input.value, { flash: true });
        });
    });

    // Botones de precios → autorellenar plan y saltar a contacto
    $$(".precio-btn[data-plan]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const planId = btn.getAttribute("data-plan");
            if (!planId || !PLANS[planId]) return;
            e.preventDefault();
            selectPlan(planId, { flash: true });
            const target = $("#contacto");
            if (target) {
                target.scrollIntoView({
                    behavior: prefersReduced ? "auto" : "smooth",
                    block: "start"
                });
            }
            // Foco amable al nombre tras el scroll
            setTimeout(() => {
                $("#name")?.focus({ preventScroll: true });
            }, prefersReduced ? 0 : 450);
        });
    });

    // Estado inicial (Business recomendado)
    selectPlan(getSelectedPlanId());
    if (planPromise) planPromise.textContent = PLAN_PROMISE;

    /* ─── Formulario ─── */
    form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const name = String(data.get("name") || "").trim();
        const email = String(data.get("email") || "").trim();
        const message = String(data.get("message") || "").trim();
        const planId = String(data.get("plan") || getSelectedPlanId());
        const plan = PLANS[planId] || PLANS.business;

        if (!name || !email || !message) {
            if (note) {
                note.textContent = "Completa todos los campos.";
                note.style.color = "var(--warn)";
            }
            return;
        }
        if (!data.get("plan")) {
            if (note) {
                note.textContent = "Elige un plan para continuar.";
                note.style.color = "var(--warn)";
            }
            return;
        }

        if (note) note.textContent = "";
        if (successText) {
            successText.textContent = `Plan ${plan.name} (${plan.price}). Se abrirá tu correo para enviar la solicitud; si no se abre, escríbenos al +504 8777-5824.`;
        }
        if (success) success.hidden = false;

        try {
            const subject = encodeURIComponent(`ONDIGITAL · Plan ${plan.name}`);
            const body = encodeURIComponent(
                `Hola ONDIGITAL,\n\nSoy ${name} (${email}).\n\nPlan de interés: ${plan.name} (${plan.price})\n\nProyecto:\n${message}`
            );
            form.dataset.mailto = `mailto:hola@ondigital.hn?subject=${subject}&body=${body}`;
            window.location.href = form.dataset.mailto;
        } catch (_) { /* ignore */ }
    });

    /* ─── Anclas suaves ─── */
    $$('a[href^="#"]').forEach((a) => {
        a.addEventListener("click", (e) => {
            // Los botones de plan ya manejan su propio scroll
            if (a.classList.contains("precio-btn") && a.hasAttribute("data-plan")) return;
            const href = a.getAttribute("href");
            if (!href || href === "#") return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({
                behavior: prefersReduced ? "auto" : "smooth",
                block: "start"
            });
        });
    });
})();
