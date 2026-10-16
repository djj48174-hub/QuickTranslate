# 🌐 QuickTranslate

A one-click translator plugin for **[BetterDiscord](https://betterdiscord.app)**.

Type a message in any language, hit the 🌐 button next to the message box — it gets translated into the language you picked and sent. Hover any message and hit the small 🌐 button to translate it in place.

> The plugin's interface (button labels, toasts, settings) is available in **English and Arabic** — it follows Discord's language by default. [اقرأ الشرح بالعربي](README.ar.md)

---

## Features

- **Translate & send** — the 🌐 button next to the chat box translates your draft into your *send-to* language and sends it.
- **Translate without sending** — `Shift` + click the button to replace your draft with the translation so you can review or edit it first.
- **Translate incoming messages** — hover a message, click the small 🌐 button, and the translation appears right under it (with `dir="rtl"` for Arabic, Hebrew, Persian, Urdu…).
- **Two independent languages** — *send to* (default `English`) and *read to* (default `العربية`), 92 languages to choose from.
- **English & Arabic interface** — every label, toast and setting follows Discord's own language automatically, or you can force Arabic / English in the settings.
- **Manual only** — nothing happens on its own. Every translation is a click you make.
- No account access, no token usage, no Nitro tricks, no external libraries.

---

## Install

1. **[BetterDiscord](https://betterdiscord.app)** must be installed first.
2. **Get the plugin file** — download [`plugin/QuickTranslate.plugin.js`](https://raw.githubusercontent.com/djj48174-hub/QuickTranslate/main/plugin/QuickTranslate.plugin.js).
3. **Drop it in the plugins folder:**

   | OS | Folder |
   | --- | --- |
   | Windows | `%APPDATA%\BetterDiscord\plugins\` |
   | macOS | `~/Library/Application Support/BetterDiscord/plugins/` |
   | Linux | `~/.config/BetterDiscord/plugins/` |

4. **Enable it** — Discord → Settings → BetterDiscord → Plugins → toggle *QuickTranslate*.

**Windows one-command install:**

```powershell
irm https://raw.githubusercontent.com/djj48174-hub/QuickTranslate/main/install-quicktranslate.ps1 | iex
```

Or download [`install-quicktranslate.ps1`](https://github.com/djj48174-hub/QuickTranslate/releases/latest/download/install-quicktranslate.ps1) and run it:

```powershell
powershell -ExecutionPolicy Bypass -File install-quicktranslate.ps1
```

The script is standalone: if the plugin file is not sitting next to it, it downloads it from GitHub, copies it into BetterDiscord, enables it and restarts Discord. Add `-NoRestart` to skip the restart, or `-Source <path>` to install a local file.

To remove it again:

```powershell
powershell -ExecutionPolicy Bypass -File uninstall-quicktranslate.ps1
```

---

## Usage

### 1) Translate your own message and send it

| Action | Result |
| --- | --- |
| Type your message, click 🌐 | The message is translated to your *send-to* language and sent |
| `Shift` + click 🌐 | The draft is replaced by the translation (nothing is sent — press Enter yourself) |
| Right-click 🌐 | Pick the *send-to* language |
| Click 🌐 with an empty box | A friendly reminder toast |

### 2) Translate messages from other people

| Action | Result |
| --- | --- |
| Hover a message | A small **🌐 Translate** button appears (**🌐 ترجم** in the Arabic interface) |
| Click it | The translation is inserted under the message |
| Click it again / the ✕ hide link | The translation is hidden |
| Right-click it | Pick the *read-to* language |

---

## Settings

Discord → Settings → BetterDiscord → Plugins → *QuickTranslate* ⚙️

| Setting | Default | Meaning |
| --- | --- | --- |
| Send language (`لغة الإرسال`) | `en` | Target language when you send a translated message |
| Messages language (`لغة القراءة`) | `ar` | Target language when you translate incoming messages |
| Interface language (`لغة الواجهة`) | `auto` | `auto` follows Discord's language, or force `العربية` / `English` |
| Auto send (`إرسال تلقائي`) | on | Click 🌐 = translate **and** send (off = ✍️🌐 always previews) |
| Message button (`زر ترجمة الرسائل`) | on | Show the hover button on messages |

Settings are stored in `%APPDATA%\BetterDiscord\plugins\QuickTranslate.config.json`.

---

## Privacy & caveats

- Translations come from Google's **unofficial** endpoint `translate.googleapis.com/translate_a/single?client=gtx` (no API key, no cost). It is not a documented API — it can rate-limit or change behaviour at any time.
- **The text you translate is sent to Google** as part of the request. That is the only thing that leaves your machine: no analytics, no telemetry, no account access, nothing stored server-side by this plugin.
- Long texts are split into chunks of ≤ 1200 characters and stitched back together.
- BetterDiscord is a client modification — use it at your own risk with respect to Discord's ToS. This plugin only uses the client's own internal APIs, and only for an action you explicitly triggered.

---

## How it works (technical)

- **Translation:** `translate.googleapis.com` through `BdApi.Net.fetch` (avoids CORS), automatic language detection, chunking for long texts.
- **Sending:** Discord's own `MessageActions.sendMessage(channelId, {content, …}, undefined, {})` — the 4th argument is required on recent builds.
- **The message box** is read and written through **Discord's Slate editor instance** (located via the React fiber tree) — *not* by touching the DOM. Direct DOM edits (`execCommand`, selection changes) desync Slate's internal state and break Backspace/deleting in the chat box. This bug was hit during development and fixed: the plugin now uses `insertText` / `deleteFragment` and re-syncs the selection, which also repairs an already-desynced box.
- **Message buttons** are injected as sibling nodes inside the message content and revealed with CSS on `:hover`.
- **RTL languages** (ar, he, fa, ur, ps, sd, yi, ku, dv) get `dir="rtl"`.

---

## Tests

```powershell
node tests/core.test.mjs
```

33 unit tests covering URL building (including parameter-injection resistance), response parsing, chunking, RTL detection, Arabic + English language labels, the bilingual interface strings and the Slate range helpers.

---

## Credits

- **Author:** ijl
- Built with AI assistance — the code was generated by an AI agent under the author's direction and testing.
- Not affiliated with Discord or BetterDiscord.

## License

[GPL-3.0](LICENSE) — free to use, study, share and modify; derivative works must stay open source under the same license.
