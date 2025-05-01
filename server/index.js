require("dotenv").config();

const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const parser = require("socket.io-msgpack-parser");

const CLIENT_URL = process.env.CLIENT_URL;
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: [CLIENT_URL],
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  parser,
  cors: {
    origin: [CLIENT_URL],
  },
});

// Shared drawing history per room
const roomHistories = {};

io.on("connection", (socket) => {
  console.log("New client connected: " + socket.id);

  socket.on("join", (room) => {
    console.log(`Socket ${socket.id} joining room ${room}`);
    socket.join(room);

    // Send current history to new client
    if (roomHistories[room]) {
      socket.emit("setElements", roomHistories[room]);
    } else {
      roomHistories[room] = [];
    }
  });

  socket.on("leave", (room) => {
    console.log(`Socket ${socket.id} leaving room ${room}`);
    socket.leave(room);
  });

  // Receive full elements update
  socket.on("getElements", ({ elements, room }) => {
    console.log(`Received getElements from ${socket.id} for room ${room}`);
    roomHistories[room] = elements;
    socket.to(room).emit("setElements", elements);
  });

  // Receive drawing action (start, move, end)
  socket.on("drawingAction", ({ action, room }) => {
    socket.to(room).emit("drawingAction", action);
  });

  // Receive tool commands like erase, clear, undo, redo
  socket.on("toolCommand", ({ command, room }) => {
    if (command.type === "clear") {
      roomHistories[room] = [];
    } else if (command.type === "undo" || command.type === "redo") {
      // For simplicity, just rebroadcast command; clients handle history
    }
    socket.to(room).emit("toolCommand", command);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected: " + socket.id);
  });
});

app.get("/", (req, res) => {
  res.send(
    `<marquee>To try the app visite : <a href="${CLIENT_URL}">${CLIENT_URL}</a></marquee>`
  );
});

server.listen(PORT, () => {
  console.log("Listen in port : " + PORT);
});
