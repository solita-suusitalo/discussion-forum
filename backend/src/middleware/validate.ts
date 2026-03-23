import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Generic middleware factory — takes any Zod schema, validates req.body,
// returns 400 with field errors if invalid, otherwise calls next().
export function validate(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            // flatten() produces:
            // {
            //   "fieldErrors": { "email": ["Invalid email"], "password": ["Too short"] },
            //   "formErrors": []   ← top-level errors (e.g. "expected object, received undefined")
            // }
            res.status(400).json({ errors: z.flattenError(result.error) });
            return;
        }
        req.body = result.data;
        next();
    };
}
