import { createSignal, batch, For } from "solid-js";
import { createTauriStore, removeIndex, Todo } from "./rsstore";
import "./App.css";

function App() {
  const [newContent, setContent] = createSignal("");
  const [todos, setTodos] = createTauriStore<Todo[]>([]);

  const addTodo = (e: SubmitEvent) => {
    e.preventDefault();
    batch(() => {
      setTodos(todos.length, {
        content: newContent(),
        done: false,
      });
      setContent("");
    });
  };

  return (
    <main class="container">
      <h1>Simple Todos</h1>

      <form onSubmit={addTodo}>
        <input
          placeholder="enter todo and click +"
          class="input"
          required
          value={newContent()}
          onInput={(e) => setContent(e.currentTarget.value)}
        />
        <button>+</button>
      </form>

      <For each={todos}>
        {(todo, i) => (
          <div class="todo-item">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={(e) => setTodos(i(), "done", e.currentTarget.checked)}
            />
            <input
              type="text"
              class={todo.done ? "done" : ""}
              value={todo.content}
              onChange={(e) => setTodos(i(), "content", e.currentTarget.value)}
            />
            <button
              class="delete-btn"
              onClick={() => setTodos((t) => removeIndex(t, i()))}
            >
              x
            </button>
          </div>
        )}
      </For>
    </main>
  );
}

export default App;
