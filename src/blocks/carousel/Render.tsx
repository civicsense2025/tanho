import type { RenderCtx } from "../types";
import { MediaPlaceholder } from "../image/Placeholder";
import type { CarouselContent } from "./fields";

/** Horizontal scroll-snap strip — pure CSS, no JS. */
export function RenderCarousel({ content }: { content: CarouselContent; ctx: RenderCtx }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-3)",
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        paddingBottom: "var(--space-2)",
      }}
    >
      {content.slides.map((slide, i) => (
        <figure
          key={i}
          style={{ flex: "0 0 80%", minWidth: 0, margin: 0, scrollSnapAlign: "start" }}
        >
          {slide.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- author media has unknown dimensions/hosts; next/image needs sizing + remotePatterns
            <img
              src={slide.src}
              alt={slide.caption}
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                objectFit: "cover",
                display: "block",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            />
          ) : (
            <MediaPlaceholder label={slide.caption || `Slide ${i + 1}`} />
          )}
          {slide.caption && (
            <figcaption
              style={{
                marginTop: "var(--space-1-5)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--text-faint)",
              }}
            >
              {slide.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
