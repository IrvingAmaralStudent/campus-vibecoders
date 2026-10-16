// Mensajes del flujo semanal. Uso:
//   node scripts/notificar.mjs propuesta <semana-NN> <url del PR> [actualizada]   → aviso al mentor
//   node scripts/notificar.mjs recordatorio <semana-NN> <url del PR> <título>      → recordatorio al mentor
//   node scripts/notificar.mjs publicada <semana-NN> [<semana-NN> …]               → anuncio al grupo
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enviar, esc } from "./telegram.mjs";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [accion, ...args] = process.argv.slice(2);
const { MENTOR_CHAT_ID, GROUP_CHAT_ID: grupo } = process.env;
// Puede haber varios mentores (MENTOR_CHAT_ID separado por coma): el aviso les llega a todos.
const mentores = String(MENTOR_CHAT_ID || "").split(",").map((x) => x.trim()).filter(Boolean);
const avisarMentores = async (html, extra) => { for (const id of mentores) await enviar(id, html, extra); };
const leerSemana = (s) => {
  const c = path.join(raiz, "programa", "semanas", s);
  return fs.readdirSync(c).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(fs.readFileSync(path.join(c, f), "utf8")));
};

// Botones que atiende el bot (scripts/bot-registro.mjs). El texto debe decir "Semana N" para que,
// si el mentor le responde al mensaje, el bot sepa de qué semana habla.
const botones = (semana, url) => ({ reply_markup: { inline_keyboard: [
  [{ text: "✅ Aprobar", callback_data: `aprobar:${semana}` }, { text: "✏️ Pedir cambios", callback_data: `cambios:${semana}` }],
  [{ text: "📄 Ver cada día", callback_data: `detalle:${semana}` }, { text: "🔗 GitHub", url }],
] } });
const ayuda = "\n\n💬 También puedes <b>responder a este mensaje</b> con lo que quieras cambiar.";

if (accion === "propuesta") {
  const [semana, url, actualizada] = args;
  const d = leerSemana(semana);
  await avisarMentores(
    `📋 <b>${actualizada ? "Actualicé" : "Ya está lista"} la Semana ${d[0].semana} para revisar</b>\n` +
    `${esc(d[0].semanaTitulo)}\n${d[0].fecha} a ${d[d.length - 1].fecha} · ${d.length} días\n\n` +
    d.map((x) => `• ${esc(x.titulo)}`).join("\n") +
    ayuda, botones(semana, url));
} else if (accion === "recordatorio") {
  const [semana, url, titulo] = args;
  await avisarMentores(`⏰ <b>Recordatorio:</b> la <b>Semana ${Number(semana.replace("semana-", ""))}</b> sigue sin aprobar.\n${esc(titulo)}\n\nSi no la apruebas, el lunes no habrá aviso para el grupo.` + ayuda, botones(semana, url));
} else if (accion === "publicada") {
  const { portalUrl } = JSON.parse(fs.readFileSync(path.join(raiz, "programa", "config.json"), "utf8"));
  for (const s of args) {
    const d = leerSemana(s);
    await enviar(grupo,
      `📢 <b>Nueva semana publicada: Semana ${d[0].semana}</b>\n${esc(d[0].semanaTitulo)}\n\n` +
      `🎯 Al final de la semana: ${esc(d[0].entregableSemana)}\n\n` +
      `Ya puedes ver todo en el portal 👉 ${portalUrl}`);
  }
} else {
  throw new Error(`Acción desconocida: ${accion}`);
}
console.log(`Notificación enviada: ${accion} ${args[0] || ""}`);
