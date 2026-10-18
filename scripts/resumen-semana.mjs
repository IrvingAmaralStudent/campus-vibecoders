// Resume en Markdown una semana (programa/semanas/semana-NN) para la descripción del PR de revisión.
// Uso: node scripts/resumen-semana.mjs semana-02
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const semana = process.argv[2];
const carpeta = path.join(raiz, "programa", "semanas", semana);
const dias = fs.readdirSync(carpeta).filter((f) => f.endsWith(".json")).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(carpeta, f), "utf8")));
if (!dias.length) throw new Error(`No hay días en ${semana}.`);

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const TIPOS = { ver: "Video", leer: "Lectura", curso: "Curso", practica: "Práctica con IA", sinia: "Sin IA", proyecto: "Proyecto", extra: "Extra" };
const IDIOMA = { es: "ES", "en-sub": "EN·sub", en: "EN" };
const nombreDia = (f) => { const [y, m, d] = f.split("-").map(Number); return DIAS[new Date(y, m - 1, d).getDay()]; };

const l = [];
l.push(`## Semana ${dias[0].semana} · ${dias[0].semanaTitulo}`, "");
l.push(`**Fase ${dias[0].fase}** · ${dias[0].fecha} a ${dias[dias.length - 1].fecha}`, "");
l.push(`**Entregable de la semana:** ${dias[0].entregableSemana}`, "");
l.push("> ✅ **Para aprobar:** toca **Aprobar** en el mensaje de esta semana en el chat con el Asistente (o da clic en **Merge pull request** aquí).", ">", "> ✏️ **Para pedir cambios:** toca **Pedir cambios** en ese mensaje, o respóndele con lo que quieras ajustar. El agente lo corrige en minutos y te manda la semana actualizada.", "");
for (const d of dias) {
  const min = d.bloques.filter((b) => b.tipo !== "extra").reduce((s, b) => s + (Number(b.minutos) || 0), 0);
  l.push(`### ${nombreDia(d.fecha)} ${d.fecha.slice(8)} · ${d.titulo} (≈ ${Math.floor(min / 60)} h ${min % 60} min)`, "");
  l.push(d.objetivo, "");
  for (const b of d.bloques) {
    const t = b.url ? `[${b.titulo}](${b.url})` : b.titulo;
    l.push(`- **${TIPOS[b.tipo] || b.tipo}**${b.idioma ? ` (${IDIOMA[b.idioma] || b.idioma})` : ""}: ${t} · ${b.minutos} min`);
  }
  l.push("", `**Entrega:** ${d.entregable}`, "");
}
console.log(l.join("\n"));
