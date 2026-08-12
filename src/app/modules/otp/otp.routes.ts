import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { otpController } from "./otp.controller.js";
import { verifyOtpZod } from "./otp.validation.js";

const router = Router();

router.post("/send", otpController.sendOtp);

router.post("/verify", validate(verifyOtpZod), otpController.verifyOtp);

export const otpRoutes = router;
