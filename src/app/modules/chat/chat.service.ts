import { Prisma } from "@prisma/client";
import ApiError from "../../classes/ApiError.js";
import prisma from "../../utils/prisma.js";
import {
  calculatePagination,
  TPaginationOptions,
} from "../../utils/paginationCalculation.js";
import { emitToUser } from "../../socket/socket.js";
import { TSendMessage } from "./chat.validation.js";

const userSelect = {
  id: true,
  email: true,
  role: true,
  profile: {
    select: {
      name: true,
      image: true,
    },
  },
} satisfies Prisma.AuthSelect;

const messageInclude = {
  senderAuth: {
    select: userSelect,
  },
  receiverAuth: {
    select: userSelect,
  },
} satisfies Prisma.MessageInclude;

const getAccessibleConversation = async (
  authId: string,
  conversationId: string
) => {
  if (!conversationId) throw new ApiError(400, "Conversation id is required");

  const conversation = await prisma.conversation.findFirstOrThrow({
    where: {
      id: conversationId,
      OR: [{ employerAuthId: authId }, { workerAuthId: authId }],
    },
  });

  return conversation;
};

const getChatList = async (authId: string, options: TPaginationOptions) => {
  const { page, take, skip } = calculatePagination(options);

  const whereConditions: Prisma.ConversationWhereInput = {
    OR: [{ employerAuthId: authId }, { workerAuthId: authId }],
  };

  const conversations = await prisma.conversation.findMany({
    where: whereConditions,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          location: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
      employerAuth: {
        select: userSelect,
      },
      workerAuth: {
        select: userSelect,
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        include: messageInclude,
      },
    },
    skip,
    take,
    orderBy: {
      updatedAt: "desc",
    },
  });

  const total = await prisma.conversation.count({
    where: whereConditions,
  });

  const chats = await Promise.all(
    conversations.map(async conversation => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          receiverAuthId: authId,
          hasRead: false,
        },
      });

      return {
        id: conversation.id,
        job: conversation.job,
        otherUser:
          conversation.employerAuthId === authId
            ? conversation.workerAuth
            : conversation.employerAuth,
        lastMessage: conversation.messages[0] || null,
        unreadCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    })
  );

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, chats };
};

const getMessages = async (
  authId: string,
  conversationId: string,
  options: TPaginationOptions
) => {
  await getAccessibleConversation(authId, conversationId);

  const { page, take, skip } = calculatePagination(options);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
    },
    include: messageInclude,
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });

  const total = await prisma.message.count({
    where: {
      conversationId,
    },
  });

  const meta = {
    page,
    limit: take,
    total,
  };

  return { meta, messages };
};

const sendMessage = async (authId: string, payload: TSendMessage) => {
  const conversation = await getAccessibleConversation(
    authId,
    payload.conversationId
  );

  const receiverAuthId =
    conversation.employerAuthId === authId
      ? conversation.workerAuthId
      : conversation.employerAuthId;

  const message = await prisma.$transaction(async tn => {
    const newMessage = await tn.message.create({
      data: {
        conversationId: payload.conversationId,
        content: payload.content,
        image: payload.image,
        senderAuthId: authId,
        receiverAuthId,
      },
      include: messageInclude,
    });

    await tn.conversation.update({
      where: {
        id: payload.conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return newMessage;
  });

  emitToUser(receiverAuthId, "message:received", message);
  emitToUser(authId, "message:sent", message);

  return message;
};

const markMessagesAsRead = async (authId: string, conversationId: string) => {
  const conversation = await getAccessibleConversation(authId, conversationId);
  const readAt = new Date();

  const result = await prisma.message.updateMany({
    where: {
      conversationId,
      receiverAuthId: authId,
      hasRead: false,
    },
    data: {
      hasRead: true,
      readAt,
    },
  });

  const senderAuthId =
    conversation.employerAuthId === authId
      ? conversation.workerAuthId
      : conversation.employerAuthId;

  const payload = {
    conversationId,
    readerAuthId: authId,
    readAt,
    count: result.count,
  };

  emitToUser(senderAuthId, "message:read", payload);

  return payload;
};

export const chatServices = {
  getChatList,
  getMessages,
  sendMessage,
  markMessagesAsRead,
};
