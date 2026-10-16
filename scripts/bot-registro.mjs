// Bot de registro: da la bienvenida a quien entra al grupo y le entrega su código personal
// cuando comparte su número en privado. Si el número no está en la lista del mentor y la persona está
// en el grupo, le pide su nombre, le genera un código y lo guarda cifrado (scripts/registro.mjs). Lo ejecuta la GitHub Action "Bot de registro", que se queda
// escuchando ~50 minutos (MINUTOS) y luego se relanza sola, así responde en segundos.
//
// Secretos que usa:
//   TELEGRAM_BOT_TOKEN  token del bot
//   GROUP_CHAT_ID       grupo del programa
//   MENTOR_CHAT_ID      chat privado del mentor, para avisarle
//   ALUMNOS             JSON [{codigo, nombre, telefono}] (lo sube contenido/sincronizar-alumnos.js)
//   REGISTRO_KEY        llave (32 bytes en base64) para cifrar programa/registro.json
//
// No guarda estado propio: al pedir las novedades con "offset", Telegram las da por leídas.
// Sin MINUTOS (o 0) atiende lo pendiente una sola vez y termina.

import { execFileSync } from "node:child_process";
import { crearRegistro } from "./registro.mjs";

const { TELEGRAM_BOT_TOKEN: token, GROUP_CHAT_ID, MENTOR_CHAT_ID, ALUMNOS } = process.env;
if (!token) throw new Error("Falta el secreto TELEGRAM_BOT_TOKEN.");
const GRUPO = Number(GROUP_CHAT_ID);
const MENTOR = Number(MENTOR_CHAT_ID);
const PORTAL = "https://irvingamaralstudent.github.io/campus-vibecoders/";
const alumnos = JSON.parse(ALUMNOS || "[]");
const registro = crearRegistro({ llave: process.env.REGISTRO_KEY, repo: process.env.GITHUB_REPOSITORY, ghToken: process.env.GH_TOKEN });
await registro.cargar();

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
// Menú "/" del chat del mentor (los alumnos solo ven /codigo).
if (MENTOR) await api("setMyCommands", {
  scope: { type: "chat", chat_id: MENTOR },
  commands: [
    { command: "estado", description: "Qué está pendiente de aprobar" },
    { command: "aprobar", description: "Publicar la semana pendiente" },
    { command: "cambios", description: "Pedir cambios a la semana (escribe: cambios: …)" },
    { command: "generar", description: "Arrancar al agente ya" },
    { command: "aviso", description: "Publicar en el grupo la actividad de hoy" },
  ],
});
const enlace = `https://t.me/${me.username}?start=registro`;
const pedirNumero = (chat) => api("sendMessage", {
  chat_id: chat,
  parse_mode: "HTML",
  text: "👋 ¡Hola! Para darte tu <b>código personal</b> del programa, toca el botón de abajo y comparte tu número.\n\nSolo se usa para identificarte en la lista de tu mentor.",
  reply_markup: { keyboard: [[{ text: "📱 Compartir mi número", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
});

// --- Registro.
const nombreTelegram = (u) => [u.first_name, u.last_name].filter(Boolean).join(" ");
const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Nombre válido: solo letras, al menos dos palabras. Se devuelve con mayúscula inicial en cada palabra.
function limpiarNombre(txt) {
  const t = txt.trim().replace(/\s+/g, " ");
  if (t.length > 60 || !/^[\p{L}' .-]+$/u.test(t) || t.split(" ").filter((w) => w.length > 1).length < 2) return "";
  return t.split(" ").map((w) => w.charAt(0).toLocaleUpperCase("es") + w.slice(1).toLocaleLowerCase("es")).join(" ");
}
// Coinciden si todas las palabras del nombre más corto aparecen en el otro (al menos dos).
function mismoNombre(a, b) {
  const pa = sinAcentos(a).split(/\s+/).filter(Boolean), pb = sinAcentos(b).split(/\s+/).filter(Boolean);
  const [corto, largo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  return corto.length >= 2 && corto.every((w) => largo.includes(w));
}
function nuevoCodigo(usados) {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    const c = "VC-" + Array.from(crypto.getRandomValues(new Uint8Array(3)), (n) => letras[n % letras.length]).join("");
    if (!usados.has(c)) return c;
  }
}
async function estaEnGrupo(id) {
  const r = await api("getChatMember", { chat_id: GRUPO, user_id: id });
  return r.ok && ["creator", "administrator", "member", "restricted"].includes(r.result.status);
}
async function entregarCodigo(chat, nombre, codigo, nota, nuevo = false) {
  await api("sendMessage", {
    chat_id: chat,
    parse_mode: "HTML",
    text: `✅ ¡Listo, ${esc(nombre.split(" ")[0])}!

Tu código personal es: <b>${esc(codigo)}</b>

Escríbelo en el portal la primera vez que mandes tu entrega; el portal lo recuerda. No lo compartas.

📚 Portal: ${PORTAL}
⏰ Cada mañana a las 7:00 publico en el grupo la actividad del día.`,
    reply_markup: { remove_keyboard: true },
  });
  await avisarMentor(nuevo
    ? `🆕 <b>${esc(nombre)}</b> se registró y recibió el código <b>${esc(codigo)}</b>.

Si no es alumno del programa, sácalo del grupo y pídele a Claude que lo dé de baja.`
    : `✅ <b>${esc(nombre)}</b> (${esc(codigo)}) ya recibió su código${nota}.`);
}

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
        ? `📝 Anotado para <b>${esc(pr.title)}</b>. El agente lo aplica en su siguiente revisión (viernes a domingo a las 9:00 am) y te aviso cuando esté. Si no quieres esperar, escribe <b>generar</b>.`
        : "📝 Anotado. No hay semana pendiente, así que se aplicará al generar la siguiente.");
    }
    if (/^\/?aviso\b/.test(t)) {
      gh("workflow", "run", "aviso-diario.yml", "-R", REPO);
      return responder("📣 Listo, en un minuto publico en el grupo la actividad de hoy (si hay una publicada).");
    }
    if (/^\/?generar\b/.test(t)) {
      gh("workflow", "run", "generar-semana.yml", "-R", REPO);
      return responder("🤖 Arranqué al agente. Si hay cambios tuyos pendientes los aplica; si toca preparar la semana siguiente, la prepara. Tarda unos 10 a 20 minutos y te aviso aquí cuando haya algo que revisar. Si no había nada que hacer, no te llega mensaje.");
    }
    if (/^\/?estado\b/.test(t)) {
      const pend = semanasPendientes();
      return responder(pend.length
        ? `📋 Pendiente de aprobar:\n${pend.map((p) => `• ${esc(p.title)}\n  ${p.url}`).join("\n")}\n\nResponde <b>aprobar</b> para publicarla.`
        : "✅ No hay nada pendiente de aprobar. La próxima semana se genera el viernes a las 9:00 am.");
    }
    return responder("Puedo ayudarte con:\n\n• <b>aprobar</b> → publica la semana pendiente y la anuncia en el grupo\n• <b>cambios: …</b> → anoto lo que quieres cambiar y el agente lo corrige\n• <b>generar</b> → arranco al agente ya, sin esperar al fin de semana\n• <b>aviso</b> → publico en el grupo la actividad de hoy\n• <b>estado</b> → te digo qué está pendiente");
  } catch (e) {
    console.log(`Error con el comando del mentor: ${e.message}`);
    return responder("⚠️ No pude completar eso. Inténtalo de nuevo en unos minutos; si sigue fallando, revísalo con Claude.");
  }
}

async function atender(u) {
  const m = u.message;
  if (!m) return;

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
    return;
  }

  if (m.chat.type !== "private") return;

  // 2. Compartió su contacto: si ya está en la lista o ya se registró, le da su código; si es nuevo, le pide su nombre.
  if (m.contact) {
    if (m.contact.user_id !== m.from.id) {
      await api("sendMessage", { chat_id: m.chat.id, text: "Necesito tu propio número. Toca el botón “📱 Compartir mi número”." });
      return;
    }
    const tel = tel10(m.contact.phone_number);
    const a = alumnos.find((x) => tel10(x.telefono) && tel10(x.telefono) === tel);
    if (a) return entregarCodigo(m.chat.id, a.nombre, a.codigo, "");
    const r = registro.porTelefono(tel);
    if (r && r.estado === "activo") return entregarCodigo(m.chat.id, registro.datos(r).nombre, r.codigo, "");
    if (!(await estaEnGrupo(m.from.id))) {
      await api("sendMessage", { chat_id: m.chat.id, text: "Todavía no estás en el grupo del programa. Pídele a tu mentor que te agregue y vuelve a escribirme.", reply_markup: { remove_keyboard: true } });
      await avisarMentor(`⚠️ <b>${esc(nombreTelegram(m.from))}</b> quiso registrarse, pero no está en el grupo.`);
      return;
    }
    await registro.pendiente(m.from.id, tel, m.contact.phone_number);
    await api("sendMessage", {
      chat_id: m.chat.id,
      parse_mode: "HTML",
      text: "📝 ¡Gracias! Ahora escríbeme tu <b>nombre completo</b> (nombre y apellido), tal como quieres que te identifique tu mentor.",
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  // 3. Está registrándose y escribió su nombre: generar su código.
  const pend = registro.porUsuario(m.from.id);
  if (pend && pend.estado === "pendiente" && m.text && !m.text.startsWith("/")) {
    const nombre = limpiarNombre(m.text);
    if (!nombre) {
      await api("sendMessage", { chat_id: m.chat.id, parse_mode: "HTML", text: "Escríbeme tu <b>nombre y apellido</b>, solo con letras. Por ejemplo: <i>Ana López</i>" });
      return;
    }
    // Si coincide con alguien de la lista del mentor que aún no tiene teléfono, se queda con su código.
    const ocupados = new Set(registro.codigos());
    const previo = alumnos.find((x) => !tel10(x.telefono) && !ocupados.has(x.codigo) && mismoNombre(x.nombre, nombre));
    const codigo = previo ? previo.codigo : nuevoCodigo(new Set([...ocupados, ...alumnos.map((x) => x.codigo)]));
    await registro.activar(pend, codigo, previo ? previo.nombre.trim() : nombre);
    return entregarCodigo(m.chat.id, previo ? previo.nombre.trim() : nombre, codigo, previo ? " (lo reconocí por su nombre en tu lista)" : "", !previo);
  }

  // 4. Mensajes del mentor: aprobar, pedir cambios o ver el estado de la semana propuesta.
  if (m.chat.id === MENTOR && m.text && !/^\/start/.test(m.text)) {
    await atenderMentor(m.text.trim());
    return;
  }

  // 5. Cualquier otro mensaje en privado (/start, /codigo, "hola"…): pedir el número.
  await pedirNumero(m.chat.id);
}

const hasta = Date.now() + Number(process.env.MINUTOS || 0) * 60_000;
let offset, total = 0;
do {
  try {
    const espera = Math.max(0, Math.min(50, Math.floor((hasta - Date.now()) / 1000)));
    const { result: novedades = [] } = await api("getUpdates", { offset, timeout: espera, allowed_updates: ["message"] });
    for (const u of novedades) {
      offset = u.update_id + 1;
      total++;
      await atender(u);
    }
  } catch (e) {
    console.log(`Error al atender novedades: ${e.message}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
} while (Date.now() < hasta);

// Confirma a Telegram lo ya atendido para que no se repita en la siguiente ejecución.
if (offset) await api("getUpdates", { offset, timeout: 0 });
console.log(`Novedades procesadas: ${total}`);
