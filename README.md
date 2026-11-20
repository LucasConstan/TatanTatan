# TatanTatan

App web para el fútbol con amigos. Es un sitio estático (HTML, CSS y JS sin dependencias ni build), pensado para el celular e instalable como app.

- **Divisor de equipos**: marcás quién juega, y arma dos equipos al azar o equilibrados por nivel (1–5). Los equipos se pueden compartir por WhatsApp o pasar directo a la cancha.
- **Plantilla**: pizarra con fichas que se arrastran por la cancha. Se puede exportar como imagen.

## Probar en la compu

```bash
python3 -m http.server 8000
```

y abrir <http://localhost:8000>. Abrir los `.html` con doble clic también anda, pero sin modo offline y sin exportar la imagen (el navegador lo bloquea en `file://`).

## Estructura

```
index.html / index.css      menú
comun/base.css              estilos compartidos (colores en :root)
comun/app.js                utilidades: guardado, avisos, compartir, hash, registro del service worker
Divisor/                    divisor de equipos
Plantilla/                  pizarra
sw.js, manifest.webmanifest app instalable y offline
img/s/                      stickers (nombre = hash del código)
```

## Datos

Todo se guarda en el `localStorage` del navegador: cada celular tiene su propia lista de jugadores, niveles y plantilla. Compartir la misma lista entre todos necesitaría un backend.

## Stickers secretos

En la Plantilla, ciertos códigos muestran un sticker en vez de una ficha con el nombre. El código no aparece en ningún archivo: solo se guarda su hash.

Para agregar uno:

1. Con la app abierta, en la consola del navegador: `Tatan.hash('elcodigo')` → devuelve algo como `'0a1b2c3d4e5f60'`. (Mayúsculas, tildes y espacios a los costados no importan.)
2. Guardá la imagen (cuadrada, fondo transparente, ~512 px) como `img/s/<hash>.webp`. Para convertir un PNG:
   ```bash
   python3 -c "from PIL import Image; Image.open('foto.png').save('img/s/<hash>.webp', quality=85)"
   ```
3. Agregá `'<hash>': {},` al objeto `STICKERS` de `Plantilla/Plantilla.js` (`{ chico: true }` si es algo chico, como la pelota).
4. Opcional, para que esté disponible sin señal desde el primer uso: sumá la ruta a `PRECACHE` en `sw.js`.

Ojo: esto es ofuscación, no seguridad. Cualquiera que mire el tráfico de red ve las imágenes, y un código corto se puede adivinar probando.

## Actualizaciones y modo offline

El service worker trae primero de la red las páginas, CSS y JS (si no hay señal o tarda más de 3 s, usa la copia guardada), así que los cambios publicados se ven solos. Las imágenes se sirven desde la copia guardada: si **reemplazás** una imagen existente con el mismo nombre, subí `VERSION` en `sw.js`.
