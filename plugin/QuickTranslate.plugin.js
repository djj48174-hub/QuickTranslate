/**
 * @name QuickTranslate
 * @author ijl
 * @description One-click translator: hit the 🌐 button next to the message box to send your message translated, and hover any message to translate it in place. (واجهة عربية)
 * @version 1.0.0
 * @source https://github.com/djj48174-hub/QuickTranslate
 * @website https://github.com/djj48174-hub/QuickTranslate
 */

/* eslint-disable no-empty */

"use strict";

// ---------------------------------------------------------------------------
// اللغة المدعومة
// ---------------------------------------------------------------------------
const LANGUAGE_LIST = [
    ["ar", "العربية"],
    ["en", "الإنجليزية"],
    ["fr", "الفرنسية"],
    ["es", "الإسبانية"],
    ["de", "الألمانية"],
    ["tr", "التركية"],
    ["ru", "الروسية"],
    ["it", "الإيطالية"],
    ["pt", "البرتغالية"],
    ["nl", "الهولندية"],
    ["pl", "البولندية"],
    ["uk", "الأوكرانية"],
    ["ro", "الرومانية"],
    ["el", "اليونانية"],
    ["sv", "السويدية"],
    ["da", "الدنماركية"],
    ["no", "النرويجية"],
    ["fi", "الفنلندية"],
    ["cs", "التشيكية"],
    ["sk", "السلوفاكية"],
    ["hu", "الهنغارية"],
    ["bg", "البلغارية"],
    ["sr", "الصربية"],
    ["hr", "الكرواتية"],
    ["sl", "السلوفينية"],
    ["bs", "البوسنية"],
    ["mk", "المقدونية"],
    ["sq", "الألبانية"],
    ["lt", "الليتوانية"],
    ["lv", "اللاتفية"],
    ["et", "الإستونية"],
    ["is", "الأيسلندية"],
    ["he", "العبرية"],
    ["fa", "الفارسية"],
    ["ur", "الأردية"],
    ["ps", "الباشتو"],
    ["ku", "الكردية"],
    ["sd", "السندية"],
    ["yi", "اليديشية"],
    ["hi", "الهندية"],
    ["bn", "البنغالية"],
    ["ta", "التاميلية"],
    ["te", "التيلوغوية"],
    ["ml", "المالايالامية"],
    ["mr", "الماراثية"],
    ["gu", "الغوجاراتية"],
    ["kn", "الكانادية"],
    ["pa", "البنجابية"],
    ["ne", "النيبالية"],
    ["si", "السنهالية"],
    ["zh-CN", "الصينية (مبسطة)"],
    ["zh-TW", "الصينية (تقليدية)"],
    ["ja", "اليابانية"],
    ["ko", "الكورية"],
    ["th", "التايلاندية"],
    ["vi", "الفيتنامية"],
    ["id", "الإندونيسية"],
    ["ms", "الماليزية"],
    ["fil", "الفلبينية"],
    ["jv", "الجاوية"],
    ["su", "السوندية"],
    ["my", "البورمية"],
    ["km", "الخميرية"],
    ["lo", "اللاوية"],
    ["ka", "الجورجية"],
    ["hy", "الأرمنية"],
    ["az", "الأذربيجانية"],
    ["kk", "الكازاخية"],
    ["uz", "الأوزبكية"],
    ["ky", "القيرغيزية"],
    ["tg", "الطاجيكية"],
    ["mn", "المنغولية"],
    ["am", "الأمهرية"],
    ["sw", "السواحيلية"],
    ["so", "الصومالية"],
    ["ha", "الهوسا"],
    ["yo", "اليوروبا"],
    ["ig", "الإيغبو"],
    ["zu", "الزولو"],
    ["af", "الأفريكانية"],
    ["ca", "الكتالونية"],
    ["eu", "الباسكية"],
    ["gl", "الجاليكية"],
    ["cy", "الويلزية"],
    ["ga", "الأيرلندية"],
    ["mt", "المالطية"],
    ["la", "اللاتينية"],
    ["eo", "الإسبرانتو"],
    ["ht", "الهايتية"],
    ["ceb", "السيبوانية"],
    ["mi", "الماورية"],
    ["haw", "الهاوائية"]
];

const LANGUAGES = LANGUAGE_LIST.map(([code, label]) => ({ code, label }));

const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "ps", "sd", "yi", "ku", "dv"]);

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const MAX_CHUNK = 1200;

// ---------------------------------------------------------------------------
// دوال نقية (تختبر بلا ديسكورد)
// ---------------------------------------------------------------------------
function buildUrl(text, target, source) {
    const params = [
        "client=gtx",
        "dt=t",
        "sl=" + encodeURIComponent(source || "auto"),
        "tl=" + encodeURIComponent(target),
        "q=" + encodeURIComponent(text)
    ];
    return ENDPOINT + "?" + params.join("&");
}

function parseGoogleResponse(data) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error("رد غير مفهوم من خدمة الترجمة");
    }
    const text = data[0]
        .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
        .filter(Boolean)
        .join("");
    let detected = typeof data[2] === "string" ? data[2] : null;
    if (!detected && Array.isArray(data[8]) && Array.isArray(data[8][0])) {
        detected = data[8][0][0] || null;
    }
    if (!text) throw new Error("ما رجعت ترجمة");
    return { text, detected };
}

function isRtl(code) {
    if (!code) return false;
    return RTL_LANGS.has(String(code).split("-")[0].toLowerCase());
}

function languageLabel(code) {
    if (code === "auto") return "تلقائي";
    const found = LANGUAGES.find((l) => l.code === code);
    return found ? found.label : code;
}

function chunkText(text, max) {
    const limit = max || MAX_CHUNK;
    const parts = [];
    let rest = String(text);
    while (rest.length > limit) {
        let cut = rest.lastIndexOf("\n", limit);
        if (cut < limit * 0.5) cut = rest.lastIndexOf(" ", limit);
        if (cut < limit * 0.5) cut = limit;
        parts.push(rest.slice(0, cut));
        rest = rest.slice(cut);
    }
    if (rest) parts.push(rest);
    return parts;
}

function looksTranslatable(text) {
    const value = String(text || "").trim();
    if (!value) return false;
    if (value.length > 6000) return false;
    return /[\p{L}\p{N}]/u.test(value);
}

function hasArabic(text) {
    return /[\u0600-\u06FF]/.test(String(text || ""));
}

// ---------------------------------------------------------------------------
// البلجن
// ---------------------------------------------------------------------------
const PLUGIN_ID = "QuickTranslate";
const STYLE_ID = "QuickTranslateStyles";
const DEFAULTS = {
    sendTo: "en",
    readTo: "ar",
    autoSend: true,
    showMessageButton: true
};

const CSS = `
.qt-input-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin: 0 2px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--interactive-normal);
    font-size: 17px;
    line-height: 1;
    user-select: none;
    transition: background 120ms ease, color 120ms ease, transform 120ms ease;
}
.qt-input-btn:hover { background: var(--background-modifier-hover); color: var(--interactive-hover); }
.qt-input-btn:active { transform: scale(0.92); }
.qt-input-btn.qt-busy { opacity: 0.55; animation: qt-pulse 900ms ease-in-out infinite; }
.qt-input-btn.qt-ok { color: #23a55a; }
.qt-input-btn.qt-err { color: #f23f43; }
@keyframes qt-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }

.qt-msg-btn {
    display: none;
    margin-inline-start: 6px;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--background-modifier-hover);
    color: var(--text-muted);
    font-size: 11px;
    line-height: 16px;
    cursor: pointer;
    vertical-align: middle;
    user-select: none;
    white-space: nowrap;
}
.qt-msg-btn:hover { color: var(--text-normal); background: var(--background-modifier-selected, var(--background-modifier-hover)); }
.qt-host:hover .qt-msg-btn, .qt-msg-btn.qt-visible { display: inline-block; }

.qt-translation {
    margin: 5px 0 2px;
    padding: 6px 10px;
    border-inline-start: 3px solid var(--brand-experiment, #5865f2);
    border-radius: 3px;
    background: var(--background-modifier-hover);
    color: var(--text-normal);
    font-size: 0.9375rem;
    line-height: 1.375rem;
    white-space: pre-wrap;
    word-break: break-word;
    width: fit-content;
    max-width: 100%;
}
.qt-translation.qt-rtl { direction: rtl; }
.qt-translation .qt-meta {
    display: block;
    margin-bottom: 2px;
    color: var(--text-muted);
    font-size: 11px;
    line-height: 14px;
    direction: ltr;
    unicode-bidi: plaintext;
}
.qt-translation .qt-meta .qt-close { cursor: pointer; margin-inline-start: 6px; }
.qt-translation .qt-meta .qt-close:hover { color: var(--text-danger, #f23f43); }
.qt-translation.qt-loading { color: var(--text-muted); font-style: italic; }
.qt-translation.qt-error { border-inline-start-color: #f23f43; color: var(--text-danger, #f23f43); }

.qt-menu {
    position: fixed;
    z-index: 10000;
    min-width: 268px;
    padding: 12px;
    border: 1px solid var(--background-modifier-accent, #4f545c);
    border-radius: 8px;
    background: var(--background-floating, #18191c);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
    color: var(--text-normal);
    font-size: 13px;
    direction: rtl;
    text-align: right;
}
.qt-menu .qt-title { margin-bottom: 10px; font-weight: 700; font-size: 14px; }
.qt-menu .qt-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.qt-menu select, .qt-panel select {
    flex: 1;
    min-width: 0;
    padding: 5px 6px;
    border: 1px solid var(--background-modifier-accent, #4f545c);
    border-radius: 4px;
    background: var(--background-secondary, #2f3136);
    color: var(--text-normal);
    font-family: inherit;
    font-size: 13px;
}
.qt-menu label.qt-check, .qt-panel label.qt-check { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.qt-menu .qt-hint { margin-top: 10px; color: var(--text-muted); font-size: 11px; line-height: 15px; }
.qt-panel { direction: rtl; text-align: right; color: var(--text-normal); font-size: 14px; }
.qt-panel .qt-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.qt-panel .qt-hint { color: var(--text-muted); font-size: 12px; line-height: 18px; }
`;

function log(...args) {
    try {
        console.log("%c[QuickTranslate]", "color:#5865f2;font-weight:bold", ...args);
    } catch (e) { /* ignore */ }
}

function findChannelId() {
    try {
        const match = location.pathname.match(/channels\/(\d+|@me)\/(\d+)/);
        return match ? match[2] : null;
    } catch (e) {
        return null;
    }
}

// ─── محرر Slate (مربع الرسالة) ───────────────────────────────────────────────
// تنبيه مهم: أي تعديل مباشر على DOM المحرر (execCommand / تغيير التحديد) يخرب
// حالة Slate الداخلية، فتصير الكتابة تشتغل بس الحذف (Backspace) يتعطل.
// الطريقة الصحيحة الوحيدة: التعديل عبر واجهة Slate نفسها.

function isSlateEditor(candidate) {
    return !!candidate && typeof candidate === "object" &&
        typeof candidate.apply === "function" &&
        typeof candidate.insertText === "function" &&
        typeof candidate.deleteFragment === "function" &&
        Array.isArray(candidate.children) &&
        typeof candidate.isInline === "function";
}

// وصل محرر Slate عن طريق شجرة React المربوطة بعنصر المحرر
function findSlateEditor(element) {
    if (!element) return null;
    try {
        const key = Object.keys(element).find(
            (name) => name.startsWith("__reactFiber$") || name.startsWith("__reactInternalInstance$")
        );
        let fiber = key ? element[key] : null;
        let depth = 0;
        while (fiber && depth < 80) {
            const props = fiber.memoizedProps;
            if (props && typeof props === "object") {
                if (isSlateEditor(props.editor)) return props.editor;
                for (const value of Object.values(props)) {
                    if (isSlateEditor(value)) return value;
                }
            }
            const owner = fiber.stateNode;
            if (owner && typeof owner === "object") {
                if (isSlateEditor(owner.editor)) return owner.editor;
                for (const value of Object.values(owner)) {
                    if (isSlateEditor(value)) return value;
                }
            }
            fiber = fiber.return;
            depth += 1;
        }
    } catch (e) {
        log("findSlateEditor", e);
    }
    return null;
}

function slateText(editor) {
    try {
        return editor.children
            .map((node) => (node.children || [])
                .map((leaf) => (typeof leaf.text === "string" ? leaf.text : ""))
                .join(""))
            .join("\n");
    } catch (e) {
        return null;
    }
}

function slateFullRange(editor) {
    const last = editor.children.length - 1;
    const node = editor.children[last] || { children: [] };
    const leaves = node.children || [];
    const index = Math.max(0, leaves.length - 1);
    const leaf = leaves[index] || {};
    return {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [last, index], offset: typeof leaf.text === "string" ? leaf.text.length : 0 }
    };
}

// استبدال محتوى المربع كامل (نص فاضي = تنظيف)
function slateReplace(editor, text) {
    try {
        const range = slateFullRange(editor);
        const run = () => {
            editor.selection = range;
            if (text) editor.insertText(text);
            else editor.deleteFragment();
        };
        if (typeof editor.withoutNormalizing === "function") editor.withoutNormalizing(run);
        else run();
        // نخلي Slate يعيد مزامنة التحديد مع DOM — بدونها ممكن يتعطّل الحذف
        if (typeof editor.onChange === "function") editor.onChange();
        return true;
    } catch (e) {
        log("slateReplace", e);
        return false;
    }
}

module.exports = class QuickTranslate {
    constructor(meta) {
        this.meta = meta;
        this.settings = Object.assign({}, DEFAULTS);
        this.cache = new Map();      // مفتاح: نص+لغة  ->  الترجمة
        this.results = new Map();    // مفتاح: معرّف الرسالة -> { text, source, target, rtl }
        this.shown = new Set();      // الرسائل المعروضة ترجمتها
        this.pending = new Set();
        this.inputButton = null;
        this.menu = null;
        this.slateEditor = null;
        this.slateEditorElement = null;
        this.interval = null;
        this._onOver = null;
        this._onDocClick = null;
        this._onKey = null;
    }

    // ---------------------------------------------------------------- الحياة
    start() {
        this.loadSettings();
        this.injectStyles();

        // مرجع للتشخيص (BdApi/console)
        try { window.__QuickTranslate = this; } catch (e) { /* ignore */ }

        this._onOver = (event) => {
            try { this.handleMouseOver(event); } catch (e) { log("mouseover", e); }
        };
        document.addEventListener("mouseover", this._onOver, true);

        this._onDocClick = (event) => {
            if (this.menu && !this.menu.contains(event.target)) this.closeMenu();
        };
        document.addEventListener("mousedown", this._onDocClick, true);

        this._onKey = (event) => {
            if (event.key === "Escape" && this.menu) this.closeMenu();
        };
        document.addEventListener("keydown", this._onKey, true);

        this.ensureInputButton();
        this.interval = setInterval(() => {
            try {
                this.ensureInputButton();
                if (this.menu && !document.body.contains(this.menu)) this.menu = null;
            } catch (e) { /* ignore */ }
        }, 1500);

        log("بدأ — لغة الإرسال:", this.settings.sendTo, "لغة العرض:", this.settings.readTo);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;

        if (this._onOver) document.removeEventListener("mouseover", this._onOver, true);
        if (this._onDocClick) document.removeEventListener("mousedown", this._onDocClick, true);
        if (this._onKey) document.removeEventListener("keydown", this._onKey, true);

        this.closeMenu();

        document.querySelectorAll(".qt-msg-btn, .qt-translation").forEach((el) => el.remove());
        document.querySelectorAll(".qt-host").forEach((el) => el.classList.remove("qt-host"));
        if (this.inputButton) {
            this.inputButton.remove();
            this.inputButton = null;
        }
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();

        try {
            if (window.__QuickTranslate === this) delete window.__QuickTranslate;
        } catch (e) { /* ignore */ }

        this.cache.clear();
        this.results.clear();
        this.shown.clear();
    }

    // ---------------------------------------------------------------- الإعدادات
    loadSettings() {
        this.settings = Object.assign({}, DEFAULTS);
        try {
            const saved = this.readData();
            if (saved && typeof saved === "object") Object.assign(this.settings, saved);
        } catch (e) { log("loadSettings", e); }
        if (!LANGUAGES.some((l) => l.code === this.settings.sendTo)) this.settings.sendTo = DEFAULTS.sendTo;
        if (!LANGUAGES.some((l) => l.code === this.settings.readTo)) this.settings.readTo = DEFAULTS.readTo;
    }

    saveSettings(patch) {
        Object.assign(this.settings, patch || {});
        try {
            if (window.BdApi && window.BdApi.Data && window.BdApi.Data.save) {
                window.BdApi.Data.save(PLUGIN_ID, "settings", this.settings);
            } else {
                localStorage.setItem(PLUGIN_ID + "_settings", JSON.stringify(this.settings));
            }
        } catch (e) { log("saveSettings", e); }
    }

    readData() {
        try {
            if (window.BdApi && window.BdApi.Data && window.BdApi.Data.load) {
                return window.BdApi.Data.load(PLUGIN_ID, "settings");
            }
            const raw = localStorage.getItem(PLUGIN_ID + "_settings");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    // ---------------------------------------------------------------- الترجمة
    async request(url) {
        const options = { method: "GET", headers: { Accept: "application/json" } };
        if (window.BdApi && window.BdApi.Net && typeof window.BdApi.Net.fetch === "function") {
            return await window.BdApi.Net.fetch(url, options);
        }
        return await window.fetch(url, options);
    }

    async translate(text, target, source) {
        const key = target + "|" + String(text);
        if (this.cache.has(key)) return this.cache.get(key);

        const chunks = chunkText(text);
        const pieces = [];
        let detected = null;

        for (const chunk of chunks) {
            if (!chunk.trim()) { pieces.push(chunk); continue; }
            const response = await this.request(buildUrl(chunk, target, source));
            if (!response || !response.ok) {
                throw new Error("خدمة الترجمة رجعت خطأ (" + (response ? response.status : "?") + ")");
            }
            const data = await response.json();
            const parsed = parseGoogleResponse(data);
            pieces.push(parsed.text);
            if (!detected && parsed.detected) detected = parsed.detected;
        }

        const result = { text: pieces.join(""), detected: detected, target: target };
        this.cache.set(key, result);
        return result;
    }

    // ---------------------------------------------------------------- الواجهة
    injectStyles() {
        let style = document.getElementById(STYLE_ID);
        if (!style) {
            style = document.createElement("style");
            style.id = STYLE_ID;
            document.head.appendChild(style);
        }
        style.textContent = CSS;
    }

    // زر مربع الكتابة
    ensureInputButton() {
        if (this.inputButton && document.body.contains(this.inputButton)) return;

        const area = document.querySelector('[class*="channelTextArea"]');
        if (!area) return;

        const host = this.findInputHost(area);

        const button = document.createElement("div");
        button.className = "qt-input-btn";
        button.setAttribute("role", "button");
        button.setAttribute("tabindex", "0");
        button.title = "ترجم رسالتي إلى: " + languageLabel(this.settings.sendTo) + "\n(يسار: ترجم وأرسل — Shift+يسار: ترجم بدون إرسال — يمين: اختيار اللغة)";

        if (!host.classList.contains("qt-btn-host")) host.classList.add("qt-btn-host");
        host.insertBefore(button, host.firstChild);

        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", (event) => {
            if (event.shiftKey) this.translateDraft(false, button);
            else this.translateDraft(this.settings.autoSend, button);
        });
        button.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.openMenu(event.clientX, event.clientY);
        });

        this.inputButton = button;
        this.updateInputButtonLabel();
    }

    // نختار صف الأزرار (الهدية/GIF/الإيموجي) لأنه الأقرب لمظهر ديسكورد الأصلي
    findInputHost(area) {
        const candidates = Array.from(area.querySelectorAll('[class*="buttons"]'));
        let best = null;
        let bestScore = -1;
        for (const candidate of candidates) {
            const score = candidate.querySelectorAll('[role="button"]').length;
            if (score > bestScore) {
                best = candidate;
                bestScore = score;
            }
        }
        if (best && bestScore > 0) return best;
        return area;
    }

    updateInputButtonLabel() {
        if (!this.inputButton) return;
        const code = this.settings.sendTo;
        this.inputButton.textContent = "🌐";
        this.inputButton.dataset.target = code;
    }

    flash(button, state) {
        if (!button) return;
        button.classList.remove("qt-ok", "qt-err", "qt-busy");
        if (state === "busy") {
            button.classList.add("qt-busy");
            return;
        }
        if (state === "ok") button.classList.add("qt-ok");
        if (state === "err") button.classList.add("qt-err");
        setTimeout(() => {
            button.classList.remove("qt-ok", "qt-err", "qt-busy");
        }, 1600);
    }

    getEditor() {
        return (
            document.querySelector('div[role="textbox"][data-slate-editor="true"]') ||
            document.querySelector('[data-slate-editor="true"]') ||
            document.querySelector('div[role="textbox"][contenteditable="true"]')
        );
    }

    // محرر Slate الحالي (مع تخزين مؤقت طالما نفس العنصر)
    getSlateEditor() {
        const element = this.getEditor();
        if (!element) {
            this.slateEditor = null;
            this.slateEditorElement = null;
            return null;
        }
        if (this.slateEditor && this.slateEditorElement === element) return this.slateEditor;
        const editor = findSlateEditor(element);
        this.slateEditor = editor;
        this.slateEditorElement = editor ? element : null;
        return editor;
    }

    getDraft() {
        const editor = this.getSlateEditor();
        if (editor) {
            const text = slateText(editor);
            if (typeof text === "string") return text.replace(/\u200b/g, "").trim();
        }
        const element = this.getEditor();
        if (!element) return "";
        if (element.tagName === "TEXTAREA") return element.value || "";
        return String(element.innerText || element.textContent || "").replace(/\u200b/g, "").trim();
    }

    setDraft(text) {
        const element = this.getEditor();
        if (!element) return false;
        try { element.focus(); } catch (e) { /* ignore */ }

        if (element.tagName === "TEXTAREA") {
            const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
            if (descriptor && descriptor.set) descriptor.set.call(element, text);
            else element.value = text;
            element.dispatchEvent(new Event("input", { bubbles: true }));
            return true;
        }

        // عبر Slate نفسها — يبقي حالة المحرر سليمة (الحذف يضل شغّال)
        const editor = this.getSlateEditor();
        if (editor && slateReplace(editor, text)) return true;

        // ما نلمس الـ DOM إطلاقًا — التعديل المباشر يخرّب المحرر
        log("setDraft: ما لقيت محرر Slate، ما عدّلت المربع");
        return false;
    }

    sendCurrentMessage() {
        // بعض نسخ ديسكورد ما فيها زر إرسال بالـ DOM — وقتها نرسل بزر الإدخال (Enter)
        const button =
            document.querySelector('[class*="sendButton"]') ||
            document.querySelector('[aria-label="Send Message" i]') ||
            document.querySelector('[aria-label="إرسال رسالة"]');
        if (button && !button.disabled && !button.getAttribute("aria-disabled")) {
            button.click();
            return true;
        }
        const editor = this.getEditor();
        if (!editor) return false;
        const event = new KeyboardEvent("keydown", {
            key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true
        });
        editor.dispatchEvent(event);
        return true;
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    currentChannelId() {
        try {
            const parts = location.pathname.split("/").filter(Boolean);
            if (parts[0] !== "channels") return null;
            const last = parts[parts.length - 1];
            return /^\d{17,}$/.test(last) ? last : null;
        } catch (e) {
            return null;
        }
    }

    clearDraft() {
        const element = this.getEditor();
        if (!element) return;
        try {
            element.focus();
            if (element.tagName === "TEXTAREA") {
                const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
                if (descriptor && descriptor.set) descriptor.set.call(element, "");
                else element.value = "";
                element.dispatchEvent(new Event("input", { bubbles: true }));
                return;
            }
            // التنظيف عبر Slate نفسها (التعديل المباشر على DOM يعطّل الحذف)
            const editor = this.getSlateEditor();
            if (editor && slateReplace(editor, "")) return;
            log("clearDraft: ما لقيت محرر Slate، خليت المربع مثل ما هو");
        } catch (e) {
            log("clearDraft", e);
        }
    }

    async waitForDraftEmpty(timeout) {
        const deadline = Date.now() + (timeout || 1200);
        while (Date.now() < deadline) {
            if (!this.getDraft().trim()) return true;
            await this.sleep(100);
        }
        return !this.getDraft().trim();
    }

    // الإرسال عبر ديسكورد نفسها — أضمن بكثير من محاكاة ضغط Enter
    async sendViaDiscord(content) {
        try {
            const actions =
                window.BdApi && window.BdApi.Webpack && typeof window.BdApi.Webpack.getByKeys === "function"
                    ? window.BdApi.Webpack.getByKeys("sendMessage")
                    : null;
            const channelId = this.currentChannelId();
            if (actions && typeof actions.sendMessage === "function" && channelId) {
                // المعامل الرابع (options) مطلوب في نسخ ديسكورد الحديثة
                await actions.sendMessage(
                    channelId,
                    {
                        content: content,
                        tts: false,
                        invalidEmojis: [],
                        validNonShortcutEmojis: []
                    },
                    undefined,
                    {}
                );
                return true;
            }
        } catch (error) {
            log("sendViaDiscord", error);
        }
        return false;
    }

    async translateDraft(autoSend, button) {
        const draft = this.getDraft();
        if (!draft.trim()) {
            this.toast("اكتب رسالة أول 🙂", "error");
            this.flash(button, "err");
            return;
        }

        const target = this.settings.sendTo;
        this.flash(button, "busy");

        try {
            const result = await this.translate(draft.trim(), target, "auto");
            const from = result.detected ? languageLabel(result.detected) : "تلقائي";

            if (autoSend === false) {
                if (!this.setDraft(result.text)) {
                    this.flash(button, "err");
                    this.toast("ما قدرت أكتب في المربع — جرّب مرة ثانية", "error");
                    return;
                }
                this.flash(button, "ok");
                this.toast("🌐 " + from + " ← " + languageLabel(target) + " (بدون إرسال)");
                return;
            }

            if (await this.sendViaDiscord(result.text)) {
                this.clearDraft();
                this.flash(button, "ok");
                this.toast("✅ أُرسلت مترجمة من " + from + " إلى " + languageLabel(target));
                return;
            }

            // احتياطي: نكتب الترجمة في المربع ونرسل بزر الإدخال
            this.setDraft(result.text);
            await this.sleep(150);
            this.sendCurrentMessage();
            if (await this.waitForDraftEmpty(1500)) {
                this.flash(button, "ok");
                this.toast("✅ أُرسلت مترجمة من " + from + " إلى " + languageLabel(target));
            } else {
                this.flash(button, "err");
                this.toast("الترجمة جاهزة في المربع — اضغط Enter للإرسال", "error");
            }
        } catch (error) {
            log("translateDraft", error);
            this.flash(button, "err");
            this.toast("فشلت الترجمة: " + (error && error.message ? error.message : error), "error");
        }
    }

    // زر ترجمة الرسائل
    handleMouseOver(event) {
        if (!this.settings.showMessageButton) return;
        const target = event.target;
        if (!target || !target.closest) return;
        if (target.closest(".qt-translation") || target.closest(".qt-menu")) return;

        const li = target.closest('li[id^="chat-messages-"]');
        if (!li) return;
        this.decorateMessage(li);
    }

    decorateMessage(li) {
        const content = li.querySelector('[id^="message-content-"]');
        if (!content) return;
        const messageId = li.id.split("-").pop();
        if (!messageId) return;

        li.classList.add("qt-host");

        if (!content.querySelector(":scope > .qt-msg-btn")) {
            const button = document.createElement("span");
            button.className = "qt-msg-btn";
            button.textContent = "🌐 ترجم";
            button.title = "ترجم إلى " + languageLabel(this.settings.readTo) + " (يمين: تغيير اللغة)";
            button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.toggleMessageTranslation(li, messageId, content);
            });
            button.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.openMenu(event.clientX, event.clientY, "readTo");
            });
            content.appendChild(button);
        }

        // استرجاع ترجمة محفوظة لو ديسكورد أعاد بناء الرسالة
        if (this.shown.has(messageId) && !content.querySelector(":scope > .qt-translation")) {
            const cached = this.results.get(messageId);
            if (cached) this.renderTranslation(content, messageId, cached);
        }
    }

    extractText(content) {
        // نخفي عناصرنا وقت القراءة عشان ما تدخل ضمن النص المترجم
        const ours = Array.from(content.querySelectorAll(".qt-msg-btn, .qt-translation"));
        const previous = ours.map((el) => el.style.display);
        ours.forEach((el) => { el.style.display = "none"; });

        const markup = content.querySelector('[class*="markup"]');
        const source = markup || content;
        const text = String(source.innerText || source.textContent || "").replace(/\u200b/g, "").trim();

        ours.forEach((el, index) => { el.style.display = previous[index] || ""; });
        return text;
    }

    async toggleMessageTranslation(li, messageId, content) {
        const existing = content.querySelector(":scope > .qt-translation");
        if (existing) {
            existing.remove();
            this.shown.delete(messageId);
            return;
        }

        const cached = this.results.get(messageId);
        if (cached) {
            this.renderTranslation(content, messageId, cached);
            this.shown.add(messageId);
            return;
        }

        const text = this.extractText(content);
        if (!looksTranslatable(text)) {
            this.toast("ما فيه نص قابل للترجمة في هذي الرسالة", "error");
            return;
        }

        const target = this.settings.readTo;
        if (this.pending.has(messageId)) return;
        this.pending.add(messageId);

        const placeholder = document.createElement("div");
        placeholder.className = "qt-translation qt-loading";
        placeholder.textContent = "… أترجم";
        content.appendChild(placeholder);

        try {
            const result = await this.translate(text, target, "auto");
            const payload = {
                text: result.text,
                source: result.detected || null,
                target: target,
                rtl: isRtl(target)
            };
            this.results.set(messageId, payload);
            this.shown.add(messageId);
            if (placeholder.parentNode) {
                this.renderTranslation(content, messageId, payload, placeholder);
            }
        } catch (error) {
            log("toggleMessageTranslation", error);
            placeholder.classList.remove("qt-loading");
            placeholder.classList.add("qt-error");
            placeholder.textContent = "فشلت الترجمة: " + (error && error.message ? error.message : error);
        } finally {
            this.pending.delete(messageId);
        }
    }

    renderTranslation(content, messageId, payload, replaceNode) {
        const block = document.createElement("div");
        block.className = "qt-translation" + (payload.rtl ? " qt-rtl" : "");
        block.setAttribute("dir", payload.rtl ? "rtl" : "auto");

        const meta = document.createElement("span");
        meta.className = "qt-meta";
        const from = payload.source ? languageLabel(payload.source) : "تلقائي";
        meta.textContent = "🌐 " + from + " ← " + languageLabel(payload.target);

        const close = document.createElement("span");
        close.className = "qt-close";
        close.textContent = "✕ إخفاء";
        close.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            block.remove();
            this.shown.delete(messageId);
        });
        meta.appendChild(close);

        const text = document.createElement("span");
        text.className = "qt-text";
        text.textContent = payload.text;

        block.appendChild(meta);
        block.appendChild(text);

        if (replaceNode && replaceNode.parentNode) replaceNode.replaceWith(block);
        else content.appendChild(block);
    }

    // القائمة الصغيرة
    openMenu(x, y, focus) {
        this.closeMenu();

        const menu = document.createElement("div");
        menu.className = "qt-menu";
        menu.dir = "rtl";

        const title = document.createElement("div");
        title.className = "qt-title";
        title.textContent = "🌐 مترجم سريع";
        menu.appendChild(title);

        const makeSelect = (labelText, key) => {
            const row = document.createElement("div");
            row.className = "qt-row";
            const label = document.createElement("span");
            label.textContent = labelText;
            const select = document.createElement("select");
            LANGUAGES.forEach((language) => {
                const option = document.createElement("option");
                option.value = language.code;
                option.textContent = language.label;
                if (language.code === this.settings[key]) option.selected = true;
                select.appendChild(option);
            });
            select.addEventListener("change", () => {
                const patch = {};
                patch[key] = select.value;
                this.saveSettings(patch);
                this.updateInputButtonLabel();
                this.refreshOpenTranslations();
            });
            row.appendChild(label);
            row.appendChild(select);
            menu.appendChild(row);
            return select;
        };

        const sendSelect = makeSelect("لغة الإرسال", "sendTo");
        makeSelect("لغة ترجمة الرسائل", "readTo");

        const autoRow = document.createElement("label");
        autoRow.className = "qt-check";
        const autoBox = document.createElement("input");
        autoBox.type = "checkbox";
        autoBox.checked = this.settings.autoSend !== false;
        autoBox.addEventListener("change", () => this.saveSettings({ autoSend: autoBox.checked }));
        autoRow.appendChild(autoBox);
        autoRow.appendChild(document.createTextNode("أرسل الرسالة مباشرة بعد الترجمة"));
        menu.appendChild(autoRow);

        const hint = document.createElement("div");
        hint.className = "qt-hint";
        hint.textContent = "زر 🌐 في مربع الكتابة: يسار = ترجم وأرسل، Shift+يسار = ترجم بدون إرسال، يمين = هذي القائمة.";
        menu.appendChild(hint);

        document.body.appendChild(menu);

        const rect = menu.getBoundingClientRect();
        const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
        const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
        menu.style.left = left + "px";
        menu.style.top = top + "px";

        this.menu = menu;
        const selectToFocus = focus === "readTo" ? menu.querySelectorAll("select")[1] : sendSelect;
        setTimeout(() => {
            try { if (selectToFocus) selectToFocus.focus(); } catch (e) { /* ignore */ }
        }, 0);
    }

    closeMenu() {
        if (this.menu && this.menu.parentNode) this.menu.parentNode.removeChild(this.menu);
        this.menu = null;
    }

    refreshOpenTranslations() {
        document.querySelectorAll(".qt-translation").forEach((el) => el.remove());
        this.shown.clear();
        this.results.clear();
    }

    // لوحة إعدادات BetterDiscord
    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.className = "qt-panel";
        panel.dir = "rtl";

        const row = (labelText, key) => {
            const wrap = document.createElement("div");
            wrap.className = "qt-row";
            const label = document.createElement("span");
            label.textContent = labelText;
            const select = document.createElement("select");
            LANGUAGES.forEach((language) => {
                const option = document.createElement("option");
                option.value = language.code;
                option.textContent = language.label;
                if (language.code === this.settings[key]) option.selected = true;
                select.appendChild(option);
            });
            select.addEventListener("change", () => {
                const patch = {};
                patch[key] = select.value;
                this.saveSettings(patch);
                this.updateInputButtonLabel();
            });
            wrap.appendChild(label);
            wrap.appendChild(select);
            panel.appendChild(wrap);
            return select;
        };

        row("لغة إرسال رسائلي", "sendTo");
        row("لغة ترجمة رسائل الآخرين", "readTo");

        const check = (labelText, key) => {
            const wrap = document.createElement("label");
            wrap.className = "qt-check";
            wrap.style.marginBottom = "10px";
            const box = document.createElement("input");
            box.type = "checkbox";
            box.checked = this.settings[key] !== false;
            box.addEventListener("change", () => {
                const patch = {};
                patch[key] = box.checked;
                this.saveSettings(patch);
            });
            wrap.appendChild(box);
            wrap.appendChild(document.createTextNode(labelText));
            panel.appendChild(wrap);
        };

        check("أرسل الرسالة تلقائيًا بعد الترجمة", "autoSend");
        check("أظهر زر ترجمة عند مرور الماوس على الرسائل", "showMessageButton");

        const hint = document.createElement("div");
        hint.className = "qt-hint";
        hint.textContent = "التلميح: اضغط بالزر الأيمن على زر 🌐 لاختيار اللغة بسرعة. الترجمة تحتاج إنترنت.";
        panel.appendChild(hint);

        return panel;
    }

    toast(message, type) {
        try {
            if (window.BdApi && window.BdApi.UI && typeof window.BdApi.UI.showToast === "function") {
                window.BdApi.UI.showToast(message, { type: type === "error" ? "error" : "success", timeout: 2500 });
            }
        } catch (e) { /* ignore */ }
        log(message);
    }
};

module.exports.__internals = {
    LANGUAGES,
    RTL_LANGS,
    buildUrl,
    parseGoogleResponse,
    isRtl,
    languageLabel,
    chunkText,
    looksTranslatable,
    hasArabic,
    isSlateEditor,
    slateText,
    slateFullRange
};
