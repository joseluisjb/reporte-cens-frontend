import Icon from './Icon'

// Aviso de error en línea (ej. "Usuario o contraseña incorrectos.").
export default function Alert({ children }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-error"
    >
      <Icon name="warn" size={16} />
      <span>{children}</span>
    </div>
  )
}
