import { z } from "zod";
import { getCloudName } from "../../config/cloudinary";

function isValidCloudinaryUrl(rawUrl: string): boolean {
  const cloudName = getCloudName();
  if (!cloudName) return false;
  try {
    const parsed = new URL(rawUrl);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      parsed.pathname.startsWith(`/${cloudName}/`)
    );
  } catch {
    return false;
  }
}

function urlContainsPublicId(rawUrl: string, publicId: string): boolean {
  try {
    const pathname = decodeURIComponent(new URL(rawUrl).pathname);
    return pathname.includes(`/${publicId}`);
  } catch {
    return false;
  }
}

export const imageSchema = z
  .object({
    url: z.string().url("Invalid image URL").refine(isValidCloudinaryUrl, {
      message: "Image URL must be a Cloudinary URL for this account"
    }),
    publicId: z.string().min(1),
    alt: z.string().trim().min(1, "Image alt text is required").max(200),
    width: z.number().int().min(1).max(20000).optional(),
    height: z.number().int().min(1).max(20000).optional()
  })
  .superRefine((val, ctx) => {
    if (!val.publicId.startsWith("catalyst/")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publicId"],
        message: "publicId must start with catalyst/"
      });
    }
    if (!urlContainsPublicId(val.url, val.publicId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publicId"],
        message: "publicId must appear in the image URL"
      });
    }
  });

export const optionalImageSchema = imageSchema.nullable().optional();

export const cloudinaryPdfSchema = z
  .object({
    url: z.string().url("Invalid file URL").refine(isValidCloudinaryUrl, {
      message: "Invalid Cloudinary file URL"
    }),
    publicId: z
      .string()
      .regex(/^catalyst\/materials\/.+\.pdf$/, "publicId must start with catalyst/materials/ and end with .pdf"),
    format: z.string().min(1),
    bytes: z.number().int().positive()
  })
  .superRefine((val, ctx) => {
    if (!urlContainsPublicId(val.url, val.publicId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publicId"],
        message: "File publicId must appear in the URL"
      });
    }
  });

export const safeHttpsLinkSchema = z
  .string()
  .url("Links must start with https://")
  .superRefine((rawUrl, ctx) => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "https:") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Links must start with https://" });
      }
      if (parsed.username || parsed.password || parsed.port) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Link URL cannot contain credentials or a port"
        });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Links must start with https://" });
    }
  });
