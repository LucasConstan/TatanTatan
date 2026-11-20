/* ===== Utilidades compartidas de TatanTatan ===== */
(function () {
  'use strict';

  const PREFIJO = 'tatan.v1.';
  // Ruta de este script: sirve para ubicar sw.js en la raíz del sitio,
  // tanto si está publicado en "/" como en un subdirectorio.
  const RAIZ = new URL('../', document.currentScript.src);

  // ===== Almacenamiento (localStorage puede fallar: modo privado, bloqueado, lleno) =====
  function leer(clave) {
    try {
      const valor = localStorage.getItem(PREFIJO + clave);
      return valor ? JSON.parse(valor) : null;
    } catch (e) {
      return null;
    }
  }

  function guardar(clave, valor) {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    } catch (e) {
      /* sin persistencia: la app sigue funcionando en memoria */
    }
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ===== Hash para los códigos secretos (ofuscación, no seguridad) =====
  function normalizar(texto) {
    return String(texto)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  function hash(texto) {
    return cyrb53('tatan:' + normalizar(texto), 2026).toString(16).padStart(14, '0');
  }

  // ===== Aviso flotante =====
  let toastEl = null;
  let toastTimer = null;

  function toast(mensaje, opciones) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = '';
    const texto = document.createElement('span');
    texto.textContent = mensaje;
    toastEl.appendChild(texto);

    if (opciones && opciones.accion) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = opciones.accion;
      boton.addEventListener('click', () => {
        ocultarToast();
        opciones.alHacer();
      });
      toastEl.appendChild(boton);
    }

    clearTimeout(toastTimer);
    // forzar reflow para reiniciar la animación
    void toastEl.offsetWidth;
    toastEl.classList.add('visible');
    toastTimer = setTimeout(ocultarToast, opciones && opciones.accion ? 5000 : 2500);
  }

  function ocultarToast() {
    if (toastEl) toastEl.classList.remove('visible');
  }

  // ===== Compartir =====
  const esCelular = window.matchMedia('(pointer: coarse)').matches;

  async function compartirTexto(texto) {
    if (esCelular && navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    // Escritorio (o sin Web Share): copiar y abrir WhatsApp Web.
    try {
      await navigator.clipboard.writeText(texto);
      toast('Equipos copiados');
    } catch (e) {
      /* sin portapapeles: queda el link de WhatsApp */
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  }

  async function compartirArchivo(blob, nombre, titulo) {
    const archivo = new File([blob], nombre, { type: blob.type });
    if (esCelular && navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: titulo });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ===== App instalable (PWA) =====
  const contextoSeguro =
    location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if ('serviceWorker' in navigator && contextoSeguro) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('sw.js', RAIZ)).catch(() => {});
    });
  }

  // Botón "Instalar" (Android / Chrome escritorio) y ayuda para iPhone, solo si la página los tiene.
  const btnInstalar = document.getElementById('btnInstalar');
  const ayudaIOS = document.getElementById('ayudaIOS');
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let eventoInstalar = null;

  if (btnInstalar) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      eventoInstalar = e;
      btnInstalar.hidden = false;
    });
    btnInstalar.addEventListener('click', async () => {
      if (!eventoInstalar) return;
      eventoInstalar.prompt();
      await eventoInstalar.userChoice.catch(() => {});
      eventoInstalar = null;
      btnInstalar.hidden = true;
    });
    window.addEventListener('appinstalled', () => {
      btnInstalar.hidden = true;
    });
  }

  if (ayudaIOS && !instalada && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
    ayudaIOS.hidden = false;
  }

  window.Tatan = {
    leer,
    guardar,
    id,
    hash,
    normalizar,
    toast,
    compartirTexto,
    compartirArchivo,
  };
})();
