// Hand-written JSON Schema for the MCP tool input.
// We don't use a generator — the schema is small, stable, and we want
// carefully-tuned descriptions for the AI calling the tool.

const personSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      minLength: 1,
      maxLength: 50,
      description: "Full name as displayed (e.g. 'Vito Napoli').",
    },
    birth: {
      type: "integer",
      description: "Birth year (4-digit). Omit if unknown.",
    },
    death: {
      type: "integer",
      description: "Death year (4-digit). Omit if unknown or still living.",
    },
  },
} as const;

const coupleSchema = {
  type: "object",
  required: ["father", "mother"],
  additionalProperties: false,
  properties: {
    father: personSchema,
    mother: personSchema,
    marriageYear: {
      type: "integer",
      description: "Marriage year. Omit if unknown.",
    },
  },
} as const;

export const familyTreeJsonSchema = {
  type: "object",
  required: ["couple"],
  additionalProperties: false,
  properties: {
    couple: {
      ...coupleSchema,
      description: "The central couple whose tree is being drawn.",
    },
    fatherParents: {
      ...coupleSchema,
      description: "The father's parents (paternal grandparents). Optional.",
    },
    motherParents: {
      ...coupleSchema,
      description: "The mother's parents (maternal grandparents). Optional.",
    },
    children: {
      type: "array",
      maxItems: 20,
      default: [],
      items: personSchema,
      description: "Children of the central couple, left-to-right in display order.",
    },
  },
} as const;

// For the MCP tool — accepts any Zod schema but we ignore it and use our hand-written one.
// The parameter type keeps the call site consistent with zodToJsonSchema libraries.
export function zodToJsonSchema(_zod: unknown) {
  return familyTreeJsonSchema;
}
