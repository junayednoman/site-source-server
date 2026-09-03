import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import pick from "../../utils/pick.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { notificationServices } from "./notification.service.js";

const create = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await notificationServices.create(
    req.user?.id as string,
    req.body
  );

  sendResponse(res, {
    status: 201,
    message: "Notification created successfully!",
    data: result,
  });
});

const getAll = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
  const result = await notificationServices.getAll(
    req.user?.id as string,
    options
  );

  sendResponse(res, {
    message: "Notifications fetched successfully!",
    data: result,
  });
});

const markAllAsRead = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await notificationServices.markAllAsRead(
      req.user?.id as string
    );

    sendResponse(res, {
      message: "Notifications marked as read successfully!",
      data: result,
    });
  }
);

const deleteSingle = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await notificationServices.deleteSingle(
      req.user?.id as string,
      req.params.id as string
    );

    sendResponse(res, {
      message: "Notification deleted successfully!",
      data: result,
    });
  }
);

const deleteAll = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await notificationServices.deleteAll(req.user?.id as string);

  sendResponse(res, {
    message: "Notifications deleted successfully!",
    data: result,
  });
});

export const notificationController = {
  create,
  getAll,
  markAllAsRead,
  deleteSingle,
  deleteAll,
};
