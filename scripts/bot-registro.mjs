// Bot de registro: da la bienvenida a quien entra al grupo y le entrega su código personal
// cuando comparte su número en privado. Lo ejecuta la GitHub Action "Bot de registro" cada 10 minutos.
//
// Secretos que usa:
//   TELEGRAM_BOT_TOKEN  token del bot
//   GROUP_CHAT_ID       grupo del programa
//   MENTOR_CHAT_ID      chat privado del mentor, para avisarle
//   ALUMNOS             JSON [{codigo, nombre, telefono}] (lo sube contenido/sincronizar-alumnos.js)
//
// No guarda estado propio: al pedir las novedades con "offset", Telegram las da por leídas.

import { execFileSync } from "node:child_process";

const { TELEGRAM_BOT_TOKEN: token, GROUP_CHAT_ID, MENTOR_CHAT_ID, ALUMNOS } = process.env;
if (!token) throw new Error("Falta el secreto TELEGRAM_BOT_TOKEN.");
const GRUPO = Number(GROUP_CHAT_ID);
const MENTOR = Number(MENTOR_CHAT_ID);
const PORTAL = "https://irvingamaralstudent.github.io/campus-vibecoders/";
const alumnos = JSON.parse(ALUMNOS || "[]");

const api = async (metodo, cuerpo) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  }).then((x) => x.json());
  if (!r.ok) console.log(`Aviso: ${metodo} falló (${r.description})`);
  return r;
};
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Se comparan los últimos 10 dígitos, para que "+52 55 1234 5678" y "5512345678" coincidan.
const tel10 = (t) => String(t || "").replace(/\D/g, "").slice(-10);
const avisarMentor = (texto) => MENTOR && api("sendMessage", { chat_id: MENTOR, text: texto, parse_mode: "HTML" });

const me = (await api("getMe", {})).result;
const enlace = `https://t.me/${me.username}?start=registro`;
const pedirNumero = (chat) => api("sendMessage", {
  chat_id: chat,
  parse_mode: "HTML",
  text: "👋 ¡Hola! Para darte tu <b>código personal</b> del programa, toca el botón de abajo y comparte tu número.\n\nSolo se usa para identificarte en la lista de tu mentor.",
  reply_markup: { keyboard: [[{ text: "📱 Compartir mi número", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
});

// --- Comandos del mentor. Usan el CLI de GitHub con el token de la Action (GH_TOKEN).
const REPO = process.env.GITHUB_REPOSITORY;
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const semanasPendientes = () => JSON.parse(gh("pr", "list", "-R", REPO, "--state", "open", "--json", "number,url,title,headRefName"))
  .filter((p) => p.headRefName.startsWith("claude/semana-"))
  .sort((a, b) => (a.headRefName < b.headRefName ? -1 : 1));
const responder = (texto) => api("sendMessage", { chat_id: MENTOR, text: texto, parse_mode: "HTML", link_preview_options: { is_disabled: true } });

async function anotarCambio(texto) {
  const [pr] = semanasPendientes();
  const rama = pr ? pr.headRefName : "main";
  const ruta = "programa/notas-mentor.md";
  const actual = JSON.parse(gh("api", `repos/${REPO}/contents/${ruta}?ref=${encodeURIComponent(rama)}`));
  const previo = Buffer.from(actual.content, "base64").toString("utf8");
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
  const nuevo = previo.replace(/\n*$/, "\n") + `- [pendiente] (${fecha}${pr ? `, ${pr.headRefName.replace("claude/", "")}` : ""}) ${texto}\n`;
  gh("api", "-X", "PUT", `repos/${REPO}/contents/${ruta}`,
    "-f", `message=Nota del mentor: ${texto.slice(0, 60)}`,
    "-f", `content=${Buffer.from(nuevo, "utf8").toString("base64")}`,
    "-f", `sha=${actual.sha}`, "-f", `branch=${rama}`);
  return pr;
}

async function atenderMentor(texto) {
  const t = texto.toLowerCase();
  try {
    if (/^\/?aprobar\b/.test(t)) {
      const [pr] = semanasPendientes();
      if (!pr) return responder("No hay ninguna semana pendiente de aprobar. 👍");
      const semana = pr.headRefName.replace("claude/", "");
      gh("pr", "merge", String(pr.number), "-R", REPO, "--merge", "--delete-branch");
      gh("workflow", "run", "publicar.yml", "-R", REPO, "-f", `anunciar=${semana}`);
      return responder(`✅ <b>Aprobada:</b> ${esc(pr.title)}\n\nEn unos minutos queda en el portal y la anuncio en el grupo.`);
    }
    const cambio = texto.match(/^\/?cambios?\s*:?\s*([\s\S]+)/i);
    if (cambio) {
      const pr = await anotarCambio(cambio[1].trim());
      return responder(pr
        ? `📝 Anotado para <b>${esc(pr.title)}</b>. El agente lo aplica en su siguiente revisión (todos los días a las 9:00 am de viernes a domingo) y te aviso cuando esté.`
        : "📝 Anotado. No hay semana pendiente, así que se aplicará al generar la siguiente.");
    }
    if (/^\/?estado\b/.test(t)) {
      const pend = semanasPendientes();
      return responder(pend.length
        ? `📋 Pendiente de aprobar:\n${pend.map((p) => `• ${esc(p.title)}\n  ${p.url}`).join("\n")}\n\nResponde <b>aprobar</b> para publicarla.`
        : "✅ No hay nada pendiente de aprobar. La próxima semana se genera el viernes a las 9:00 am.");
    }
    return responder("Puedo ayudarte con:\n\n• <b>aprobar</b> → publica la semana pendiente y la anuncia en el grupo\n• <b>cambios: …</b> → anoto lo que quieres cambiar y el agente lo corrige\n• <b>estado</b> → te digo qué está pendiente");
  } catch (e) {
    console.log(`Error con el comando del mentor: ${e.message}`);
    return responder("⚠️ No pude completar eso. Inténtalo de nuevo en unos minutos; si sigue fallando, revísalo con Claude.");
  }
}

const { result: novedades = [] } = await api("getUpdates", { timeout: 0, allowed_updates: ["message"] });
let ultimo = 0;
for (const u of novedades) {
  ultimo = u.update_id;
  const m = u.message;
  if (!m) continue;

  // 1. Alguien entró al grupo: bienvenida con botón para registrarse.
  if (m.chat.id === GRUPO && m.new_chat_members) {
    for (const p of m.new_chat_members.filter((x) => !x.is_bot)) {
      await api("sendMessage", {
        chat_id: GRUPO,
        parse_mode: "HTML",
        text: `¡Bienvenido/a, <b>${esc(p.first_name)}</b>! 🎉\n\nToca el botón para recibir tu código personal en privado. Lo vas a usar en el portal para mandar tus entregas.`,
        reply_markup: { inline_keyboard: [[{ text: "🔑 Recibir mi código", url: enlace }]] },
      });
    }
    continue;
  }

  if (m.chat.type !== "private") continue;

  // 2. Compartió su contacto: buscarlo en la lista y mandarle su código.
  if (m.contact) {
    if (m.contact.user_id !== m.from.id) {
      await api("sendMessage", { chat_id: m.chat.id, text: "Necesito tu propio número. Toca el botón “📱 Compartir mi número”." });
      continue;
    }
    const a = alumnos.find((x) => tel10(x.telefono) && tel10(x.telefono) === tel10(m.contact.phone_number));
    if (a) {
      await api("sendMessage", {
        chat_id: m.chat.id,
        parse_mode: "HTML",
        text: `✅ ¡Listo, ${esc(a.nombre.split(" ")[0])}!\n\nTu código personal es: <b>${esc(a.codigo)}</b>\n\nEscríbelo en el portal la primera vez que mandes tu entrega; el portal lo recuerda. No lo compartas.\n\n📚 Portal: ${PORTAL}\n⏰ Cada mañana a las 7:00 publico en el grupo la actividad del día.`,
        reply_markup: { remove_keyboard: true },
      });
      await avisarMentor(`✅ <b>${esc(a.nombre)}</b> (${esc(a.codigo)}) ya recibió su código.`);
    } else {
      await api("sendMessage", {
        chat_id: m.chat.id,
        text: "No encontré tu número en la lista del programa. Ya le avisé a tu mentor; en cuanto te agregue, vuelve a tocar “📱 Compartir mi número”.",
        reply_markup: { keyboard: [[{ text: "📱 Compartir mi número", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
      });
      await avisarMentor(`⚠️ <b>${esc([m.from.first_name, m.from.last_name].filter(Boolean).join(" "))}</b> pidió su código, pero su número (${esc(m.contact.phone_number)}) no está en tu lista de alumnos.`);
    }
    continue;
  }

  // 3. Mensajes del mentor: aprobar, pedir cambios o ver el estado de la semana propuesta.
  if (m.chat.id === MENTOR && m.text && !/^\/start/.test(m.text)) {
    await atenderMentor(m.text.trim());
    continue;
  }

  // 4. Cualquier otro mensaje en privado (/start, /codigo, "hola"…): pedir el número.
  await pedirNumero(m.chat.id);
}

if (ultimo) await api("getUpdates", { offset: ultimo + 1, timeout: 0 });
console.log(`Novedades procesadas: ${novedades.length}`);
