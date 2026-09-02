import { Server as HttpServer } from "http";
import jwt, { Secret } from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import ApiError from "../classes/ApiError.js";
import config from "../config/index.js";
import { TAuthUser } from "../interface/global.interface.js";
import { chatServices } from "../modules/chat/chat.service.js";
import {
  readMessageZod,
  sendMessageZod,
} from "../modules/chat/chat.validation.js";

let io: Server | undefined;

const onlineUsers = new Map<string, Set<string>>();

const addOnlineUser = (authId: string, socketId: string) => {
  const sockets = onlineUsers.get(authId) || new Set<string>();
  sockets.add(socketId);
  onlineUsers.set(authId, sockets);
};

const removeOnlineUser = (authId: string, socketId: string) => {
  const sockets = onlineUsers.get(authId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (!sockets.size) onlineUsers.delete(authId);
};

const getTokenFromSocket = (socket: Socket) => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string") return authToken;

  const authHeader = socket.handshake.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  return undefined;
};

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "PATCH"],
    },
  });

  io.use((socket, next) => {
    try {
      const token = getTokenFromSocket(socket);
      if (!token) throw new ApiError(401, "Unauthorized");

      socket.data.user = jwt.verify(
        token,
        config.jwt.accessSecret as Secret
      ) as TAuthUser;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", socket => {
    const user = socket.data.user as TAuthUser;
    addOnlineUser(user.id, socket.id);

    socket.on("message:send", async (payload, callback) => {
      try {
        const message = await chatServices.sendMessage(
          user.id,
          await sendMessageZod.parseAsync(payload)
        );
        callback?.({ success: true, data: message });
      } catch (error) {
        callback?.({
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to send message",
        });
      }
    });

    socket.on("message:read", async (payload, callback) => {
      try {
        const data = await readMessageZod.parseAsync(payload);
        const result = await chatServices.markMessagesAsRead(
          user.id,
          data.conversationId
        );
        callback?.({ success: true, data: result });
      } catch (error) {
        callback?.({
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to read messages",
        });
      }
    });

    socket.on("disconnect", () => {
      removeOnlineUser(user.id, socket.id);
    });
  });

  return io;
};

export const emitToUser = (
  authId: string,
  eventName: string,
  payload: unknown
) => {
  const sockets = onlineUsers.get(authId);
  if (!io || !sockets) return;

  sockets.forEach(socketId => {
    io?.to(socketId).emit(eventName, payload);
  });
};
