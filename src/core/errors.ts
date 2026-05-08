export const EXIT_CODES = {
  SUCCESS: 0,
  GENERIC: 1,
  INVALID_ARG: 2,
  AUTH_EXPIRED: 3,
  NOT_FOUND: 4,
  CONFLICT: 5,
} as const;

export class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly exitCode: number = EXIT_CODES.GENERIC,
    public readonly traceId: string = "",
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "CliError";
  }
}

export function formatErrorOutput(err: CliError, json: boolean): string {
  if (json) {
    return JSON.stringify({
      code: err.code,
      message: err.message,
      trace_id: err.traceId,
      details: err.details,
    });
  }
  return `Error: ${err.code} - ${err.message}`;
}
