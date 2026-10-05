import { ImageResponse } from "next/og";
import { brandIconDataUri } from "@/components/brand/brandMark";

export const runtime = "nodejs";

export function GET() {
  return new ImageResponse(
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img src={brandIconDataUri({ size: 192 })} width={192} height={192} />,
    { width: 192, height: 192 },
  );
}