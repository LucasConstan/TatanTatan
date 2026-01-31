let personas = [
  'Constan',
  'Nico',
  'Seba',
  'Braian',
  'Ezequiel',
  'Oti',
  'Gordo',
  'Fabi',
  'Hernan',
  'Bruno'
];

function mostrarLista() {
  const ul = document.getElementById('lista');
  ul.innerHTML = '';

  personas.forEach((p, index) => {
    const li = document.createElement('li');

    const input = document.createElement('input');
    input.value = p;

    input.oninput = () => {
      personas[index] = input.value;
    };

    li.appendChild(input);
    ul.appendChild(li);
  });
}

function dividir() {
  const mezcladas = [...personas].sort(() => Math.random() - 0.5);

  const mitad = Math.ceil(mezcladas.length / 2);
  const grupoA = mezcladas.slice(0, mitad);
  const grupoB = mezcladas.slice(mitad);

  mostrarGrupo('grupoA', grupoA);
  mostrarGrupo('grupoB', grupoB);
}

function mostrarGrupo(id, grupo) {
  const ul = document.getElementById(id);
  ul.innerHTML = '';

  grupo.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    ul.appendChild(li);
  });
}

// Mostrar lista al cargar la página
mostrarLista();
