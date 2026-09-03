import { Response } from "express";
import { UserRole } from "@prisma/client";
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
      req.user?.id,
      options,
      req.query
    );
    sendResponse(res, {
      message: "Jobs fetched successfully!",
      data: result,
    });
  }
);

const getAvailableMapJobsForWorker = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit"]);
    const result = await jobServices.getAvailableMapJobsForWorker(
      req.user?.id,
      options,
      req.query
    );

    sendResponse(res, {
      message: "Jobs fetched successfully!",
      data: result,
    });
  }
);

const getActiveJobsForWorker = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await jobServices.getActiveJobsForWorker(
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
  const result = await jobServices.getSingle(req.params.id as string);
  sendResponse(res, {
    message: "Job fetched successfully!",
    data: result,
  });
});

const apply = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await jobServices.apply(
    req.user?.id as string,
    req.params.id as string
  );
  sendResponse(res, {
    status: 201,
    message: "Job applied successfully!",
    data: result,
  });
});

const getMyAppliedJobs = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await jobServices.getMyAppliedJobs(
      req.user?.id as string,
      options
    );
    sendResponse(res, {
      message: "Applied jobs fetched successfully!",
      data: result,
    });
  }
);

const getApplicationsByJob = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await jobServices.getApplicationsByJob(
      req.user?.id as string,
      req.params.id as string,
      options
    );
    sendResponse(res, {
      message: "Applications fetched successfully!",
      data: result,
    });
  }
);

const changeApplicationStatus = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await jobServices.changeApplicationStatus(
      req.user?.id as string,
      req.params.id as string,
      req.body.status
    );
    sendResponse(res, {
      message: "Application status changed successfully!",
      data: result,
    });
  }
);

const sendOffer = handleAsyncRequest(async (req: TRequest, res: Response) => {
  const result = await jobServices.sendOffer(req.user?.id as string, req.body);
  sendResponse(res, {
    status: 201,
    message: "Job offer sent successfully!",
    data: result,
  });
});

const getSentOffers = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await jobServices.getSentOffers(
      req.user?.id as string,
      options
    );
    sendResponse(res, {
      message: "Sent offers fetched successfully!",
      data: result,
    });
  }
);

const getReceivedOffers = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await jobServices.getReceivedOffers(
      req.user?.id as string,
      options
    );
    sendResponse(res, {
      message: "Received offers fetched successfully!",
      data: result,
    });
  }
);

const getEmployerJobTitles = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await jobServices.getEmployerJobTitles(
      req.user?.id as string
    );
    sendResponse(res, {
      message: "Job titles fetched successfully!",
      data: result,
    });
  }
);

const changeJobOfferStatus = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await jobServices.changeJobOfferStatus(
      req.user?.id as string,
      req.params.id as string,
      req.body.status
    );
    sendResponse(res, {
      message: "Job offer status changed successfully!",
      data: result,
    });
  }
);

const createTimeSheet = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await jobServices.createTimeSheet(
      req.user?.id as string,
      req.params.id as string,
      req.body
    );
    sendResponse(res, {
      status: 201,
      message: "TimeSheet created successfully!",
      data: result,
    });
  }
);

const getTimeSheetByJob = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await jobServices.getTimeSheetByJob(
      req.user?.id as string,
      req.user?.role as UserRole,
      req.params.id as string
    );
    sendResponse(res, {
      message: "TimeSheet fetched successfully!",
      data: result,
    });
  }
);

const getPendingTimeSheetsForEmployer = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const options = pick(req.query, ["page", "limit", "sortBy", "orderBy"]);
    const result = await jobServices.getPendingTimeSheetsForEmployer(
      req.user?.id as string,
      options
    );

    sendResponse(res, {
      message: "Pending TimeSheets fetched successfully!",
      data: result,
    });
  }
);

const changeTimeSheetStatus = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await jobServices.changeTimeSheetStatus(
      req.user?.id as string,
      req.params.id as string,
      req.body.status
    );
    sendResponse(res, {
      message: "TimeSheet day status changed successfully!",
      data: result,
    });
  }
);

const approveAllTimeSheetDays = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const result = await jobServices.approveAllTimeSheetDays(
      req.user?.id as string,
      req.params.id as string
    );
    sendResponse(res, {
      message: "TimeSheet days approved successfully!",
      data: result,
    });
  }
);

export const jobController = {
  create,
  getMyJobs,
  getAllForWorker,
  getAvailableMapJobsForWorker,
  getActiveJobsForWorker,
  getSingle,
  apply,
  getMyAppliedJobs,
  getApplicationsByJob,
  changeApplicationStatus,
  sendOffer,
  getSentOffers,
  getReceivedOffers,
  getEmployerJobTitles,
  changeJobOfferStatus,
  createTimeSheet,
  getTimeSheetByJob,
  getPendingTimeSheetsForEmployer,
  changeTimeSheetStatus,
  approveAllTimeSheetDays,
};
