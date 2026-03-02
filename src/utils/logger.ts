/** Simple logging utility with prefixed tags */
export class Logger {
  constructor(private tag: string) {}

  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.tag}] ℹ ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.tag}] ⚠ ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.tag}] ✖ ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(`[${this.tag}] 🔍 ${message}`, ...args);
  }
}
