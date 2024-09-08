import React, { useEffect, useCallback, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import ReactPlayer from "react-player";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS } from "../../constants";
import Output from "./Output";
import { excuteCode } from "./api";
import peer from "../services/peer";
import { useSocket } from "../context/SocketProvider";
import Client from "./Client";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
const CodeEditor = () => {
  const navigate = useNavigate();
  const editorRef = useRef();
  const roomId = window.location.href.split("/room/")[1];
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [output, setOutput] = useState(null);

  // WebRTC State
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const [clients, setclients] = useState([]);

  // Handle user joining the room
  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  // Handle calling the other user
  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
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
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  // Send streams
  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  // Handle call accepted
  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      sendStreams();
    },
    [sendStreams]
  );

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

  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
    console.log("curr editor", editor);
    // Listen for content changes
    editor.onDidChangeModelContent((event) => {
      const code = editor.getValue();
      const cursorPosition = editor.getPosition();
      console.log("new val", code);
      handleCodeChange(code, cursorPosition); // Send changes for sync or further processing
    });
  };

  // Function to handle code change, debounced to reduce unnecessary socket emissions
  const handleCodeChange = useCallback(
    debounce((code) => {
      const editorInstance = editorRef.current;
      if (editorInstance) {
        // Get the current cursor position before updating the state
        const currentCursorPosition = editorInstance.getPosition();
        setValue(code);

        // Emit code change and cursor position if it's not a remote update
        socket.emit("code:change", {
          roomId,
          code,
          cursorPosition: {
            lineNumber: currentCursorPosition.lineNumber,
            column: currentCursorPosition.column,
          },
        });

        // Restore the cursor position after updating
        editorInstance.setPosition(currentCursorPosition);
      }
    }, 1),
    [socket]
  );

  // Handle real-time code updates from other users
  useEffect(() => {
    socket.on("code:change", ({ code, cursorPosition }) => {
      if (editorRef.current) {
        if (code !== editorRef.current.getValue()) {
          setValue(code);
          editorRef.current.setValue(code); // Update the editor

          // Ensure cursorPosition is in the correct format before setting
          if (
            cursorPosition &&
            typeof cursorPosition.lineNumber === "number" &&
            typeof cursorPosition.column === "number"
          ) {
            editorRef.current.setPosition(cursorPosition); // Set the cursor position
          }
        }
      }
    });

    return () => {
      socket.off("code:change");
    };
  }, [socket]);

  const onSelect = (language) => {
    setLanguage(language);
    setValue(CODE_SNIPPETS[language]);
  };

  const runCode = async () => {
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) return;

    try {
      setIsLoading(true);
      const { run: result } = await excuteCode(language, sourceCode);
      setOutput(result.output.split("\n"));
      result.stderr ? setIsError(true) : setIsError(false);
    } catch (error) {
      console.log(error);
      alert(`An error occurred: ${error.message || "Unable to run code"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy Room ID functionality
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
    socket.emit("user:disconnect");
    // Optionally redirect or clear state
    navigate("/");
    setRemoteSocketId(null);
    setMyStream(null);
    setRemoteStream(null);
    setclients([]);
  };

  return (
    <div className="p-6 bg-gray-900 dark:bg-gray-900 min-h-screen text-white">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-4 grid-cols-1 gap-6">
        {/* Left side: Code Editor and Language Selector */}
        <div className="lg:col-span-3 bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 font-semibold">Language:</span>
              <LanguageSelector language={language} onSelect={onSelect} />
            </div>
            <button
              onClick={runCode}
              disabled={isLoading}
              className={`py-2 px-4 text-sm rounded-lg shadow-md transition duration-300 ease-in-out ${
                isLoading
                  ? "bg-gray-500 text-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {isLoading ? "Running..." : "Run Code"}
            </button>
          </div>

          {/* Code Editor */}
          <div className="mb-4">
            <Editor
              height="60vh"
              theme="vs-dark"
              language={language}
              value={value}
              onMount={onMount}
              onChange={handleCodeChange} // Trigger code change handling
              className="rounded-lg"
            />
          </div>

          {/* Output Component */}
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 shadow-sm">
            <Output output={output} isError={isError} isLoading={isLoading} />
          </div>
        </div>

        {/* Right side: Video of interviewer and candidate */}
        <div className="lg:col-span-1 space-y-6">
          <h4 className="text-xl mb-6">
            {remoteSocketId ? "Connected" : "No one in the room"}
          </h4>
          <div className="clientList flex items-center space-x-2">
            {clients.map(({ socketId, email }) => (
              <Client email={email} key={socketId} />
            ))}
          </div>

          <div className="flex space-x-4 mb-6">
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
          {myStream && (
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4 text-center">
                Interviewer
              </h2>
              <ReactPlayer
                playing
                height="240px"
                width="100%"
                url={myStream}
                className="rounded-md"
              />
            </div>
          )}

          {remoteStream && (
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold mb-4 text-center">
                Candidate
              </h2>
              <ReactPlayer
                playing
                height="240px"
                width="100%"
                url={remoteStream}
                className="rounded-md"
              />
            </div>
          )}
          <div className="flex space-x-4">
            <button
              onClick={copyRoomId}
              className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-600 transition duration-300 ease-in-out"
            >
              Copy Room ID
            </button>
            <button
              onClick={leaveRoom}
              className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-600 transition duration-300 ease-in-out"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
