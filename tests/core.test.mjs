// اختبارات دوال QuickTranslate النقية (بدون ديسكورد)
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const Plugin = require("../plugin/QuickTranslate.plugin.js");
const T = Plugin.__internals;

let pass = 0;
let fail = 0;

function test(name, fn) {
    try {
        fn();
        pass++;
        console.log("  ✔ " + name);
    } catch (error) {
        fail++;
        console.log("  ✘ " + name + "\n      " + error.message);
    }
}

console.log("\nQuickTranslate tests\n");

// --- اللغات ---------------------------------------------------------------
test("قائمة اللغات مو موجودة فاضية", () => {
    assert.ok(T.LANGUAGES.length > 50, "عدد اللغات " + T.LANGUAGES.length);
});

test("رموز اللغات فريدة", () => {
    const codes = T.LANGUAGES.map((l) => l.code);
    assert.equal(new Set(codes).size, codes.length);
});

test("العربية والإنجليزية موجودة", () => {
    assert.ok(T.LANGUAGES.some((l) => l.code === "ar"));
    assert.ok(T.LANGUAGES.some((l) => l.code === "en"));
});

test("كل لغة لها اسم عربي", () => {
    for (const language of T.LANGUAGES) {
        assert.ok(language.label && language.label.length > 0, "ناقص: " + language.code);
        assert.ok(!/[A-Za-z]/.test(language.label.replace(/\(.*\)/, "")), "اسم غير معرّب: " + language.label);
    }
});

// --- بناء الرابط ----------------------------------------------------------
test("بناء رابط الترجمة صحيح", () => {
    const url = T.buildUrl("السلام عليكم", "en");
    assert.ok(url.startsWith("https://translate.googleapis.com/translate_a/single?"));
    assert.ok(url.includes("sl=auto"), url);
    assert.ok(url.includes("tl=en"), url);
    assert.ok(url.includes("q=" + encodeURIComponent("السلام عليكم")), url);
    assert.ok(url.includes("client=gtx"));
});

test("بناء الرابط ما يسمح بحقن معاملات", () => {
    const url = T.buildUrl("a&tl=zz&q=b", "en");
    const occurrences = url.split("tl=").length - 1;
    assert.equal(occurrences, 1, "صار حقن: " + url);
});

test("رموز اللغات المركبة تتشفّر", () => {
    const url = T.buildUrl("hi", "zh-CN");
    assert.ok(url.includes("tl=zh-CN"), url);
});

// --- قراءة رد الخدمة ------------------------------------------------------
test("قراءة رد الترجمة العادي", () => {
    const response = [
        [["Peace be upon you", "السلام عليكم", null, null, 10], [" how are you?", " كيف حالك", null, null, 3]],
        null,
        "ar"
    ];
    const parsed = T.parseGoogleResponse(response);
    assert.equal(parsed.text, "Peace be upon you how are you?");
    assert.equal(parsed.detected, "ar");
});

test("قراءة رد بلغة من مصفوفة بديلة", () => {
    const parsed = T.parseGoogleResponse([[["Hello", "مرحبا"]], null, null, null, null, null, null, null, [["ar"]]]);
    assert.equal(parsed.text, "Hello");
    assert.equal(parsed.detected, "ar");
});

test("رد تالف يرمي خطأ", () => {
    assert.throws(() => T.parseGoogleResponse(null));
    assert.throws(() => T.parseGoogleResponse([[]]));
    assert.throws(() => T.parseGoogleResponse([[[null, null]]]));
});

// --- الاتجاه --------------------------------------------------------------
test("اللغات اليمينية تُكتشف", () => {
    for (const code of ["ar", "he", "fa", "ur", "ps", "sd"]) {
        assert.equal(T.isRtl(code), true, code);
    }
    assert.equal(T.isRtl("ar-EG"), true, "ar-EG");
});

test("اللغات اليسارية ما تُصنّف يمينية", () => {
    for (const code of ["en", "fr", "tr", "zh-CN", "ja"]) {
        assert.equal(T.isRtl(code), false, code);
    }
    assert.equal(T.isRtl(null), false);
});

// --- التقسيم --------------------------------------------------------------
test("النص القصير ما يتقسّم", () => {
    assert.deepEqual(T.chunkText("مرحبا"), ["مرحبا"]);
});

test("النص الطويل يتقسّم ويُعاد بنفس المحتوى", () => {
    const word = "كلمة ";
    const long = word.repeat(1000);
    const parts = T.chunkText(long, 200);
    assert.ok(parts.length > 1, "ما تقسّم");
    for (const part of parts) assert.ok(part.length <= 200, "جزء طويل " + part.length);
    assert.equal(parts.join(""), long);
});

test("نص بلا مسافات يتقسّم بعدّاد صحيح", () => {
    const parts = T.chunkText("a".repeat(500), 100);
    assert.equal(parts.length, 5);
    assert.equal(parts.join("").length, 500);
});

// --- أهليّة الترجمة -------------------------------------------------------
test("النص الفاضي ما يُترجم", () => {
    assert.equal(T.looksTranslatable(""), false);
    assert.equal(T.looksTranslatable("   \n "), false);
    assert.equal(T.looksTranslatable(null), false);
});

test("الإيموجي وحده ما يُترجم", () => {
    assert.equal(T.looksTranslatable("👋👋🎉"), false);
});

test("النص العادي والعربي يُترجم", () => {
    assert.equal(T.looksTranslatable("hello"), true);
    assert.equal(T.looksTranslatable("السلام عليكم"), true);
    assert.equal(T.looksTranslatable("123"), true);
});

test("النص الطويل جدًا يُرفض", () => {
    assert.equal(T.looksTranslatable("a".repeat(6001)), false);
});

// --- الأسماء --------------------------------------------------------------
test("أسماء اللغات بالعربي", () => {
    assert.equal(T.languageLabel("ar"), "العربية");
    assert.equal(T.languageLabel("en"), "الإنجليزية");
    assert.equal(T.languageLabel("auto"), "تلقائي");
    assert.equal(T.languageLabel("xx"), "xx");
});

test("الرموز كلها موجودة في القائمة الأساسية", () => {
    for (const code of T.RTL_LANGS) {
        if (code === "dv") continue;
        assert.ok(T.LANGUAGES.some((l) => l.code === code), "ناقص من القائمة: " + code);
    }
});

// --- محرر Slate -----------------------------------------------------------
test("التعرّف على محرر Slate", () => {
    const fake = {
        children: [{ children: [{ text: "hi" }] }],
        apply: () => {}, insertText: () => {}, deleteFragment: () => {}, isInline: () => false
    };
    assert.equal(T.isSlateEditor(fake), true);
    assert.equal(T.isSlateEditor(null), false);
    assert.equal(T.isSlateEditor({}), false);
    assert.equal(T.isSlateEditor({ apply: () => {}, children: [] }), false);
});

test("قراءة نص Slate بسطرين", () => {
    const fake = { children: [{ children: [{ text: "أهلا" }] }, { children: [{ text: "وسهلا" }] }] };
    assert.equal(T.slateText(fake), "أهلا\nوسهلا");
});

test("مدى الاختيار الكامل يغطي آخر حرف", () => {
    const fake = { children: [{ children: [{ text: "abc" }, { text: "de" }] }] };
    assert.deepEqual(T.slateFullRange(fake), {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 1], offset: 2 }
    });
});

test("مدى الاختيار يتعامل مع مربع فاضي", () => {
    const fake = { children: [{ children: [{ text: "" }] }] };
    assert.deepEqual(T.slateFullRange(fake), {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 0 }
    });
});

// --- الواجهة (عربي / إنجليزي) ---------------------------------------------
test("كل لغة لها اسم إنجليزي", () => {
    for (const language of T.LANGUAGES) {
        assert.ok(T.EN_NAMES[language.code], "ناقص إنجليزي: " + language.code);
    }
});

test("الأسماء الإنجليزية ما فيها حروف عربية", () => {
    for (const code of Object.keys(T.EN_NAMES)) {
        assert.ok(!/[\u0600-\u06FF]/.test(T.EN_NAMES[code]), "فيه عربي: " + code);
    }
});

test("جدولا النصوص فيهما نفس المفاتيح", () => {
    const arKeys = Object.keys(T.STRINGS.ar).sort();
    const enKeys = Object.keys(T.STRINGS.en).sort();
    assert.deepEqual(enKeys, arKeys);
});

test("النصوص الإنجليزية كلها موجودة وما فيها عربي", () => {
    for (const key of Object.keys(T.STRINGS.en)) {
        const value = T.STRINGS.en[key];
        assert.ok(value && value.length > 0, "ناقص: " + key);
        assert.ok(!/[\u0600-\u06FF]/.test(value), "فيه عربي: " + key);
    }
});

test("تبديل لغة الواجهة يغيّر النصوص والأسماء", () => {
    assert.equal(T.setUiLang("en"), "en");
    assert.equal(T.getUiLang(), "en");
    assert.equal(T.languageLabel("ar"), "Arabic");
    assert.equal(T.languageLabel("zh-CN"), "Chinese (Simplified)");
    assert.equal(T.languageLabel("auto"), "Auto");
    assert.equal(T.t("hide"), "✕ Hide");

    assert.equal(T.setUiLang("ar"), "ar");
    assert.equal(T.languageLabel("ar"), "العربية");
    assert.equal(T.t("hide"), "✕ إخفاء");
});

test("قيمة غير معروفة ترجع للعربي", () => {
    T.setUiLang("fr");
    assert.equal(T.getUiLang(), "ar");
});

test("تمرير المتغيرات داخل النصوص", () => {
    T.setUiLang("en");
    assert.equal(T.t("msgTitle", { to: "French" }), "Translate to French (right click: change language)");
    T.setUiLang("ar");
    assert.equal(T.t("msgTitle", { to: "الفرنسية" }), "ترجم إلى الفرنسية (يمين: تغيير اللغة)");
});

test("لغة الواجهة auto تُحسم لواحد من الاثنين", () => {
    assert.equal(T.resolveUiLang("ar"), "ar");
    assert.equal(T.resolveUiLang("en"), "en");
    assert.ok(["ar", "en"].indexOf(T.resolveUiLang("auto")) !== -1);
});

console.log("\n" + (fail === 0 ? "✅" : "❌") + " نجح: " + pass + " — فشل: " + fail + "\n");
if (fail > 0) process.exit(1);
