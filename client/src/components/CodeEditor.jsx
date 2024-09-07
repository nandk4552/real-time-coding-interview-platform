import React, { useEffect, useCallback, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import ReactPlayer from "react-player";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS } from "../../constants";
import Output from "./Output";
import { excuteCode } from "./api";
import peer from "../services/peer";
import { useSocket } from "../context/SocketProvider";

const CodeEditor = () => {
  const editorRef = useRef();
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

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
    };
  }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted]);

  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

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

  // Synchronize code changes in real-time using WebSockets
  useEffect(() => {
    socket.on("code:update", (newValue) => {
      setValue(newValue);
      if (editorRef.current) {
        editorRef.current.setValue(newValue); // Update editor content
      }
    });

    return () => {
      socket.off("code:update");
    };
  }, [socket]);
  const handleCodeChange = (newValue) => {
    setValue(newValue);
    socket.emit("code:change", { value: newValue }); // Broadcast code change to other users
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
            {/* <Editor
              height="60vh"
              theme="vs-dark"
              language={language}
              defaultValue={CODE_SNIPPETS[language]}
              onMount={onMount}
              value={value}
              onChange={(v) => setValue(v)}
              className="rounded-lg"
            /> */}
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
                Candidate
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
                Interviewer
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
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
