import { HttpErrorResponse } from '@angular/common/http';

export interface FieldMessage {
  readonly field: string;
  readonly message: string;
}

const UNREACHABLE = 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
const UNEXPECTED = 'Algo salió mal. Intenta de nuevo en unos segundos.';

/**
 * An error from the LVL API, read from its RFC 9457 problem body: a player-facing `message`,
 * a stable `code` and, for input problems, the `fields` it concerns.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
    readonly fields: readonly FieldMessage[] = [],
  ) {
    super(message);
  }

  /** The message for one request field, if the API pointed at it. */
  messageFor(field: string): string | undefined {
    return this.fields.find((f) => f.field === field)?.message;
  }
}

function isFieldMessage(value: unknown): value is FieldMessage {
  const v = value as FieldMessage;
  return typeof v?.field === 'string' && typeof v?.message === 'string';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!(error instanceof HttpErrorResponse)) return new ApiError(UNEXPECTED, 0);
  // 0: network down or blocked; 502-504: the server is restarting or unreachable.
  if (error.status === 0 || error.status >= 502)
    return new ApiError(UNREACHABLE, error.status, 'UNREACHABLE');

  const body = error.error as { detail?: unknown; code?: unknown; errors?: unknown } | null;
  if (body && typeof body.detail === 'string') {
    const fields = Array.isArray(body.errors) ? body.errors.filter(isFieldMessage) : [];
    return new ApiError(
      body.detail,
      error.status,
      typeof body.code === 'string' ? body.code : null,
      fields,
    );
  }
  return new ApiError(UNEXPECTED, error.status);
}
