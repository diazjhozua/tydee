import { ImageResponse } from "next/og";
import { brandIconDataUri } from "@/components/brand/brandMark";

export const runtime = "nodejs";

export function GET() {
  return new ImageResponse(
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img src={brandIconDataUri({ size: 512 })} width={512} height={512} />,
    { width: 512, height: 512 },
  );
}