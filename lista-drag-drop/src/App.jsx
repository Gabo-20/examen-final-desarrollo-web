
import { useState } from "react";
import "./App.css";

const datosIniciales = {
  todo: [
    {
      id: 1,
      titulo: "Estudiar React",
      descripcion: "Leer documentación básica de componentes y hooks."
    },
    {
      id: 2,
      titulo: "Diseñar interfaz",
      descripcion: "Definir estructura de la lista de tareas."
    },
    {
      id: 3,
      titulo: "Configurar Drag & Drop",
      descripcion: "Usar la API de HTML5 para arrastrar elementos."
    }
  ],
  done: [
    {
      id: 4,
      titulo: "Instalar Node.js",
      descripcion: "Asegurarse de tener Node y npm instalados."
    }
  ]
};

function App() {
  const [listas, setListas] = useState(datosIniciales);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const onDragStart = (e, tareaId, columnaOrigen) => {
    // Enviamos datos mínimos por dataTransfer
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ id: tareaId, fromColumn: columnaOrigen })
    );
    // Opcional: efecto visual
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e, columnaDestino) => {
    e.preventDefault(); // Necesario para permitir drop
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnaDestino);
  };

  const onDragLeave = () => {
    setDragOverColumn(null);
  };

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
    if (fromColumn === columnaDestino) return; // no hacemos nada si es la misma columna

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json.todo) || !Array.isArray(json.done)) {
          alert("El JSON debe tener los arrays 'todo' y 'done'.");
          return;
        }
        setListas({
          todo: json.todo,
          done: json.done
        });
      } catch (err) {
        console.error(err);
        alert("Archivo JSON inválido.");
      }
    };
    reader.readAsText(file);
  };

  const renderLista = (items, columnaClave) => {
    if (!items.length) {
      return <p className="empty-text">No hay tareas aquí.</p>;
    }

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
    <div className="app-container">
      <header className="app-header">
        <h1>Gestor de Tareas con Drag & Drop</h1>
        <p>Arrastra las tareas entre las listas "Por hacer" y "Hechas".</p>

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
            El JSON debe tener la estructura: {"{ todo: [], done: [] }"}
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
  );
}

export default App;
