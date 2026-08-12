import { NextFunction, Request, Response } from "express";

const routeNotFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  res.status(404).json({
    success: false,
    message: "API route not found!",
    path: req.originalUrl,
  });
};

export default routeNotFoundHandler;
