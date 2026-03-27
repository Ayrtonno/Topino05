export function qs<T extends Element>(selector: string, parent: ParentNode = document): T {
    return parent.querySelector(selector) as T;
}

export function qsa<T extends Element>(selector: string, parent: ParentNode = document): T[] {
    return Array.from(parent.querySelectorAll(selector)) as T[];
}

export function setActiveNav() {
    const page = document.body.getAttribute("data-page");
    qsa<HTMLAnchorElement>(".nav a").forEach((link) => {
        if (link.dataset.page === page) {
            link.classList.add("active");
        }
    });
}

export function showMessage(text: string, type: "success" | "error" = "success") {
    const msg = document.getElementById("message");
    if (!msg) return;
    msg.className = `message ${type}`;
    msg.textContent = text;
}

export function clearMessage(delayMs = 2000) {
    const msg = document.getElementById("message");
    if (!msg) return;
    setTimeout(() => {
        msg.className = "message";
        msg.textContent = "";
    }, delayMs);
}

export function formatDate(dateIso: string) {
    if (!dateIso) return "-";
    try {
        return new Date(dateIso).toLocaleDateString();
    } catch {
        return "-";
    }
}

export function formatCurrency(value: number, decimals = 2) {
    const formatted = value.toLocaleString("it-IT", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    return `${formatted}€`;
}

type PopupRegistry = Record<string, Window | null>;
type PopupLocks = Record<string, number>;

declare global {
    interface Window {
        __topinoPopupRegistry?: PopupRegistry;
        __topinoPopupLocks?: PopupLocks;
    }
}

export function openSingletonWindow(
    key: string,
    url: string,
    features: string,
    throttleMs = 450,
) {
    const now = Date.now();
    if (!window.__topinoPopupLocks) {
        window.__topinoPopupLocks = {};
    }
    const lastOpen = window.__topinoPopupLocks[key] || 0;
    if (now - lastOpen < throttleMs) {
        const existingFast = window.__topinoPopupRegistry?.[key];
        if (existingFast && !existingFast.closed) {
            existingFast.focus();
            return existingFast;
        }
        return null;
    }
    window.__topinoPopupLocks[key] = now;

    if (!window.__topinoPopupRegistry) {
        window.__topinoPopupRegistry = {};
    }
    const existing = window.__topinoPopupRegistry[key];
    if (existing && !existing.closed) {
        existing.focus();
        existing.location.href = url;
        return existing;
    }

    const popupName = `topino-${key}`;
    const win = window.open(url, popupName, features);
    if (win) {
        window.__topinoPopupRegistry[key] = win;
        win.addEventListener("beforeunload", () => {
            if (window.__topinoPopupRegistry?.[key] === win) {
                window.__topinoPopupRegistry[key] = null;
            }
        });
    }
    return win;
}

function initSidebarBunnyBounce() {
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    if (!sidebar) return;

    sidebar.addEventListener("mouseenter", () => {
        sidebar.classList.add("bunny-bounce");
    });

    sidebar.addEventListener("mouseleave", () => {
        sidebar.classList.remove("bunny-bounce");
    });
}

setActiveNav();
initSidebarBunnyBounce();
