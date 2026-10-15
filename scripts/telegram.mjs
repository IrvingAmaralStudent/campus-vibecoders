// Envío de mensajes por el bot de Telegram (HTML). Lo usan los scripts de las Actions.
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function enviar(chat, html, extra = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chat) throw new Error("Faltan TELEGRAM_BOT_TOKEN o el chat de destino.");
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra }),
  }).then((x) => x.json());
  if (!r.ok) throw new Error(`Telegram respondió: ${r.description}`);
  return r;
}
