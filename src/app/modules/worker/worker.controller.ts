import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import { TFile } from "../../interface/file.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import pick from "../../utils/pick.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { workerServices } from "./worker.service.js";

const getAll = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit"]);
  const result = await workerServices.getAll(
    req.user?.id as string,
    options,
    req.query
  );

  sendResponse(res, {
    message: "Workers fetched successfully!",
    data: result,
  });
});

const getProfile = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await workerServices.getProfile(req.user?.id as string);
  sendResponse(res, {
    message: "Profile fetched successfully!",
    data: result,
  });
});

const getDetails = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await workerServices.getDetails(req.user?.id as string);
  sendResponse(res, {
    message: "Details fetched successfully!",
    data: result,
  });
});

const updateProfile = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const files = req.files as Record<string, TFile[]> | undefined;
    const image = files?.image?.[0];
    const certificates = files?.certificates || [];

    const result = await workerServices.updateProfile(
      req.user?.id as string,
      req.body,
      image,
      certificates
    );
    sendResponse(res, {
      message: "Profile updated successfully!",
      data: result,
    });
  }
);

export const workerController = {
  getAll,
  getProfile,
  getDetails,
  updateProfile,
};
