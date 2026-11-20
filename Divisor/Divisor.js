(function () {
  'use strict';

  const NOMBRES_INICIALES = [
    'Constan', 'Nico', 'Seba', 'Braian', 'Ezequiel', 'Oti', 'Gordo',
    'Pola', 'Hernan', 'Bruno', 'Fabi', 'Mauri', 'Leo', 'Amigo de',
  ];
  const CUPO = { 5: 10, 7: 14 };
  const NIVEL_POR_DEFECTO = 3;
  const MAX_ENUMERAR = 20; // hasta 20 jugadores se prueban todas las combinaciones

  // ===== Algoritmo (funciones puras) =====

  // Fisher–Yates: mezcla sin sesgo (sort con Math.random no es uniforme).
  function mezclar(lista) {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  function contarBits(n) {
    let c = 0;
    while (n) {
      n &= n - 1;
      c++;
    }
    return c;
  }

  /**
   * Divide jugadores [{nombre, nivel}] en dos equipos.
   * Con `equilibrar`, busca la menor diferencia de suma de niveles y elige al azar
   * entre todas las divisiones igual de parejas, así no salen siempre los mismos.
   */
  function armarEquipos(jugadores, equilibrar) {
    const n = jugadores.length;
    const k = Math.floor(n / 2);
    let a;
    let b;

    if (!equilibrar) {
      const mezclados = mezclar(jugadores);
      a = mezclados.slice(0, k);
      b = mezclados.slice(k);
    } else {
      const niveles = jugadores.map((j) => j.nivel);
      const total = niveles.reduce((s, x) => s + x, 0);
      let mejor = Infinity;
      let elegida = null;
      let empates = 0;

      const considerar = (indicesA) => {
        let suma = 0;
        for (const i of indicesA) suma += niveles[i];
        const dif = Math.abs(total - 2 * suma);
        if (dif < mejor) {
          mejor = dif;
          elegida = indicesA;
          empates = 1;
        } else if (dif === mejor) {
          // muestreo de reservorio: elige uniformemente entre los empates
          empates++;
          if (Math.random() * empates < 1) elegida = indicesA;
        }
      };

      if (n <= MAX_ENUMERAR) {
        for (let mascara = 0; mascara < 1 << n; mascara++) {
          if (contarBits(mascara) !== k) continue;
          const indices = [];
          for (let i = 0; i < n; i++) if (mascara & (1 << i)) indices.push(i);
          considerar(indices);
        }
      } else {
        const todos = jugadores.map((_, i) => i);
        for (let intento = 0; intento < 5000; intento++) {
          considerar(mezclar(todos).slice(0, k));
        }
      }

      const enA = new Set(elegida);
      a = jugadores.filter((_, i) => enA.has(i));
      b = jugadores.filter((_, i) => !enA.has(i));
    }

    const sumaA = a.reduce((s, j) => s + j.nivel, 0);
    const sumaB = b.reduce((s, j) => s + j.nivel, 0);
    // Orden al azar: que "Equipo 1" no sea siempre el mismo grupo.
    const [primero, segundo] = Math.random() < 0.5 ? [a, b] : [b, a];
    return {
      a: mezclar(primero),
      b: mezclar(segundo),
      diferencia: Math.abs(sumaA - sumaB),
    };
  }

  // ===== Estado =====

  function estadoInicial() {
    return {
      cancha: '5',
      equilibrar: true,
      jugadores: NOMBRES_INICIALES.map((nombre, i) => ({
        id: Tatan.id(),
        nombre,
        nivel: NIVEL_POR_DEFECTO,
        juega: i < CUPO[5],
      })),
    };
  }

  function cargarEstado() {
    const guardado = Tatan.leer('divisor');
    if (!guardado || !Array.isArray(guardado.jugadores)) return estadoInicial();
    return {
      cancha: guardado.cancha === '7' ? '7' : '5',
      equilibrar: guardado.equilibrar !== false,
      jugadores: guardado.jugadores
        .filter((j) => j && typeof j.nombre === 'string')
        .map((j) => ({
          id: j.id || Tatan.id(),
          nombre: j.nombre,
          nivel: Math.min(5, Math.max(1, Number(j.nivel) || NIVEL_POR_DEFECTO)),
          juega: j.juega !== false,
        })),
    };
  }

  const estado = cargarEstado();
  let equipos = Tatan.leer('equipos');

  const guardar = () => Tatan.guardar('divisor', estado);
  const convocados = () =>
    estado.jugadores.filter((j) => j.juega && j.nombre.trim() !== '');

  // ===== Interfaz =====

  const lista = document.getElementById('lista');
  const contador = document.getElementById('contador');
  const ayudaNivel = document.getElementById('ayudaNivel');
  const chkEquilibrar = document.getElementById('equilibrar');
  const formAgregar = document.getElementById('formAgregar');
  const inputNuevo = document.getElementById('nuevoJugador');
  const btnDividir = document.getElementById('btnDividir');
  const resultado = document.getElementById('resultado');

  function actualizarContador() {
    const cantidad = convocados().length;
    const cupo = CUPO[estado.cancha];
    let texto = `${cantidad} / ${cupo}`;
    if (cantidad < cupo) texto += ` · faltan ${cupo - cantidad}`;
    if (cantidad > cupo) texto += ` · sobran ${cantidad - cupo}`;
    contador.textContent = texto;
    contador.classList.toggle('incompleto', cantidad !== cupo);
  }

  function crearFila(jugador) {
    const li = document.createElement('li');
    li.className = 'jugador' + (jugador.juega ? '' : ' fuera');

    const juega = document.createElement('input');
    juega.type = 'checkbox';
    juega.className = 'juega';
    juega.checked = jugador.juega;
    juega.setAttribute('aria-label', 'Juega');
    juega.addEventListener('change', () => {
      jugador.juega = juega.checked;
      li.classList.toggle('fuera', !jugador.juega);
      actualizarContador();
      guardar();
    });

    const nombre = document.createElement('input');
    nombre.className = 'campo nombre';
    nombre.value = jugador.nombre;
    nombre.maxLength = 24;
    nombre.autocomplete = 'off';
    nombre.setAttribute('aria-label', 'Nombre');
    nombre.addEventListener('input', () => {
      jugador.nombre = nombre.value;
      actualizarContador();
      guardar();
    });

    const nivel = document.createElement('select');
    nivel.className = 'campo nivel';
    nivel.setAttribute('aria-label', 'Nivel');
    for (let n = 1; n <= 5; n++) {
      const opcion = document.createElement('option');
      opcion.value = n;
      opcion.textContent = `${n} ★`;
      nivel.appendChild(opcion);
    }
    nivel.value = jugador.nivel;
    nivel.addEventListener('change', () => {
      jugador.nivel = Number(nivel.value);
      guardar();
    });

    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'quitar';
    quitar.textContent = '✕';
    quitar.setAttribute('aria-label', 'Quitar jugador');
    quitar.addEventListener('click', () => quitarJugador(jugador));

    li.append(juega, nombre, nivel, quitar);
    return li;
  }

  function mostrarLista() {
    lista.replaceChildren(...estado.jugadores.map(crearFila));
    lista.classList.toggle('sin-nivel', !estado.equilibrar);
    ayudaNivel.hidden = !estado.equilibrar;
    actualizarContador();
  }

  function quitarJugador(jugador) {
    const posicion = estado.jugadores.indexOf(jugador);
    if (posicion === -1) return;
    estado.jugadores.splice(posicion, 1);
    guardar();
    mostrarLista();
    Tatan.toast(`Se quitó a ${jugador.nombre.trim() || 'un jugador'}`, {
      accion: 'Deshacer',
      alHacer: () => {
        estado.jugadores.splice(posicion, 0, jugador);
        guardar();
        mostrarLista();
      },
    });
  }

  function mostrarEquipos() {
    if (!equipos || !Array.isArray(equipos.a) || !Array.isArray(equipos.b)) {
      resultado.hidden = true;
      return;
    }
    const llenar = (id, nombres) => {
      const ul = document.getElementById(id);
      ul.replaceChildren(
        ...nombres.map((nombre) => {
          const li = document.createElement('li');
          li.textContent = nombre;
          return li;
        })
      );
    };
    llenar('grupoA', equipos.a);
    llenar('grupoB', equipos.b);
    document.getElementById('cantidadA').textContent = `(${equipos.a.length})`;
    document.getElementById('cantidadB').textContent = `(${equipos.b.length})`;

    const diferencia = document.getElementById('diferencia');
    if (equipos.equilibrado) {
      diferencia.textContent =
        equipos.diferencia === 0
          ? 'Equipos parejos: misma suma de nivel.'
          : `Diferencia de nivel entre equipos: ${equipos.diferencia}.`;
    } else {
      diferencia.textContent = '';
    }
    resultado.hidden = false;
    btnDividir.textContent = '🔀 Volver a armar';
  }

  function dividir() {
    const jugando = convocados();
    if (jugando.length < 2) {
      Tatan.toast('Marcá al menos 2 jugadores');
      return;
    }
    const r = armarEquipos(
      jugando.map((j) => ({ nombre: j.nombre.trim(), nivel: j.nivel })),
      estado.equilibrar
    );
    equipos = {
      cancha: estado.cancha,
      a: r.a.map((j) => j.nombre),
      b: r.b.map((j) => j.nombre),
      diferencia: r.diferencia,
      equilibrado: estado.equilibrar,
    };
    Tatan.guardar('equipos', equipos);
    mostrarEquipos();
    resultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function textoParaCompartir() {
    const lineas = [`⚽ Equipos TatanTatan (cancha de ${equipos.cancha})`, '', '⚪ Equipo 1'];
    equipos.a.forEach((n) => lineas.push(`• ${n}`));
    lineas.push('', '🟡 Equipo 2');
    equipos.b.forEach((n) => lineas.push(`• ${n}`));
    return lineas.join('\n');
  }

  // ===== Eventos =====

  document.querySelectorAll('input[name="cancha"]').forEach((radio) => {
    radio.checked = radio.value === estado.cancha;
    radio.addEventListener('change', () => {
      estado.cancha = radio.value;
      actualizarContador();
      guardar();
    });
  });

  chkEquilibrar.checked = estado.equilibrar;
  chkEquilibrar.addEventListener('change', () => {
    estado.equilibrar = chkEquilibrar.checked;
    lista.classList.toggle('sin-nivel', !estado.equilibrar);
    ayudaNivel.hidden = !estado.equilibrar;
    guardar();
  });

  formAgregar.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = inputNuevo.value.trim();
    if (!nombre) return;
    estado.jugadores.push({ id: Tatan.id(), nombre, nivel: NIVEL_POR_DEFECTO, juega: true });
    guardar();
    mostrarLista();
    inputNuevo.value = '';
    inputNuevo.focus();
  });

  btnDividir.addEventListener('click', dividir);

  document.getElementById('btnCompartir').addEventListener('click', () => {
    if (equipos) Tatan.compartirTexto(textoParaCompartir());
  });

  document.getElementById('btnCancha').addEventListener('click', () => {
    if (equipos) location.href = '../Plantilla/Plantilla.html?importar=1';
  });

  // ===== Inicio =====
  mostrarLista();
  mostrarEquipos();

  // Expuesto solo para pruebas desde la consola.
  window.TatanDivisor = { armarEquipos };
})();
