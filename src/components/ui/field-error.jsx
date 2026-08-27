function FieldError({ message }) {
  if (!message) return null
  return <p className="text-[11px] font-medium text-destructive">{message}</p>
}

export { FieldError }
