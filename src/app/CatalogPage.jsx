// Catálogo de componentes UI (paso 3). Sirve de referencia visual para todo el equipo.
import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  FilterSelect,
  Icon,
  IconButton,
  Input,
  Modal,
  PageHeader,
  PasswordField,
  SearchBox,
  Select,
  Switch,
  Table,
  useToast,
} from '../components/ui'

function Seccion({ titulo, children }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-hd text-xl font-bold">{titulo}</h2>
      {children}
    </section>
  )
}

export default function CatalogPage() {
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [panel, setPanel] = useState(false)
  const [activo, setActivo] = useState(true)
  const [cargando, setCargando] = useState(false)

  const simularCarga = () => {
    setCargando(true)
    setTimeout(() => setCargando(false), 1500)
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="font-hd text-3xl font-bold">Catálogo de componentes</h1>
      <p className="mt-1 text-muted">Componentes base de NexoVolt, fieles a la maqueta aprobada.</p>

      <Seccion titulo="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primario</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Gris</Button>
          <Button size="sm">Pequeño</Button>
          <Button disabled>Deshabilitado</Button>
          <Button loading={cargando} onClick={simularCarga}>
            {cargando ? 'Extrayendo…' : (<><Icon name="refresh" size={16} />Con icono y carga</>)}
          </Button>
        </div>
        <div className="mt-4 max-w-xs">
          <Button size="lg" block>Iniciar sesión (grande, ancho completo)</Button>
        </div>
      </Seccion>

      <Seccion titulo="Encabezado de página, búsqueda y filtro">
        <PageHeader title="Códigos de Concepto de Energía">
          <Button variant="outline"><Icon name="layers" size={16} />Crear grupo de conceptos</Button>
          <Button><Icon name="plus" size={16} />Agregar código</Button>
        </PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBox label="Buscar código o descripción" placeholder="Buscar código o descripción" />
          <FilterSelect label="Filtrar por estado">
            <option>Todos los estados</option>
            <option>Activo</option>
            <option>Inactivo</option>
          </FilterSelect>
        </div>
        <div className="mt-4 flex items-center gap-2 text-muted">
          Botones de icono:
          <IconButton icon="edit" label="Editar" />
          <IconButton icon="download" label="Descargar" />
          <IconButton icon="search" label="Buscar" />
        </div>
      </Seccion>

      <Seccion titulo="Campos de formulario">
        <Card className="grid gap-5 p-6 sm:grid-cols-2">
          <Input label="Correo electrónico" type="email" placeholder="nombre@cens.com.co" />
          <Input label="Con error" defaultValue="correo-invalido" error="Ingresa un correo válido, por ejemplo nombre@cens.com.co." />
          <Input label="Deshabilitado" defaultValue="No editable" disabled />
          <PasswordField label="Contraseña" placeholder="••••••••••••" />
          <Select label="Rol" defaultValue="Analista de Cartera">
            <option>Analista de Cartera</option>
            <option>Administrador</option>
          </Select>
          <Select label="Select con error" error="Selecciona un grupo de conceptos.">
            <option value="">Selecciona un grupo…</option>
          </Select>
        </Card>
        <div className="mt-4 max-w-md">
          <Alert>Usuario o contraseña incorrectos.</Alert>
        </div>
      </Seccion>

      <Seccion titulo="Insignias, chips e interruptor">
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone="ok">Activo</Badge>
          <Badge tone="off">Inactivo</Badge>
          <Badge tone="admin">Administrador</Badge>
          <Chip title="Energía Residencial Estrato 1-3">ENE-001</Chip>
          <Chip>ENE-002</Chip>
          <span className="flex items-center gap-2">
            <Switch checked={activo} onChange={setActivo} label="Usuario activo" />
            {activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </Seccion>

      <Seccion titulo="Tabla">
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <th>Nombre completo</th>
                <th>Correo corporativo</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Juan Pérez</td>
                <td>jperez@cens.com.co</td>
                <td><Badge tone="ok">Analista de Cartera</Badge></td>
                <td><Badge tone="ok">Activo</Badge></td>
              </tr>
              <tr>
                <td>Rosa Martínez</td>
                <td>rmartinez@cens.com.co</td>
                <td><Badge tone="admin">Administrador</Badge></td>
                <td><Badge tone="ok">Activo</Badge></td>
              </tr>
              <tr>
                <td>Ana Lucía Vargas</td>
                <td>avargas@cens.com.co</td>
                <td><Badge tone="ok">Analista de Cartera</Badge></td>
                <td><Badge tone="off">Inactivo</Badge></td>
              </tr>
            </tbody>
          </Table>
        </Card>
        <Card className="mt-4">
          <EmptyState>No se encontraron resultados.</EmptyState>
        </Card>
      </Seccion>

      <Seccion titulo="Modal, panel lateral y avisos">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setModal(true)}>Abrir modal</Button>
          <Button variant="outline" onClick={() => setPanel(true)}>Abrir panel lateral</Button>
          <Button variant="ghost" onClick={() => toast.success('Operación realizada correctamente.')}>Aviso de éxito</Button>
          <Button variant="ghost" onClick={() => toast.error('No se pudo completar la operación.')}>Aviso de error</Button>
        </div>
      </Seccion>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Ejemplo de modal"
        subtitle="Se cierra con Escape, con clic fuera o con Cancelar. El foco queda atrapado dentro."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={() => { setModal(false); toast.success('Cambios guardados.') }}>Guardar</Button>
          </>
        }
      >
        <Input label="Nombre completo" />
      </Modal>

      <Modal
        side
        open={panel}
        onClose={() => setPanel(false)}
        title="Crear nuevo usuario"
        footer={<Button block onClick={() => setPanel(false)}>Crear usuario</Button>}
      >
        <Input label="Nombre completo" className="mb-5" />
        <Input label="Correo corporativo" type="email" />
      </Modal>
    </main>
  )
}
