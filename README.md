# innoboxrr docs

Documentación del ecosistema innoboxrr, en español y en inglés:
<https://innoboxrr.github.io/docs/>.

- **Empezar**: una aplicación nueva, tu primer modelo, un paquete nuevo.
- **Aplicación base** (`innoboxrr/laravel-setup`): sitio, acceso y administrador en Vue o en React.
- **LaraPack** (`innoboxrr/larapack-generator`): el contrato `laraimport.json`, los comandos y lo que se genera.
- **Desarrollo con IA**: cómo trabaja un agente dentro de la arquitectura.
- **Paquetes** de Laravel y de interfaz, **CI y publicación**, y **solución de problemas**.

## Escribir en local

```bash
npm install
npm run docs:dev
```

El español vive en la raíz y el inglés en `en/`, con la misma estructura. El menú
de los dos idiomas sale de `.vitepress/config.mts`: una página nueva se añade ahí
una vez, con su ruta y su título en cada idioma.

Cada push a `main` construye el sitio y lo publica en GitHub Pages
(`.github/workflows/deploy.yml`). Un enlace roto hace fallar el build.
