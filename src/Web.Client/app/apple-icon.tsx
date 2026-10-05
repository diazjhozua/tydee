import { ImageResponse } from "next/og";
import { brandIconDataUri } from "@/components/brand/brandMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img src={brandIconDataUri({ size: 180 })} width={180} height={180} />,
    size,
  );
}