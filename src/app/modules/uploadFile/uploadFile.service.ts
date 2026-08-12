import { TFile } from "../../interface/file.interface.js";
import { deleteFromS3, uploadToS3 } from "../../utils/awss3.js";

const uploadFile = async (file: TFile) => {
  if (!file) throw new Error("No file provided!");
  const url = await uploadToS3(file);
  return url;
};

const deleteFile = async (url: string) => {
  await deleteFromS3(url);
};

const uploadFiles = async (files: TFile[]) => {
  if (!files || !files.length) throw new Error("No files provided!");
  const urls = [];
  for (const file of files) {
    const url = await uploadToS3(file);
    urls.push(url);
  }
  return urls;
};

const deleteFiles = async (urls: string[]) => {
  if (!urls || !urls.length) throw new Error("No URLs provided!");
  for (const url of urls) {
    await deleteFromS3(url);
  }
};

export const uploadFileServices = {
  uploadFile,
  deleteFile,
  uploadFiles,
  deleteFiles,
};
