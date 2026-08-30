import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { Request, Response } from "express";
import { authServices } from "./auth.service.js";
import config from "../../config/index.js";
import { TRequest } from "../../interface/global.interface.js";
import pick from "../../utils/pick.js";

const signup = handleAsyncRequest(async (req: TRequest, res) => {
  const result = await authServices.signUp(req.body, req.file);

  sendResponse(res, {
    status: 201,
    message: "Signup successful!",
    data: result,
  });
});

const login = handleAsyncRequest(async (req: Request, res: Response) => {
  const result = await authServices.login(req.body);

  // set up cookie
  const day = 24 * 60 * 60 * 1000;
  const { refreshToken, accessToken } = result;
  const cookieOptions: any = {
    httpOnly: true,
    secure: config.env === "production", // Use secure in production
    maxAge: 45 * day,
  };

  if (config.env === "production") cookieOptions.sameSite = "none";

  res.cookie("player-centralRefreshToken", refreshToken, cookieOptions);

  sendResponse(res, {
    message: "Logged in successfully!",
    data: { accessToken },
  });
});

const getSingle = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await authServices.getSingle(req.params.id as string);
  sendResponse(res, {
    message: "User retrieved successfully!",
    data: result,
  });
});

const getAll = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
  const result = await authServices.getAll(options, req.query);
  sendResponse(res, {
    message: "Users retrieved successfully!",
    data: result,
  });
});

const resetPassword = handleAsyncRequest(
  async (req: Request, res: Response) => {
    const result = await authServices.resetPassword(req.body);
    sendResponse(res, {
      message: "Password reset successfully!",
      data: result,
    });
  }
);

const changePassword = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await authServices.changePassword(
      req.body,
      req.user?.id as string
    );
    sendResponse(res, {
      message: "Password changed successfully!",
      data: result,
    });
  }
);

const changeAccountStatus = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const { message } = await authServices.changeAccountStatus(
      req.params.userId as string,
      req.body.status
    );
    sendResponse(res, {
      message,
      data: null,
    });
  }
);

const refreshToken = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const token = req.cookies["player-centralRefreshToken"];
    const result = await authServices.refreshToken(token);
    sendResponse(res, {
      message: "Token refreshed successfully!",
      data: result,
    });
  }
);

const logout = handleAsyncRequest(async (_req: Request, res: Response) => {
  res.clearCookie("player-centralRefreshToken", { httpOnly: true });
  sendResponse(res, {
    message: "Logged out successfully!",
    data: null,
  });
});

export const authController = {
  signup,
  login,
  getSingle,
  getAll,
  resetPassword,
  changePassword,
  changeAccountStatus,
  refreshToken,
  logout,
};
