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

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);
  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
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

  // Handle code changes
  socket.on("code:change", ({ room, code }) => {
    socket.to(room).emit("code:sync", code);
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
