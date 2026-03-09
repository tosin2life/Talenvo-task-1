import * as React from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  titleId?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  titleId,
  children,
  className,
}: ModalProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    previousActiveElement.current =
      (document.activeElement as HTMLElement) ?? null;
    document.body.style.overflow = "hidden";

    const timer = requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      const focusable = getFocusableElements(el);
      focusable[0]?.focus();
    });

    return () => {
      cancelAnimationFrame(timer);
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    };
  }, [open]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !contentRef.current) return;
    const focusable = getFocusableElements(contentRef.current);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const target = event.target as HTMLElement;
    if (event.shiftKey) {
      if (target === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (target === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={contentRef}
        className={`max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl${className ? ` ${className}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

