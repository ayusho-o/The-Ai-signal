import { z } from "zod";

export const AppTypeSchema = z.enum([
  "crm",
  "project_management",
  "ecommerce",
  "hr_tool",
  "inventory",
  "content_platform",
  "analytics",
  "custom",
]);

export const ClarificationSchema = z.object({
  flag: z.literal(true),
  question: z.string().min(1),
});

export const AppIntentSchema = z.object({
  appName: z.string().min(1, "appName is required"),
  appType: AppTypeSchema,
  features: z.array(z.string()),
  entities: z.array(z.string()),
  integrations_requested: z.array(z.string()),
  assumptions: z.array(z.string()),
  clarification_required: ClarificationSchema.optional(),
});

export type AppIntentSchemaType = z.infer<typeof AppIntentSchema>;
