// Publica en el grupo de Telegram el aviso del día (hora de Ciudad de México).
// Lo ejecuta la GitHub Action "Aviso diario"; si hoy no hay actividad publicada, no manda nada.
import fs from "node:fs";

const { TELEGRAM_BOT_TOKEN: token, GROUP_CHAT_ID: chat, FECHA } = process.env;
if (!token || !chat) throw new Error("Faltan los secretos TELEGRAM_BOT_TOKEN o GROUP_CHAT_ID.");

const hoy = FECHA || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const { portalUrl, dias } = JSON.parse(fs.readFileSync(new URL("../contenido.json", import.meta.url), "utf8"));
const dia = dias.find((d) => d.fecha === hoy);
if (!dia) { console.log(`Sin actividad publicada para ${hoy}; no se envía nada.`); process.exit(0); }

// El texto viene con formato de WhatsApp (*negritas*); Telegram usa HTML.
const html = dia.aviso
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
  .split("{link}").join(portalUrl);

const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: chat, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
}).then((x) => x.json());
if (!r.ok) throw new Error(`Telegram respondió: ${r.description}`);
console.log(`Aviso del ${hoy} enviado: ${dia.titulo}`);
