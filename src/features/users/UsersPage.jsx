// Gestión de usuarios (RF28), solo Administrador. Maqueta 7.
// Estructura y navegación: Johan. Formularios: Omar (UserFormPanel.jsx y userValidation.js).
import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Icon, IconButton, PageHeader, Spinner, Switch, Table, useToast } from '../../components/ui'
import { formatearFechaHora } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAuth } from '../auth/authContext'
import { ROLES } from '../auth/roles'
import TemporaryPasswordDialog from './TemporaryPasswordDialog'
import UserFormPanel from './UserFormPanel'
import { listUsers, setUserActive } from './usersService'

const RESALTADO_MS = 2600

export default function UsersPage() {
  usePageTitle('Usuarios del Sistema')
  const { user: yo } = useAuth()
  const toast = useToast()
  const [usuarios, setUsuarios] = useState(null) // null = cargando
  const [errorCarga, setErrorCarga] = useState('')
  const [panel, setPanel] = useState(null) // null | { usuario? }  (sin usuario = crear)
  const [temporal, setTemporal] = useState(null) // { nombre, password }
  const [aDesactivar, setADesactivar] = useState(null)
  const [ocupado, setOcupado] = useState(null) // id con una operación en curso
  const [resaltado, setResaltado] = useState(null)

  // Carga inicial (se cancela si la pantalla se cierra antes de terminar) y reintento manual.
  useEffect(() => {
    let cancelado = false
    listUsers()
      .then((lista) => !cancelado && setUsuarios(lista))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])
  const reintentar = async () => {
    setErrorCarga('')
    try {
      setUsuarios(await listUsers())
    } catch (err) {
      setErrorCarga(err.message)
    }
  }

  const resaltar = (id) => {
    setResaltado(id)
    setTimeout(() => setResaltado(null), RESALTADO_MS)
  }
  const reemplazar = (u) => setUsuarios((l) => l.map((x) => (x.id === u.id ? u : x)))

  const guardado = ({ usuario, creado, passwordTemporal }) => {
    setPanel(null)
    if (creado) setUsuarios((l) => [...l, usuario])
    else reemplazar(usuario)
    resaltar(usuario.id)
    if (creado && passwordTemporal) setTemporal({ nombre: usuario.nombre, password: passwordTemporal })
    else toast.success(creado ? 'Usuario creado. La contraseña temporal se envió a su correo.' : 'Usuario actualizado correctamente.')
  }

  const cambiarEstado = async (u, activo) => {
    setOcupado(u.id)
    try {
      reemplazar(await setUserActive(u.id, activo))
      toast.success(activo ? `Usuario «${u.nombre}» activado.` : `Usuario «${u.nombre}» desactivado.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(null)
      setADesactivar(null)
    }
  }

  return (
    <>
      <PageHeader title="Usuarios del Sistema">
        <Button onClick={() => setPanel({})}>
          <Icon name="plus" size={16} />
          Crear usuario
        </Button>
      </PageHeader>

      {errorCarga && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Alert>{errorCarga}</Alert>
          <Button variant="outline" size="sm" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      )}
      {!usuarios && !errorCarga && (
        <div role="status" aria-label="Cargando usuarios" className="flex justify-center p-12">
          <Spinner className="size-6" />
        </div>
      )}
      {usuarios && (
        <Card className="overflow-hidden">
          {usuarios.length === 0 ? (
            <EmptyState>Aún no hay usuarios registrados.</EmptyState>
          ) : (
            <Table caption="Usuarios del sistema">
              <thead>
                <tr>
                  <th scope="col">Nombre completo</th>
                  <th scope="col">Correo corporativo</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Último acceso</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esYo = u.id === yo.id
                  return (
                    <tr key={u.id} className={resaltado === u.id ? 'fila-resaltada' : undefined}>
                      <td>{u.nombre}</td>
                      <td>{u.correo}</td>
                      <td>
                        <Badge tone={u.rol === ROLES.ADMIN ? 'admin' : 'ok'}>{u.rol}</Badge>
                      </td>
                      <td>
                        <Badge tone={u.activo ? 'ok' : 'off'}>{u.estado}</Badge>
                      </td>
                      <td className="whitespace-nowrap">{formatearFechaHora(u.ultimoAcceso)}</td>
                      <td>
                        <div className="flex items-center gap-2.5 text-muted">
                          <IconButton icon="edit" label={`Editar a ${u.nombre}`} onClick={() => setPanel({ usuario: u })} />
                          <Switch
                            checked={u.activo}
                            label={esYo ? 'No puedes desactivar tu propio usuario' : `Usuario ${u.nombre} activo`}
                            disabled={esYo || ocupado === u.id}
                            onChange={(activo) => (activo ? cambiarEstado(u, true) : setADesactivar(u))}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {panel && (
        <UserFormPanel
          usuario={panel.usuario}
          esYo={panel.usuario?.id === yo.id}
          onClose={() => setPanel(null)}
          onGuardado={guardado}
        />
      )}
      {temporal && <TemporaryPasswordDialog {...temporal} onClose={() => setTemporal(null)} />}
      <ConfirmDialog
        open={Boolean(aDesactivar)}
        danger
        title="Desactivar usuario"
        message={`¿Desactivar a ${aDesactivar?.nombre}? No podrá iniciar sesión hasta que lo actives de nuevo.`}
        confirmLabel="Desactivar"
        loading={Boolean(aDesactivar) && ocupado === aDesactivar.id}
        onConfirm={() => cambiarEstado(aDesactivar, false)}
        onCancel={() => setADesactivar(null)}
      />
    </>
  )
}
