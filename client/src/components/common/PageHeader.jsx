import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";

// The top of every page: an optional back link, the page title (the page's only h1), an
// optional badge beside it, a line of explanation and actions on the right.
// Pages put their own spacing (e.g. mt-6) on what comes next.
//
// <PageHeader title="My orders" />
// <PageHeader
//   back={{ to: "/admin/riders", label: "Riders" }}
//   title="Riders online"
//   subtitle="Blue: free. Orange: on a delivery."
//   actions={<Button>Add admin</Button>}
// />
//
// title:    text or JSX (e.g. <>Hello, {name}</>)
// back:     { to, label }: where "back" goes, named ("Orders", not just "Back")
// leading:  a photo or Avatar before the title (people's pages)
// badge:    e.g. a StatusBadge shown next to the title
// meta:     a small muted line under the title (e.g. "Placed 12 Oct 2026, 15:34")
// subtitle: one or two sentences about the page
// actions:  buttons or links on the right; they move under the title on narrow screens
// className: spacing for this page (e.g. "mb-6")

const PageHeader = ({ title, back, leading, badge, meta, subtitle, actions, className }) => {
  return (
    <header className={className}>
      {back && (
        <Link
          to={back.to}
          className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-[15px] font-bold text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {leading}
        {/* At least 12rem for the title: long actions move under it on phones instead of
            squeezing it */}
        <div className="min-w-48 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Heading level={1}>{title}</Heading>
            {badge}
          </div>
          {meta && <p className="mt-1 text-[15px] text-muted-foreground">{meta}</p>}
          {subtitle && (
            <Text muted className="mt-1 max-w-prose">
              {subtitle}
            </Text>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
};

export default PageHeader;
