// Une clases CSS ignorando valores vacíos.
export const cx = (...c) => c.filter(Boolean).join(' ')

// Une los ids que describen un campo (su error y, opcionalmente, una ayuda como la lista de requisitos).
export const describedByIds = (...ids) => ids.filter(Boolean).join(' ') || undefined
