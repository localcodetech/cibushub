import { cn } from "@/lib/utils";

// A grey block that gently pulses where content will appear while it loads [AC-UX-02].
// Give it the size of the real thing, so nothing jumps when the data arrives.
//
// <Skeleton className="h-5 w-40" />              -> a line of text
// <Skeleton className="aspect-video w-full" />   -> a photo
//
// Put role="status" on the box around a group of skeletons, with hidden text
// like <span className="sr-only">Loading restaurants</span> for screen readers.
// (index.css stops the pulse for people who ask their device for less motion.)
const Skeleton = ({ className }) => {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
};

export default Skeleton;
