import { useState, useEffect } from "react";
import "./App.css";

const STORAGE_KEY = "tareas_drag_drop_listas";

function App() {
  const [listas, setListas] = useState({ todo: [], done: [] });
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // ----------- MODAL -----------
  const [modal, setModal] = useState({
    open: false,
    type: "info", // info | success | error
    title: "",
    message: ""
  });

  const showModal = (type, title, message) => {
    setModal({ open: true, type, title, message });
  };

  const closeModal = () => {
    setModal((m) => ({ ...m, open: false }));
  };
  // -----------------------------

  // ----------- LOCALSTORAGE: CARGAR AL INICIO -----------
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray(parsed.todo) &&
        Array.isArray(parsed.done)
      ) {
        setListas({ todo: parsed.todo, done: parsed.done });
      }
    } catch (err) {
      console.error("Error leyendo localStorage:", err);
    }
  }, []);

  // ----------- LOCALSTORAGE: GUARDAR EN CADA CAMBIO -----------
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listas));
    } catch (err) {
      console.error("Error guardando en localStorage:", err);
    }
  }, [listas]);
  // ------------------------------------------------------------

  const onDragStart = (e, tareaId, columnaOrigen) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ id: tareaId, fromColumn: columnaOrigen })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e, columnaDestino) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnaDestino);
  };

  const onDragLeave = () => setDragOverColumn(null);

  const onDrop = (e, columnaDestino) => {
    e.preventDefault();
    setDragOverColumn(null);

    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const { id, fromColumn } = payload;
    if (!id || !fromColumn) return;
    if (fromColumn === columnaDestino) return;

    setListas((prev) => {
      const desde = [...prev[fromColumn]];
      const hacia = [...prev[columnaDestino]];

      const index = desde.findIndex((t) => t.id === id);
      if (index === -1) return prev;

      const [tareaMovida] = desde.splice(index, 1);
      hacia.push(tareaMovida);

      return {
        ...prev,
        [fromColumn]: desde,
        [columnaDestino]: hacia
      };
    });
  };

  // ----------- VALIDACIÓN JSON (solo NUEVO archivo) -----------
  const validarEstructuraJson = (json) => {
    if (typeof json !== "object" || json === null)
      return "El JSON debe contener un objeto principal.";

    if (!Array.isArray(json.todo) || !Array.isArray(json.done))
      return "El JSON debe tener 'todo' y 'done' como arreglos.";

    const validarTarea = (t, i, nombre) => {
      if (typeof t.id === "undefined")
        return `Falta 'id' en ${nombre}[${i}]`;
      if (typeof t.titulo !== "string")
        return `La propiedad 'titulo' debe ser texto (id: ${t.id}).`;
      if (typeof t.descripcion !== "string")
        return `La propiedad 'descripcion' debe ser texto (id: ${t.id}).`;
      return null;
    };

    for (let i = 0; i < json.todo.length; i++) {
      const err = validarTarea(json.todo[i], i, "todo");
      if (err) return err;
    }

    for (let i = 0; i < json.done.length; i++) {
      const err = validarTarea(json.done[i], i, "done");
      if (err) return err;
    }

    // Duplicados DENTRO del propio archivo
    const newIds = [...json.todo, ...json.done].map((t) => t.id);
    const newIdsSet = new Set(newIds);
    if (newIdsSet.size !== newIds.length) {
      return "Dentro del archivo hay tareas con IDs duplicados.";
    }

    return null; // sin errores
  };
  // ------------------------------------------------------------

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);

        // 1) Validar estructura del archivo
        const errorEstructura = validarEstructuraJson(json);
        if (errorEstructura) {
          showModal("error", "JSON no válido", errorEstructura);
          return;
        }

        // 2) Verificar duplicados contra lo que YA existe en la app
        const existingIds = new Set(
          [...listas.todo, ...listas.done].map((t) => t.id)
        );
        const incomingIds = [...json.todo, ...json.done].map((t) => t.id);

        const idsDuplicados = incomingIds.filter((id) => existingIds.has(id));

        if (idsDuplicados.length > 0) {
          showModal(
            "error",
            "Datos duplicados",
            `El archivo contiene IDs que ya existen en la lista actual: ${[
              ...new Set(idsDuplicados)
            ].join(", ")}.`
          );
          return; // No agregamos nada
        }

        // 3) Si todo está bien, MERGE (añadir a lo que ya hay)
        setListas((prev) => ({
          todo: [...prev.todo, ...json.todo],
          done: [...prev.done, ...json.done]
        }));

        showModal(
          "success",
          "Carga exitosa",
          "El archivo JSON fue cargado y las tareas se añadieron correctamente."
        );
      } catch (err) {
        console.error(err);
        showModal(
          "error",
          "Error",
          "El archivo no tiene un formato JSON válido."
        );
      }
    };

    reader.readAsText(file);
  };

  const renderLista = (items, columnaClave) => {
    if (!items.length)
      return <p className="empty-text">No hay tareas aquí aún.</p>;

    return items.map((tarea) => (
      <div
        key={tarea.id}
        className="task-card"
        draggable
        onDragStart={(e) => onDragStart(e, tarea.id, columnaClave)}
      >
        <h3>{tarea.titulo}</h3>
        <p>{tarea.descripcion}</p>
        <span className="task-id">ID: {tarea.id}</span>
      </div>
    ));
  };

  return (
    <>
      {/* MODAL */}
      {modal.open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={
              "modal " +
              (modal.type === "error"
                ? "modal--error"
                : modal.type === "success"
                ? "modal--success"
                : "modal--info")
            }
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">{modal.title}</h2>
            <p className="modal-message">{modal.message}</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={closeModal}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APP */}
      <div className="app-container">
        <header className="app-header">
          <h1>Gestor de Tareas con Drag & Drop</h1>
          <p>
            Carga uno o varios archivos JSON. Las tareas se irán agregando a la
            lista actual.
          </p>

          <div className="file-input-wrapper">
            <label className="file-label">
              Cargar JSON de tareas
              <input
                type="file"
                accept="application/json"
                onChange={handleFileChange}
              />
            </label>
            <small className="file-help">
              Estructura esperada: {"{ todo: [], done: [] }"}
            </small>
          </div>
        </header>

        <main className="lists-wrapper">
          <section
            className={
              "list-column" +
              (dragOverColumn === "todo" ? " list-column--over" : "")
            }
            onDragOver={(e) => onDragOver(e, "todo")}
            onDrop={(e) => onDrop(e, "todo")}
            onDragLeave={onDragLeave}
          >
            <h2>Por hacer</h2>
            {renderLista(listas.todo, "todo")}
          </section>

          <section
            className={
              "list-column" +
              (dragOverColumn === "done" ? " list-column--over" : "")
            }
            onDragOver={(e) => onDragOver(e, "done")}
            onDrop={(e) => onDrop(e, "done")}
            onDragLeave={onDragLeave}
          >
            <h2>Hechas</h2>
            {renderLista(listas.done, "done")}
          </section>
        </main>
      </div>
    </>
  );
}

export default App;
