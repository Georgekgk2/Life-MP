"use client";

import { useEffect, useState } from "react";

type CardImageProps = Readonly<{
  src?: string | undefined;
  alt: string;
  loading?: "lazy" | "eager";
}>;

export function CardImage({ src, alt, loading = "lazy" }: CardImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(!src);
  }, [src]);

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
      onError={() => setHasError(true)}
    />
  );
}
