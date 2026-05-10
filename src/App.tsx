import { createSignal, batch, For, createMemo } from "solid-js";
import { createTauriStore, removeIndex, Todo } from "./rsstore";
import { Plus, X } from "lucide-solid";
import "./App.css";

// 删除的偏移值
const DELETE_THRESHOLD = 120;

function App() {
  // 用于创建内容
  const [newContent, setContent] = createSignal("");

  // 创建 Tauri 后端储存，相比于 createStore, 多了 Tauri 初始化
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
        <button class="input-btn" type="submit" aria-label="添加待办">
          <Plus size={24} />
        </button>
      </form>

      <For each={todos}>
        {(todo, i) => {
          // 移动端的手势逻辑
          // offset 是偏移，swipeState 是状态机，idle是没有滑动，dragging代表正在滑动，snapping是没有滑到位，slide-out是滑出去，deleting是删除数据
          const [offset, setOffset] = createSignal(0);
          const [swipeState, setSwipeState] = createSignal<
            "idle" | "dragging" | "snapping" | "slide-out" | "deleting"
          >("idle");

          // 起始点
          let startX = 0;
          let startY = 0;
          let tracking = false;

          // 开始触碰
          const onTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            tracking = true;
            setSwipeState("dragging");
          };

          // 开始滑动
          const onTouchMove = (e: TouchEvent) => {
            if (!tracking) return;
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
              tracking = false;
              setOffset(0);
              setSwipeState("idle");
              return;
            }

            if (dx < 0) {
              e.preventDefault();
              setOffset(dx);
            }
          };

          //滑动结束
          const onTouchEnd = () => {
            if (!tracking) return;
            tracking = false;
            const currentIndex = i();
            const currentOffset = offset();

            if (currentOffset <= -DELETE_THRESHOLD) {
              setSwipeState("slide-out");
              setOffset(-window.innerWidth);
              setTimeout(() => {
                setSwipeState("deleting");
                setTodos((t) => removeIndex(t, currentIndex));
              }, 250);
            } else {
              setSwipeState("snapping");
              setOffset(0);
              setTimeout(() => setSwipeState("idle"), 300);
            }
          };

          // 用于创建类名，以实现不同css效果
          const trackClass = createMemo(() => {
            const state = swipeState();
            let cls = "todo-item swipe-track";
            if (state === "snapping") cls += " snapping-back";
            if (state === "slide-out") cls += " slide-out";
            if (state === "deleting") cls += " deleting";
            return cls;
          });

          return (
            <div class="todo-item-wrapper">
              <div class="delete-hint">删除</div>
              <div
                class={trackClass()}
                style={{ transform: `translateX(${offset()}px)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={(e) =>
                    setTodos(i(), "done", e.currentTarget.checked)
                  }
                />
                <input
                  type="text"
                  class={todo.done ? "done" : ""}
                  value={todo.content}
                  onChange={(e) =>
                    setTodos(i(), "content", e.currentTarget.value)
                  }
                />
                <button
                  class="delete-btn"
                  onClick={() => setTodos((t) => removeIndex(t, i()))}
                  aria-label="删除这个待办"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          );
        }}
      </For>
    </main>
  );
}

export default App;
