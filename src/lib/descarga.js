// Guarda en el equipo un archivo que devolvió la API (blob), con el nombre que manda el servidor.
// Lo usan el archivo plano del reporte (RF20) y el insumo de reclamos (RF23).

// 'attachment; filename="SSR001123.txt"' → 'SSR001123.txt' (null si la cabecera no trae nombre).
export const nombreDeDescarga = (cabecera) => /filename="?([^";]+)"?/i.exec(cabecera ?? '')?.[1] ?? null

// Tiempo que se conserva el enlace temporal del archivo: revocarlo en el mismo instante del clic
// cancela la descarga en algunos navegadores. Es un detalle técnico, no una regla de CENS ni de
// TransUnion: 40 s es el mismo valor que usa la librería FileSaver.js para revocar su enlace.
export const ESPERA_REVOCAR_MS = 40000

export function guardarArchivo(blob, nombre) {
  const enlace = document.createElement('a')
  const url = URL.createObjectURL(blob)
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), ESPERA_REVOCAR_MS)
}
