import { changePassword, confirmPasswordReset, getCurrentUser, login, logout, requestPasswordReset } from '../features/auth/authService'
import { MSG_CREDENCIALES, reglasIncumplidas } from '../features/auth/authConfig'
import { ROLES, rolACodigo, rolATexto } from '../features/auth/roles'
import { createUser, listUsers, setUserActive, updateUser } from '../features/users/usersService'
import { CLAVE_TEMPORAL_MOCK, db, TOKEN_RECUPERACION_VALIDO, ultimoCorreo } from '../mocks/db'
import { expectPeticionCumpleContrato } from './contrato'
import { espiarLogout } from './espiarLogout'

describe('authService', () => {
  test('login correcto devuelve el usuario en el formato de la interfaz', async () => {
    const u = await login('rmartinez@example.com', 'Admin12345')
    expect(u).toMatchObject({ nombre: 'Rosa Martínez', correo: 'rmartinez@example.com', rol: ROLES.ADMIN, estado: 'Activo', debeCambiarPassword: false })
    expect(u.ultimoAcceso).toBeInstanceOf(Date)
    expect(u).not.toHaveProperty('password')
  })

  test('credenciales incorrectas dan el mensaje de la maqueta', async () => {
    await expect(login('rmartinez@example.com', 'mala')).rejects.toThrow(MSG_CREDENCIALES)
    await expect(login('nadie@example.com', 'Admin12345')).rejects.toThrow(MSG_CREDENCIALES)
  })

  test('un usuario desactivado no entra y se le explica por qué', async () => {
    await expect(login('avargas@example.com', 'Cartera123')).rejects.toMatchObject({ status: 403, message: /desactivado/i })
  })

  test('el usuario con contraseña temporal queda marcado para cambiarla', async () => {
    const u = await login('mgomez@example.com', 'Temporal123')
    expect(u.debeCambiarPassword).toBe(true)
  })

  test('sin sesión getCurrentUser devuelve null; con sesión, el usuario; tras logout, null', async () => {
    expect(await getCurrentUser()).toBeNull()
    await login('jperez@example.com', 'Analista123')
    expect((await getCurrentUser()).nombre).toBe('Juan Pérez')
    await logout()
    expect(await getCurrentUser()).toBeNull()
  })

  test('logout envía el motivo cuando lo hay, y sin motivo no envía cuerpo', async () => {
    const cuerpos = espiarLogout()
    await login('jperez@example.com', 'Analista123')
    await logout('inactividad')
    await login('jperez@example.com', 'Analista123')
    await logout()
    expect(cuerpos).toEqual([{ motivo: 'inactividad' }, null])
    expectPeticionCumpleContrato('post', '/auth/logout/', cuerpos[0])
  })

  test('cambiar la contraseña temporal quita la marca de primer ingreso', async () => {
    await login('mgomez@example.com', 'Temporal123')
    await changePassword({ actual: 'Temporal123', nueva: 'Nueva12345' })
    expect((await getCurrentUser()).debeCambiarPassword).toBe(false)
    await logout()
    expect((await login('mgomez@example.com', 'Nueva12345')).nombre).toBe('María Gómez')
  })

  test('una contraseña nueva débil o una actual errónea se reportan por campo', async () => {
    await login('mgomez@example.com', 'Temporal123')
    await expect(changePassword({ actual: 'Temporal123', nueva: 'corta' })).rejects.toMatchObject({ fieldErrors: { new_password: expect.stringMatching(/mínimo 8/i) } })
    await expect(changePassword({ actual: 'x', nueva: 'Nueva12345' })).rejects.toMatchObject({ fieldErrors: { current_password: expect.any(String) } })
  })

  test('recuperar contraseña responde igual con un correo que no existe', async () => {
    await expect(requestPasswordReset('nadie@example.com')).resolves.toBeUndefined()
    await expect(requestPasswordReset('jperez@example.com')).resolves.toBeUndefined()
  })

  test('el enlace de recuperación con token inválido se rechaza', async () => {
    await expect(confirmPasswordReset({ token: 'malo', nueva: 'Nueva12345' })).rejects.toMatchObject({ fieldErrors: { token: expect.any(String) } })
    await expect(confirmPasswordReset({ token: TOKEN_RECUPERACION_VALIDO, nueva: 'Nueva12345' })).resolves.toBeUndefined()
  })
})

describe('reglas de contraseña', () => {
  test('devuelve las reglas que no se cumplen', () => {
    expect(reglasIncumplidas('abc')).toEqual(['Mínimo 8 caracteres', 'Al menos una letra mayúscula', 'Al menos un número'])
    expect(reglasIncumplidas('Abcdefg1')).toEqual([])
    expect(reglasIncumplidas('abcdefgh1')).toEqual(['Al menos una letra mayúscula'])
  })
})

describe('usersService', () => {
  test('el Administrador lista los usuarios', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    const usuarios = await listUsers()
    expect(usuarios).toHaveLength(7)
    expect(usuarios[3]).toMatchObject({ nombre: 'Ana Lucía Vargas', estado: 'Inactivo', activo: false })
  })

  test('el Analista recibe 403 y sin sesión 401', async () => {
    await expect(listUsers()).rejects.toMatchObject({ status: 401 })
    await login('jperez@example.com', 'Analista123')
    await expect(listUsers()).rejects.toMatchObject({ status: 403 })
  })

  test('crear usuario no devuelve la contraseña: la envía por correo (simulado)', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    const { user, passwordTemporal } = await createUser({ nombre: 'Laura Díaz', correo: 'ldiaz@example.com', rol: ROLES.ANALISTA })
    expect(user).toMatchObject({ nombre: 'Laura Díaz', debeCambiarPassword: true, estado: 'Activo' })
    expect(passwordTemporal).toBeNull()
    expect(ultimoCorreo().para).toBe('ldiaz@example.com')
    expect(ultimoCorreo().cuerpo).toContain(CLAVE_TEMPORAL_MOCK)
  })

  test('el rol viaja como código y llega como texto', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    const { user } = await createUser({ nombre: 'Laura Díaz', correo: 'ldiaz@example.com', rol: ROLES.ADMIN })
    expect(db.usuarios.find((u) => u.id === user.id).rol).toBe('ADMINISTRADOR')
    expect(user.rol).toBe(ROLES.ADMIN)
    expect((await listUsers())[0].rol).toBe(ROLES.ANALISTA) // Juan Pérez se guarda como ANALISTA_CARTERA
  })

  test('crear usuario valida campos y correo repetido por campo', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    await expect(createUser({ nombre: '', correo: '', rol: ROLES.ANALISTA })).rejects.toMatchObject({ fieldErrors: { nombre: expect.any(String), email: expect.any(String) } })
    await expect(createUser({ nombre: 'Otra Juana', correo: 'jperez@example.com', rol: ROLES.ANALISTA })).rejects.toMatchObject({ fieldErrors: { email: 'Ya existe un usuario con ese correo.' } })
  })

  test('editar y desactivar un usuario', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    expect((await updateUser(3, { nombre: 'Carlos A. Sánchez' })).nombre).toBe('Carlos A. Sánchez')
    const off = await setUserActive(3, false)
    expect(off).toMatchObject({ activo: false, estado: 'Inactivo' })
  })

  test('editar el rol lo envía como código', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    const editado = await updateUser(3, { rol: ROLES.ADMIN })
    expect(editado.rol).toBe(ROLES.ADMIN)
    expect(db.usuarios.find((u) => u.id === 3).rol).toBe('ADMINISTRADOR')
  })

  test('un rol inválido se reporta por campo', async () => {
    await login('rmartinez@example.com', 'Admin12345')
    await expect(updateUser(3, { rol: 'Supervisor' })).rejects.toMatchObject({ fieldErrors: { rol: 'Selecciona un rol válido.' } })
    await expect(createUser({ nombre: 'Otra Juana', correo: 'ojuana@example.com', rol: 'Supervisor' })).rejects.toMatchObject({ fieldErrors: { rol: 'Selecciona un rol válido.' } })
  })

  test('el servidor impide desactivarse a sí mismo y cambiarse el propio rol', async () => {
    await login('rmartinez@example.com', 'Admin12345') // Rosa Martínez, id 2
    await expect(setUserActive(2, false)).rejects.toMatchObject({ fieldErrors: { is_active: 'No puedes desactivar tu propio usuario.' } })
    await expect(updateUser(2, { rol: ROLES.ANALISTA })).rejects.toMatchObject({ fieldErrors: { rol: 'No puedes cambiar tu propio rol.' } })
    // enviar el mismo rol (como hace el formulario al editarse) sí se permite
    await expect(updateUser(2, { nombre: 'Rosa M. Martínez', rol: ROLES.ADMIN })).resolves.toMatchObject({ nombre: 'Rosa M. Martínez', rol: ROLES.ADMIN })
  })
})

describe('roles', () => {
  test('el código del backend se traduce al texto de la interfaz y viceversa', () => {
    expect(rolATexto('ADMINISTRADOR')).toBe('Administrador')
    expect(rolATexto('ANALISTA_CARTERA')).toBe(ROLES.ANALISTA)
    expect(rolACodigo(ROLES.ANALISTA)).toBe('ANALISTA_CARTERA')
    expect(rolACodigo(ROLES.ADMIN)).toBe('ADMINISTRADOR')
  })

  test('un código desconocido se devuelve igual y nunca equivale al Administrador', () => {
    expect(rolATexto('SUPERUSUARIO')).toBe('SUPERUSUARIO')
    expect(rolATexto('SUPERUSUARIO')).not.toBe(ROLES.ADMIN)
    expect(rolATexto(undefined)).toBeUndefined()
    expect(rolACodigo('Supervisor')).toBe('Supervisor') // el backend responderá 400
  })
})
