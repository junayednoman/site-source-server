import { Response } from "express";
import { TFile } from "../../interface/file.interface.js";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import pick from "../../utils/pick.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { supportServices } from "./support.service.js";

const create = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const files = req.files as TFile[] | undefined;
  const result = await supportServices.create(
    req.user?.id as string,
    req.body,
    files || []
  );

  sendResponse(res, {
    status: 201,
    message: "Support ticket created successfully!",
    data: result,
  });
});

const getAll = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
  const result = await supportServices.getAll(options);

  sendResponse(res, {
    message: "Support tickets fetched successfully!",
    data: result,
  });
});

export const supportController = {
  create,
  getAll,
};
