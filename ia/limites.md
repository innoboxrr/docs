# Lo que no se delega

Decidir el dominio, dar permisos en las políticas, manejar credenciales y
secretos, publicar una versión y migrar una base de producción. **El agente puede
proponerlo; lo confirma una persona.**

No es desconfianza en el agente. Son las decisiones cuyo error no detecta ninguna
herramienta, o no se puede deshacer.

| Tarea | El agente | Una persona |
|---|---|---|
| Escribir y validar `laraimport.json` | Lo propone | Decide el dominio y aprueba el diff |
| Generar, rellenar huecos, verificar, probar | Lo hace | Revisa |
| Abrir una habilidad de la política, cambiar la visibilidad | Lo propone | Lo concede |
| Credenciales, `.env`, secretos de CI | No los toca | Los gestiona |
| Subir `VERSION` y publicar | Propone el `CHANGELOG` | Decide qué se publica y cuándo |
| Migraciones | Las escribe y las corre en local | Migra producción |

## Decidir el dominio

`laraimport.json` es la decisión de arquitectura: qué entidades existen, cómo se
relacionan, qué tabla es una bitácora inmutable, qué dato es secreto. El agente lo
redacta muy bien a partir de una descripción, pero no conoce el negocio. Una
relación mal elegida se genera perfecta y coherente, y `validate` y `verify` la dan
por buena. Por eso el diff del JSON es lo primero que revisa una persona.

## Dar permisos

La política nace cerrada a propósito: sólo pasa el administrador. Cada habilidad
que se abre, cada fila que `ManagedFilter::canView` deja ver y cada `forceDelete`
que se saca de `$exceptAbilities` es una decisión de seguridad. Un error aquí no
rompe ningún test generado: se convierte en una fuga de datos.

Tampoco se delega **quién es administrador**. En la aplicación base lo decide
`ADMIN_EMAILS` en el `.env` (`config('auth.admins')`), y de ahí dependen las
políticas, el middleware `admin`, la suplantación, los registros y el editor del
`.env`.

## Credenciales y secretos

El `.env`, las claves de servicios, `COMPOSER_AUTH`, la configuración de npm y de
S3 no pasan por el agente: ni los lee para «probar algo», ni los pega en un
commit, un log o una respuesta.

- **Una columna con un secreto se declara `secret`.** Nunca sale por la API, la
  exportación ni la tabla, y exponerla «para depurar» es exactamente lo que
  `verify` marca como `secret-exposed`.
- **Nunca se guardan secretos en `laravel-options`**: su índice es de lectura
  pública, porque alimenta el sitio.
- **El editor del `.env`** de la aplicación base está detrás de `web`, `auth` y
  `admin`; quien es administrador ve el `.env` entero.

## Publicar una versión

En el ecosistema, publicar es subir `VERSION` (o la `version` de `package.json`) y
empujar a `master`. Si los tests pasan, la CI crea el tag y Packagist o npm
publican. Un tag que ya existe no se vuelve a crear: una versión publicada no se
corrige, se publica otra.

El agente puede preparar el `CHANGELOG` y el cambio de `VERSION` en una rama. Qué
se publica, con qué número y qué se promete a quien actualiza lo decide una
persona. Ver [Publicar una versión](/ci/publicar).

## Migrar una base de producción

Una migración de alteración puede quitar una columna con sus datos o cambiarle el
tipo con `->change()`, y un cambio de clave foránea se escribe a mano. En local, el
agente las escribe y las corre las veces que haga falta. En producción, alguien lee
la migración, comprueba que hay copia de seguridad y ejecuta
`php artisan migrate --force` sabiendo lo que hace.

## Lo que sí puede hacer solo

Todo el ciclo local, sin pedir permiso en cada paso: leer el esquema, declarar,
validar, generar, rellenar los huecos, verificar, probar, auditar, y proponer el
`CHANGELOG`. Para eso existe el ciclo, con sus códigos de salida: ver
[El ciclo del agente](/ia/ciclo).
