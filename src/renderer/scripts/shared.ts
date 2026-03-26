export function qs<T extends HTMLElement>(selector: string, parent: ParentNode = document): T {
    return parent.querySelector(selector) as T;
}

export function qsa<T extends HTMLElement>(selector: string, parent: ParentNode = document): T[] {
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
    try {
        return new Date(dateIso).toLocaleDateString();
    } catch {
        return "-";
    }
}

setActiveNav();
