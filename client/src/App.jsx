import React, { useEffect } from "react";
import CodeEditor from "./components/CodeEditor";
import { Route, Routes } from "react-router-dom";
import LobbyScreen from "./screens/Lobby";
import RoomPage from "./screens/Room";

const App = () => {
  useEffect(() => {
    // Set the initial color mode to dark
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-500 px-5 py-8">
      <Routes>
        {/* Lobby Screen Route */}
        <Route path="/" element={<LobbyScreen />} />

        {/* Room Page with Video Streaming + Code Editor */}
        <Route path="/room/:roomId" element={<CodeEditor />} />
      </Routes>
    </div>
  );
};

export default App;
