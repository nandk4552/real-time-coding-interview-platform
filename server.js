const { Server } = require("socket.io");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;
app.use(
  cors({
    origin: "*", // Allow all origins, you can restrict it by specifying allowed domains
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
// Initialize server on port 8000
const io = new Server(
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  }),
  {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
    },
  }
);

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();
const userSocketMap = {};

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({
      socketId,
      email: userSocketMap[socketId],
    })
  );
};

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);
  socket.on("room:join", (data) => {
    const { email, room } = data;
    userSocketMap[socket.id] = email;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    // Retrieve the clients in the room
    const clients = getAllConnectedClients(room);

    // Emit to the newly joined user the updated list of clients in the room
    io.to(socket.id).emit("room:joined", {
      clients,
      email,
      socketId: socket.id,
    });

    // Broadcast the new user to everyone else in the room
    socket.broadcast.to(room).emit("user:joined", { email, id: socket.id });

    // Broadcast the updated list of clients to everyone in the room
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit("room:joined", {
        clients,
        email,
        socketId: socket.id,
      });
    });
    // console.log("Clients in room", clients);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("code:change", ({ roomId, code, cursorPosition }) => {
    // Emit code change and cursor position to all other users in the room
    socket.broadcast.to(roomId).emit("code:change", { code, cursorPosition });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  // Handle custom disconnection
  socket.on("user:disconnect", () => {
    const email = socketidToEmailMap.get(socket.id);
    const room = Array.from(socket.rooms)[1]; // Assuming the room is the second in the rooms set
    if (email) {
      emailToSocketIdMap.delete(email);
      socketidToEmailMap.delete(socket.id);
      io.to(room).emit("user:left", { email, id: socket.id });
    }
    socket.leave(room);
    console.log(`Socket Disconnected`, socket.id);
  });
  // Handle disconnection
  socket.on("disconnect", () => {
    const email = socketidToEmailMap.get(socket.id);
    const room = Array.from(socket.rooms)[1]; // Assuming the room is the second in the rooms set
    if (email) {
      emailToSocketIdMap.delete(email);
      socketidToEmailMap.delete(socket.id);
      io.to(room).emit("user:left", { email, id: socket.id });
    }
    console.log(`Socket Disconnected`, socket.id);
  });
});
