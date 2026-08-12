import { Response } from "express";

export type TResponse<T> = {
  status?: number;
  success?: boolean;
  message: string;
  data: T | null;
};

export const sendResponse = <T>(
  res: Response,
  { status = 200, success = true, message, data }: TResponse<T>
) => {
  res.status(status).json({
    success,
    message,
    data: data || null,
  });
};
