import React, { useState, useCallback, useEffect } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

// zod schema for form validation
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  room: z
    .string()
    .min(1, { message: "Room number is required" })
    .refine((val) => !isNaN(parseInt(val)), {
      message: "Room number must be a number",
    })
    .refine((val) => Number.isInteger(Number(val)), {
      message: "Room number must be an integer",
    }),
});

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const socket = useSocket();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();

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
      return navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join");
    };
  }, [socket, handleJoinRoom]);

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
              onChange={(e) => setRoom(e.target.value)}
              className="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter interview room number"
              required
            />
            {errors?.room && (
              <p className="text-red-500 text-sm mt-1">{errors?.room}</p>
            )}
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
