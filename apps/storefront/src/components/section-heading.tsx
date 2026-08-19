import Link from "next/link";

type InternalHref = `/${string}`;

type SectionHeadingProps = Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: InternalHref;
  actionLabel?: string;
  level?: "h1" | "h2" | "h3";
}>;

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  level = "h2",
}: SectionHeadingProps) {
  const hasAction = actionHref !== undefined && actionLabel !== undefined;
  const HeadingTag = level;

  return (
    <header className="section-heading">
      <div className="section-heading__content">
        {eyebrow ? <p className="section-heading__eyebrow">{eyebrow}</p> : null}
        <HeadingTag>{title}</HeadingTag>
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
