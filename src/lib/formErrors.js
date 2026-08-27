// Laravel's validation error shape: { message, errors: { field: [msg, ...] } }.
// The field keys match the request body's own key names (snake_case), not
// local camelCase form state — callers look them up by the backend key they
// sent, not the local field name. Every write action in this app either
// throws the raw ApiError (`err.body`) or wraps it in `new Error(msg, {
// cause: err })`, so both locations are checked.
export function getFieldErrors(err) {
  const errors = err?.body?.errors ?? err?.cause?.body?.errors
  if (!errors || typeof errors !== 'object') return {}

  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : String(messages),
    ]),
  )
}
