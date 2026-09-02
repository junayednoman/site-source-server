import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import pick from "../../utils/pick.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { chatServices } from "./chat.service.js";

const getChatList = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit"]);
  const result = await chatServices.getChatList(
    req.user?.id as string,
    options
  );

  sendResponse(res, {
    message: "Chats fetched successfully!",
    data: result,
  });
});

const getMessages = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit"]);
  const result = await chatServices.getMessages(
    req.user?.id as string,
    req.params.id as string,
    options
  );

  sendResponse(res, {
    message: "Messages fetched successfully!",
    data: result,
  });
});

const sendMessage = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await chatServices.sendMessage(req.user?.id as string, {
    ...req.body,
    conversationId: req.params.id,
  });

  sendResponse(res, {
    status: 201,
    message: "Message sent successfully!",
    data: result,
  });
});

const markMessagesAsRead = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await chatServices.markMessagesAsRead(
      req.user?.id as string,
      req.params.id as string
    );

    sendResponse(res, {
      message: "Messages marked as read successfully!",
      data: result,
    });
  }
);

export const chatController = {
  getChatList,
  getMessages,
  sendMessage,
  markMessagesAsRead,
};
