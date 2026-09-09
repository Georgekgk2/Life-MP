"use client";

import { useEffect, useState } from "react";

type CardImageProps = Readonly<{
  src?: string | undefined;
  fallbackSrc?: string | undefined;
  alt: string;
  loading?: "lazy" | "eager";
}>;

export function CardImage({
  src,
  fallbackSrc,
  alt,
  loading = "lazy",
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
    <img
      className="card__image"
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding="async"
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
