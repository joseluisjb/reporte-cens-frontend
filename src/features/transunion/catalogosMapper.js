// Traduce un código de catálogo del Manual (ItemCatalogo, contrato 0.9) al formato de la interfaz.
// Hoy los nombres coinciden; si el backend los cambia, se corrige solo aquí.
//   { codigo, descripcion, confirmado } → { codigo, descripcion, confirmado }
export const mapItemCatalogo = (raw) => ({ codigo: raw.codigo, descripcion: raw.descripcion, confirmado: raw.confirmado })
