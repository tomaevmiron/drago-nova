# Reservas reales con Google Calendar

La web funciona desde el primer momento en **modo demostración**: muestra una agenda simulada y, al reservar, la clienta envía la confirmación a Ana por WhatsApp.

Para que la disponibilidad sea **la real** y las reservas entren solas en la agenda, se conecta a Google Calendar con este script gratuito. Se tarda unos 5 minutos y se hace una sola vez.

## Cómo queda funcionando

- La web lee el **Google Calendar** de la cuenta del negocio. Cualquier evento que haya allí bloquea esas horas: citas por teléfono, descansos, vacaciones (un evento de "todo el día" bloquea el día entero).
- Cada reserva hecha en la web **crea un evento** en ese calendario con el nombre, el teléfono y las notas de la clienta, y te llega un **email de aviso**.
- Si la clienta deja su email, recibe una confirmación.
- Si dos personas intentan coger la misma hora a la vez, solo entra la primera; a la otra la web le pide que elija otra hora.

## Instalación

1. Entra en <https://script.google.com> con la cuenta de Google del negocio y pulsa **Nuevo proyecto**. Ponle de nombre `Reservas DragaNova`.
2. Borra lo que aparece en el editor y pega todo el contenido de `Code.gs`. Guarda (icono del disquete).
3. Ve a **Configuración del proyecto** (rueda dentada) y en **Zona horaria** elige `(GMT+01:00) Madrid`.
4. Vuelve al editor, elige la función `probar` en el desplegable de arriba y pulsa **Ejecutar**. Google pedirá permisos para Calendar y Gmail: acéptalos (si sale "Google no ha verificado esta aplicación", pulsa *Configuración avanzada* → *Ir a Reservas DragaNova*).
5. Pulsa **Implementar → Nueva implementación**. En el tipo, elige **Aplicación web**:
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier usuario**
6. Pulsa **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
7. Abre `js/config.js` y pega esa URL entre las comillas de `endpoint`:

   ```js
   endpoint: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```

Listo. A partir de ese momento la web muestra las horas reales.

## Cambios habituales

- **Horario**: cámbialo en `js/config.js` **y** en `AJUSTES.horario` de `Code.gs` (los dos tienen que coincidir).
- **Vacaciones o un día libre**: crea un evento de todo el día en el calendario. No hace falta tocar la web.
- **Usar otro calendario** (por ejemplo, uno solo para las citas): copia su ID desde la configuración de Google Calendar y ponlo en `AJUSTES.calendarId`.
- Si editas `Code.gs` después de implementarlo: **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: nueva → Implementar**. La URL no cambia.
