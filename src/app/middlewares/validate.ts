import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

const validate =
  (schema: ZodTypeAny, { formData = false }: { formData?: boolean } = {}) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!formData) {
        await schema.parseAsync(req.body);
      } else if (formData && req?.body?.payload) {
        req.body = await schema.parseAsync(
          JSON.parse(req?.body?.payload || "{}")
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };

export default validate;
