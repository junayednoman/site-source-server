import { Response } from "express";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { TRequest } from "../../interface/global.interface.js";
import { LegalService } from "./legal.service.js";

const get = handleAsyncRequest(async (_req: TRequest, res: Response) => {
  const result = await LegalService.get();
  sendResponse(res, {
    message: "Legal data retrieved successfully!",
    data: result,
  });
});

const update = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await LegalService.upsert(req.body);
  sendResponse(res, {
    message: "Legal data updated successfully!",
    data: result,
  });
});

export const LegalController = {
  get,
  update,
};
