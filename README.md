# solicitudes_comisiones_estudio_mf

Microfrontend para la gestión de solicitudes de comisiones de estudio del Sistema de Gestión Académica (SGA) de la Universidad Distrital Francisco José de Caldas.

El proyecto forma parte de una arquitectura de microclientes: se construye como una aplicación Angular independiente y se integra en el cliente contenedor mediante [single-spa](https://single-spa.js.org/).

## Especificaciones técnicas

### Tecnologías implementadas

* [Angular 20](https://angular.dev/)
* [single-spa](https://single-spa.js.org/) y [single-spa-angular 9](https://single-spa.js.org/docs/ecosystem-angular/)
* [Angular Material 20](https://material.angular.dev/)
* [Tailwind CSS 3](https://v3.tailwindcss.com/)
* [TypeScript 5.8](https://www.typescriptlang.org/)
* [RxJS 7.8](https://rxjs.dev/)
* Node.js 24, versión utilizada en el pipeline de CI

### Arquitectura

El punto de entrada es `src/main.single-spa.ts`. La compilación utiliza `@angular-builders/custom-webpack` y `single-spa-angular` para generar los artefactos que carga la aplicación contenedora.

Durante el desarrollo, el microfrontend se publica en `http://localhost:4224/`. Para probar el flujo completo debe estar registrado en el mapa de importaciones o la configuración equivalente del cliente contenedor de SGA.

### Configuración por ambiente

La configuración de servicios se encuentra en los archivos de Angular:

| Ambiente | Archivo | Compilación |
| --- | --- | --- |
| Local | `src/environments/environment.ts` | `npm run build` |
| Pruebas | `src/environments/environment.development.ts` | `npm run build:test` |
| Producción | `src/environments/environment.production.ts` | `npm run build:prod` |

## Ejecución del proyecto

### Requisitos

* Node.js 24
* npm
* Google Chrome o Chromium para las pruebas unitarias

### Instalación

```bash
git clone https://github.com/udistrital/solicitudes_comisiones_estudio_mf.git
cd solicitudes_comisiones_estudio_mf
npm install
```

### Servidor local

```bash
npm start
```

El servidor queda disponible en `http://localhost:4224/`.

También se puede iniciar con el comando específico de single-spa:

```bash
npm run serve:single-spa:solicitudes-comisiones-estudio-mf
```

### Compilación

```bash
# Local
npm run build

# Pruebas
npm run build:test

# Producción
npm run build:prod

# Producción específica de single-spa
npm run build:single-spa:solicitudes-comisiones-estudio-mf
```

Los artefactos se generan en `dist/`.

### Pruebas

Las pruebas unitarias utilizan Karma y Jasmine:

```bash
npm test

# Ejecución no interactiva
npm test -- --watch=false --browsers=ChromeHeadless
```

## Estado CI

| Develop | Release 0.0.1 | Master | Sonar |
| --- | --- | --- | --- |
| [![Build Status](https://hubci.portaloas.udistrital.edu.co/api/badges/udistrital/solicitudes_comisiones_estudio_mf/status.svg?ref=refs/heads/develop)](https://hubci.portaloas.udistrital.edu.co/udistrital/solicitudes_comisiones_estudio_mf) | [![Build Status](https://hubci.portaloas.udistrital.edu.co/api/badges/udistrital/solicitudes_comisiones_estudio_mf/status.svg?ref=refs/heads/release/0.0.1)](https://hubci.portaloas.udistrital.edu.co/udistrital/solicitudes_comisiones_estudio_mf) | [![Build Status](https://hubci.portaloas.udistrital.edu.co/api/badges/udistrital/solicitudes_comisiones_estudio_mf/status.svg?ref=refs/heads/master)](https://hubci.portaloas.udistrital.edu.co/udistrital/solicitudes_comisiones_estudio_mf) | [![Quality Gate Status](https://sonarqube.portaloas.udistrital.edu.co/api/project_badges/measure?project=solicitudes_comisiones_estudio_mf&metric=alert_status)](https://sonar.portaloas.udistrital.edu.co/dashboard?id=solicitudes_comisiones_estudio_mf) |
