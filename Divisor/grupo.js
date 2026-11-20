/* ===== Lista oficial del grupo =====
   datos/grupos.json guarda cada grupo cifrado (AES-GCM) con una clave que sale del código
   (PBKDF2). No hay índice: se prueba descifrar cada grupo y el que abre es el correcto. */
(function () {
  'use strict';

  const RUTA = '../datos/grupos.json';
  const ITERACIONES = 150000;
  const codificar = new TextEncoder();
  const decodificar = new TextDecoder();

  const aBase64 = (bytes) => {
    let s = '';
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s);
  };
  const deBase64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

  async function derivarClave(codigo, salt) {
    const base = await crypto.subtle.importKey(
      'raw',
      codificar.encode(Tatan.normalizar(codigo)),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERACIONES, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function descifrar(codigo, entrada) {
    try {
      const clave = await derivarClave(codigo, deBase64(entrada.salt));
      const plano = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: deBase64(entrada.iv) },
        clave,
        deBase64(entrada.datos)
      );
      return JSON.parse(decodificar.decode(plano));
    } catch (e) {
      return null; // código incorrecto o entrada dañada
    }
  }

  async function cifrar(codigo, grupo) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const clave = await derivarClave(codigo, salt);
    const datos = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      clave,
      codificar.encode(JSON.stringify(grupo))
    );
    return { salt: aBase64(salt), iv: aBase64(iv), datos: aBase64(new Uint8Array(datos)) };
  }

  // Lanza error si no se pudo leer (sin red y sin copia guardada): así nunca se
  // confunde "no pude leer" con "código incorrecto", ni se publica un archivo incompleto.
  async function leerArchivo() {
    const res = await fetch(RUTA, { cache: 'no-cache' });
    if (res.status === 404) return { version: 1, grupos: [] };
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const archivo = await res.json();
    if (!archivo || !Array.isArray(archivo.grupos)) throw new Error('Formato inválido');
    return archivo;
  }

  /** Devuelve el grupo que abre con ese código, o null si ninguno. */
  async function buscar(codigo) {
    const archivo = await leerArchivo();
    for (const entrada of archivo.grupos) {
      const grupo = await descifrar(codigo, entrada);
      if (grupo) return grupo;
    }
    return null;
  }

  /** Arma el contenido nuevo de grupos.json: reemplaza el grupo de ese código o lo agrega. */
  async function publicar(codigo, grupo) {
    const archivo = await leerArchivo();
    const nueva = await cifrar(codigo, grupo);
    const grupos = [];
    let reemplazada = false;
    for (const entrada of archivo.grupos) {
      if (!reemplazada && (await descifrar(codigo, entrada))) {
        grupos.push(nueva);
        reemplazada = true;
      } else {
        grupos.push(entrada);
      }
    }
    if (!reemplazada) grupos.push(nueva);
    return {
      contenido: JSON.stringify({ version: 1, grupos }, null, 2) + '\n',
      reemplazada,
    };
  }

  window.TatanGrupo = {
    disponible: Boolean(window.crypto && crypto.subtle),
    buscar,
    publicar,
  };
})();
