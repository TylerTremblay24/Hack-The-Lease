"use client";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable,
  pointerWithin, closestCenter, type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { CriterionId, UserPlace } from "@/lib/types";
import { CRITERION_GROUPS, criterionBlurb, criterionLabel } from "@/lib/engine/explain";

type Props = { tiers: CriterionId[][]; places: UserPlace[]; onChange: (t: CriterionId[][], note: string) => void };

const chipBase = "flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm select-none";

function BankChip({ id, label, onAdd }: { id: CriterionId; label: string; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} title={criterionBlurb(id)} {...attributes} {...listeners}
      onDoubleClick={onAdd}
      className={`${chipBase} cursor-grab border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-500 ${isDragging ? "opacity-30" : ""}`}>
      <span className="text-slate-500">⋮⋮</span>{label}
    </div>
  );
}

function WorkChip({ id, label, index, tied, canTie, onRemove, onTie }:
  { id: CriterionId; label: string; index: number; tied: boolean; canTie: boolean; onRemove: () => void; onTie: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-2">
      <span className="w-5 text-right text-xs font-semibold text-emerald-400">{tied ? "=" : index}</span>
      <div {...attributes} {...listeners} title={criterionBlurb(id)}
        className={`${chipBase} flex-1 cursor-grab border-emerald-600/60 bg-emerald-500/10 text-emerald-100 ${tied ? "border-dashed" : ""} ${isDragging ? "opacity-40" : ""}`}>
        <span className="text-emerald-400/60">⋮⋮</span>{label}
      </div>
      {canTie && (
        <button onClick={onTie} className="text-xs text-slate-400 underline hover:text-slate-200" title="Same importance as the chip above">
          {tied ? "untie" : "tie"}
        </button>
      )}
      <button onClick={onRemove} aria-label={`Remove ${label}`} className="px-1 text-slate-500 hover:text-rose-400">×</button>
    </div>
  );
}

function Zone({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={`${className} ${isOver ? "ring-1 ring-emerald-400/70" : ""}`}>{children}</div>;
}

/** Bank of priority chips + your ranked working list. Drag a chip from the bank into the list (or double-click it),
 *  reorder by dragging, drag back to the bank or press × to remove. "tie" merges a chip with the one above. */
export function PriorityChips({ tiers, places, onChange }: Props) {
  const lab = (c: CriterionId) => criterionLabel(c, places);
  const [active, setActive] = useState<CriterionId | null>(null);
  const flat = tiers.flat();
  const inList = new Set(flat);
  const tieOf = (c: CriterionId) => tiers.some((t) => t.length > 1 && t.includes(c));
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
    onChange(next, `Added ${lab(c)} to your priorities.`);
  }
  function remove(c: CriterionId) {
    onChange(tiers.map((t) => t.filter((x) => x !== c)).filter((t) => t.length), `Removed ${lab(c)} from your priorities.`);
  }
  function toggleTie(i: number) {
    if (i === 0) return;
    const c = flat[i], above = flat[i - 1];
    const same = tiers.find((t) => t.includes(c) && t.includes(above));
    if (same) return onChange(tiers.flatMap((t) => (t === same ? t.map((x) => [x]) : [t])), `Untied ${lab(c)}.`);
    const mine = tiers.find((t) => t.includes(c))!;
    onChange(tiers.filter((t) => t !== mine).map((t) => (t.includes(above) ? [...t, ...mine] : t)),
      `${lab(c)} now ties with ${lab(above)}.`);
  }
  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const a = e.active.id as CriterionId, o = e.over?.id as string | undefined;
    if (!o) return;
    if (inList.has(a)) {
      if (o === "bank-zone") return remove(a);
      if (o === "work-zone") return onChange(arrayMove(flat, flat.indexOf(a), flat.length - 1).map((c) => [c]), `Moved ${lab(a)} to the bottom.`);
      if (a !== o && inList.has(o as CriterionId))
        onChange(arrayMove(flat, flat.indexOf(a), flat.indexOf(o as CriterionId)).map((c) => [c]), `Moved ${lab(a)} to #${flat.indexOf(o as CriterionId) + 1}.`);
      return;
    }
    if (o === "work-zone") return add(a);
    if (inList.has(o as CriterionId)) add(a, tiers.findIndex((t) => t.includes(o as CriterionId)));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collide}
      onDragStart={(e: DragStartEvent) => setActive(e.active.id as CriterionId)} onDragCancel={() => setActive(null)} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your priorities</h3>
            <span className="text-[11px] text-slate-500">most important first</span>
          </div>
          <Zone id="work-zone" className="min-h-[64px] rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-2">
            <SortableContext items={flat} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {flat.map((c, i) => (
                  <WorkChip key={c} id={c} label={lab(c)} index={i + 1} tied={tieOf(c) && i > 0 && tiers.some((t) => t.includes(c) && t.includes(flat[i - 1]))}
                    canTie={i > 0} onRemove={() => remove(c)} onTie={() => toggleTie(i)} />
                ))}
              </div>
            </SortableContext>
            {flat.length === 0 && <p className="px-2 py-3 text-xs text-slate-500">Drag chips here from the bank below. Using cost only until you add one.</p>}
          </Zone>
        </div>

        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Chip bank</h3>
          <Zone id="bank-zone" className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
            {CRITERION_GROUPS.map((g) => {
              const left = g.ids.filter((c) => !inList.has(c));
              return (
                <div key={g.title}>
                  <div className="mb-1 text-[11px] text-slate-500">{g.title}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {left.map((c) => <BankChip key={c} id={c} label={lab(c)} onAdd={() => add(c)} />)}
                    {left.length === 0 && <span className="text-[11px] text-slate-600">all in use</span>}
                  </div>
                </div>
              );
            })}
            {places.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] text-slate-500">My places</div>
                <div className="flex flex-wrap gap-1.5">
                  {places.map((p) => `place:${p.id}` as CriterionId).filter((c) => !inList.has(c))
                    .map((c) => <BankChip key={c} id={c} label={lab(c)} onAdd={() => add(c)} />)}
                  {places.every((p) => inList.has(`place:${p.id}` as CriterionId)) && <span className="text-[11px] text-slate-600">all in use</span>}
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500">Drag into the list, or double-click a chip. Drag a listed chip back here to remove it.</p>
          </Zone>
        </div>
      </div>
      <DragOverlay>
        {active && <div className={`${chipBase} border-emerald-400 bg-slate-800 text-emerald-100 shadow-xl`}>⋮⋮ {lab(active)}</div>}
      </DragOverlay>
    </DndContext>
  );
}
