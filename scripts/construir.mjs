// Arma el sitio en dist/ a partir de las semanas aprobadas (programa/semanas/**) y la plantilla del portal.
// Lo usan las Actions de publicación y del aviso diario. Uso local: node scripts/construir.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = (...p) => path.join(raiz, ...p);
const config = JSON.parse(fs.readFileSync(dir("programa", "config.json"), "utf8"));

const dias = [];
for (const s of fs.readdirSync(dir("programa", "semanas")).filter((d) => /^semana-\d+$/.test(d)).sort()) {
  for (const f of fs.readdirSync(dir("programa", "semanas", s)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) {
    dias.push(JSON.parse(fs.readFileSync(dir("programa", "semanas", s, f), "utf8")));
  }
}
dias.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

const embebido = JSON.stringify({ portalUrl: config.portalUrl, formUrl: config.formUrl, dias }).replace(/</g, "\\u003c");
const plantilla = fs.readFileSync(dir("portal", "plantilla.html"), "utf8");
const cuerpo = plantilla.replace(/\/\*CONTENIDO\*\/[\s\S]*?\/\*FIN\*\//, () => "/*CONTENIDO*/" + embebido + "/*FIN*/");

fs.mkdirSync(dir("dist"), { recursive: true });
fs.writeFileSync(dir("dist", "index.html"),
  '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<meta name="robots" content="noindex"><style>[hidden]{display:none!important}img{max-width:100%}body{margin:0}</style></head><body>' +
  cuerpo + "</body></html>");
fs.writeFileSync(dir("dist", "contenido.json"), JSON.stringify({
  portalUrl: config.portalUrl,
  dias: dias.map((d) => ({ fecha: d.fecha, semana: d.semana, semanaTitulo: d.semanaTitulo, titulo: d.titulo, aviso: d.whatsapp })),
}, null, 2));
fs.writeFileSync(dir("dist", ".nojekyll"), "");
console.log(`Sitio armado en dist/: ${dias.length} días publicados (${dias[0]?.fecha || "—"} a ${dias[dias.length - 1]?.fecha || "—"}).`);
