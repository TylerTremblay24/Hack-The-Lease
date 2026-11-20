"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./ui";

type Props = {
  title: ReactNode;
  summary?: ReactNode; // one line shown next to the title while closed, so nothing important hides
  icon?: IconName;
  variant?: "row" | "inline";
  open?: boolean; // controlled
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dot?: boolean; // marks a section whose settings differ from the defaults
  className?: string;
  children: ReactNode;
};

/** A dropdown section. "row" is a full-width header (the input accordion); "inline" is a small toggle inside a panel. */
export function Disclosure({ title, summary, icon, variant = "inline", open, defaultOpen = false, onOpenChange, dot, className = "", children }: Props) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const id = useId();
  const toggle = () => { const n = !isOpen; if (open === undefined) setInner(n); onOpenChange?.(n); };

  return (
    <div className={className}>
      {variant === "row" ? (
        <button type="button" onClick={toggle} aria-expanded={isOpen} aria-controls={id}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-surface-2/60">
          {icon && <Icon name={icon} size={18} className={isOpen ? "text-leader" : "text-ink-muted"} />}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink">{title}{dot && <span className="h-1.5 w-1.5 rounded-full bg-flip" aria-label="changed" />}</span>
            {summary && !isOpen && <span className="block truncate text-xs text-ink-muted">{summary}</span>}
          </span>
          <Icon name="chevron" size={16} className={`text-ink-faint transition-transform duration-base ${isOpen ? "-rotate-90" : "rotate-90"}`} />
        </button>
      ) : (
        <button type="button" onClick={toggle} aria-expanded={isOpen} aria-controls={id}
          className="flex w-full items-center gap-1.5 text-left text-xs font-semibold text-ink-muted transition-colors duration-fast hover:text-ink">
          <Icon name="chevron" size={14} className={`transition-transform duration-base ${isOpen ? "rotate-90" : ""}`} />
          <span className={summary && !isOpen ? "shrink-0" : "min-w-0 flex-1"}>{title}</span>
          {summary && !isOpen && <span className="min-w-0 flex-1 truncate text-right font-normal text-ink-faint">{summary}</span>}
        </button>
      )}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div id={id} key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
