# Sitio de Nicolás Manú (NewCo)

Sitio estático para Nicolás Manú: planeación y estrategia financiera para PyMEs en Colombia. HTML, CSS y JS puros, sin build. Netlify publica `main` automáticamente, así que todo lo que llega a `main` queda en vivo.

## Cómo trabajamos
- Idioma: español. Trato de "tú", nunca voseo. Siempre "Nicolás Manú", nunca "Nico".
- Tono directo y seguro, sin rodeos ni frases de relleno.
- No usar rayas largas (—) en textos publicados. En el copy del sitio se escribe en plural ("nosotros") cuando habla el negocio, y de "tú" al lector.
- Antes de publicar cambios visibles, mostrar el resultado a Nicolás y esperar su visto bueno. Nada va a `main` sin revisión conjunta.
- Si Nicolás pide solo una respuesta o un texto, no tocar el repo.
- GitHub se usa con `gh` (CLI oficial), con sesión iniciada una vez en el Mac de Nicolás y token guardado en el llavero de macOS. Claude puede hacer push de ramas, abrir PRs y leer deploy previews sin pedir permiso cada vez. Lo que nunca cambia: nada se fusiona a `main` sin el visto bueno de Nicolás, y ningún token se escribe en archivos, en el repo ni en el chat.

## Estructura
- `index.html`: home (hero con video, Sobre mí, Cómo trabajamos, Herramientas, footer).
- `assets/css/main.css` y `assets/js/main.js`: estilos y comportamiento de la home.
- `herramientas/<nombre>/{index.html,style.css,script.js}`: una carpeta por herramienta (punto-de-equilibrio, simulador-credito, costeo).
- `_headers`: política de seguridad de Netlify.

## Seguridad (CSP del `_headers`)
La política es `default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' https://d8j0ntlcm91z4.cloudfront.net; connect-src 'self'`. Consecuencias:
- Prohibido `<script>` o `<style>` dentro del HTML, atributos `style=""` y handlers como `onclick`. Todo va en archivos externos con `addEventListener` y clases CSS.
- Para estilos dinámicos usar clases o `el.style.propiedad = ...` desde JS.
- Una fuente, imagen o video nuevo de otro dominio exige ampliar el CSP en `_headers`, y eso se avisa a Nicolás.

## Marca
- Colores: navy `#0A0A16`, navy 2 `#151A33`, azul eléctrico `#64CEFB`, blanco hueso `#F4F6FA`. Semáforo de herramientas: verde `#4ADE80`, amarillo `#FACC15`, rojo `#F87171`.
- Tipografía web: Inter. Los botones principales (CTA) van en azul eléctrico sobre navy.
- Estilo: oscuro, limpio, corporativo. Las herramientas replican el look de la home.

## Negocio y contenido
- Servicios ("Cómo trabajamos"): Punto de partida (diagnóstico), Ruta (proyecto de 2 o 3 meses), Copiloto (acompañamiento mensual), Asesoría Particular (sesión puntual), Optimización con IA (automatización).
- No se publican precios. Se cotiza por WhatsApp.
- WhatsApp: `https://wa.me/573503462481?text=<mensaje codificado>`. Mensaje por defecto: "Hola Nicolás, vi tu página y me gustaría conversar sobre tus servicios, gracias!".
- Instagram: https://www.instagram.com/nico.nomics/ · TikTok: https://www.tiktok.com/@nico.nomics_
- Las herramientas no capturan datos de usuarios. Lo que se guarda va en `localStorage` del navegador.
- Fuente de verdad del contenido y del diseño: Notion, en Cortex → NewCo → B2B (servicios, Pricing, tesis y la hoja "Página Web").

## Agregar una herramienta
1. Crear `herramientas/<slug>/` con `index.html`, `style.css` y `script.js` (sin nada inline).
2. Agregar su tarjeta en `#herramientas` de `index.html`, dentro de `.tools-grid` y antes de la tarjeta "Próximamente":
   `<div class="tool-card"><h3>…</h3><p>…</p><a href="/herramientas/<slug>/" class="tool-link">Ir a … <svg …/></a></div>`
3. Incluir enlace de regreso a `/`, enlace a `/#herramientas` en el pie, y un bloque final que lleve a WhatsApp.

## Cómo probar
No hay build. Servir la carpeta con un servidor local que envíe el mismo CSP de `_headers` y abrir con Playwright en celular (390 px) y en 320 px. Verificar que no haya errores de consola ni violaciones de CSP, y que no haya scroll horizontal.

## Commits
Mensajes en español, cortos y descriptivos.
