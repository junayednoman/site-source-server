import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { otpServices } from "./otp.service.js";
import { Request, Response } from "express";

const verifyOtp = handleAsyncRequest(async (req: Request, res: Response) => {
  const result = await otpServices.verifyOtp(req.body);
  sendResponse(res, {
    message: "OTP verified successfully!",
    data: result,
  });
});

const sendOtp = handleAsyncRequest(async (req: Request, res: Response) => {
  const result = await otpServices.sendOtp(req.body.email, req.body.purpose);
  sendResponse(res, {
    message: "OTP sent successfully!",
    data: result,
  });
});

export const otpController = {
  verifyOtp,
  sendOtp,
};
