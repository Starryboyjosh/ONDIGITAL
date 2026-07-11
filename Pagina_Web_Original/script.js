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
    const heroMouth = $(".robot-logo-large .robot-mouth-large");
    const pupils = $$(".robot-logo-large .robot-pupil");
    const eyeGroups = $$(".robot-logo-large .robot-eye-group");
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
            price: "$99 USD/mes",
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
            price: "$149 USD/mes",
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
            name: "Enterprise AI",
            price: "$199 USD/mes",
            features: [
                "Todo Business",
                "Vito integrado",
                "Automatización con IA",
                "Alertas y predicciones",
                "IA nube o local",
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

        form.querySelectorAll("input, textarea, button[type=submit]").forEach((el) => {
            el.disabled = true;
        });
        if (note) note.textContent = "";
        if (successText) {
            successText.textContent = `Plan ${plan.name} (${plan.price}). ${PLAN_PROMISE}`;
        }
        if (success) success.hidden = false;

        try {
            const subject = encodeURIComponent(`ONDIGITAL · Plan ${plan.name}`);
            const body = encodeURIComponent(
                `Hola ONDIGITAL,\n\nSoy ${name} (${email}).\n\nPlan de interés: ${plan.name} (${plan.price})\n\nProyecto:\n${message}`
            );
            form.dataset.mailto = `mailto:hola@ondigital.hn?subject=${subject}&body=${body}`;
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
