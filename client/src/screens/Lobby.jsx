import React, { useState, useCallback, useEffect } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";

// zod schema for form validation
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  room: z.string().min(1, { message: "Room number is required" }),
});

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const socket = useSocket();

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuid();
    setRoom(id);
    toast.success("Created new Room ID successfully!");
  };

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      if (!room || !email) {
        toast.error("All fields are required!");
        return;
      }

      // Validate form data using Zod
      const validationResult = formSchema.safeParse({ email, room });

      if (!validationResult.success) {
        // Extract the error messages
        const validationErrors = validationResult.error.format();
        setErrors({
          email: validationErrors.email?._errors[0],
          room: validationErrors.room?._errors[0],
        });
        return;
      }

      // If validation passes, emit the event
      socket.emit("room:join", {
        email,
        room,
      });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { room } = data;
      return navigate(`/room/${room}`, {
        state: {
          email,
        },
      });
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join");
    };
  }, [socket, handleJoinRoom]);

  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      handleJoinRoom();
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Join an Interview Room
        </h2>
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email ID:
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyUp={handleInputEnter}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your email"
              required
            />
            {errors?.email && (
              <p className="text-red-500 text-sm mt-1">{errors?.email}</p>
            )}
          </div>

          {/* Room Number Field */}
          <div>
            <label htmlFor="room" className="block text-sm font-medium mb-2">
              Interview Room Number:
            </label>
            <input
              type="text"
              id="room"
              name="room"
              value={room}
              onKeyUp={handleInputEnter}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter interview room number"
              required
            />
            {errors?.room && (
              <p className="text-red-500 text-sm mt-1">{errors?.room}</p>
            )}
          </div>
          <div>
            <span className="my-3">
              if you don't have an invite then create &nbsp;
              <a
                className="text-green-500 underline"
                onClick={createNewRoom}
                href=""
              >
                new room
              </a>
            </span>
          </div>

          {/* Join Button */}
          <div className="text-center">
            <button
              type="submit"
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-md font-semibold text-white transition duration-300 ease-in-out"
            >
              Join Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LobbyScreen;
