import { z } from "zod";
export const predictRequest = z
  .object({
    stage: z.enum(["enrollment", "semester1", "semester2"]),
    rows: z
      .array(
        z.record(
          z.string().max(120),
          z.union([z.number().finite(), z.string().max(100), z.null()]),
        ),
      )
      .min(1)
      .max(250)
      .refine((rows) => rows.every((row) => Object.keys(row).length <= 60), "Too many columns"),
    save: z.boolean().default(false),
  })
  .strict();
const probability = z.number().min(0).max(1);
export const modelResponse = z.object({
  stage: z.enum(["enrollment", "semester1", "semester2"]),
  model_version: z.string().regex(/^[a-f0-9]{64}$/),
  results: z
    .array(
      z.object({
        row: z.number().int().positive(),
        outcome: z.enum(["Dropout", "Enrolled", "Graduate"]),
        probabilities: z
          .object({ Dropout: probability, Enrolled: probability, Graduate: probability })
          .refine((p) => Math.abs(p.Dropout + p.Enrolled + p.Graduate - 1) < 0.00001),
      }),
    )
    .min(1)
    .max(250),
  warnings: z.array(z.string()).max(100),
});
export function safeCell(value: unknown): string {
  const text = String(value ?? "");
  return /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
}
