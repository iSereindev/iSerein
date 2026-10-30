import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const shareImageSize = { width: 1200, height: 630 };
const serifFont = readFile(join(process.cwd(), "assets/share/DejaVuSerif.ttf"));

export async function shareImage({
  title,
  description,
  topic,
}: {
  title: string;
  description: string;
  topic?: string;
}) {
  const font = await serifFont;
  const heading = title.length > 130 ? `${title.slice(0, 127)}…` : title;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", padding: 44, background: "#F6F0E8", color: "#33241D", fontFamily: "Reading Serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", border: "1px solid #D7C8B8", borderRadius: 24, padding: "38px 48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 32, letterSpacing: 6, color: "#5B3A2D" }}>iSEREIN</div>
            <div style={{ display: "flex", fontSize: 20, color: "#75665C" }}>{topic || "A page for yourself"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", fontSize: heading.length > 75 ? 52 : 68, lineHeight: 1.12, letterSpacing: -2 }}>{heading}</div>
            <div style={{ display: "flex", fontSize: 23, lineHeight: 1.45, color: "#75665C" }}>{description}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #D7C8B8", paddingTop: 22, fontSize: 19, color: "#75665C" }}>
            <div style={{ display: "flex" }}>Self · Life · Growth</div>
            <div style={{ display: "flex" }}>iserein.app</div>
          </div>
        </div>
      </div>
    ),
    {
      ...shareImageSize,
      fonts: [{ name: "Reading Serif", data: Uint8Array.from(font).buffer, style: "normal", weight: 400 }],
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=60" },
    }
  );
}
