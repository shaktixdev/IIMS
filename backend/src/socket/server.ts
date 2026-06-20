import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { IAlert } from "../models/Alert.model.js";

let io: SocketServer | null = null;

export function initSocketServer(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join room based on user role or custom room
    socket.on("join-room", (room: string) => {
      console.log(`[Socket.io] Socket ${socket.id} joining room: ${room}`);
      socket.join(room);
    });

    socket.on("leave-room", (room: string) => {
      console.log(`[Socket.io] Socket ${socket.id} leaving room: ${room}`);
      socket.leave(room);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket.io] Socket.io server initialized successfully.");
  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error("Socket.io server has not been initialized yet!");
  }
  return io;
}

export function broadcastAlert(alert: any) {
  if (!io) {
    console.warn("[Socket.io] Cannot broadcast alert: Socket server not initialized yet.");
    return;
  }
  
  // Format the alert payload so it populates items if needed
  console.log(`[Socket.io] Broadcasting alert: ${alert.title}`);
  io.emit("new-alert", alert);
}
