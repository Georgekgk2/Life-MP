import Link from "next/link";

type InternalHref = `/${string}`;

type SectionHeadingProps = Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: InternalHref;
  actionLabel?: string;
}>;

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: SectionHeadingProps) {
  const hasAction = actionHref !== undefined && actionLabel !== undefined;

  return (
    <header className="section-heading">
      <div className="section-heading__content">
        {eyebrow ? <p className="section-heading__eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? (
          <p className="section-heading__description">{description}</p>
        ) : null}
      </div>
      {hasAction ? (
        <Link className="section-heading__action" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </header>
  );
}
