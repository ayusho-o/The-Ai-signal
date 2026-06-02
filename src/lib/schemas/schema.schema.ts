import { z } from "zod";

export const FieldTypeSchema = z.enum([
  "string",
  "text",
  "integer",
  "float",
  "boolean",
  "date",
  "datetime",
  "uuid",
  "json",
  "enum",
]);

export const RelationTypeSchema = z.enum(["hasMany", "belongsTo", "hasOne"]);

export const OnDeleteSchema = z.enum([
  "CASCADE",
  "SET_NULL",
  "RESTRICT",
  "NO_ACTION",
]);

export const FieldSchemaZod = z.object({
  name: z.string().min(1),
  type: FieldTypeSchema,
  // Make boolean flags optional with defaults — AI frequently omits these
  nullable: z.boolean().optional().default(true),
  isRelation: z.boolean().optional().default(false),
  isPrimary: z.boolean().optional().default(false),
  isUnique: z.boolean().optional().default(false),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean(), z.null()])
    .optional(),
  enumValues: z.array(z.string()).optional(),
});

export const RelationSchemaZod = z.object({
  type: RelationTypeSchema,
  target: z.string().min(1),
  foreignKey: z.string().min(1),
  onDelete: OnDeleteSchema.optional().default("SET_NULL"),
});

export const EntitySchemaZod = z.object({
  name: z.string().min(1),
  tableName: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "tableName must be snake_case"),
  fields: z.array(FieldSchemaZod).min(1),
  relations: z.array(RelationSchemaZod),
});

export const DataSchemaZod = z.object({
  entities: z.array(EntitySchemaZod).min(1, "At least one entity required"),
});

export type DataSchemaZodType = z.infer<typeof DataSchemaZod>;
