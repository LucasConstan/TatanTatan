
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
  'Mauri',
  'Leo',
  'Amigo de'
];

// ===== Cantidad visible según la cancha =====
function totalPersonasVisibles() {
  const cancha = document.querySelector('input[name="cancha"]:checked').value;
  return cancha === "5" ? 10 : 14;
}

// ===== Mostrar lista editable =====
function mostrarLista() {
  const ul = document.getElementById('lista');
  ul.innerHTML = '';

  const total = totalPersonasVisibles();

  jugadores.slice(0, total).forEach((p, index) => {
    const li = document.createElement('li');

    const input = document.createElement('input');
    input.value = p;

    input.oninput = () => {
      jugadores[index] = input.value;
    };

    li.appendChild(input);
    ul.appendChild(li);
  });
}

// ===== Dividir en dos grupos =====
function dividir() {
  const total = totalPersonasVisibles();
  const visibles = jugadores.slice(0, total);

  const mezcladas = [...visibles].sort(() => Math.random() - 0.5);

  const mitad = total / 2;
  const grupoA = mezcladas.slice(0, mitad);
  const grupoB = mezcladas.slice(mitad);

  mostrarGrupo('grupoA', grupoA);
  mostrarGrupo('grupoB', grupoB);
}

// ===== Mostrar grupos =====
function mostrarGrupo(id, grupo) {
  const ul = document.getElementById(id);
  ul.innerHTML = '';

  grupo.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    ul.appendChild(li);
  });
}

// ===== Escuchar cambios de radio buttons =====
document.querySelectorAll('input[name="cancha"]').forEach(radio => {
  radio.addEventListener('change', () => {
    mostrarLista();
    document.getElementById('grupoA').innerHTML = '';
    document.getElementById('grupoB').innerHTML = '';
  });
});

// ===== Inicial =====
mostrarLista();
