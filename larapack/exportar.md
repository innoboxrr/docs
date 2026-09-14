# Exportar a Excel

Con la acción `export`, un modelo exporta a Excel lo que filtra su índice. El archivo se guarda en un disco y llega a quien lo pidió por notificación, con un enlace firmado. Funciona recién generado: el paquete pide `maatwebsite/excel`, usa el disco `local` y avisa por correo.

## De principio a fin

1. **La interfaz lo pide.** «Export» está en la barra de la tabla y en la paleta de comandos. `exportModel()` pregunta antes con la confirmación del tema y hace `POST export`. Al aceptarse, se avisa «The export is being prepared. You will be notified when it is ready.».
2. **`ExportRequest` autoriza** con la habilidad `export` de la política y completa la petición con `paginate: 0`, `managed: true` y `except_view_any: true`: todos los registros, con la visibilidad de `ManagedFilter`.
3. **Lanza `ExportEvent`**, con los datos de la petición, el usuario y el idioma de la petición. Responde `{"status": true}`. Si algo lanza, lo registra en el log y responde 500 con `{"message": "The export could not be generated."}`, traducido.
4. **`SendExportNotification`**, el listener, notifica al usuario con `ExportNotification`, en ese idioma.
5. **La notificación crea el archivo** la primera vez que se envía por un canal: `Excel::store(new PostsExports($data), 'exports/<uuid>.xlsx', <disco>)`.
6. **Y avisa** con un enlace temporal al archivo, válido un día.

::: warning La exportación corre en la misma petición
Ni la notificación ni el listener generados implementan `ShouldQueue`, así que el archivo se crea mientras se atiende `POST export`. Con tablas grandes, implementa `ShouldQueue` en la notificación para que la cree un worker de la cola.
:::

## Qué se genera

| Archivo | Qué es |
|---|---|
| `src/Http/Requests/<Model>/ExportRequest.php` | Autoriza, completa los filtros y lanza el evento. |
| `src/Http/Events/<Model>/Events/ExportEvent.php` | Lleva `data`, `user` y `locale`. |
| `src/Http/Events/<Model>/Listeners/ExportEvent/SendExportNotification.php` | Notifica al usuario. |
| `src/Http/Events/<Model>/Listeners/ExportEvent/DefaultOperation.php` | **Hueco** para otros efectos. |
| `src/Exports/<Plural>Exports.php` | `FromView`: la consulta y la vista. |
| `resources/views/excel/<snake>.blade.php` | Una tabla con una columna por cada nombre de `$export_cols`. |
| `src/Notifications/<Model>/ExportNotification.php` | Crea el archivo y avisa. |
| La habilidad `export` en la política | Devuelve `false`: sólo el administrador exporta hasta que lo decidas. |

Sin la acción `export` no se genera nada de esto.

### La consulta y las columnas

```php
public function view(): View
{
    return view(
        config('acmecatalogo.excel_view', 'acmecatalogo::excel.') . 'post',
        [
            'posts' => $this->getQuery(),
            'exportCols' => Post::$export_cols,
        ]
    );
}

public function getQuery()
{
    $builder = new Builder();

    return $builder->lazy(Post::class, $this->data);
}
```

- Las filas salen de search-surge con los mismos filtros que el índice, y con `lazy()`: una exportación recorre la tabla entera sin hidratarla de golpe.
- Las columnas son `$export_cols`, que sale de `exports_cols` de cada propiedad. Una propiedad `secret`, `payload` en un modelo con metas y `password` y `remember_token` en uno `authenticatable` nunca están.
- La vista escribe en la cabecera el nombre de cada columna y en cada fila su valor. Para cambiar las cabeceras o el formato, edita la vista.

### La notificación

| Canal | Qué manda |
|---|---|
| `mail` | Asunto `<APP_NAME> \| Export of <Plural>`, saludo, texto, un botón «Download» con el enlace y una despedida, todo con `__()`. |
| `database` | `action` (el enlace), `message` e `img`. Es la forma que lee la campana de `innoboxrr/laravel-notifications`. |

El enlace es `temporaryUrl()` del disco, con caducidad de un día; si el disco no admite enlaces temporales, `url()`.

::: warning Nadie borra los archivos
El texto del correo dice que el archivo se borrará a las 24 horas, pero lo único que caduca es el enlace: los archivos quedan en `exports/` del disco. Bórralos con una tarea programada de la aplicación.
:::

## Configuración {#configuracion}

La exportación lee tres claves, con valores por defecto en el código, así que funciona también sin archivo de configuración:

| Clave | Por defecto | Qué es |
|---|---|---|
| `excel_view` | `<clave>::excel.` en un paquete; `excel.` en una aplicación | Prefijo de la vista de Excel. |
| `notification_via` | `['mail']` | Canales de la notificación. |
| `export_disk` | `'local'` | Disco donde se guarda el archivo. En producción, normalmente `s3`. |
| `user_class` | `'App\Models\User'` | Se escribe en el archivo, pero el código generado no la lee. |

Dónde viven:

| | Paquete | Aplicación |
|---|---|---|
| Archivo | `config/<clave>.php`, con la clave del paquete: el namespace en minúsculas y sin separadores (`acmecatalogo`) | `config/larapack.php` |
| Cómo se lee | `config('acmecatalogo.export_disk', 'local')` | `config('larapack.export_disk', 'local')` |
| Vistas de Excel | Registradas con el namespace del paquete por su `AppServiceProvider` | Sin namespace, en `resources/views/excel` |
| Quién lo crea | `larapack:new` o `larapack:config`; la aplicación lo publica con `--tag=config` | `larapack:config`, que nunca escribe en `config/app.php` |

```php
// config/larapack.php
return [

    'user_class' => 'App\Models\User',

    'excel_view' => 'excel.',

    // Por dónde avisa la exportación. `database` necesita la tabla de
    // notificaciones de la aplicación: php artisan make:notifications-table
    'notification_via' => ['mail'],

    // Dónde se guarda el archivo exportado. `local` funciona en cualquier
    // aplicación; en producción, normalmente `s3`.
    'export_disk' => 'local',

];
```

## En una aplicación

- **Registra el `EventServiceProvider`** en `bootstrap/providers.php` (`larapack:event-service-provider` lo crea). Laravel no descubre proveedores en el `composer.json` de una aplicación, y sin él nadie escucha `ExportEvent`: ni se crea el archivo ni llega el aviso, aunque la API responda `{"status": true}`.
- **La configuración es `config/larapack.php`**, no la de Laravel: `config/app.php` es de Laravel.
- Una aplicación generada con 7.10.0 o 7.10.1 pedía la vista `app::excel.` y leía `app.*`: ver [De 7.10.1 a 7.10.2](/larapack/actualizar#de-7101-a-7102).

## Avisar también en la base de datos

```bash
php artisan make:notifications-table
php artisan migrate
```

Y añade `database` a `notification_via`:

```php
'notification_via' => ['mail', 'database'],
```

El archivo se crea una sola vez aunque la notificación salga por los dos canales. La campana del administrador de la aplicación base lee esas notificaciones: ver [laravel-notifications](/paquetes/laravel-notifications).

## Lo que necesita

| Qué | Por qué |
|---|---|
| `maatwebsite/excel` | Crea el archivo. Un paquete creado con `larapack:new` ya lo pide en `require`. |
| Un usuario `Notifiable` | Recibe el aviso. |
| Correo configurado, o el canal `database` | Por donde llega el enlace. |
| El `EventServiceProvider` cargado | Enlaza el evento con su listener. |
| La habilidad `export` | Nace en `false`: sólo pasa el administrador. |

## Cuando algo falla

| Síntoma | Causa |
|---|---|
| 403 al exportar | La política no permite `export`, o el usuario no es administrador. |
| La API responde bien y no llega nada | El `EventServiceProvider` no está registrado, o el correo no está configurado. |
| 500 «The export could not be generated.» | El detalle está en el log. |
| «No hint path defined for [app]» | Una aplicación generada con 7.10.0 o 7.10.1. |
| El enlace no abre | El disco no sirve archivos: con `local`, revisa la configuración de su servicio de archivos, o usa un disco con enlaces temporales como S3. |
