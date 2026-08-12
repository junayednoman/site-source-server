import { NextFunction, Response } from "express";
import jwt, { Secret } from "jsonwebtoken";
import { TAuthUser, TRequest } from "../interface/global.interface.js";
import ApiError from "../classes/ApiError.js";
import config from "../config/index.js";

type TAuthorizeOptions = {
  optional?: boolean;
};

const authorize = (...args: Array<string | TAuthorizeOptions>) => {
  const options =
    typeof args[0] === "object" ? (args[0] as TAuthorizeOptions) : undefined;
  const roles = (options ? args.slice(1) : args).filter(
    (arg): arg is string => typeof arg === "string"
  );

  return async (req: TRequest, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        if (options?.optional) {
          req.user = undefined;
          return next();
        }

        throw new ApiError(401, "Unauthorized");
      }
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

      if (!token) throw new ApiError(401, "Unauthorized");

      const decodedUser = jwt.verify(
        token,
        config.jwt.accessSecret as Secret
      ) as TAuthUser;
      req.user = decodedUser;

      if (roles.length && !roles.includes(decodedUser.role)) {
        throw new ApiError(403, "Forbidden!");
      }

      next();
    } catch (error: any) {
      next(error);
    }
  };
};

export default authorize;
