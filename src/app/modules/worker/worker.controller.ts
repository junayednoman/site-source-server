import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import { TFile } from "../../interface/file.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { workerServices } from "./worker.service.js";

const getProfile = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await workerServices.getProfile(req.user?.id as string);
  sendResponse(res, {
    message: "Profile fetched successfully!",
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
  getProfile,
  updateProfile,
};
