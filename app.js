// =========================================================
//  Gestor de Tareas — JavaScript ES6+ con POO
// =========================================================

// ---------- Clase Tarea: representa una tarea individual ----------
class Tarea {
  constructor(nombre, completada = false, id = Date.now() * 1000 + Math.floor(Math.random() * 1000)) {
    this.id = id;
    this.nombre = nombre;
    this.completada = completada;
  }

  // Cambia el estado entre completa e incompleta
  actualizarEstado() {
    this.completada = !this.completada;
  }

  // Modifica el texto de la tarea
  editar(nuevoNombre) {
    this.nombre = nuevoNombre;
  }

  // Se elimina a sí misma de la lista del gestor que la contiene
  eliminar(gestor) {
    gestor.eliminarTarea(this.id);
  }
}

// ---------- Clase GestorDeTareas: almacena y opera sobre las tareas ----------
class GestorDeTareas {
  static CLAVE_STORAGE = 'gestor-tareas';

  constructor() {
    this.tareas = [];
    this.cargar();
  }

  agregarTarea(nombre) {
    const tarea = new Tarea(nombre);
    this.tareas.push(tarea);
    this.guardar();
    return tarea;
  }

  obtenerTarea(id) {
    return this.tareas.find((tarea) => tarea.id === id);
  }

  editarTarea(id, nuevoNombre) {
    this.obtenerTarea(id)?.editar(nuevoNombre);
    this.guardar();
  }

  actualizarEstado(id) {
    this.obtenerTarea(id)?.actualizarEstado();
    this.guardar();
  }

  eliminarTarea(id) {
    this.tareas = this.tareas.filter((tarea) => tarea.id !== id);
    this.guardar();
  }

  existeNombre(nombre, idIgnorado = null) {
    const buscado = nombre.toLowerCase();
    return this.tareas.some(({ id, nombre: n }) => id !== idIgnorado && n.toLowerCase() === buscado);
  }

  get totalCompletadas() {
    return this.tareas.filter(({ completada }) => completada).length;
  }

  // ----- Persistencia con LocalStorage (desafío adicional) -----
  guardar() {
    try {
      localStorage.setItem(GestorDeTareas.CLAVE_STORAGE, JSON.stringify(this.tareas));
    } catch (error) {
      console.warn('No se pudieron guardar las tareas:', error);
    }
  }

  cargar() {
    try {
      const datos = JSON.parse(localStorage.getItem(GestorDeTareas.CLAVE_STORAGE)) ?? [];
      // Se reconstruyen como instancias de Tarea para recuperar sus métodos
      this.tareas = datos.map(({ nombre, completada, id }) => new Tarea(nombre, completada, id));
    } catch (error) {
      console.warn('No se pudieron cargar las tareas:', error);
      this.tareas = [];
    }
  }
}

// =========================================================
//  Interfaz: manipulación del DOM
// =========================================================
const gestor = new GestorDeTareas();

const form = document.querySelector('#form-tarea');
const inputTarea = document.querySelector('#input-tarea');
const lista = document.querySelector('#lista-tareas');
const mensajeError = document.querySelector('#mensaje-error');
const contador = document.querySelector('#contador');
const listaVacia = document.querySelector('#lista-vacia');

const MAX_CARACTERES = 100;
let idEnEdicion = null; // id de la tarea que se está editando (o null)

// Evita que el texto del usuario se interprete como HTML
const escaparHTML = (texto) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Valida el texto y devuelve un mensaje de error, o cadena vacía si es válido
const validar = (texto, idIgnorado = null) => {
  if (texto === '') return 'La tarea no puede estar vacía.';
  if (texto.length < 3) return 'La tarea debe tener al menos 3 caracteres.';
  if (texto.length > MAX_CARACTERES) return `La tarea no puede superar ${MAX_CARACTERES} caracteres.`;
  if (gestor.existeNombre(texto, idIgnorado)) return `Ya existe una tarea llamada "${texto}".`;
  return '';
};

const mostrarError = (mensaje, campo = inputTarea) => {
  mensajeError.textContent = mensaje;
  campo.classList.toggle('input-error', mensaje !== '');
  campo.setAttribute('aria-invalid', mensaje !== '');
};

// Genera el HTML de una tarea con template literals
const crearHTMLTarea = ({ id, nombre, completada }) => {
  const nombreSeguro = escaparHTML(nombre);

  if (id === idEnEdicion) {
    return `
      <li class="tarea editando" data-id="${id}">
        <label for="editar-${id}" class="visually-hidden">Editar tarea</label>
        <input type="text" id="editar-${id}" class="input-editar" value="${nombreSeguro}" maxlength="${MAX_CARACTERES}">
        <div class="acciones">
          <button type="button" class="btn btn-guardar" data-accion="guardar">Guardar</button>
          <button type="button" class="btn btn-cancelar" data-accion="cancelar">Cancelar</button>
        </div>
      </li>`;
  }

  return `
    <li class="tarea ${completada ? 'completada' : ''}" data-id="${id}">
      <input type="checkbox" id="check-${id}" class="check" data-accion="estado" ${completada ? 'checked' : ''}>
      <label for="check-${id}" class="nombre-tarea">${nombreSeguro}</label>
      <div class="acciones">
        <button type="button" class="btn btn-editar" data-accion="editar" aria-label="Editar: ${nombreSeguro}">Editar</button>
        <button type="button" class="btn btn-eliminar" data-accion="eliminar" aria-label="Eliminar: ${nombreSeguro}">Eliminar</button>
      </div>
    </li>`;
};

// Vuelve a dibujar toda la lista recorriendo las tareas con forEach
const renderizar = () => {
  lista.innerHTML = '';
  gestor.tareas.forEach((tarea) => {
    lista.insertAdjacentHTML('beforeend', crearHTMLTarea(tarea));
  });

  const total = gestor.tareas.length;
  listaVacia.hidden = total > 0;
  contador.textContent = total > 0 ? `${gestor.totalCompletadas} de ${total} tareas completadas` : '';

  // Si hay una tarea en edición, se enfoca su campo
  const inputEditar = lista.querySelector('.input-editar');
  if (inputEditar) {
    inputEditar.focus();
    inputEditar.select();
  }
};

// ---------- Eventos ----------

// Agregar tarea
form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const texto = inputTarea.value.trim();
  const error = validar(texto);

  if (error) {
    mostrarError(error);
    inputTarea.focus();
    return;
  }

  gestor.agregarTarea(texto);
  mostrarError('');
  inputTarea.value = '';
  inputTarea.focus();
  renderizar();
});

// Limpia el error mientras el usuario escribe
inputTarea.addEventListener('input', () => {
  if (mensajeError.textContent) mostrarError('');
});

const guardarEdicion = (id, campo) => {
  const texto = campo.value.trim();
  const error = validar(texto, id);
  if (error) {
    mostrarError(error, campo);
    campo.focus();
    return;
  }
  gestor.editarTarea(id, texto);
  idEnEdicion = null;
  mostrarError('');
  renderizar();
};

const cancelarEdicion = () => {
  idEnEdicion = null;
  mostrarError('');
  renderizar();
};

// Delegación de eventos: un solo listener para todos los botones de la lista
lista.addEventListener('click', (evento) => {
  const control = evento.target.closest('[data-accion]');
  if (!control) return;

  const item = control.closest('.tarea');
  const id = Number(item.dataset.id);
  const tarea = gestor.obtenerTarea(id);

  const acciones = {
    estado: () => {
      gestor.actualizarEstado(id);
      renderizar();
    },
    editar: () => {
      idEnEdicion = id;
      mostrarError('');
      renderizar();
    },
    guardar: () => guardarEdicion(id, item.querySelector('.input-editar')),
    cancelar: cancelarEdicion,
    eliminar: () => {
      if (!confirm(`¿Eliminar la tarea "${tarea.nombre}"?`)) return;
      tarea.eliminar(gestor);
      if (idEnEdicion === id) idEnEdicion = null;
      renderizar();
    },
  };

  acciones[control.dataset.accion]?.();
});

// Atajos de teclado en modo edición: Enter guarda, Escape cancela
lista.addEventListener('keydown', (evento) => {
  if (!evento.target.matches('.input-editar')) return;
  const id = Number(evento.target.closest('.tarea').dataset.id);

  if (evento.key === 'Enter') guardarEdicion(id, evento.target);
  if (evento.key === 'Escape') cancelarEdicion();
});

// Primer dibujado con las tareas guardadas en LocalStorage
renderizar();
