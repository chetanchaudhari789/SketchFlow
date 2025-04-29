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

io.on("connection", (socket) => {
  console.log("New client connected: " + socket.id);

  socket.on("join", (room) => {
    console.log(`Socket ${socket.id} joining room ${room}`);
    socket.join(room);
  });

  socket.on("leave", (room) => {
    console.log(`Socket ${socket.id} leaving room ${room}`);
    socket.leave(room);
  });

  socket.on("getElements", ({ elements, room }) => {
    console.log(`Received getElements from ${socket.id} for room ${room}`);
    socket.to(room).emit("setElements", elements);
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
