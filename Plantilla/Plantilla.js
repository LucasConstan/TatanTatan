let jugadores = [
  'Constan',
  'Nico',
  'Seba',
  'Braian',
  'Ezequiel',
  'Oti',
  'Gordo',
  'Pola',
  'Hernan',
  'Bruno',
  'Fabi',
  'Leo',
  'Jugador 13',
  'Jugador 14'
];

const cancha = document.getElementById('cancha');

// Áreas
const areaIzq = document.createElement('div');
areaIzq.className = 'area izq';

const areaDer = document.createElement('div');
areaDer.className = 'area der';

cancha.appendChild(areaIzq);
cancha.appendChild(areaDer);

let activo = null;
let offsetX = 0;
let offsetY = 0;

// Crear jugadores
jugadores.forEach((nombre, i) => {
  const div = document.createElement('div');
  div.className = 'jugador';
  div.textContent = nombre;

  div.style.left = '2%';
  div.style.top = (5 + i * 8) + '%';

  cancha.appendChild(div);

  div.addEventListener('pointerdown', e => {
    activo = div;
    const rect = div.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    div.setPointerCapture(e.pointerId);
  });

  div.addEventListener('pointerup', e => {
    div.releasePointerCapture(e.pointerId);
    activo = null;
  });
});

// Movimiento
document.addEventListener('pointermove', e => {
  if (!activo) return;

  const rect = cancha.getBoundingClientRect();

  let x = e.clientX - rect.left - offsetX;
  let y = e.clientY - rect.top - offsetY;

  x = Math.max(0, Math.min(x, cancha.clientWidth - activo.offsetWidth));
  y = Math.max(0, Math.min(y, cancha.clientHeight - activo.offsetHeight));

  activo.style.left = x + 'px';
  activo.style.top = y + 'px';
});
