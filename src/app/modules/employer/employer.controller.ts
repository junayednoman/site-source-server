import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { employerServices } from "./employer.service.js";

const getProfile = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await employerServices.getProfile(req.user?.id as string);
  sendResponse(res, {
    message: "Profile fetched successfully!",
    data: result,
  });
});

const getDetails = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await employerServices.getDetails(req.user?.id as string);
  sendResponse(res, {
    message: "Details fetched successfully!",
    data: result,
  });
});

const updateProfile = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await employerServices.updateProfile(
      req.user?.id as string,
      req.body,
      req.file
    );
    sendResponse(res, {
      message: "Profile updated successfully!",
      data: result,
    });
  }
);

export const employerController = {
  getProfile,
  getDetails,
  updateProfile,
};
