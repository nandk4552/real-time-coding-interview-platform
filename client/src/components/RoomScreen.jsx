import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FaCopy,
  FaShareSquare,
  FaSignOutAlt,
  FaStopCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import ReactPlayer from "react-player";
import { useSocket } from "../context/SocketProvider";
import peer from "../services/peer";
import { excuteCode } from "./api";
import { CODE_SNIPPETS } from "../../constants";
import Client from "./Client";
import LanguageSelector from "./LanguageSelector";
import Output from "./Output";
import ToggleViewButton from "./ToggleViewButton";
import CodeEditor from "./CodeEditor";

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const RoomScreen = () => {
  const codeMirrorRef = useRef(null);
  const navigate = useNavigate();
  const roomId = window.location.href.split("/room/")[1];

  // state variables
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showSharedScreen, setShowSharedScreen] = useState(false); // Toggle state for view
  const [value, setValue] = useState(
    codeMirrorRef.current?.getCode() || "// Start coding here!"
  );
  const [language, setLanguage] = useState("javascript");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [output, setOutput] = useState(null);

  // WebRTC State
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [clients, setclients] = useState([]);

  // Send streams
  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  // Handle user joining the room
  const handleUserJoined = useCallback(
    ({ email, id }) => {
      toast.success(`${email} joined room successfully`);
      setRemoteSocketId(id);

      // If you are already streaming video, send your stream to the newly joined user
      if (myStream) {
        sendStreams(); // Re-send your stream to the new user
      }
    },
    [myStream, sendStreams]
  );

  // Handle calling the other user
  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket]);

  // Handle incoming call
  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      if (isScreenSharing) peer.startScreenShare();
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });

      sendStreams(); // Ensure streams are sent
    },
    [socket, isScreenSharing, sendStreams]
  );

  // Handle call accepted
  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      sendStreams();
    },
    [sendStreams]
  );

  // End the call and clean up
  const handleEndCall = () => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    setMyStream(null);
    setRemoteStream(null);
    socket.emit("user:disconnect"); // Notify others in the room
    toast.success("Call ended");
    navigate("/"); // Redirect to home or another page
  };

  // Handle negotiation needed
  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  useEffect(() => {
    peer.peer.addEventListener("track", (ev) => {
      const remoteStream = ev.streams;
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  const handleClientsJoinedInRoom = useCallback(
    ({ clients, email, socketId }) => {
      if (email !== location.state?.email) {
        toast.success(`${email} joined the room`);
        console.log(`${email} joined the room}`);
      }
      setclients(clients);
    },
    []
  );

  const handleUserLeft = useCallback(({ email, id }) => {
    toast.success(`${email} has left the room`);

    // Remove the user from the clients array
    setclients((prevClients) => {
      const updatedClients = prevClients.filter(
        (client) => client.socketId !== id
      );
      console.log("Updated clients: ", updatedClients); // Check if the user is removed
      return updatedClients;
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("room:joined", handleClientsJoinedInRoom);
    socket.on("user:left", handleUserLeft);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("room:joined", handleClientsJoinedInRoom);
      socket.off("user:left", handleUserLeft);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleClientsJoinedInRoom,
    handleUserLeft,
  ]);

  // Real-time listener for incoming code changes
  useEffect(() => {
    const updateCode = ({ code }) => {
      if (code !== value) setValue(code);
    };
    socket.on("code:change", updateCode);

    // Cleanup on unmount
    return () => {
      socket.off("code:change", updateCode);
    };
  }, [socket, value]);

  // Focus editor when real-time code changes occur
  const updateCode = ({ code }) => {
    if (code !== value) {
      setValue(code);
      codeMirrorRef.current?.focus(); // Ensure editor remains in focus
    }
  };

  // Handle code changes with debounce to reduce socket messages
  const handleCodeChange = useCallback(
    debounce((code) => {
      if (code !== value) {
        updateCode(code);
        socket.emit("code:change", { roomId, code });
      }
    }, 150),
    [socket, roomId, value]
  );
  const onSelect = (language) => {
    setLanguage(language);
    setValue(CODE_SNIPPETS[language]);
  };

  const runCode = async () => {
    const sourceCode = codeMirrorRef.current?.getCode();
    setValue(sourceCode);
    if (!sourceCode) return;

    try {
      setIsLoading(true);
      const { run: result } = await excuteCode(language, sourceCode);
      setOutput(result.output.split("\n"));
      setIsError(!!result.stderr);
    } catch (error) {
      console.log(error);
      alert(`An error occurred: ${error.message || "Unable to run code"}`);
    } finally {
      setIsLoading(false);
    }
  }; // Copy Room ID functionality
  const copyRoomId = () => {
    navigator.clipboard
      .writeText(window.location.href.split("/room/")[1])
      .then(() => {
        toast.success("Room ID copied to clipboard!");
      })
      .catch((err) => {
        toast.error("Failed to copy Room ID.");
      });
  };

  // Leave Room functionality
  const leaveRoom = () => {
    toast.success("Leaving room...");

    // Emit user disconnect and clean up streams
    socket.emit("user:disconnect");
    setRemoteSocketId(null);
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop()); // Stop all tracks
    }

    setMyStream(null);
    setRemoteStream(null);
    setclients([]);
    navigate("/");
  };

  // Function to handle screen sharing
  const handleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      peer.stopScreenShare();
      setIsScreenSharing(false);
      toast.success("Screen sharing stopped");
      setRemoteStream(null); // Stop displaying the video when sharing is stopped
    } else {
      try {
        const screenStream = await peer.startScreenShare();
        setRemoteStream(screenStream);
        setIsScreenSharing(true);
        toast.success("Screen sharing started");
      } catch (error) {
        toast.error("Failed to start screen sharing");
      }
    }
  }, [isScreenSharing]);

  // Toggle between shared screen and code editor
  const handleToggleView = () => {
    setShowSharedScreen((prev) => !prev);
  };
  return (
    <div className="p-0 sm:px-3 sm:py-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 min-h-screen text-white">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-4 grid-cols-1 gap-6">
        {/* Left Side: Code Editor and Output */}
        <div className="lg:col-span-3 bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 font-semibold hidden md:inline">
                Language:
              </span>
              <LanguageSelector language={language} onSelect={onSelect} />
            </div>

            {/* Toggle Button in Center */}
            <ToggleViewButton
              showSharedScreen={showSharedScreen}
              handleToggleView={handleToggleView}
            />
            <button
              onClick={runCode}
              disabled={isLoading}
              className={`py-1 px-3 md:py-2 md:px-4 text-sm rounded-lg shadow-md transition duration-300 ease-in-out ${
                isLoading
                  ? "bg-gray-500 text-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {isLoading ? "Running..." : "Run Code"}
            </button>
          </div>
          {/* Conditionally Render Code Editor or Shared Screen */}
          {showSharedScreen ? (
            <div className="h-full">
              {remoteStream ? (
                <ReactPlayer
                  url={remoteStream}
                  playing
                  muted
                  volume={0}
                  controls={false}
                  width="100%"
                  height="100%"
                  playsinline
                  style={{ backgroundColor: "black" }}
                />
              ) : (
                <p className="text-center text-gray-400">
                  Screen sharing is not active.
                </p>
              )}
            </div>
          ) : (
            <div className="editor-container h-full">
              {/* Code Editor */}
              <div className="mb-4">
                <CodeEditor
                  value={value}
                  onChange={(newCode) => handleCodeChange(newCode)}
                  ref={codeMirrorRef}
                />
              </div>

              {/* Output Section */}
              <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-sm">
                <Output
                  output={output}
                  isError={isError}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Video and Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Room Controls: Copy & Leave */}
          <div className="flex justify-center space-x-2 mt-4">
            {/* Screen Share Button */}
            <button
              onClick={handleScreenShare}
              className={`flex items-center space-x-1 py-1 px-2 sm:py-1 sm:px-2 text-xs sm:text-sm font-medium rounded-md shadow transition duration-300 ease-in-out ${
                isScreenSharing
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {/* Toggle between icons based on sharing status */}
              {isScreenSharing ? (
                <FaStopCircle className="text-sm sm:text-base" />
              ) : (
                <FaShareSquare className="text-sm sm:text-base" />
              )}

              {/* Toggle button text */}
              <span className="hidden sm:inline">
                {isScreenSharing ? "Stop" : "Share"}
              </span>
            </button>

            {/* Copy Room ID Button */}
            <button
              onClick={copyRoomId}
              className="flex items-center space-x-1  text-white font-medium py-1 px-2 sm:py-1 sm:px-2 rounded-md shadow bg-teal-500 hover:bg-teal-600 transition duration-300 ease-in-out"
            >
              <FaCopy className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Copy ID</span>
            </button>

            {/* Leave Room Button */}
            <button
              onClick={leaveRoom}
              className="flex items-center space-x-1 bg-red-500 text-white font-medium py-1 px-2 sm:py-1 sm:px-2 rounded-md shadow hover:bg-red-600 transition duration-300 ease-in-out"
            >
              <FaSignOutAlt className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>

          {/* Stream View: Interviewer */}
          {myStream && (
            <div className="bg-gray-800 p-1 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105 relative">
              <div className="relative rounded-md overflow-hidden shadow-inner">
                <ReactPlayer
                  playing
                  height="240px"
                  width="100%"
                  url={myStream}
                  className="rounded-md"
                />
                <h2 className="absolute top-0 left-0 right-0 text-2xl font-semibold text-center text-white opacity-70 p-2">
                  Interviewer
                </h2>
              </div>
            </div>
          )}

          {/* Stream View: Candidate */}
          {remoteStream && (
            <div className="bg-gray-800 p-1 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105 relative">
              <div className="relative rounded-md overflow-hidden shadow-inner">
                <ReactPlayer
                  playing
                  height="240px"
                  width="100%"
                  url={remoteStream}
                  className="rounded-md"
                />
                <h2 className="absolute top-0 left-0 right-0 text-2xl font-semibold text-center text-white opacity-70 p-2">
                  Candidate
                </h2>
              </div>
            </div>
          )}

          <h4
            className={`text-xl font-bold mb-6 text-center transition-all duration-300 ease-in-out transform ${
              remoteSocketId
                ? "text-green-400 opacity-50 animate-pulse"
                : "text-red-500 opacity-50"
            }`}
          >
            {remoteSocketId ? "✅ Connected" : "⚠️ No one in the room"}
          </h4>

          {/* Client List */}
          <div className="flex items-center justify-center space-x-2 mx-auto">
            {clients.map(({ socketId, email }) => (
              <Client email={email} key={socketId} />
            ))}
          </div>

          {/* Buttons: Send Stream & Call */}
          <div className="flex space-x-4 justify-center mb-6">
            {myStream && (
              <button
                onClick={sendStreams}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg shadow-md transition duration-300"
              >
                Send Stream
              </button>
            )}
            {remoteSocketId && (
              <button
                onClick={handleCallUser}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg shadow-md transition duration-300"
              >
                CALL
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default RoomScreen;
