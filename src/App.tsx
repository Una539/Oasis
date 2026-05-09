import { createSignal, batch, For } from "solid-js";
import { createTauriStore, removeIndex } from "./utils";
import "./App.css";

type TodoItem = { title: string; done: boolean };

function App() {
  const [newTitle, setTitle] = createSignal("");
  const [todos, setTodos] = createTauriStore<TodoItem[]>([]);

  const addTodo = (e: SubmitEvent) => {
    e.preventDefault();
    batch(() => {
      setTodos(todos.length, {
        title: newTitle(),
        done: false,
      });
      setTitle("");
    });
  };

  return (
    <main class="container">
      <h1>Simple Todos</h1>

      <form onSubmit={addTodo}>
        <input
          placeholder="enter todo and click +"
          required
          value={newTitle()}
          onInput={(e) => setTitle(e.currentTarget.value)}
        />
        <button>+</button>
      </form>

      <For each={todos}>
        {(todo, i) => (
          <div>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => setTodos(i(), "done", e.currentTarget.checked)}
            />
            <input
              type="text"
              value={todo.title}
              onChange={(e) => setTodos(i(), "title", e.currentTarget.value)}
            />
            <button onClick={() => setTodos((t) => removeIndex(t, i()))}>
              x
            </button>
          </div>
        )}
      </For>
    </main>
  );
}

export default App;
