import { defineConfig, type DefaultTheme } from 'vitepress'

/**
 * La estructura del sitio vive en un solo sitio y sirve a los dos idiomas: cada
 * página tiene su ruta y su título en español y en inglés. Así el menú de un
 * idioma no se queda atrás del otro.
 */
type Page = { es: [string, string]; en: [string, string] }
type Section = { es: string; en: string; base: { es: string; en: string }; pages: Page[] }

const sections: Section[] = [
    {
        es: 'Empezar',
        en: 'Getting started',
        base: { es: '/empezar/', en: '/en/getting-started/' },
        pages: [
            { es: ['', 'Qué es el ecosistema'], en: ['', 'What the ecosystem is'] },
            { es: ['requisitos', 'Requisitos'], en: ['requirements', 'Requirements'] },
            { es: ['app-nueva', 'Una aplicación nueva'], en: ['new-app', 'A new application'] },
            { es: ['primer-modelo', 'Tu primer modelo'], en: ['first-model', 'Your first model'] },
            { es: ['paquete-nuevo', 'Un paquete nuevo'], en: ['new-package', 'A new package'] },
            { es: ['proyecto-existente', 'En un proyecto existente'], en: ['existing-project', 'In an existing project'] },
        ],
    },
    {
        es: 'Conceptos',
        en: 'Concepts',
        base: { es: '/conceptos/', en: '/en/concepts/' },
        pages: [
            { es: ['', 'Cómo encaja todo'], en: ['', 'How it fits together'] },
            { es: ['arquitectura', 'La arquitectura de un modelo'], en: ['architecture', 'The architecture of a model'] },
            { es: ['front-back', 'El contrato front ↔ back'], en: ['front-back', 'The front ↔ back contract'] },
            { es: ['paquete-o-aplicacion', 'Paquete o aplicación'], en: ['package-or-application', 'Package or application'] },
        ],
    },
    {
        es: 'Aplicación base',
        en: 'Base application',
        base: { es: '/app-base/', en: '/en/app-base/' },
        pages: [
            { es: ['', 'Qué trae'], en: ['', 'What it includes'] },
            { es: ['instalar', 'Instalar'], en: ['install', 'Install'] },
            { es: ['vue', 'Con Vue'], en: ['vue', 'With Vue'] },
            { es: ['react', 'Con React'], en: ['react', 'With React'] },
            { es: ['sitio', 'El sitio y su editor'], en: ['site', 'The site and its editor'] },
            { es: ['administrador', 'El administrador'], en: ['admin', 'The admin panel'] },
            { es: ['acceso', 'Acceso y usuarios'], en: ['auth', 'Authentication and users'] },
            { es: ['personalizar', 'Personalizar y ampliar'], en: ['customize', 'Customize and extend'] },
            { es: ['contrato', 'El contrato de las interfaces'], en: ['contract', 'The interface contract'] },
        ],
    },
    {
        es: 'LaraPack',
        en: 'LaraPack',
        base: { es: '/larapack/', en: '/en/larapack/' },
        pages: [
            { es: ['', 'Qué es LaraPack'], en: ['', 'What LaraPack is'] },
            { es: ['laraimport', 'El contrato: laraimport.json'], en: ['laraimport', 'The contract: laraimport.json'] },
            { es: ['comandos', 'Comandos'], en: ['commands', 'Commands'] },
            { es: ['que-se-genera', 'Qué se genera y dónde va tu código'], en: ['generated-code', 'What is generated and where your code goes'] },
            { es: ['regenerar', 'Regenerar sin destruir'], en: ['regenerate', 'Regenerate without destroying'] },
            { es: ['verificar', 'Verificar y auditar'], en: ['verify', 'Verify and audit'] },
            { es: ['metas', 'Metas y payload'], en: ['metas', 'Metas and payload'] },
            { es: ['acciones', 'Rutas, inmutables, secretos y usuarios'], en: ['actions', 'Routes, immutables, secrets and users'] },
            { es: ['interfaz', 'La interfaz generada'], en: ['ui', 'The generated UI'] },
            { es: ['exportar', 'Exportar a Excel'], en: ['export', 'Export to Excel'] },
            { es: ['migraciones', 'Migraciones y cambios de esquema'], en: ['migrations', 'Migrations and schema changes'] },
            { es: ['actualizar', 'Guía de actualización'], en: ['upgrade', 'Upgrade guide'] },
        ],
    },
    {
        es: 'Desarrollo con IA',
        en: 'AI-assisted development',
        base: { es: '/ia/', en: '/en/ai/' },
        pages: [
            { es: ['', 'Por qué funciona'], en: ['', 'Why it works'] },
            { es: ['preparar', 'Preparar el proyecto'], en: ['setup', 'Preparing the project'] },
            { es: ['ciclo', 'El ciclo del agente'], en: ['loop', 'The agent loop'] },
            { es: ['pedir', 'Cómo pedir las cosas'], en: ['prompting', 'How to ask for things'] },
            { es: ['revisar', 'Qué revisa una persona'], en: ['review', 'What a person reviews'] },
            { es: ['limites', 'Lo que no se delega'], en: ['limits', 'What is not delegated'] },
        ],
    },
    {
        es: 'Paquetes de Laravel',
        en: 'Laravel packages',
        base: { es: '/paquetes/', en: '/en/packages/' },
        pages: [
            { es: ['', 'Todos los paquetes'], en: ['', 'All packages'] },
            { es: ['laravel-auth', 'laravel-auth'], en: ['laravel-auth', 'laravel-auth'] },
            { es: ['laravel-options', 'laravel-options'], en: ['laravel-options', 'laravel-options'] },
            { es: ['laravel-notifications', 'laravel-notifications'], en: ['laravel-notifications', 'laravel-notifications'] },
            { es: ['laravel-uploads', 'laravel-uploads'], en: ['laravel-uploads', 'laravel-uploads'] },
            { es: ['laravel-audit', 'laravel-audit'], en: ['laravel-audit', 'laravel-audit'] },
            { es: ['laravel-env-editor', 'laravel-env-editor'], en: ['laravel-env-editor', 'laravel-env-editor'] },
            { es: ['aws-file-manager', 'aws-file-manager'], en: ['aws-file-manager', 'aws-file-manager'] },
            { es: ['routes-to-json', 'routes-to-json'], en: ['routes-to-json', 'routes-to-json'] },
            { es: ['locale-generator', 'locale-generator'], en: ['locale-generator', 'locale-generator'] },
            { es: ['support-traits-search', 'support, traits y search-surge'], en: ['support-traits-search', 'support, traits and search-surge'] },
        ],
    },
    {
        es: 'Paquetes de interfaz',
        en: 'UI packages',
        base: { es: '/interfaz/', en: '/en/ui/' },
        pages: [
            { es: ['', 'Todos los paquetes'], en: ['', 'All packages'] },
            { es: ['form-core', 'form-core: tema y estilos'], en: ['form-core', 'form-core: theme and styles'] },
            { es: ['form-elements', 'Componentes de formulario'], en: ['form-elements', 'Form components'] },
            { es: ['datatables', 'Tablas'], en: ['datatables', 'Tables'] },
            { es: ['http-rutas-i18n', 'Peticiones, rutas e idiomas'], en: ['http-routes-i18n', 'Requests, routes and languages'] },
            { es: ['js-validator', 'Validación'], en: ['js-validator', 'Validation'] },
        ],
    },
    {
        es: 'Publicar y CI',
        en: 'Releases and CI',
        base: { es: '/ci/', en: '/en/ci/' },
        pages: [
            { es: ['', 'La línea base'], en: ['', 'The baseline'] },
            { es: ['workflows', 'Los workflows'], en: ['workflows', 'The workflows'] },
            { es: ['publicar', 'Publicar una versión'], en: ['releasing', 'Releasing a version'] },
        ],
    },
    {
        es: 'Ayuda',
        en: 'Help',
        base: { es: '/ayuda/', en: '/en/help/' },
        pages: [
            { es: ['', 'Solución de problemas'], en: ['', 'Troubleshooting'] },
            { es: ['versiones', 'Versiones y compatibilidad'], en: ['versions', 'Versions and compatibility'] },
        ],
    },
]

function sidebar(lang: 'es' | 'en'): DefaultTheme.SidebarItem[] {
    return sections.map((section) => ({
        text: section[lang],
        collapsed: false,
        items: section.pages.map((page) => ({
            text: page[lang][1],
            link: section.base[lang] + page[lang][0],
        })),
    }))
}

function nav(lang: 'es' | 'en'): DefaultTheme.NavItem[] {
    const pick = (index: number) => ({ text: sections[index][lang], link: sections[index].base[lang] })

    return [pick(0), pick(2), pick(3), pick(4), { text: lang === 'es' ? 'Paquetes' : 'Packages', items: [pick(5), pick(6)] }]
}

export default defineConfig({
    base: '/docs/',
    cleanUrls: true,
    lastUpdated: true,
    title: 'innoboxrr',

    locales: {
        root: {
            label: 'Español',
            lang: 'es',
            description: 'Crea aplicaciones Laravel con Vue o React declarando tu dominio, no escribiendo la arquitectura a mano.',
            themeConfig: {
                nav: nav('es'),
                sidebar: sidebar('es'),
                outline: { label: 'En esta página', level: [2, 3] },
                docFooter: { prev: 'Anterior', next: 'Siguiente' },
                lastUpdatedText: 'Actualizado',
                returnToTopLabel: 'Volver arriba',
                sidebarMenuLabel: 'Menú',
                darkModeSwitchLabel: 'Modo oscuro',
                editLink: { pattern: 'https://github.com/innoboxrr/docs/edit/main/:path', text: 'Mejorar esta página' },
            },
        },
        en: {
            label: 'English',
            lang: 'en',
            link: '/en/',
            description: 'Build Laravel applications with Vue or React by declaring your domain instead of hand-writing the architecture.',
            themeConfig: {
                nav: nav('en'),
                sidebar: sidebar('en'),
                outline: { level: [2, 3] },
                editLink: { pattern: 'https://github.com/innoboxrr/docs/edit/main/:path', text: 'Improve this page' },
            },
        },
    },

    themeConfig: {
        socialLinks: [{ icon: 'github', link: 'https://github.com/innoboxrr' }],
        search: {
            provider: 'local',
            options: {
                locales: {
                    root: {
                        translations: {
                            button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' },
                            modal: {
                                noResultsText: 'Sin resultados para',
                                resetButtonTitle: 'Borrar la búsqueda',
                                footer: { selectText: 'elegir', navigateText: 'moverse', closeText: 'cerrar' },
                            },
                        },
                    },
                },
            },
        },
    },
})
