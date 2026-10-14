// Formulario reutilizable (RF31): encapsula lo que repetían todas las pantallas con formulario.
//   - valores y errores por campo;
//   - validar → mostrar errores → ENFOCAR el primer campo inválido → solo entonces enviar;
//   - el error de un campo se quita al escribir en él;
//   - los errores del servidor (`err.fieldErrors`) se muestran EN el campo; los que no corresponden a
//     ningún campo (o si no hay `fieldErrors`) salen como error general (`errorGeneral`);
//   - evita el doble envío y no actualiza el estado si el formulario ya se desmontó.
//
// Uso (ver features/users/UserFormPanel.jsx):
//   const form = useFormulario({
//     valoresIniciales: { nombre: '', correo: '' },
//     validar: validarUsuario,                 // pura: (valores) => ({ campo: 'mensaje' }) o {}
//     traducirErrores: mapUserFieldErrors,     // opcional: nombres del backend → nombres del formulario
//     onSubmit: async (valores) => { await guardar(valores) },   // si lanza, el hook muestra el error
//   })
//   <form {...form.formProps}>
//     <Input label="Nombre" {...form.campo('nombre')} />
//     {form.errorGeneral && <Alert>{form.errorGeneral}</Alert>}
//     <Button type="submit" loading={form.enviando}>Guardar</Button>
//   </form>
// `campo(nombre)` devuelve { name, value (o checked si el valor inicial es booleano), onChange, error, ref }.
import { useCallback, useEffect, useRef, useState } from 'react'

const MSG_INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo.'

export function useFormulario({ valoresIniciales, validar, onSubmit, orden, traducirErrores }) {
  const [valores, setValores] = useState(valoresIniciales)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const refs = useRef({}) // campo → elemento del DOM
  const callbacksRef = useRef({}) // campo → función `ref` estable (evita que React la vuelva a llamar en cada render)
  const montado = useRef(true)
  const enCurso = useRef(false)
  // Siempre las últimas funciones, sin obligar a quien usa el hook a memoizarlas.
  const ultimas = useRef({})
  useEffect(() => {
    ultimas.current = { validar, onSubmit, orden, traducirErrores, valoresIniciales }
  })
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  const ordenCampos = () => ultimas.current.orden ?? Object.keys(ultimas.current.valoresIniciales ?? valores)

  const enfocar = useCallback((campo) => {
    refs.current[campo]?.focus?.()
  }, [])

  const refDe = (campo) => {
    callbacksRef.current[campo] ??= (el) => {
      if (el) refs.current[campo] = el
      else delete refs.current[campo]
    }
    return callbacksRef.current[campo]
  }

  const setValor = useCallback((campo, valor) => {
    setValores((v) => ({ ...v, [campo]: valor }))
    setErrores((er) => (er[campo] === undefined ? er : { ...er, [campo]: undefined }))
    setErrorGeneral('')
  }, [])

  const campo = (nombre) => {
    const esBooleano = typeof valoresIniciales?.[nombre] === 'boolean'
    return {
      name: nombre,
      ...(esBooleano ? { checked: Boolean(valores[nombre]) } : { value: valores[nombre] ?? '' }),
      onChange: (e) => setValor(nombre, esBooleano ? e.target.checked : e.target.value),
      error: errores[nombre],
      ref: refDe(nombre),
    }
  }

  const enviar = async (e) => {
    e?.preventDefault?.()
    if (enCurso.current) return
    const { validar: validarAhora, onSubmit: enviarAhora, traducirErrores: traducir } = ultimas.current

    const encontrados = validarAhora?.(valores) ?? {}
    setErrores(encontrados)
    setErrorGeneral('')
    const primero = ordenCampos().find((c) => encontrados[c]) ?? Object.keys(encontrados)[0]
    if (primero) return enfocar(primero)

    enCurso.current = true
    setEnviando(true)
    try {
      await enviarAhora(valores)
    } catch (err) {
      if (!montado.current) return
      const delServidor = traducir ? traducir(err?.fieldErrors ?? {}) : (err?.fieldErrors ?? {})
      const conocidos = new Set(ordenCampos())
      const deCampo = {}
      const sueltos = []
      for (const [c, mensaje] of Object.entries(delServidor)) {
        if (!mensaje) continue
        if (conocidos.has(c)) deCampo[c] = mensaje
        else sueltos.push(mensaje)
      }
      setErrores(deCampo)
      // Un error sin campo visible no puede quedar mudo: va al aviso general.
      if (sueltos.length) setErrorGeneral(sueltos.join(' '))
      else if (!Object.keys(deCampo).length) setErrorGeneral(err?.message || MSG_INESPERADO)
      const primeroConError = ordenCampos().find((c) => deCampo[c])
      if (primeroConError) enfocar(primeroConError)
    } finally {
      enCurso.current = false
      if (montado.current) setEnviando(false)
    }
  }

  const reiniciar = useCallback(() => {
    setValores(ultimas.current.valoresIniciales)
    setErrores({})
    setErrorGeneral('')
  }, [])

  return {
    valores,
    errores,
    errorGeneral,
    enviando,
    campo,
    setValor,
    setErrorGeneral,
    enfocar,
    reiniciar,
    formProps: { onSubmit: enviar, noValidate: true },
  }
}
