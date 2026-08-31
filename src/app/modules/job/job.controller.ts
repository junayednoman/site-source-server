import { Response } from "express";
import { TRequest } from "../../interface/global.interface.js";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import pick from "../../utils/pick.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { jobServices } from "./job.service.js";

const create = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await jobServices.create(req.user?.id as string, req.body);
  sendResponse(res, {
    status: 201,
    message: "Job created successfully!",
    data: result,
  });
});

const getMyJobs = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
  const result = await jobServices.getMyJobs(
    req.user?.id as string,
    options,
    req.query
  );
  sendResponse(res, {
    message: "Jobs fetched successfully!",
    data: result,
  });
});

const getAllForWorker = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await jobServices.getAllForWorker(
      req.user?.id as string,
      options,
      req.query
    );
    sendResponse(res, {
      message: "Jobs fetched successfully!",
      data: result,
    });
  }
);

const getSingle = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await jobServices.getSingle(
    req.user?.id as string,
    req.params.id as string
  );
  sendResponse(res, {
    message: "Job fetched successfully!",
    data: result,
  });
});

export const jobController = {
  create,
  getMyJobs,
  getAllForWorker,
  getSingle,
};
