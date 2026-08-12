import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import { adminServices } from "./admin.service.js";
import { sendResponse } from "../../utils/sendResponse.js";

const getProfile = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await adminServices.getProfile(req.user?.id as string);
  sendResponse(res, {
    message: "Profile fetched successfully!",
    data: result,
  });
});

const updateProfile = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await adminServices.updateProfile(
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

export const adminController = {
  getProfile,
  updateProfile,
};
