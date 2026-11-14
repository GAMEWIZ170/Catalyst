import { imageUrl } from "../utils/cloudinary";
import { isLowData } from "../utils/lowData";

const WIDTHS = [400, 800, 1200];
// Low-data mode: two smaller sizes, never the 1200 one, at lower quality. The setting is read each time an image
// is drawn, so every page opened after the student switches it on follows it.
const LOW_WIDTHS = [320, 640];

// A stored image ({ url, alt, width, height }) shown at the right size for the screen.
// Cloudinary makes three sizes (400, 800, 1200 px wide) in the best format the browser supports, and the
// browser downloads only the one it needs. width and height reserve the space so the page does not jump when
// the image arrives; images saved before sizes were stored have none, so the attributes are left out.
// `sizes` says how wide the image is drawn: "(max-width: 800px) 100vw, 800px" means full width on phones.
export default function ResponsiveImage({ image, sizes = "(max-width: 800px) 100vw, 800px", loading, ...rest }) {
  if (!image?.url) return null;
  const isCloudinary = image.url.includes("/upload/");
  const low = isLowData();
  const widths = low ? LOW_WIDTHS : WIDTHS;
  return <img
    src={imageUrl(image.url, low ? 640 : 800, low)}
    srcSet={isCloudinary ? widths.map((width) => `${imageUrl(image.url, width, low)} ${width}w`).join(", ") : undefined}
    sizes={isCloudinary ? sizes : undefined}
    alt={image.alt || ""}
    width={image.width || undefined}
    height={image.height || undefined}
    loading={loading}
    decoding="async"
    {...rest}
  />;
}
