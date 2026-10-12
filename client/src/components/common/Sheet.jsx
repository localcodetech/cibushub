import { Dialog } from "radix-ui";
import { X } from "lucide-react";

// A panel over the page: slides up from the bottom on phones, sits in the middle on bigger screens.
// Radix Dialog does the hard parts for us: focus stays inside, Esc closes it,
// the page behind can't be scrolled, and screen readers announce the title.
//
// <Sheet title="Jollof with Protein" description="Smoky party jollof" onClose={handleClose}>
//   ...content...
// </Sheet>
//
// Show it with {isOpen && <Sheet ... />}; it is open whenever it is on the page.
const Sheet = ({ title, description, onClose, children }) => {
  // Radix calls this with false when the customer taps outside, presses Esc or the X
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={handleOpenChange}>
      {/* Portal draws the sheet at the end of <body>, above everything else */}
      <Dialog.Portal>
        {/* Motion answers the tap that opened it (design guide): the sheet slides up in about
            300ms, and not at all for people who ask their device for less motion */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 duration-200 animate-in fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90svh] flex-col rounded-t-xl bg-background text-foreground duration-300 animate-in slide-in-from-bottom motion-reduce:animate-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:fade-in-0 sm:zoom-in-95 sm:slide-in-from-bottom-0">
          <div className="flex items-start justify-between gap-4 border-b border-border p-4">
            <div>
              <Dialog.Title className="font-heading text-lg font-bold">{title}</Dialog.Title>
              {/* Radix wants a description for screen readers. With none, repeat the title
                  but hide it on screen (sr-only), so nothing shows twice. */}
              <Dialog.Description
                className={description ? "mt-1 text-[15px] text-muted-foreground" : "sr-only"}
              >
                {description || title}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="flex size-11 shrink-0 items-center justify-center rounded-md"
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          {/* Long content scrolls inside the sheet; the page behind stays still */}
          <div className="overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Sheet;
