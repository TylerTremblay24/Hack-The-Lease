"use client";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CriterionId } from "@/lib/types";
import { CRITERION_LABEL } from "@/lib/engine/explain";

type Props = { tiers: CriterionId[][]; onChange: (t: CriterionId[][]) => void };

function Chip({ id, tied }: { id: CriterionId; tied: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex cursor-grab items-center gap-2 rounded border bg-white px-3 py-2 text-sm shadow-sm ${isDragging ? "opacity-60" : ""} ${tied ? "border-dashed" : ""}`}
      {...attributes}
      {...listeners}
    >
      <span className="text-slate-400">≡</span>{CRITERION_LABEL[id]}
    </div>
  );
}

/** Priorities as a sortable list. Dragging flattens ties into singleton tiers; the "tie" button
 *  merges a chip with the one above it (equal importance), "untie" splits it again. */
export function PriorityChips({ tiers, onChange }: Props) {
  const flat = tiers.flat();
  const tieOf = (i: number) => tiers.some((t) => t.length > 1 && t.includes(flat[i]));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = flat.indexOf(e.active.id as CriterionId);
    const to = flat.indexOf(e.over.id as CriterionId);
    onChange(arrayMove(flat, from, to).map((c) => [c]));
  }
  function toggleTie(i: number) {
    if (i === 0) return;
    const same = tiers.find((t) => t.includes(flat[i]) && t.includes(flat[i - 1]));
    if (same) return onChange(tiers.flatMap((t) => (t === same ? t.map((c) => [c]) : [t])));
    const mine = tiers.find((t) => t.includes(flat[i]))!;
    onChange(tiers.filter((t) => t !== mine).map((t) => (t.includes(flat[i - 1]) ? [...t, ...mine] : t)));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={flat} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {flat.map((c, i) => (
            <div key={c} className="flex items-center gap-1">
              <span className="w-4 text-xs text-slate-500">{i + 1}</span>
              <div className="flex-1"><Chip id={c} tied={tieOf(i)} /></div>
              {i > 0 && <button className="text-xs text-slate-500 underline" onClick={() => toggleTie(i)}>{tieOf(i) ? "untie" : "tie"}</button>}
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
