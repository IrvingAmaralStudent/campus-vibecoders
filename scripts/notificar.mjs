// Mensajes del flujo semanal. Uso:
//   node scripts/notificar.mjs propuesta <semana-NN> <url del PR> [actualizada]   → aviso al mentor
//   node scripts/notificar.mjs recordatorio <url del PR> <título>                  → recordatorio al mentor
//   node scripts/notificar.mjs publicada <semana-NN> [<semana-NN> …]               → anuncio al grupo
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enviar, esc } from "./telegram.mjs";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [accion, ...args] = process.argv.slice(2);
const { MENTOR_CHAT_ID: mentor, GROUP_CHAT_ID: grupo } = process.env;
const leerSemana = (s) => {
  const c = path.join(raiz, "programa", "semanas", s);
  return fs.readdirSync(c).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(fs.readFileSync(path.join(c, f), "utf8")));
};

if (accion === "propuesta") {
  const [semana, url, actualizada] = args;
  const d = leerSemana(semana);
  await enviar(mentor,
    `📋 <b>${actualizada ? "Actualicé" : "Ya está lista"} la semana ${d[0].semana} para revisar</b>\n` +
    `${esc(d[0].semanaTitulo)}\n${d[0].fecha} a ${d[d.length - 1].fecha} · ${d.length} días\n\n` +
    d.map((x) => `• ${esc(x.titulo)}`).join("\n") +
    `\n\n👀 Revisa y aprueba (Merge) aquí:\n${url}`);
} else if (accion === "recordatorio") {
  const [url, titulo] = args;
  await enviar(mentor, `⏰ <b>Recordatorio:</b> la propuesta "${esc(titulo)}" sigue sin aprobar. Si no la apruebas, el lunes no habrá aviso para el grupo.\n\n${url}`);
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
