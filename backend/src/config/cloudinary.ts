import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

// Parse cloudinary://api_key:api_secret@cloud_name safely without exposing credentials.
function configureCloudinary(): void {
  try {
    const parsed = new URL(env.CLOUDINARY_URL);
    cloudinary.config({
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username),
      api_secret: decodeURIComponent(parsed.password),
      secure: true
    });
  } catch {
    cloudinary.config({ secure: true });
  }
}

configureCloudinary();

export function getCloudName(): string | undefined {
  return cloudinary.config().cloud_name;
}

export { cloudinary };
