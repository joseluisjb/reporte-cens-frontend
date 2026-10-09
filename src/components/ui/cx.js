// Une clases CSS ignorando valores vacíos.
export const cx = (...c) => c.filter(Boolean).join(' ')
