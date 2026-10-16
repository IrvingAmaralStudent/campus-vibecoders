// Registro de alumnos que se dan de alta solos con el bot. Se guarda en programa/registro.json,
// dentro del repo público, así que nombres y teléfonos van cifrados (AES-256-GCM) con la llave REGISTRO_KEY.
// Para buscar sin descifrar se guardan huellas (HMAC) del teléfono y del usuario de Telegram.
//
// Cada registro: { codigo, estado: "pendiente" | "activo", fecha, t: huella del teléfono, u: huella del usuario,
//                  d: { nombre, telefono } cifrado }
// "pendiente" = ya compartió su número y falta que escriba su nombre.
import crypto from "node:crypto";

const RUTA = "programa/registro.json";

export function crearRegistro({ llave, repo, ghToken }) {
  if (!llave) throw new Error("Falta el secreto REGISTRO_KEY.");
  const k = Buffer.from(llave, "base64");
  if (k.length !== 32) throw new Error("REGISTRO_KEY debe ser de 32 bytes en base64.");
  const huella = (tipo, valor) => crypto.createHmac("sha256", k).update(`${tipo}:${valor}`).digest("base64url").slice(0, 22);
  const cifrar = (obj) => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", k, iv);
    const datos = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), datos]).toString("base64");
  };
  const descifrar = (txt) => {
    const b = Buffer.from(txt, "base64");
    const d = crypto.createDecipheriv("aes-256-gcm", k, b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
  };

  // --- Lectura y escritura en el repo con la API de contenidos (no dispara otros workflows).
  const url = `https://api.github.com/repos/${repo}/contents/${RUTA}`;
  const headers = { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json", "User-Agent": "campus-vibecoders" };
  let lista = [], sha;
  async function cargar() {
    const r = await fetch(`${url}?ref=main`, { headers });
    if (r.status === 404) { lista = []; sha = undefined; return; }
    if (!r.ok) throw new Error(`No pude leer el registro (${r.status}).`);
    const j = await r.json();
    lista = JSON.parse(Buffer.from(j.content, "base64").toString("utf8"));
    sha = j.sha;
  }
  async function guardar(mensaje) {
    const contenido = Buffer.from(JSON.stringify(lista, null, 1) + "\n", "utf8").toString("base64");
    const r = await fetch(url, { method: "PUT", headers, body: JSON.stringify({ message: mensaje, content: contenido, sha, branch: "main" }) });
    if (!r.ok) throw new Error(`No pude guardar el registro (${r.status}).`);
    sha = (await r.json()).content.sha;
  }

  return {
    cargar,
    porTelefono: (tel10) => lista.find((x) => x.t === huella("t", tel10)),
    porUsuario: (id) => lista.find((x) => x.u === huella("u", id)),
    codigos: () => lista.map((x) => x.codigo).filter(Boolean),
    datos: (x) => descifrar(x.d),
    async pendiente(id, tel10, telefono) {
      lista = lista.filter((x) => !(x.estado === "pendiente" && (x.u === huella("u", id) || x.t === huella("t", tel10))));
      lista.push({ estado: "pendiente", fecha: new Date().toISOString(), t: huella("t", tel10), u: huella("u", id), d: cifrar({ telefono }) });
      await guardar("Registro: número recibido");
    },
    async activar(x, codigo, nombre) {
      const { telefono } = descifrar(x.d);
      Object.assign(x, { estado: "activo", codigo, fecha: new Date().toISOString(), d: cifrar({ nombre, telefono }) });
      await guardar(`Registro: alta de ${codigo}`);
    },
  };
}
