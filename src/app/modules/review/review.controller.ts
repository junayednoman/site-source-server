import { UserRole } from "@prisma/client";
import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import pick from "../../utils/pick.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { reviewServices } from "./review.service.js";

const create = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await reviewServices.create(
    req.user?.id as string,
    req.user?.role as UserRole,
    req.body
  );

  sendResponse(res, {
    status: 201,
    message: "Review created successfully!",
    data: result,
  });
});

const getSummary = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await reviewServices.getSummary(req.params.authId as string);

  sendResponse(res, {
    message: "Review summary fetched successfully!",
    data: result,
  });
});

const getAllByUser = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await reviewServices.getAllByUser(
      req.params.authId as string,
      options
    );

    sendResponse(res, {
      message: "Reviews fetched successfully!",
      data: result,
    });
  }
);

export const reviewController = {
  create,
  getSummary,
  getAllByUser,
};
