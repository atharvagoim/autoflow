import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

// Validates and replaces req.body with the parsed (trimmed, coerced) value.
export const validateBody =
  (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
