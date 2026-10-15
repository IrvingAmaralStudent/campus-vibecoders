# Plan del programa Campus Vibecoders

Este archivo es la guía que sigue el agente que genera cada semana. El mentor puede editarlo cuando quiera; los cambios aplican desde la siguiente semana generada.

## Objetivo

Formar a un grupo pequeño (unas 5 personas, en su mayoría estudiantes) para que construyan software real con IA (Claude Code) y entiendan lo suficiente de arquitectura para supervisar a la IA. Al final, cada persona debe poder recibir un requerimiento, explorar un repositorio con Claude Code, proponer un plan, implementarlo en una rama con pruebas, abrir un pull request claro y explicar con sus palabras el código que entrega.

Principios:

1. **Construir desde el día 1.** Cada semana termina con algo que corre.
2. **Entender lo suficiente, no todo.** Fundamentos justos para supervisar a la IA.
3. **La IA escribe, la persona responde.** Nada se entrega sin poder explicarlo; por eso cada día hay un reto sin IA y una explicación con sus palabras.

## Ritmo

- Lunes a viernes: entre 2 h y 2 h 30 min por día (sin contar extras).
- Sábado: "laboratorio" de unas 3 h, enfocado en el proyecto personal o en integrar lo de la semana.
- Domingo: descanso. No se genera día.
- Cada semana va de lunes a sábado (6 días).

## Ruta por semanas

El programa dura unas 16 semanas (0 a 15). Las compuertas se evalúan en vivo por el mentor; el contenido solo prepara para ellas.

| Semana | Fase | Tema | Entregable de la semana |
|---|---|---|---|
| 0 | 1 | Puesta a punto: herramientas y mentalidad | Claude Code instalado, repo sandbox en GitHub, página personal |
| 1 | 1 | Claude Code y el ciclo pedir-revisar-probar | Gestor de gastos en TypeScript con localStorage, CLAUDE.md, README y primer PR |
| 2 | 1 | Cómo funciona una app web: HTTP, JSON, cliente y servidor, API REST, SQL básico | API en Node + SQLite con CRUD completo y frontend mínimo que la consume. **Compuerta 1 (Fundamentos)** al cerrar la semana |
| 3 | 2 | Backend en .NET I: C# esencial, ASP.NET Core Web API | La API de la semana 2 reescrita en ASP.NET Core |
| 4 | 2 | Backend en .NET II: Entity Framework Core, migraciones, inyección de dependencias, SQL en Docker | API .NET con EF Core y PostgreSQL o SQL Server en Docker |
| 5 | 2 | Frontend en Angular I: componentes, servicios, routing | Frontend Angular que lista y crea registros contra la API |
| 6 | 2 | Frontend en Angular II: formularios reactivos, manejo de errores, autenticación con JWT | App completa con login JWT |
| 7 | 2 | Pruebas y calidad: xUnit, pruebas de Angular, pedir pruebas antes que código, linting, CI con GitHub Actions | Suite de pruebas y CI que corre en cada PR |
| 8 | 2 | Arquitectura de software I: capas, Clean Architecture ligera, repositorio, servicio, DTO, y cuándo NO usarlos | Refactor a capas y documento de arquitectura de una página con diagrama. **Compuerta 2 (Stack)** |
| 9 | 3 | Trabajar en código ajeno: explorar un repo desconocido con Claude Code, leer código de otros, flujo de PR y revisión entre pares | Primer cambio a un proyecto open source o al proyecto de equipo que asigne el mentor |
| 10 | 3 | Nube con capas gratuitas: variables de entorno, secretos, logs, despliegue continuo (GitHub Pages, Render, Azure for Students u opciones gratuitas similares) | Proyecto personal desplegado con CD |
| 11 | 3 | Seguridad y datos: OWASP Top 10 aplicado, validación, autorización por rol, migraciones seguras | Auditoría de seguridad asistida por IA con correcciones. **Compuerta 3 (Proyecto real)** |
| 12 | 4 | Ritmo de equipo: tickets, estimación, comunicar bloqueos, revisar PRs de compañeros | 2 o 3 tickets cerrados en el proyecto de equipo |
| 13 | 4 | Agentes y automatización: subagentes, skills, MCP y hooks en Claude Code | Una automatización útil para el grupo |
| 14 | 4 | Proyecto integrador I: MVP desde cero con todo el stack | MVP funcionando y documentado |
| 15 | 4 | Proyecto integrador II: despliegue, demo y retrospectiva | Demo al grupo y plan personal siguiente. **Compuerta 4 (Autonomía)** |

Proyecto personal: lo eligen en el laboratorio de la semana 1 (PROYECTO.md) y lo van reconstruyendo con el stack de cada fase en los sábados.

## Formato de cada día

Cada día es un archivo `programa/semanas/semana-NN/AAAA-MM-DD.json` con esta forma:

```json
{
  "fecha": "2026-10-26",
  "semana": 2,
  "fase": 1,
  "semanaTitulo": "Tema de la semana",
  "entregableSemana": "Lo que entregan al cerrar la semana",
  "titulo": "Título corto del día",
  "objetivo": "Una o dos frases: qué van a poder hacer al terminar el día.",
  "bloques": [
    { "tipo": "leer", "idioma": "es", "titulo": "…", "url": "https://…", "minutos": 20, "detalle": "Qué leer y en qué fijarse." }
  ],
  "entregable": "Qué entregan hoy y qué escriben en la explicación.",
  "pregunta": "Pregunta de reflexión del día.",
  "whatsapp": "Texto del aviso diario (ver formato abajo)."
}
```

Tipos de bloque (`tipo`): `ver` (video), `leer`, `curso`, `practica` (práctica con IA), `sinia` (reto sin IA), `proyecto`, `extra` (opcional, no cuenta en el tiempo del día).

Idioma (`idioma`, obligatorio en bloques con `url`): `es`, `en-sub` (inglés con subtítulos en español), `en` (solo inglés).

Reglas de contenido:

- **Español primero.** Usa material en inglés solo si es muy bueno y tiene subtítulos (`en-sub`); en el `detalle` explica cómo activarlos ("⚙ Configuración → Subtítulos → Traducir automáticamente → Español"). Material solo en inglés va únicamente como `extra`.
- **Solo recursos gratuitos.** Nada de cursos de pago.
- **Recursos de confianza:** documentación oficial (Claude Code en `https://code.claude.com/docs/es/…`, docs de Claude en `https://platform.claude.com/docs/es/…`, Microsoft Learn en español, MDN en español, angular.dev), freeCodeCamp Español, MoureDev, midudev, Sergie Code, Fazt y canales similares reconocidos.
- **Verifica cada link** antes de usarlo: que responda 200. Para YouTube usa `https://www.youtube.com/oembed?url=<link>&format=json` y confirma título y canal. Nunca inventes un link o un ID de video.
- **Cada día de lunes a viernes:** 4 o 5 bloques, al menos uno de práctica con Claude Code y, casi siempre, un reto `sinia` para entrenar el criterio propio.
- **Sábado:** laboratorio con un bloque `proyecto` largo.
- Las prácticas son concretas: qué pedirle a Claude Code, qué revisar del resultado y qué hacer con Git (rama, commit, PR).
- Los repos de los alumnos son en **GitHub** personal.
- **Contenido genérico:** no menciones empresas, clientes ni al mentor por nombre.
- `minutos` realistas; la suma de los bloques que no son `extra` debe dar entre 120 y 150 min (sábado hasta 180).

Formato del campo `whatsapp` (es el aviso diario que publica el bot; `*texto*` sale en negritas):

```
*Vibecoders · {titulo}*
{Día de la semana} {día} de {mes}

{objetivo}

⏱ ≈ {X} h {Y} min
✅ Entrega: {resumen corto de la entrega}

Todo el material y tu checklist aquí 👉 {link}
```

`{link}` se deja literal; el sistema lo reemplaza.

## Notas del mentor

Antes de generar una semana, lee `programa/notas-mentor.md`: ahí el mentor deja ajustes (por ejemplo, "el grupo va lento, bajar carga" o "reforzar Git"). Las notas tienen prioridad sobre este plan.
