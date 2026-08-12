import { Response } from "express";
import handleAsyncRequest from "../../utils/handleAsyncRequest.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { TRequest } from "../../interface/global.interface.js";
import { TFile } from "../../interface/file.interface.js";
import { uploadFileServices } from "./uploadFile.service.js";

const uploadSingle = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const file = req.file as TFile;

    const url = await uploadFileServices.uploadFile(file);
    sendResponse(res, {
      message: "File uploaded successfully!",
      data: { url },
    });
  }
);

const uploadMultiple = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const files = req.files as TFile[];

    const urls = await uploadFileServices.uploadFiles(files);
    sendResponse(res, {
      message: "Files uploaded successfully!",
      data: { urls },
    });
  }
);

const deleteSingle = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const { url } = req.body;
    const result = await uploadFileServices.deleteFile(url);
    sendResponse(res, { message: "File deleted successfully!", data: result });
  }
);

const deleteMultiple = handleAsyncRequest(
  async (req: TRequest, res: Response) => {
    const { urls } = req.body;

    const result = await uploadFileServices.deleteFiles(urls);
    sendResponse(res, { message: "Files deleted successfully!", data: result });
  }
);

export const fileController = {
  uploadSingle,
  uploadMultiple,
  deleteSingle,
  deleteMultiple,
};
