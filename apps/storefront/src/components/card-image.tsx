"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type CardImageProps = Readonly<{
  src?: string | undefined;
  fallbackSrc?: string | undefined;
  alt: string;
  loading?: "lazy" | "eager";
  sizes?: string;
  priority?: boolean;
}>;

export function CardImage({
  src,
  fallbackSrc,
  alt,
  loading = "lazy",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: CardImageProps) {
  const initialSrc = src || fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [hasError, setHasError] = useState(!initialSrc);

  useEffect(() => {
    const nextSrc = src || fallbackSrc;
    setCurrentSrc(nextSrc);
    setHasError(!nextSrc);
  }, [src, fallbackSrc]);

  if (!currentSrc || hasError) {
    return (
      <div
        className="card__image-fallback"
        role="img"
        aria-label={`${alt} — зображення недоступне`}
      >
        <span aria-hidden="true" className="card__image-fallback-icon">
          ◌
        </span>
        <span>Зображення недоступне</span>
      </div>
    );
  }

  return (
    <Image
      className="card__image"
      src={currentSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority || loading === "eager"}
      loading={priority || loading === "eager" ? undefined : "lazy"}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        } else {
          setHasError(true);
        }
      }}
    />
  );
}
