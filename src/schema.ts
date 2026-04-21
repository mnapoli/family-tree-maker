import { z } from "zod";

const MAX_NAME_LEN = 50;
const MAX_CHILDREN = 20;

const year = z
  .number()
  .int()
  .min(-3000)
  .max(3000)
  .optional();

export const PersonSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LEN),
  birth: year,
  death: year,
});

export const CoupleSchema = z.object({
  father: PersonSchema,
  mother: PersonSchema,
  marriageYear: year,
});

export const FamilyTreeSchema = z.object({
  couple: CoupleSchema,
  fatherParents: CoupleSchema.optional(),
  motherParents: CoupleSchema.optional(),
  children: z.array(PersonSchema).max(MAX_CHILDREN).default([]),
});

export type Person = z.infer<typeof PersonSchema>;
export type Couple = z.infer<typeof CoupleSchema>;
export type FamilyTree = z.infer<typeof FamilyTreeSchema>;

export const EXAMPLE_TREE: FamilyTree = {
  couple: {
    father: { name: "Vito Napoli", birth: 1854 },
    mother: { name: "Giuseppa Grammatico", birth: 1860 },
    marriageYear: 1876,
  },
  fatherParents: {
    father: { name: "Girolamo Napoli" },
    mother: { name: "Teresa Poma" },
  },
  motherParents: {
    father: { name: "Nicolo Grammatico" },
    mother: { name: "Rosaria Rizzo" },
  },
  children: [
    { name: "Nicolo", birth: 1880 },
    { name: "Rosaria", birth: 1891 },
    { name: "Giuseppe", birth: 1892 },
    { name: "Girolamo" },
    { name: "Mario" },
  ],
};

export function encodeTree(tree: FamilyTree): string {
  const json = JSON.stringify(tree);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeTree(encoded: string): FamilyTree {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const json = new TextDecoder().decode(bytes);
  return FamilyTreeSchema.parse(JSON.parse(json));
}

export function formatLifespan(p: Person): string | null {
  if (p.birth == null && p.death == null) return null;
  const b = p.birth != null ? String(p.birth) : "?";
  const d = p.death != null ? String(p.death) : "?";
  return `${b} - ${d}`;
}
