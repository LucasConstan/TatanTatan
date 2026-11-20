(function () {
  'use strict';

  // Stickers secretos: solo se guardan los hashes de los códigos (ver README).
  const STICKERS = {
    '02d35cbbbbf96b': {},
    '03b067e501f0f7': {},
    '069b4b17c0ca8a': {},
    '0775a6a49da720': {},
    '0a9cf1004156c6': {},
    '0b2281d1d1ac70': { chico: true },
    '0c1b786ce8069c': {},
    '0c78384baf2a9f': {},
    '0ede129a552a35': {},
    '13d72455287a7f': {},
    '1479025b136923': {},
    '18a2d7d80cd701': {},
    '1b0432a7547144': {},
    '1d440844e73f14': {},
  };
  const rutaSticker = (hash) => `../img/s/${hash}.webp`;

  // Formaciones por cantidad de jugadores, para el equipo de abajo (y en % de la cancha).
  // El primero es el arquero. El equipo de arriba usa las mismas, espejadas.
  const FORMACIONES = {
    1: [[50, 90]],
    2: [[50, 92], [50, 66]],
    3: [[50, 92], [30, 68], [70, 68]],
    4: [[50, 92], [28, 76], [72, 76], [50, 61]],
    5: [[50, 92], [27, 78], [73, 78], [33, 62], [67, 62]],
    6: [[50, 93], [22, 80], [78, 80], [50, 73], [30, 60], [70, 60]],
    7: [[50, 93], [18, 81], [50, 83], [82, 81], [30, 70], [70, 70], [50, 59]],
  };

  // Lugares donde aparecen las fichas nuevas (se usa el primero libre).
  const LUGARES_NUEVOS = [
    [50, 50], [28, 50], [72, 50], [50, 42], [50, 58], [28, 42], [72, 42],
    [28, 58], [72, 58], [18, 50], [82, 50], [18, 42], [82, 42], [18, 58], [82, 58],
  ];

  const LIMITE_MIN = 3;
  const LIMITE_MAX = 97;
  const UMBRAL_ARRASTRE = 6; // px antes de considerar que es un arrastre y no un toque

  const cancha = document.getElementById('cancha');
  const papelera = document.getElementById('papelera');
  const form = document.getElementById('formJugador');
  const input = document.getElementById('nombreJugador');

  let fichas = cargar();
  let zMax = 1;

  // ===== Estado =====

  function cargar() {
    const guardado = Tatan.leer('plantilla');
    if (!guardado || !Array.isArray(guardado.fichas)) return [];
    return guardado.fichas.filter((f) => {
      if (!f || typeof f.x !== 'number' || typeof f.y !== 'number') return false;
      if (f.tipo === 'sticker') return Boolean(STICKERS[f.hash]);
      return f.tipo === 'texto' && typeof f.texto === 'string';
    });
  }

  function guardar() {
    Tatan.guardar('plantilla', { fichas });
  }

  const limitar = (v) => Math.min(LIMITE_MAX, Math.max(LIMITE_MIN, v));

  // Márgenes (en %) para que la ficha no quede cortada por el borde de la cancha.
  // Los stickers tienen bordes transparentes, así que pueden acercarse más.
  function margenes(el) {
    const factor = el.classList.contains('ficha-sticker') ? 0.7 : 1;
    const ancho = cancha.clientWidth || 1;
    const alto = cancha.clientHeight || 1;
    return [
      Math.max(LIMITE_MIN, ((el.offsetWidth / 2) * factor * 100) / ancho),
      Math.max(LIMITE_MIN, ((el.offsetHeight / 2) * factor * 100) / alto),
    ];
  }

  const entre = (v, margen) => Math.min(100 - margen, Math.max(margen, v));

  function nuevaFicha(texto, color, x, y) {
    const hash = Tatan.hash(texto);
    if (STICKERS[hash]) return { id: Tatan.id(), tipo: 'sticker', hash, x, y };
    return { id: Tatan.id(), tipo: 'texto', texto: texto.trim().slice(0, 20), color, x, y };
  }

  function lugarLibre() {
    const ocupado = ([x, y]) => fichas.some((f) => Math.abs(f.x - x) < 9 && Math.abs(f.y - y) < 5);
    const libre = LUGARES_NUEVOS.find((p) => !ocupado(p));
    if (libre) return libre;
    return [limitar(50 + (Math.random() - 0.5) * 60), limitar(50 + (Math.random() - 0.5) * 30)];
  }

  // ===== Render =====

  function posicionar(el, f) {
    el.style.left = f.x + '%';
    el.style.top = f.y + '%';
  }

  function crearElemento(f) {
    const el = document.createElement('div');
    el.dataset.id = f.id;
    el.tabIndex = 0;

    if (f.tipo === 'sticker') {
      el.className = 'ficha ficha-sticker' + (STICKERS[f.hash].chico ? ' chico' : '');
      el.setAttribute('aria-label', 'Sticker');
      const img = document.createElement('img');
      img.src = rutaSticker(f.hash);
      img.alt = '';
      img.draggable = false;
      el.appendChild(img);
    } else {
      el.className = 'ficha ficha-texto equipo-' + (f.color === 'b' ? 'b' : 'a');
      el.textContent = f.texto;
      el.title = f.texto;
      el.setAttribute('aria-label', 'Ficha ' + f.texto);
    }

    el.style.zIndex = ++zMax;
    posicionar(el, f);
    hacerArrastrable(el, f);
    hacerAccesibleConTeclado(el, f);
    return el;
  }

  function render() {
    cancha.querySelectorAll('.ficha').forEach((el) => el.remove());
    zMax = 1;
    fichas.forEach((f) => cancha.appendChild(crearElemento(f)));
  }

  function agregar(f) {
    fichas.push(f);
    cancha.appendChild(crearElemento(f));
    guardar();
  }

  function borrar(f, el) {
    const posicion = fichas.indexOf(f);
    if (posicion === -1) return;
    fichas.splice(posicion, 1);
    el.remove();
    guardar();
    Tatan.toast('Ficha borrada', {
      accion: 'Deshacer',
      alHacer: () => {
        fichas.splice(posicion, 0, f);
        render();
        guardar();
      },
    });
  }

  function cambiarColor(f, el) {
    if (f.tipo !== 'texto') return;
    f.color = f.color === 'b' ? 'a' : 'b';
    el.classList.toggle('equipo-a', f.color === 'a');
    el.classList.toggle('equipo-b', f.color === 'b');
    guardar();
  }

  function traerAlFrente(f, el) {
    const posicion = fichas.indexOf(f);
    if (posicion !== -1 && posicion !== fichas.length - 1) {
      fichas.splice(posicion, 1);
      fichas.push(f);
    }
    el.style.zIndex = ++zMax;
  }

  // ===== Arrastre (mouse y touch con pointer events) =====

  function sobre(elemento, ev) {
    if (elemento.hidden) return false;
    const r = elemento.getBoundingClientRect();
    return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
  }

  function hacerArrastrable(el, f) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const rect = cancha.getBoundingClientRect();
      // distancia entre el puntero y el centro de la ficha, para que no "salte"
      const dx = e.clientX - (rect.left + (f.x / 100) * rect.width);
      const dy = e.clientY - (rect.top + (f.y / 100) * rect.height);
      const inicioX = e.clientX;
      const inicioY = e.clientY;
      const [mx, my] = margenes(el);
      let arrastrando = false;

      traerAlFrente(f, el);
      el.setPointerCapture(e.pointerId);

      const mover = (ev) => {
        if (!arrastrando) {
          if (Math.hypot(ev.clientX - inicioX, ev.clientY - inicioY) < UMBRAL_ARRASTRE) return;
          arrastrando = true;
          el.classList.add('arrastrando');
          papelera.hidden = false;
        }
        f.x = entre(((ev.clientX - dx - rect.left) / rect.width) * 100, mx);
        f.y = entre(((ev.clientY - dy - rect.top) / rect.height) * 100, my);
        posicionar(el, f);
        papelera.classList.toggle('activa', sobre(papelera, ev));
      };

      const soltar = (ev) => {
        el.removeEventListener('pointermove', mover);
        el.removeEventListener('pointerup', soltar);
        el.removeEventListener('pointercancel', soltar);
        el.classList.remove('arrastrando');

        const alTacho = arrastrando && ev.type === 'pointerup' && sobre(papelera, ev);
        papelera.hidden = true;
        papelera.classList.remove('activa');

        if (alTacho) {
          borrar(f, el);
        } else if (!arrastrando && ev.type === 'pointerup') {
          cambiarColor(f, el);
        } else {
          guardar();
        }
      };

      el.addEventListener('pointermove', mover);
      el.addEventListener('pointerup', soltar);
      el.addEventListener('pointercancel', soltar);
    });
  }

  // Flechas mueven, Enter/Espacio cambia el color, Supr borra.
  function hacerAccesibleConTeclado(el, f) {
    el.addEventListener('keydown', (e) => {
      const paso = e.shiftKey ? 5 : 2;
      const movimientos = {
        ArrowLeft: [-paso, 0],
        ArrowRight: [paso, 0],
        ArrowUp: [0, -paso],
        ArrowDown: [0, paso],
      };
      if (movimientos[e.key]) {
        e.preventDefault();
        const [mx, my] = margenes(el);
        f.x = entre(f.x + movimientos[e.key][0], mx);
        f.y = entre(f.y + movimientos[e.key][1], my);
        posicionar(el, f);
        guardar();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cambiarColor(f, el);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        borrar(f, el);
      }
    });
  }

  // ===== Importar equipos del Divisor =====

  function posicionesEquipo(cantidad, arriba) {
    const base = FORMACIONES[Math.min(cantidad, 7)] || [];
    const posiciones = [];
    for (let i = 0; i < cantidad; i++) {
      let p = base[i];
      if (!p) {
        // más de 7: los que sobran van a los costados
        const extra = i - base.length;
        p = [extra % 2 === 0 ? 17 : 83, 56 + Math.floor(extra / 2) * 8];
      }
      posiciones.push(arriba ? [p[0], 100 - p[1]] : p);
    }
    return posiciones;
  }

  function importarEquipos() {
    const params = new URLSearchParams(location.search);
    if (!params.has('importar')) return;
    // que recargar la página no vuelva a importar
    history.replaceState(null, '', location.pathname);

    const equipos = Tatan.leer('equipos');
    if (!equipos || !Array.isArray(equipos.a) || !Array.isArray(equipos.b)) return;

    fichas = [];
    const colocar = (nombres, color, arriba) => {
      posicionesEquipo(nombres.length, arriba).forEach(([x, y], i) => {
        fichas.push(nuevaFicha(nombres[i], color, x, limitar(y)));
      });
    };
    colocar(equipos.a, 'a', true);
    colocar(equipos.b, 'b', false);
    guardar();
    Tatan.toast('Equipos cargados en la cancha');
  }

  // ===== Exportar como imagen (canvas propio: sin librerías, funciona offline) =====

  function rectRedondeado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function recortarTexto(ctx, texto, anchoMax) {
    if (ctx.measureText(texto).width <= anchoMax) return texto;
    let t = texto;
    while (t.length > 1 && ctx.measureText(t + '…').width > anchoMax) t = t.slice(0, -1);
    return t + '…';
  }

  function dibujarCancha(ctx, W, H) {
    const css = getComputedStyle(document.documentElement);
    const c1 = css.getPropertyValue('--cesped-1').trim() || '#2e7d32';
    const c2 = css.getPropertyValue('--cesped-2').trim() || '#2a7330';
    const k = W / 420; // escala respecto de una cancha de 420px de ancho

    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 === 0 ? c1 : c2;
      ctx.fillRect(0, (i * H) / 10, W, H / 10 + 1);
    }

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 8 * k; // la mitad queda afuera del lienzo: se ve como 4px
    ctx.strokeRect(0, 0, W, H);

    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, W * 0.11 - k, 0, Math.PI * 2);
    ctx.stroke();

    const anchoArea = W * 0.55;
    const altoArea = H * 0.16;
    const xArea = (W - anchoArea) / 2;
    const m = k; // mitad del grosor de línea
    ctx.beginPath();
    ctx.moveTo(xArea + m, 0);
    ctx.lineTo(xArea + m, altoArea - m);
    ctx.lineTo(xArea + anchoArea - m, altoArea - m);
    ctx.lineTo(xArea + anchoArea - m, 0);
    ctx.moveTo(xArea + m, H);
    ctx.lineTo(xArea + m, H - altoArea + m);
    ctx.lineTo(xArea + anchoArea - m, H - altoArea + m);
    ctx.lineTo(xArea + anchoArea - m, H);
    ctx.stroke();
  }

  function dibujarFichas(ctx, W, H) {
    const css = getComputedStyle(document.documentElement);
    const colores = {
      a: [css.getPropertyValue('--equipo-a').trim(), css.getPropertyValue('--equipo-a-texto').trim()],
      b: [css.getPropertyValue('--equipo-b').trim(), css.getPropertyValue('--equipo-b-texto').trim()],
    };
    const fs = W * 0.034;
    const fuente = getComputedStyle(document.body).fontFamily;

    fichas.forEach((f) => {
      const cx = (f.x / 100) * W;
      const cy = (f.y / 100) * H;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      if (f.tipo === 'sticker') {
        const img = cancha.querySelector(`[data-id="${f.id}"] img`);
        if (img && img.complete && img.naturalWidth) {
          const lado = W * (STICKERS[f.hash].chico ? 0.095 : 0.22);
          ctx.drawImage(img, cx - lado / 2, cy - lado / 2, lado, lado);
        }
      } else {
        const [fondo, texto] = colores[f.color === 'b' ? 'b' : 'a'];
        ctx.font = `700 ${fs}px ${fuente}`;
        const padding = 0.9 * fs;
        const etiqueta = recortarTexto(ctx, f.texto, W * 0.32 - 2 * padding);
        const w = ctx.measureText(etiqueta).width + 2 * padding;
        const h = 2.1 * fs;
        ctx.fillStyle = fondo;
        rectRedondeado(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = texto;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(etiqueta, cx, cy + fs * 0.05);
      }
      ctx.restore();
    });

    ctx.font = `600 ${W * 0.026}px ${fuente}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('TatanTatan', W - W * 0.03, H - W * 0.02);
  }

  function dataUrlABlob(dataUrl) {
    const [cabecera, datos] = dataUrl.split(',');
    const tipo = cabecera.match(/:(.*?);/)[1];
    const binario = atob(datos);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Blob([bytes], { type: tipo });
  }

  function exportar() {
    if (!fichas.length) {
      Tatan.toast('Agregá jugadores antes de exportar');
      return;
    }
    const W = 1080;
    const H = 1620;
    const lienzo = document.createElement('canvas');
    lienzo.width = W;
    lienzo.height = H;
    const ctx = lienzo.getContext('2d');
    dibujarCancha(ctx, W, H);
    dibujarFichas(ctx, W, H);

    let blob;
    try {
      // Sincrónico a propósito: el menú de compartir del celu exige
      // que se llame dentro del mismo toque del usuario.
      blob = dataUrlABlob(lienzo.toDataURL('image/png'));
    } catch (e) {
      Tatan.toast('No se pudo generar la imagen');
      return;
    }
    Tatan.compartirArchivo(blob, 'plantilla.png', 'Plantilla TatanTatan');
  }

  // ===== Eventos =====

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = input.value.trim();
    if (!nombre) return;
    const [x, y] = lugarLibre();
    agregar(nuevaFicha(nombre, 'a', x, y));
    input.value = '';
  });

  document.getElementById('btnLimpiar').addEventListener('click', () => {
    if (!fichas.length) return;
    if (!confirm('¿Borrar todas las fichas de la cancha?')) return;
    fichas = [];
    render();
    guardar();
  });

  document.getElementById('btnExportar').addEventListener('click', exportar);

  // ===== Inicio =====
  importarEquipos();
  render();
})();
