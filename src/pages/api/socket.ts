import { NextApiRequest } from "next";
import { NextApiResponseServerIO } from '../../types/next';
import { Server as ServerIO } from "socket.io";

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("🔌 Starting Socket.io server...");

    const io = new ServerIO(res.socket.server, {
      path: "/api/socket",
    });

    io.on("connection", (socket) => {
      console.log("✅ Client connected:", socket.id);


      // Join room event
      socket.on("joinRoom", (roomId: string) => {
        socket.join(roomId);
        console.log(`🟢 ${socket.id} joined room ${roomId}`);
      });



      // Handle messages within a room
      socket.on("message", ({ roomId, refresh }) => {
        io.to(roomId).emit("message", refresh);
      });
      socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
      });
    });

    res.socket.server.io = io;
  } else {
    console.log("⚙️ Socket.io server already running.");
  }

  res.end();
}
