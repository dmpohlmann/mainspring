"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { TokenSelect } from "@/components/tui/token-select";
import { Readout } from "@/components/tui/readout";
import { TimeInput, TimeField } from "@/components/tui/time-input";
import { SEGMENT_TYPES, STATUS_TYPES, typeCode } from "@/lib/tui/types";
import {
  fmtFlex,
  fmtHM,
  flexClass,
  isCompleteTime,
  prettyDate,
  toMinutes,
} from "@/lib/tui/format";
import {
  flexMinutes,
  leaveTakenByType,
  workedMinutes,
} from "@/lib/utils/entry-calc";
import { minutesToTime } from "@/lib/utils/time-calculations";
import {
  deleteEntry,
  loadDayForEdit,
  upsertEntry,
  type DayEditData,
  type SegmentInput,
} from "@/lib/actions/entries";
import type { LeaveStatus, SegmentType } from "@/lib/types/database";

// A day is a contiguous timeline of typed blocks. Each block stores its own end;
// its start is the previous block's end (the last block always ends at the day
// finish). This guarantees no overlaps and no gaps.
type Block = { id: number; type: string; end: string };
type Range = { id: number; type: string; start: string; end: string };

function blockRanges(blocks: Block[], dayStart: string, dayEnd: string): Range[] {
  let prev = dayStart;
  return blocks.map((b, i) => {
    const end = i === blocks.length - 1 ? dayEnd : b.end;
    const range = { id: b.id, type: b.type, start: prev, end };
    prev = end;
    return range;
  });
}

// Seed the editor from loaded data: existing segments if present, else a default
// work day (08:00–17:00) with a lunch break sized from settings.
function seedBlocks(data: DayEditData): {
  dayStart: string;
  dayEnd: string;
  blocks: Block[];
  nextId: number;
} {
  const segs = data.entry?.segments ?? [];
  if (segs.length) {
    return {
      dayStart: segs[0].start_time,
      dayEnd: segs[segs.length - 1].end_time,
      blocks: segs.map((s, i) => ({ id: i + 1, type: s.type, end: s.end_time })),
      nextId: segs.length + 1,
    };
  }
  const lunchEnd = minutesToTime(13 * 60 + data.defaultLunchMinutes);
  return {
    dayStart: "08:00",
    dayEnd: "17:00",
    blocks: [
      { id: 1, type: "work", end: "13:00" },
      { id: 2, type: "break", end: lunchEnd },
      { id: 3, type: "work", end: "17:00" },
    ],
    nextId: 4,
  };
}

export interface EditActions {
  save: () => void;
  remove: () => void;
}

export function EditModal({
  date,
  today,
  onClose,
  registerActions,
}: {
  date: string;
  today: string;
  onClose: () => void;
  registerActions: (actions: EditActions | null) => void;
}) {
  const router = useRouter();

  const [data, setData] = useState<DayEditData | null>(null);
  const [dayStart, setDayStart] = useState("08:00");
  const [dayEnd, setDayEnd] = useState("17:00");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<LeaveStatus | "">("");
  const [saving, setSaving] = useState(false);
  const nextBlockId = useRef(1);

  // Load the day (and reset form) whenever the target date changes.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    loadDayForEdit(date)
      .then((d) => {
        if (cancelled) return;
        const seed = seedBlocks(d);
        nextBlockId.current = seed.nextId;
        setDayStart(seed.dayStart);
        setDayEnd(seed.dayEnd);
        setBlocks(seed.blocks);
        setNote(d.entry?.note ?? "");
        setStatus(d.entry?.status ?? "");
        setData(d);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load this day");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const ranges = useMemo(
    () => blockRanges(blocks, dayStart, dayEnd),
    [blocks, dayStart, dayEnd]
  );

  // Split the last block in two: it ends at the midpoint, a new leave block
  // fills the rest. Keeps the timeline contiguous with no overlap.
  const addBlock = () =>
    setBlocks((bs) => {
      const resolved = blockRanges(bs, dayStart, dayEnd);
      const last = resolved[resolved.length - 1];
      const mid = minutesToTime(
        Math.round((toMinutes(last.start) + toMinutes(last.end)) / 2)
      );
      return [
        ...bs.slice(0, -1),
        { ...bs[bs.length - 1], end: mid },
        { id: nextBlockId.current++, type: "annual_leave", end: dayEnd },
      ];
    });
  const updateBlock = (id: number, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id: number) =>
    setBlocks((bs) => (bs.length > 1 ? bs.filter((b) => b.id !== id) : bs));

  // Live calc — only complete-time segments contribute, so mid-typing is safe.
  const std = data?.standardDayMinutes ?? 450;
  const calcSegs = useMemo<SegmentInput[]>(
    () =>
      ranges
        .filter((r) => isCompleteTime(r.start) && isCompleteTime(r.end))
        .map((r) => ({
          type: r.type as SegmentType,
          start_time: r.start,
          end_time: r.end,
        })),
    [ranges]
  );
  const worked = workedMinutes(calcSegs);
  const dayFlex = flexMinutes(calcSegs, std);
  const leaveByType = leaveTakenByType(calcSegs);
  const runningFlex = (data?.flexBalanceExcludingDay ?? 0) + dayFlex;

  // Build the segments to persist; null if the timeline isn't valid yet.
  const buildSegments = (): SegmentInput[] | null => {
    const segs: SegmentInput[] = [];
    for (const r of ranges) {
      if (!isCompleteTime(r.start) || !isCompleteTime(r.end)) return null;
      if (toMinutes(r.end) <= toMinutes(r.start)) return null;
      segs.push({
        type: r.type as SegmentType,
        start_time: r.start,
        end_time: r.end,
      });
    }
    return segs.length ? segs : null;
  };

  const doSave = async () => {
    if (saving) return;
    const segments = buildSegments();
    if (!segments) {
      toast.error("Check the times — each block must be a valid HH:MM range");
      return;
    }
    setSaving(true);
    try {
      await upsertEntry({
        date,
        segments,
        note: note.trim() || null,
        status: status || null,
      });
      toast.success(`Saved — ${prettyDate(date)}`);
      router.refresh();
      onClose();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteEntry(date);
      toast.error(`Deleted — ${prettyDate(date)}`);
      router.refresh();
      onClose();
    } catch {
      toast.error("Delete failed");
    } finally {
      setSaving(false);
    }
  };

  // Register F2=save / F8=delete with the shell via stable wrappers that always
  // call the latest handlers (avoids re-registering on every state change).
  const saveRef = useRef(doSave);
  const deleteRef = useRef(doDelete);
  saveRef.current = doSave;
  deleteRef.current = doDelete;
  useEffect(() => {
    registerActions({
      save: () => saveRef.current(),
      remove: () => deleteRef.current(),
    });
    return () => registerActions(null);
  }, [registerActions]);

  // Focus the first field once loaded.
  useEffect(() => {
    if (!data) return;
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("#edit-modal input")?.focus()
    );
  }, [data]);

  return (
    <div
      id="edit-modal"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 sm:py-10"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <TerminalFrame title={`mainspring — ~/entry/edit [${date}]`}>
          {!data ? (
            <p className="text-muted-foreground">
              <span className="text-secondary">$</span> loading {date}…
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-baseline gap-3 border-b border-border pb-3">
                <span className="uppercase text-muted-foreground">entry for</span>
                <span className="font-bold text-secondary">
                  {prettyDate(date)}
                </span>
                {date === today && <Badge variant="secondary">today</Badge>}
                {date > today && <Badge variant="outline">scheduled</Badge>}
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="uppercase text-muted-foreground">status</span>
                <TokenSelect
                  value={status}
                  options={STATUS_TYPES}
                  onChange={(v) => setStatus(v as LeaveStatus)}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <TimeField label="start" value={dayStart} onChange={setDayStart} />
                    <TimeField label="finish" value={dayEnd} onChange={setDayEnd} />
                  </div>

                  {/* contiguous timeline of typed blocks */}
                  <div className="space-y-2 border-t border-dashed border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="uppercase text-muted-foreground">
                        day timeline
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addBlock}
                      >
                        + split
                      </Button>
                    </div>

                    {ranges.map((r, i) => {
                      const isLast = i === ranges.length - 1;
                      const mins = Math.max(
                        0,
                        toMinutes(r.end) - toMinutes(r.start)
                      );
                      return (
                        <div
                          key={r.id}
                          className="space-y-1.5 border border-border/60 p-2"
                        >
                          <TokenSelect
                            value={r.type}
                            options={SEGMENT_TYPES}
                            onChange={(v) => updateBlock(r.id, { type: v })}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{r.start}</span>
                            <span className="text-muted-foreground/50">→</span>
                            {isLast ? (
                              <span className="text-muted-foreground">{r.end}</span>
                            ) : (
                              <TimeInput
                                value={r.end}
                                onChange={(v) => updateBlock(r.id, { end: v })}
                                className="h-7 w-20"
                              />
                            )}
                            <span className="text-muted-foreground/60">
                              ({fmtHM(mins)})
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={ranges.length === 1}
                              onClick={() => removeBlock(r.id)}
                              aria-label="remove block"
                              className="ml-auto"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-muted-foreground/60">
                      blocks tile {dayStart}–{dayEnd} with no gaps. “+ split” carves
                      the last block into a leave / flex block.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="note"
                      className="uppercase text-muted-foreground"
                    >
                      note
                    </Label>
                    <Input
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="WFH, meeting notes…"
                    />
                  </div>
                </div>

                {/* live calc readout */}
                <div className="min-w-56 space-y-2 border-l border-border pl-6 text-sm">
                  <p className="uppercase text-muted-foreground">live calc</p>
                  <Readout k="worked" v={fmtHM(worked)} />
                  <Readout k="standard" v={fmtHM(std)} />
                  {Object.entries(leaveByType).map(([t, m]) => (
                    <Readout
                      key={t}
                      k={typeCode(t)}
                      v={`−${fmtHM(m)}`}
                      cls="text-[var(--c-neg)]"
                    />
                  ))}
                  <div className="my-2 border-t border-dashed border-border" />
                  <Readout
                    k="flex today"
                    v={fmtFlex(dayFlex)}
                    cls={flexClass(dayFlex)}
                  />
                  <Readout
                    k="balance →"
                    v={fmtFlex(runningFlex)}
                    cls={flexClass(runningFlex)}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 text-muted-foreground">
                <Button size="sm" onClick={doSave} disabled={saving}>
                  save [F2]
                </Button>
                <Button variant="outline" size="sm" onClick={onClose}>
                  close [Esc]
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto"
                  onClick={doDelete}
                  disabled={saving}
                >
                  delete [F8]
                </Button>
              </div>
            </>
          )}
        </TerminalFrame>
      </div>
    </div>
  );
}
