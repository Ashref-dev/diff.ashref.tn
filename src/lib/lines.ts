const NEWLINE = /\r\n|\r|\n/;

/** Splits text into display lines. A single trailing newline does not produce an extra empty line. */
export function toLines(text: string): string[] {
  if (text.length === 0) return [];
  const lines = text.split(NEWLINE);
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Cheap line count for gutters: counts line breaks without allocating. */
export function countLines(text: string): number {
  let count = 1;
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) count++;
  return count;
}

/** Line count as the diff sees it (see toLines): a trailing newline does not start a new line. */
export function countContentLines(text: string): number {
  if (text.length === 0) return 0;
  const count = countLines(text);
  return text.endsWith("\n") ? count - 1 : count;
}
