import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import config from "../config/index.js";
import multer, { memoryStorage } from "multer";
import ApiError from "../classes/ApiError.js";
import { TFile } from "../interface/file.interface.js";

export const s3Client = new S3Client({
  // endpoint: config.aws.endpoint as string,
  region: `${config.aws.region}`,
  credentials: {
    accessKeyId: `${config.aws.accessKeyId}`,
    secretAccessKey: `${config.aws.secretAccessKey}`,
  },
});

export const upload = multer({
  storage: memoryStorage(),
});

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const uploadImage = multer({
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new ApiError(400, "Only jpeg, png, and webp images are allowed"));
      return;
    }
    cb(null, true);
  },
});

//upload a single file
export const uploadToS3 = async (file: TFile): Promise<string> => {
  if (!file) throw new ApiError(400, "File is required");
  const fileName = `site source/${Date.now()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.bucket,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    const key = await s3Client.send(command);
    if (!key) {
      throw new ApiError(400, "File Upload failed");
    }
    const url = `${config?.aws?.s3BaseUrl}${fileName}`;
    if (!url) throw new ApiError(400, "File Upload failed");

    return url;
  } catch (error) {
    console.log(error);
    throw new ApiError(400, "File Upload failed");
  }
};

// // delete file from s3 bucket
export const deleteFromS3 = async (url: string) => {
  const key = decodeURIComponent(
    url.split(config.aws.s3BaseUrl as string)[1] as string
  );

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.log("🚀 ~ deleteFromS3 ~ error:", error);
  }
};
