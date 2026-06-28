// Oasis - A simple Todo List app built with Tauri, SolidJS and Rust.
// Copyright (C) 2026 Uno
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { useDeviceDetect } from "./hooks/useDeviceDetect";
import { useTodos } from "./hooks/useTodos";
import MobileApp from "./components/MobileApp";
import DesktopApp from "./components/DesktopApp";

function App() {
  const deviceType = useDeviceDetect();
  const {
    partitions,
    handleAdd,
    handleDelete,
    handleToggle,
    handleUpdate,
    handleUpdateDueDate,
  } = useTodos();

  return (
    <>
      {deviceType() === "mobile" ? (
        <MobileApp
          partitions={partitions()}
          handleAdd={handleAdd}
          handleDelete={handleDelete}
          handleToggle={handleToggle}
          handleUpdate={handleUpdate}
          handleUpdateDueDate={handleUpdateDueDate}
        />
      ) : (
        <DesktopApp
          partitions={partitions()}
          handleAdd={handleAdd}
          handleDelete={handleDelete}
          handleToggle={handleToggle}
          handleUpdate={handleUpdate}
          handleUpdateDueDate={handleUpdateDueDate}
        />
      )}
    </>
  );
}

export default App;
