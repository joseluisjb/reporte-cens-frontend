// Interruptor accesible (activar/desactivar). `label` dice qué activa, para lectores de pantalla.
export default function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="cursor-pointer rounded-full p-1 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {checked ? (
        <svg width="30" height="17" viewBox="0 0 36 20" aria-hidden="true">
          <rect x="1" y="1" width="34" height="18" rx="9" fill="#0D9648" stroke="#0D9648" />
          <circle cx="26" cy="10" r="6" fill="#fff" />
        </svg>
      ) : (
        <svg width="30" height="17" viewBox="0 0 36 20" aria-hidden="true">
          <rect x="1" y="1" width="34" height="18" rx="9" fill="none" stroke="#A1A1A5" strokeWidth="2" />
          <circle cx="10" cy="10" r="6" fill="#A1A1A5" />
        </svg>
      )}
    </button>
  )
}
