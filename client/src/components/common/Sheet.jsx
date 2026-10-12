import { useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// A panel over the page: slides up from the bottom on phones, sits in the middle on bigger screens.
// Radix Dialog does the hard parts for us: focus stays inside, Esc closes it,
// the page behind can't be scrolled, and screen readers announce the title.
// Motion (design guide): it slides in, slides back out when closed, and on phones can be
// swiped down by its handle. Reduced-motion users get instant changes (MotionConfig, main.jsx).
//
// <Sheet title="Jollof with Protein" description="Smoky party jollof" onClose={handleClose}>
//   ...content...
// </Sheet>
//
// Show it with {isOpen && <Sheet ... />}; it is open whenever it is on the page.
// onClose runs after the closing slide has finished (Esc, the X, tapping outside, a swipe).

// Swiped further than this, or flicked faster than this, closes it
const CLOSE_DISTANCE = 120;
const CLOSE_SPEED = 500;

const Sheet = ({ title, description, onClose, children }) => {
  // Open until the customer closes it; then the exit slide plays and onClose is called
  const [isOpen, setIsOpen] = useState(true);
  const isWide = useMediaQuery("(min-width: 640px)");
  // The swipe starts only from the handle, so scrolling inside the sheet still works
  const dragControls = useDragControls();
  // What had focus when the sheet opened (usually the button that opened it). After the
  // closing slide, focus goes back there, so keyboard and screen-reader users keep their place.
  const openerRef = useRef(document.activeElement);

  const handleClosed = () => {
    const opener = openerRef.current;
    onClose();
    // After React has updated the page; skipped if the button has gone (e.g. a removed row)
    setTimeout(() => {
      if (opener && opener.isConnected && typeof opener.focus === "function") {
        opener.focus();
      }
    }, 0);
  };

  // Radix calls this with false when the customer taps outside, presses Esc or the X
  const handleOpenChange = (open) => {
    if (!open) {
      setIsOpen(false);
    }
  };

  const handleDragEnd = (event, info) => {
    if (info.offset.y > CLOSE_DISTANCE || info.velocity.y > CLOSE_SPEED) {
      setIsOpen(false);
    }
  };

  // Phones: from the bottom edge. Wider screens: fade and grow slightly in the middle.
  const panelMotion = isWide
    ? {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
      }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <AnimatePresence onExitComplete={handleClosed}>
        {isOpen && (
          // forceMount: Motion, not Radix, decides when the sheet leaves the page
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90svh] flex-col rounded-t-xl bg-background text-foreground sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
                {...panelMotion}
                transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
                drag={isWide ? false : "y"}
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.7 }}
                onDragEnd={handleDragEnd}
              >
                {/* Phones: the handle to swipe the sheet down (touch-none: the browser
                    leaves this swipe to us instead of scrolling the page) */}
                {!isWide && (
                  <div
                    onPointerDown={(event) => dragControls.start(event)}
                    className="flex cursor-grab touch-none justify-center pt-2"
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-10 rounded-full bg-border" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 border-b border-border p-4">
                  <div>
                    <Dialog.Title className="font-heading text-lg font-bold">{title}</Dialog.Title>
                    {/* Radix wants a description for screen readers. With none, repeat the
                        title but hide it on screen (sr-only), so nothing shows twice. */}
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
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export default Sheet;
