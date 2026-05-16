import { Logger } from "./logger";

const logger = new Logger("Timeline");

interface TimelineMark {
  label: string;
  t: number;
}

export class Timeline {
  private readonly marks: TimelineMark[] = [];
  private readonly start: number;

  constructor(public readonly name: string) {
    this.start = performance.now();
  }

  mark(label: string): void {
    this.marks.push({ label, t: performance.now() });
  }

  dump(): string {
    const lines: string[] = [`Timeline [${this.name}]`];
    let prev = this.start;
    for (const m of this.marks) {
      const delta = m.t - prev;
      const total = m.t - this.start;
      lines.push(
        `  +${delta.toFixed(0).padStart(5)}ms  (t=${total.toFixed(0).padStart(5)}ms)  ${m.label}`,
      );
      prev = m.t;
    }
    return lines.join("\n");
  }
}

const timelines = new Map<string, Timeline>();

export function startTimeline(sessionId: string, name?: string): Timeline {
  const existing = timelines.get(sessionId);
  if (existing) {
    logger.info(`Replacing in-flight timeline for ${sessionId}:\n${existing.dump()}`);
  }
  const t = new Timeline(name ?? sessionId);
  timelines.set(sessionId, t);
  return t;
}

export function getTimeline(sessionId: string | undefined): Timeline | undefined {
  return sessionId ? timelines.get(sessionId) : undefined;
}

export function mark(sessionId: string | undefined, label: string): void {
  if (!sessionId) return;
  timelines.get(sessionId)?.mark(label);
}

export function endTimeline(sessionId: string | undefined): void {
  if (!sessionId) return;
  const t = timelines.get(sessionId);
  if (t) {
    logger.info(`\n${t.dump()}`);
    timelines.delete(sessionId);
  }
}
