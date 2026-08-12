import { NextFunction, Request, RequestHandler, Response } from "express";

const handleAsyncRequest = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
export default handleAsyncRequest;
