import { isAxiosError } from 'axios';

interface ApiErrorBody {
  success?: false;
  error?: { code?: number; message?: string; details?: unknown };
  detail?: unknown;
  message?: string;
}

/** Turn any thrown value (usually an Axios error from the FastAPI backend) into a readable message. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) return 'Cannot reach the server. Check your connection and try again.';

    const body = err.response.data;
    const details = body?.error?.details;

    if (Array.isArray(details) && details.length > 0) {
      return details
        .map((d: { field?: string; issue?: string; message?: string }) => {
          // Validation errors arrive as { field: "body -> email", issue: "..." }
          const msg = d.issue ?? d.message ?? '';
          const field = (d.field ?? '').replace(/^body( -> )?/, '').replace(/ -> /g, '.');
          return field ? `${field}: ${msg}` : msg;
        })
        .join(' · ');
    }
    if (body?.error?.message) return body.error.message;
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) {
      return (body.detail as { msg: string }[]).map((d) => d.msg).join(' · ');
    }
    if (body?.message) return body.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isNotFound(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 404;
}

/** The machine-readable `details.reason` the API attaches to some errors (e.g. "email_not_verified"). */
export function getErrorReason(err: unknown): string | null {
  if (!isAxiosError<ApiErrorBody>(err)) return null;
  const details = err.response?.data?.error?.details as { reason?: unknown } | null | undefined;
  return typeof details?.reason === 'string' ? details.reason : null;
}
