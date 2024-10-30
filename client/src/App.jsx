import React, { useEffect } from "react";
import RoomScreen from "./components/RoomScreen";
import { Route, Routes } from "react-router-dom";
import LobbyScreen from "./screens/Lobby";
import RoomPage from "./screens/Room";

const App = () => {
  useEffect(() => {
    // Set the initial color mode to dark
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-gray-900 text-gray-500 px-5 py-0 sm:py-8">
      <Routes>
        {/* Lobby Screen Route */}
        <Route path="/" element={<LobbyScreen />} />

        {/* Room Page with Video Streaming + Code Editor */}
        <Route path="/room/:roomId" element={<RoomScreen />} />
      </Routes>
    </div>
  );
};

export default App;
