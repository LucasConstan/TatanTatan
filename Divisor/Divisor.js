(function () {
  'use strict';

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

  const nivelValido = (n) => Math.min(5, Math.max(1, Math.round(Number(n)) || NIVEL_POR_DEFECTO));

  function limpiarJugadores(lista) {
    return (Array.isArray(lista) ? lista : [])
      .filter((j) => j && typeof j.nombre === 'string')
      .map((j) => ({
        id: j.id || Tatan.id(),
        nombre: j.nombre.slice(0, 24),
        nivel: nivelValido(j.nivel),
        juega: j.juega !== false,
      }));
  }

  // Sin datos guardados arranca vacío: la lista de cada grupo se carga con su código.
  function cargarEstado() {
    const guardado = Tatan.leer('divisor') || {};
    const grupo = guardado.grupo;
    return {
      cancha: guardado.cancha === '7' ? '7' : '5',
      equilibrar: guardado.equilibrar !== false,
      jugadores: limpiarJugadores(guardado.jugadores),
      grupo:
        grupo && typeof grupo.codigo === 'string'
          ? { codigo: grupo.codigo, nombre: String(grupo.nombre || 'Grupo'), actualizado: String(grupo.actualizado || '') }
          : null,
    };
  }

  const estado = cargarEstado();
  let equipos = Tatan.leer('equipos');

  const guardar = () => Tatan.guardar('divisor', estado);
  const convocados = () =>
    estado.jugadores.filter((j) => j.juega && j.nombre.trim() !== '');

  // ===== Interfaz =====

  const lista = document.getElementById('lista');
  const listaVacia = document.getElementById('listaVacia');
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
    listaVacia.hidden = estado.jugadores.length > 0;
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

  // ===== Grupo (lista oficial por código) =====

  const formGrupo = document.getElementById('formGrupo');
  const inputCodigo = document.getElementById('codigoGrupo');
  const grupoActivo = document.getElementById('grupoActivo');
  const avisoCambios = document.getElementById('avisoCambios');

  function mostrarGrupo() {
    const hay = Boolean(estado.grupo);
    formGrupo.hidden = hay;
    grupoActivo.hidden = !hay;
    if (hay) document.getElementById('nombreGrupo').textContent = estado.grupo.nombre;
    avisoCambios.hidden = true;
    grupoActivo.classList.remove('hay-cambios');
  }

  function sincronizarCancha() {
    document.querySelectorAll('input[name="cancha"]').forEach((radio) => {
      radio.checked = radio.value === estado.cancha;
    });
  }

  // Reemplaza la lista por la del grupo. Si `conservarJuega`, mantiene quién juega
  // (por nombre) en vez de usar lo que vino en la lista oficial.
  function aplicarGrupo(grupo, codigo, conservarJuega) {
    const anterior = JSON.parse(JSON.stringify(estado));
    const juegaPorNombre = new Map(estado.jugadores.map((j) => [Tatan.normalizar(j.nombre), j.juega]));

    estado.jugadores = limpiarJugadores(grupo.jugadores).map((j) => {
      const clave = Tatan.normalizar(j.nombre);
      if (conservarJuega && juegaPorNombre.has(clave)) j.juega = juegaPorNombre.get(clave);
      return j;
    });
    if (!conservarJuega && (grupo.cancha === '5' || grupo.cancha === '7')) estado.cancha = grupo.cancha;
    estado.grupo = {
      codigo: Tatan.normalizar(codigo),
      nombre: String(grupo.nombre || 'Grupo'),
      actualizado: String(grupo.actualizado || ''),
    };
    guardar();
    sincronizarCancha();
    mostrarLista();
    mostrarGrupo();

    const deshacer = () => {
      Object.assign(estado, anterior);
      guardar();
      sincronizarCancha();
      mostrarLista();
      mostrarGrupo();
    };
    if (anterior.jugadores.length) {
      Tatan.toast(`Lista de ${estado.grupo.nombre} cargada`, { accion: 'Deshacer', alHacer: deshacer });
    } else {
      Tatan.toast(`Lista de ${estado.grupo.nombre} cargada`);
    }
  }

  async function buscarGrupo(codigo) {
    if (!TatanGrupo.disponible) {
      Tatan.toast('Este navegador no permite abrir la lista del grupo');
      return undefined;
    }
    try {
      return await TatanGrupo.buscar(codigo);
    } catch (e) {
      Tatan.toast('No se pudo cargar la lista. Revisá la conexión.');
      return undefined;
    }
  }

  formGrupo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = inputCodigo.value.trim();
    if (!codigo) return;
    const boton = formGrupo.querySelector('button');
    boton.disabled = true;
    const grupo = await buscarGrupo(codigo);
    boton.disabled = false;
    if (grupo === null) {
      Tatan.toast('Código incorrecto');
      inputCodigo.select();
      return;
    }
    if (!grupo) return;
    inputCodigo.value = '';
    aplicarGrupo(grupo, codigo, false);
  });

  document.getElementById('btnActualizarGrupo').addEventListener('click', async () => {
    if (!estado.grupo) return;
    const grupo = await buscarGrupo(estado.grupo.codigo);
    if (grupo === null) {
      Tatan.toast('El código del grupo ya no es válido');
      return;
    }
    if (grupo) aplicarGrupo(grupo, estado.grupo.codigo, true);
  });

  document.getElementById('btnSalirGrupo').addEventListener('click', () => {
    const grupo = estado.grupo;
    estado.grupo = null;
    guardar();
    mostrarGrupo();
    Tatan.toast('Saliste del grupo (la lista queda)', {
      accion: 'Deshacer',
      alHacer: () => {
        estado.grupo = grupo;
        guardar();
        mostrarGrupo();
      },
    });
  });

  // Al abrir, revisa en segundo plano si la lista oficial cambió.
  async function revisarCambios() {
    if (!estado.grupo || !TatanGrupo.disponible) return;
    try {
      const grupo = await TatanGrupo.buscar(estado.grupo.codigo);
      if (grupo && String(grupo.actualizado || '') > estado.grupo.actualizado) {
        avisoCambios.hidden = false;
        grupoActivo.classList.add('hay-cambios');
      }
    } catch (e) {
      /* sin red: se revisa la próxima vez */
    }
  }

  // ===== Publicar (solo con ?publicar) =====

  function iniciarPublicar() {
    if (!new URLSearchParams(location.search).has('publicar')) return;
    const panel = document.getElementById('panelPublicar');
    const pubNombre = document.getElementById('pubNombre');
    const pubCodigo = document.getElementById('pubCodigo');
    const pubResultado = document.getElementById('pubResultado');
    const pubSalida = document.getElementById('pubSalida');
    const pubAviso = document.getElementById('pubAviso');

    panel.hidden = false;
    if (estado.grupo) {
      pubNombre.value = estado.grupo.nombre;
      pubCodigo.value = estado.grupo.codigo;
    }

    document.getElementById('formPublicar').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = pubNombre.value.trim();
      const codigo = pubCodigo.value.trim();
      const jugadores = estado.jugadores
        .filter((j) => j.nombre.trim() !== '')
        .map((j) => ({ nombre: j.nombre.trim(), nivel: j.nivel, juega: j.juega }));
      if (!nombre || !codigo) {
        Tatan.toast('Completá el nombre y el código');
        return;
      }
      if (!jugadores.length) {
        Tatan.toast('La lista de jugadores está vacía');
        return;
      }
      if (!TatanGrupo.disponible) {
        Tatan.toast('Este navegador no permite cifrar la lista');
        return;
      }

      const grupo = { nombre, cancha: estado.cancha, actualizado: new Date().toISOString(), jugadores };
      let resultado;
      try {
        resultado = await TatanGrupo.publicar(codigo, grupo);
      } catch (err) {
        Tatan.toast('No se pudo leer la lista publicada. Revisá la conexión.');
        return;
      }

      pubSalida.value = resultado.contenido;
      pubAviso.textContent =
        (resultado.reemplazada
          ? `Reemplaza la lista que ya había con ese código (${jugadores.length} jugadores).`
          : `Grupo nuevo: no había ninguno con ese código (${jugadores.length} jugadores).`) +
        (Tatan.normalizar(codigo).length < 8 ? ' Ojo: el código es corto y se puede adivinar probando.' : '');
      pubResultado.hidden = false;

      // Este celu ya tiene la versión que se va a publicar.
      estado.grupo = { codigo: Tatan.normalizar(codigo), nombre, actualizado: grupo.actualizado };
      guardar();
      mostrarGrupo();
    });

    document.getElementById('btnCopiarPub').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pubSalida.value);
        Tatan.toast('Copiado');
      } catch (e) {
        pubSalida.select();
        Tatan.toast('Seleccioná el texto y copialo');
      }
    });
  }

  // ===== Eventos =====

  sincronizarCancha();
  document.querySelectorAll('input[name="cancha"]').forEach((radio) => {
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
  mostrarGrupo();
  iniciarPublicar();
  revisarCambios();

  // Expuesto solo para pruebas desde la consola.
  window.TatanDivisor = { armarEquipos };
})();
