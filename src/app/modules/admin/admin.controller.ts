import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import { adminServices } from "./admin.service.js";
import { sendResponse } from "../../utils/sendResponse.js";
import pick from "../../utils/pick.js";

const getDashboard = handleAsyncRequest(
  async (_req: TRequest, res: Response) => {
    const result = await adminServices.getDashboard();

    sendResponse(res, {
      message: "Dashboard data fetched successfully!",
      data: result,
    });
  }
);

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

const getAllUsers = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit"]);
  const result = await adminServices.getAllUsers(options, req.query);

  sendResponse(res, {
    message: "Users fetched successfully!",
    data: result,
  });
});

const changeUserStatus = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await adminServices.changeUserStatus(
      req.params.id as string,
      req.body.status
    );

    sendResponse(res, {
      message: "User status updated successfully!",
      data: result,
    });
  }
);

const getAllJobs = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit"]);
  const result = await adminServices.getAllJobs(options, req.query);

  sendResponse(res, {
    message: "Jobs fetched successfully!",
    data: result,
  });
});

const deleteJob = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await adminServices.deleteJob(req.params.id as string);

  sendResponse(res, {
    message: "Job deleted successfully!",
    data: result,
  });
});

const getAllSupports = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit"]);
    const result = await adminServices.getAllSupports(options);

    sendResponse(res, {
      message: "Supports fetched successfully!",
      data: result,
    });
  }
);

const getAllReviews = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await adminServices.getAllReviews(options);

    sendResponse(res, {
      message: "Reviews fetched successfully!",
      data: result,
    });
  }
);

const deleteReview = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await adminServices.deleteReview(req.params.id as string);

    sendResponse(res, {
      message: "Review deleted successfully!",
      data: result,
    });
  }
);

export const adminController = {
  getDashboard,
  getProfile,
  updateProfile,
  getAllUsers,
  changeUserStatus,
  getAllJobs,
  deleteJob,
  getAllSupports,
  getAllReviews,
  deleteReview,
};
