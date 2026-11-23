import { z } from "zod";

/** Contact details attached to every print / lend / item request. */
export const requesterSchema = z.object({
  requester_name: z.string().trim().min(2).max(100),
  requester_email: z.string().trim().email().max(255),
  requester_phone: z.string().trim().min(7).max(20),
});

/** Optional http(s) link; empty string allowed. zod's .url() alone accepts javascript: URLs. */
export const optionalHttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "קישור חייב להתחיל ב-http:// או https://");
