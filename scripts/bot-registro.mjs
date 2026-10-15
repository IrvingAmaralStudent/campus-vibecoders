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

  // 3. Cualquier otro mensaje en privado (/start, /codigo, "hola"…): pedir el número.
  await pedirNumero(m.chat.id);
}

if (ultimo) await api("getUpdates", { offset: ultimo + 1, timeout: 0 });
console.log(`Novedades procesadas: ${novedades.length}`);
