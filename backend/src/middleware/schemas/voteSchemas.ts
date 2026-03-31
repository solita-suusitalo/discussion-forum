import { z } from "zod";

export const voteSchema = z.object({
    value: z.literal(1).or(z.literal(-1)),
});
