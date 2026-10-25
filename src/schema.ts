import { z } from "zod";

export const ArchaeologicalReportSchema = z.object({
  possibleHistoricalPurpose: z.string().min(1),
  recommendation: z.enum(["ARCHIVE", "KEEP"]),
  reasoning: z.string().min(1),
});
