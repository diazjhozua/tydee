import { ImageResponse } from "next/og";
import { brandIconDataUri } from "@/components/brand/brandMark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img src={brandIconDataUri({ size: 32 })} width={32} height={32} />,
    size,
  );
}