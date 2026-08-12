import { NextFunction, Request, Response } from "express";
import ApiError from "../classes/ApiError.js";
import config from "../config/index.js";
import { Prisma } from "@prisma/client";

const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let status = 500;
  const success = false;
  let message = "Something went wrong!";
  let error = err;
  const stack = err.stack;

  if (err instanceof Prisma.PrismaClientValidationError) {
    status = 422;
    message = "Validation error!";

    const missingMatch = err.message.match(/Argument `(\w+)` is missing/);
    const unknownMatch = err.message.match(/Unknown argument `(\w+)`/);
    const invalidMatch = err.message.match(
      /Argument `(\w+)`: Invalid value provided/
    );
    const invalidEnumMatch = err.message.match(
      /Invalid value for argument `(\w+)`/
    );

    if (missingMatch) {
      const field = missingMatch[1];
      message = `Field '${field}' is required!`;
      error = { message, path: field, code: "missing_field" };
    } else if (unknownMatch) {
      const field = unknownMatch[1];
      message = `Field '${field}' does not exist on this model!`;
      error = { message, path: field, code: "unknown_field" };
    } else if (invalidMatch) {
      const field = invalidMatch[1];
      message = `Field '${field}' has an invalid value or type!`;
      error = { message, path: field, code: "invalid_value" };
    } else if (invalidEnumMatch) {
      const field = invalidEnumMatch[1];
      message = `Field '${field}' has an invalid enum value!`;
      error = { message, path: field, code: "invalid_enum_value" };
    } else {
      message = err.message.split("\n")[0] || message;
      error = err.message;
    }
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err.name === "PrismaClientKnownRequestError"
  ) {
    if (err.code === "P2002") {
      message = `${err.meta?.modelName === "Auth" ? "User" : err.meta?.modelName} already exists with this ${
        (err.meta?.target as string[] | number[])[0]
      }!`;
      error = err.meta;
    } else if (err.code === "P2025") {
      status = 404;
      message = `${err.meta?.modelName === "Auth" ? "User" : err.meta?.modelName} not found!`;
      error = err.meta;
    } else if (err.code === "P2003") {
      const constraint = err.meta?.constraint as string | undefined;
      const modelName = err.meta?.modelName || "Record";

      if (constraint) {
        if (req.method === "DELETE") {
          message = `${modelName} cannot be deleted because it is associated with other data!`;
          status = 409;
        } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
          const parentTable = constraint?.split("_")[1] || "parent";
          message = `Invalid ${parentTable} id for ${modelName}!`;
          status = 400;
        } else {
          message = `${modelName} is associated with other data!`;
          status = 409;
        }
      } else {
        message = `${modelName} is associated with other data!`;
        status = 409;
      }
      error = err.meta;
    }
  } else if (err.name === "ZodError") {
    status = 422;
    message = err.issues[0]?.message || "Validation error!";
    error = err.issues;

    if (error[0].code === "invalid_type") {
      message = `${error[0].path[0]} must be a ${error[0].expected}!`;
    } else if (error[0].code === "invalid_value") {
      const secondPartMessage = `Invalid ${error[0].path[0]}! Expected one of ${error[0].values.join(" | ")}`;

      message = secondPartMessage;
    }
  } else if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
  } else if (err.name === "JsonWebTokenError") {
    status = 401;
    message = err?.message;
  } else if (err.name === "TokenExpiredError") {
    status = 401;
    message = err?.message;
  } else if (err.name === "MulterError") {
    status = 400;
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = err?.message;
      err = [
        {
          path: "",
          message: err?.message,
        },
      ];
    }
  }

  res.status(status).json({
    success,
    message,
    error,
    stack: config.env === "development" ? stack : undefined,
  });
};

export default globalErrorHandler;
