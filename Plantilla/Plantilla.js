let contadorJugadores = 0;

/* Crear jugador */
function crearJugador() {
  const input = document.getElementById('nombreJugador');
  const nombre = input.value.trim();
  if (!nombre) return;

  const jugador = document.createElement('div');
  jugador.className = 'jugador';
  jugador.textContent = nombre;

  // posición inicial (abajo de la cancha)
  jugador.style.left = '10px';
  jugador.style.top = (200 + contadorJugadores * 34) + 'px';

  hacerDraggable(jugador);

  document.body.appendChild(jugador);

  contadorJugadores++;
  input.value = '';
}

/* Drag & drop libre */
function hacerDraggable(el) {
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    el.style.cursor = 'grabbing';

    const mover = ev => {
      el.style.left = ev.clientX - offsetX + 'px';
      el.style.top = ev.clientY - offsetY + 'px';
    };

    const soltar = () => {
      el.releasePointerCapture(e.pointerId);
      document.removeEventListener('pointermove', mover);
      document.removeEventListener('pointerup', soltar);
      el.style.cursor = 'grab';
    };

    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
  });
}
