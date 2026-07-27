import Link from "next/link";

type InternalHref = `/${string}`;

type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  href?: InternalHref;
  linkLabel?: string;
}>;

export function EmptyState({
  title,
  description,
  href,
  linkLabel,
}: EmptyStateProps) {
  const hasLink = href !== undefined && linkLabel !== undefined;

  return (
    <section aria-label={title} className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__description">{description}</p>
      {hasLink ? (
        <Link className="empty-state__link" href={href}>
          {linkLabel}
        </Link>
      ) : null}
    </section>
  );
}
