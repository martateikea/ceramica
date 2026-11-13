# Mi taller

Mis piezas de cerámica, lo que aprendo de cada una y las ideas que quiero hacer.

- **App:** `index.html` + `app.js`, publicada con GitHub Pages.
- **Datos:** un Google Sheet con cuatro pestañas (`Proyectos`, `Ideas`, `Placas`, `Listas`). Las fotos van a una carpeta de Drive.
- **Puente:** `apps-script/Code.gs`, una aplicación web de Apps Script que lee y escribe en el Sheet. Protegida con PIN.
- **Demo:** añade `?demo` a la dirección para verla con datos de ejemplo (no guarda nada).

## Puesta en marcha

### 1. Apps Script
1. Abre el Google Sheet → **Extensiones → Apps Script**.
2. Borra lo que haya en `Código.gs` y pega el contenido de [`apps-script/Code.gs`](apps-script/Code.gs). Si existe un archivo `Index.html`, bórralo: ya no hace falta. Guarda.
3. **Configuración del proyecto** (rueda dentada) → **Propiedades del script** → añade `PIN` con el código que quieras.
4. Arriba, elige la función `setup` y pulsa **Ejecutar**. Acepta los permisos (el aviso "Google no ha verificado esta aplicación" es normal: *Configuración avanzada → Ir a…*).
5. **Implementar → Gestionar implementaciones** → lápiz → *Versión: nueva versión*. Ejecutar como *Yo*, acceso *Cualquier usuario* → **Implementar**.

### 2. GitHub Pages
Repositorio → **Settings → Pages** → *Deploy from a branch* → `main` / `/ (root)` → Save.
La app queda en `https://martateikea.github.io/ceramica/`.

### 3. En el móvil
Abre la dirección y escribe el PIN.
Para tenerla como app: **Compartir → Añadir a pantalla de inicio** (iPhone) o **⋮ → Añadir a pantalla de inicio** (Android).

## Cosas útiles
- **Barros, esmaltes, defectos…** se editan en la pestaña `Listas` del Sheet o desde la app con "+ añadir".
- **Fotos:** se reducen antes de subirlas y quedan en Drive como "cualquiera con el enlace puede ver" (necesario para mostrarlas). Los enlaces no se pueden adivinar.

## Cambios en el puente
Cada vez que cambie `Code.gs` hay que pegarlo de nuevo y hacer **Gestionar implementaciones → nueva versión**.
Nunca "Nueva implementación": cambiaría la URL y la app dejaría de funcionar.
