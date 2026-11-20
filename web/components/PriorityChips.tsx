"use client";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable,
  pointerWithin, closestCenter, type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type KeyboardEvent } from "react";
import type { CriterionId, UserPlace } from "@/lib/types";
import { CRITERION_GROUPS, criterionBlurb, criterionLabel } from "@/lib/engine/explain";
import { Icon, btn, label, poss } from "./ui";

type Props = {
  tiers: CriterionId[][]; places: UserPlace[]; onChange: (t: CriterionId[][], note: string) => void;
  weights?: Partial<Record<CriterionId, number>>; // the weights the current order implies (ROC), shown on each chip
  owner?: string; // in roommates mode, whose list this is
};

const stop = (e: KeyboardEvent) => e.stopPropagation(); // keep Space/Enter on inner buttons from starting a keyboard drag
const two = (n: number) => String(n).padStart(2, "0");

function BankChip({ id, text, onAdd }: { id: CriterionId; text: string; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} title={`${criterionBlurb(id)} Drag into your list, or press +.`} {...attributes} {...listeners} onDoubleClick={onAdd}
      className={`group flex cursor-grab select-none items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 py-1 pl-3 pr-1 text-sm text-ink transition-colors duration-fast hover:border-mist ${isDragging ? "opacity-30" : ""}`}>
      {text}
      <button onClick={onAdd} onKeyDown={stop} aria-label={`Add ${text} to your priorities`}
        className="grid h-6 w-6 place-items-center rounded-full text-ink-muted transition-colors duration-fast hover:bg-sage hover:text-cream">
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

interface ChipProps {
  id: CriterionId; text: string; rank: number; tiedWithPrev: boolean; inTie: boolean; weight?: number; maxWeight: number;
  canTie: boolean; onRemove: () => void; onTie: () => void; insertBefore: boolean; settled: boolean;
}
function WorkChip({ id, text, rank, tiedWithPrev, inTie, weight, maxWeight, canTie, onRemove, onTie, insertBefore, settled }: ChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const top = rank === 1 && !inTie;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="relative min-w-32 flex-1 basis-32 sm:basis-40">
      {insertBefore && <span aria-hidden className="absolute -left-2 bottom-1 top-1 w-1 rounded-full bg-flip" />}
      {tiedWithPrev && <span aria-hidden className="absolute -left-2.5 top-1/2 z-10 -translate-y-1/2 rounded bg-surface px-0.5 font-mono text-micro text-ink-muted">=</span>}
      <motion.div {...attributes} {...listeners} title={criterionBlurb(id)} aria-roledescription="sortable priority"
        aria-label={`${text}, priority ${rank}${inTie ? ", tied" : ""}${weight != null ? `, weight ${Math.round(weight * 100)}%` : ""}`}
        animate={settled ? { scale: [1.06, 0.98, 1] } : { scale: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}
        className={`flex h-full cursor-grab touch-none select-none flex-col rounded-xl border px-3 pb-2.5 pt-2 transition-colors duration-fast active:cursor-grabbing ${
          top ? "border-sage bg-gradient-to-b from-sage/35 to-sage/10" : "border-line-strong bg-surface-2 hover:border-mist/60"
        } ${inTie ? "border-dashed" : ""} ${isDragging ? "opacity-30" : ""}`}>
        <div className="flex items-start gap-1.5">
          <Icon name="grip" size={14} className="mt-0.5 text-ink-faint" />
          <span className="text-sm font-semibold leading-tight text-ink">{text}</span>
          {weight != null && <span className="num ml-auto pl-1 text-xs text-leader">{Math.round(weight * 100)}%</span>}
        </div>
        <div className="mt-1.5 flex items-center gap-1 pl-5">
          <span className={`font-mono text-micro ${top ? "text-leader" : "text-ink-muted"}`}>{two(rank)}{top ? " · TOP" : inTie ? " · TIED" : ""}</span>
          <span className="ml-auto flex items-center">
            {canTie && (
              <button onClick={onTie} onKeyDown={stop} title={tiedWithPrev ? "Untie from the chip before" : "Same importance as the chip before"}
                className="rounded px-1 font-mono text-micro text-ink-faint transition-colors duration-fast hover:bg-bg hover:text-ink">{tiedWithPrev ? "UNTIE" : "TIE"}</button>
            )}
            <button onClick={onRemove} onKeyDown={stop} aria-label={`Remove ${text}`}
              className="grid h-5 w-5 place-items-center rounded text-ink-faint transition-colors duration-fast hover:bg-bg hover:text-against">
              <Icon name="close" size={12} />
            </button>
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <motion.div className="h-full rounded-full bg-leader" initial={false} animate={{ width: `${weight != null ? (weight / maxWeight) * 100 : 0}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }} />
        </div>
      </motion.div>
    </div>
  );
}

function Zone({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={`${className} ${isOver ? "ring-1 ring-flip/60" : ""}`}>{children}</div>;
}

/** Your ranked priorities as a row of chips, plus the bank they come from. Drag to reorder (mouse, touch or keyboard:
 *  focus a chip, Space, arrow keys, Space). Drag from the bank into the row, or press + on a bank chip. */
export function PriorityChips({ tiers, places, onChange, weights, owner }: Props) {
  const lab = (c: CriterionId) => criterionLabel(c, places);
  const [active, setActive] = useState<CriterionId | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [settled, setSettled] = useState<CriterionId | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  useEffect(() => { if (!settled) return; const t = setTimeout(() => setSettled(null), 400); return () => clearTimeout(t); }, [settled]);
  const flat = tiers.flat();
  const inList = new Set(flat);
  const tierOf = (c: CriterionId) => tiers.findIndex((t) => t.includes(c));
  const rankOf = (c: CriterionId) => tiers.slice(0, tierOf(c)).reduce((a, t) => a + t.length, 0) + 1;
  const maxW = Math.max(0.0001, ...flat.map((c) => weights?.[c] ?? 0));
  const bankLeft = [...CRITERION_GROUPS.flatMap((g) => g.ids), ...places.map((p) => `place:${p.id}` as CriterionId)].filter((c) => !inList.has(c)).length;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Prefer a chip under the pointer over the big zones, so inserting lands between chips.
  const collide: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const chips = hits.filter((h) => h.id !== "work-zone" && h.id !== "bank-zone");
    if (chips.length) return chips;
    if (hits.length) return hits;
    return closestCenter(args);
  };

  function add(c: CriterionId, beforeTier?: number) {
    const next = tiers.map((t) => [...t]);
    next.splice(beforeTier ?? next.length, 0, [c]);
    setSettled(c);
    onChange(next, `Added ${lab(c)} to ${owner ? poss(owner).toLowerCase() === "your" ? "your" : poss(owner) : "your"} priorities.`);
  }
  function remove(c: CriterionId) {
    onChange(tiers.map((t) => t.filter((x) => x !== c)).filter((t) => t.length), `Removed ${lab(c)} from ${owner ? poss(owner).toLowerCase() === "your" ? "your" : poss(owner) : "your"} priorities.`);
  }
  function toggleTie(i: number) {
    if (i === 0) return;
    const c = flat[i], above = flat[i - 1];
    const same = tiers.find((t) => t.includes(c) && t.includes(above));
    if (same) return onChange(tiers.flatMap((t) => (t === same ? t.map((x) => [x]) : [t])), `Untied ${lab(c)}.`);
    const mine = tiers.find((t) => t.includes(c))!;
    onChange(tiers.filter((t) => t !== mine).map((t) => (t.includes(above) ? [...t, ...mine] : t)), `${lab(c)} now ties with ${lab(above)}.`);
  }
  function onDragEnd(e: DragEndEvent) {
    setActive(null); setOver(null);
    const a = e.active.id as CriterionId, o = e.over?.id as string | undefined;
    if (!o) return;
    if (inList.has(a)) {
      if (o === "bank-zone") return remove(a);
      if (o === "work-zone") { setSettled(a); return onChange(arrayMove(flat, flat.indexOf(a), flat.length - 1).map((c) => [c]), `Moved ${lab(a)} to the end.`); }
      if (a !== o && inList.has(o as CriterionId)) {
        setSettled(a);
        onChange(arrayMove(flat, flat.indexOf(a), flat.indexOf(o as CriterionId)).map((c) => [c]), `Moved ${lab(a)} to #${flat.indexOf(o as CriterionId) + 1}.`);
      }
      return;
    }
    if (o === "work-zone") return add(a);
    if (inList.has(o as CriterionId)) add(a, tierOf(o as CriterionId));
  }
  const fromBank = active != null && !inList.has(active);

  return (
    <DndContext id="priorities" sensors={sensors} collisionDetection={collide}
      onDragStart={(e: DragStartEvent) => setActive(e.active.id as CriterionId)}
      onDragOver={(e: DragOverEvent) => setOver((e.over?.id as string) ?? null)}
      onDragCancel={() => { setActive(null); setOver(null); }} onDragEnd={onDragEnd}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Icon name="spark" size={20} className="hidden text-flip sm:block" />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{owner ? `${poss(owner)} priorities` : "Your priorities"}</h2>
          <p className="text-xs text-ink-muted">Drag to reorder, most important first. The order becomes the weights; nothing is typed in.</p>
        </div>
        <button onClick={() => setBankOpen((o) => !o)} aria-expanded={bankOpen} aria-controls="chip-bank" className={`${btn} ml-auto`}>
          <Icon name="plus" size={16} /> Chip bank <span className="num text-ink-muted">{bankLeft}</span>
          <Icon name="chevron" size={14} className={`transition-transform duration-base ${bankOpen ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </div>

      <Zone id="work-zone" className="mt-4 rounded-card">
        <SortableContext items={flat} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {flat.map((c, i) => {
              const tiedWithPrev = i > 0 && tierOf(c) === tierOf(flat[i - 1]);
              return (
                <WorkChip key={c} id={c} text={lab(c)} rank={rankOf(c)} tiedWithPrev={tiedWithPrev} inTie={tiers[tierOf(c)].length > 1}
                  weight={weights?.[c]} maxWeight={maxW} canTie={i > 0} onRemove={() => remove(c)} onTie={() => toggleTie(i)}
                  insertBefore={fromBank && over === c} settled={settled === c} />
              );
            })}
            {flat.length === 0 && (
              <p className="w-full rounded-xl border border-dashed border-line-strong px-4 py-5 text-sm text-ink-muted">
                Nothing ranked yet, so only cost counts. Open the chip bank and drag in what matters to you.
              </p>
            )}
          </div>
        </SortableContext>
      </Zone>

      <AnimatePresence initial={false}>
        {(bankOpen || fromBank) && (
          <motion.div id="chip-bank" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
            <Zone id="bank-zone" className="mt-4 rounded-xl border border-line bg-bg/50 p-3">
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {CRITERION_GROUPS.map((g) => {
                  const left = g.ids.filter((c) => !inList.has(c));
                  return (
                    <div key={g.title}>
                      <div className={`${label} mb-1.5`}>{g.title}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {left.map((c) => <BankChip key={c} id={c} text={lab(c)} onAdd={() => add(c)} />)}
                        {left.length === 0 && <span className="py-1 text-xs text-ink-faint">all in use</span>}
                      </div>
                    </div>
                  );
                })}
                {places.length > 0 && (
                  <div>
                    <div className={`${label} mb-1.5`}>My places</div>
                    <div className="flex flex-wrap gap-1.5">
                      {places.map((p) => `place:${p.id}` as CriterionId).filter((c) => !inList.has(c))
                        .map((c) => <BankChip key={c} id={c} text={lab(c)} onAdd={() => add(c)} />)}
                      {places.every((p) => inList.has(`place:${p.id}` as CriterionId)) && <span className="py-1 text-xs text-ink-faint">all in use</span>}
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-ink-faint">Drag a chip into your list, or press +. Drag a ranked chip down here to remove it. Add your own places in the Places tab.</p>
            </Zone>
          </motion.div>
        )}
      </AnimatePresence>

      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }}>
        {active && (
          <div className="flex rotate-2 cursor-grabbing items-center gap-2 rounded-xl border border-flip bg-surface-2 px-3 py-2.5 text-sm font-semibold text-ink shadow-e2">
            <Icon name="grip" size={14} className="text-ink-faint" />{lab(active)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
