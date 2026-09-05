import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import pick from "../../utils/pick.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { bookmarkServices } from "./bookmark.service.js";

const createJobBookmark = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await bookmarkServices.createJobBookmark(
      req.user?.id as string,
      req.body
    );

    sendResponse(res, {
      status: 201,
      message: "Job bookmark updated successfully!",
      data: result,
    });
  }
);

const getJobBookmarks = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await bookmarkServices.getJobBookmarks(
      req.user?.id as string,
      options
    );

    sendResponse(res, {
      message: "Job bookmarks fetched successfully!",
      data: result,
    });
  }
);

const createWorkerBookmark = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await bookmarkServices.createWorkerBookmark(
      req.user?.id as string,
      req.body
    );

    sendResponse(res, {
      status: 201,
      message: "Worker bookmark updated successfully!",
      data: result,
    });
  }
);

const getWorkerBookmarks = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await bookmarkServices.getWorkerBookmarks(
      req.user?.id as string,
      options
    );

    sendResponse(res, {
      message: "Worker bookmarks fetched successfully!",
      data: result,
    });
  }
);

export const bookmarkController = {
  createJobBookmark,
  getJobBookmarks,
  createWorkerBookmark,
  getWorkerBookmarks,
};
