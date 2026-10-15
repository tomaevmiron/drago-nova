/**
 * DragaNova Therapy · motor de reservas de la web
 *
 * La agenda es el Google Calendar del negocio:
 *  - Cualquier evento del calendario bloquea esas horas en la web
 *    (citas por teléfono, descansos, vacaciones…).
 *  - Cada reserva hecha en la web crea un evento nuevo y te avisa por email.
 *
 * Instrucciones de instalación: ver LEEME.md
 */

const AJUSTES = {
  calendarId: 'primary',      // 'primary' = calendario principal de la cuenta, o el ID de otro calendario
  zona: 'Europe/Madrid',
  avisarA: '',                // email donde recibir los avisos ('' = el de la cuenta)
  negocio: 'DragaNova Therapy',
  direccion: 'Carrer del Carme, 2, 17310 Lloret de Mar',
  telefono: '646 12 58 03',
  antelacionMin: 60,
  diasMax: 120,
  // Debe coincidir con js/config.js · 0 = domingo … 6 = sábado
  horario: {
    0: [],
    1: [['09:00', '19:00']],
    2: [['09:00', '19:00']],
    3: [['09:00', '19:00']],
    4: [['09:00', '19:00']],
    5: [['09:00', '19:00']],
    6: [['09:00', '13:00'], ['15:00', '19:00']]
  }
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'busy') return salida(ocupado(p.from, p.to));
  return salida({ ok: true, servicio: 'Reservas DragaNova' });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return salida({ ok: false, error: 'formato' }); }
  if (!d || d.action !== 'book') return salida({ ok: false, error: 'accion' });
  return salida(reservar(d));
}

/* ---------- Horas ocupadas ---------- */
function ocupado(desde, hasta) {
  const a = fecha(desde), b = fecha(hasta);
  if (!a || !b || b < a) return { ok: false, error: 'fechas' };
  const fin = fecha(diaSiguiente(hasta));
  if ((fin - a) / 864e5 > AJUSTES.diasMax + 2) return { ok: false, error: 'rango' };

  const out = [];
  calendario().getEvents(a, fin).forEach(function (ev) {
    if (esTransparente(ev)) return;
    const s = ev.isAllDayEvent() ? ev.getAllDayStartDate() : ev.getStartTime();
    const f = ev.isAllDayEvent() ? ev.getAllDayEndDate() : ev.getEndTime();
    // Partir por días para que la web lo entienda fácil
    let dia = Utilities.formatDate(s < a ? a : s, AJUSTES.zona, 'yyyy-MM-dd');
    for (let i = 0; i < 400; i++) {
      const ini = fecha(dia), sig = fecha(diaSiguiente(dia));
      if (ini >= f || ini >= fin) break;
      const s2 = s > ini ? s : ini, f2 = f < sig ? f : sig;
      if (f2 > s2) out.push({ start: texto(s2), end: texto(f2) });
      dia = diaSiguiente(dia);
    }
  });
  return { ok: true, busy: out };
}

/* ---------- Crear reserva ---------- */
function reservar(d) {
  if (d.web) return { ok: true };                     // trampa anti-spam: fingimos éxito
  const nombre = limpio(d.nombre, 80);
  const telefono = limpio(d.telefono, 30);
  const email = limpio(d.email, 120);
  const notas = limpio(d.notas, 500);
  const tratamiento = limpio(d.tratamiento, 120) || 'Cita';
  const dur = Number(d.duracion);

  if (nombre.length < 2 || telefono.replace(/\D/g, '').length < 9) return { ok: false, error: 'datos' };
  if (!(dur >= 15 && dur <= 240)) return { ok: false, error: 'duracion' };
  const s = fecha(d.start);
  if (!s) return { ok: false, error: 'fecha' };
  const f = new Date(s.getTime() + dur * 60000);
  if (s.getTime() < Date.now() + AJUSTES.antelacionMin * 60000 - 5 * 60000) return { ok: false, error: 'pasado' };
  if (!enHorario(d.start, dur)) return { ok: false, error: 'horario' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const choque = calendario().getEvents(s, f).some(function (ev) {
      if (esTransparente(ev)) return false;
      if (ev.isAllDayEvent()) return true;
      return ev.getStartTime() < f && ev.getEndTime() > s;
    });
    if (choque) return { ok: false, error: 'ocupado' };

    const cuando = bonito(s);
    const detalle = [
      'Cliente: ' + nombre,
      'Teléfono: ' + telefono,
      email ? 'Email: ' + email : '',
      notas ? 'Notas: ' + notas : '',
      '',
      'Reserva hecha desde la web.'
    ].filter(String).join('\n');

    calendario().createEvent(tratamiento + ' · ' + nombre, s, f, { description: detalle, location: AJUSTES.direccion });

    try {
      MailApp.sendEmail(AJUSTES.avisarA || Session.getEffectiveUser().getEmail(),
        'Nueva reserva: ' + tratamiento + ' · ' + cuando,
        'Nueva cita desde la web\n\n' + tratamiento + ' (' + dur + ' min)\n' + cuando + '\n\n' + detalle);
    } catch (err) { console.warn(err); }

    if (email) {
      try {
        MailApp.sendEmail(email, 'Tu cita en ' + AJUSTES.negocio,
          'Hola ' + nombre + ',\n\nTu cita está reservada:\n\n' + tratamiento + ' (' + dur + ' min)\n' + cuando + '\n' + AJUSTES.direccion +
          '\n\nSi necesitas cambiarla o anularla, llámanos o escríbenos al ' + AJUSTES.telefono + '.\n\n¡Hasta pronto!\n' + AJUSTES.negocio,
          { name: AJUSTES.negocio });
      } catch (err) { console.warn(err); }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Utilidades ---------- */
function calendario() {
  return AJUSTES.calendarId === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(AJUSTES.calendarId);
}

function esTransparente(ev) {
  try { return ev.getTransparency() === CalendarApp.EventTransparency.TRANSPARENT; } catch (err) { return false; }
}

// 'AAAA-MM-DD' o 'AAAA-MM-DDTHH:mm' en hora de Madrid -> Date
function fecha(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(String(s || ''));
  if (!m) return null;
  return Utilities.parseDate(m[1] + '-' + m[2] + '-' + m[3] + ' ' + (m[4] || '00') + ':' + (m[5] || '00'), AJUSTES.zona, 'yyyy-MM-dd HH:mm');
}

// "jueves 16 de octubre a las 10:00"
function bonito(d) {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const f = function (p) { return Utilities.formatDate(d, AJUSTES.zona, p); };
  return dias[Number(f('u')) % 7] + ' ' + f('d') + ' de ' + meses[Number(f('M')) - 1] + ' a las ' + f('HH:mm');
}

function texto(d) { return Utilities.formatDate(d, AJUSTES.zona, "yyyy-MM-dd'T'HH:mm"); }

function diaSiguiente(k) {
  const p = String(k).slice(0, 10).split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function enHorario(inicio, dur) {
  const k = inicio.slice(0, 10);
  const p = k.split('-').map(Number);
  const dia = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  const ini = minutos(inicio.slice(11, 16));
  return (AJUSTES.horario[dia] || []).some(function (r) { return ini >= minutos(r[0]) && ini + dur <= minutos(r[1]); });
}

function minutos(h) { const p = h.split(':').map(Number); return p[0] * 60 + p[1]; }

function limpio(v, max) { return String(v || '').replace(/[<>]/g, '').trim().slice(0, max); }

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Ejecuta esta función una vez desde el editor para dar los permisos de Calendar y Gmail.
function probar() {
  const hoy = Utilities.formatDate(new Date(), AJUSTES.zona, 'yyyy-MM-dd');
  console.log(JSON.stringify(ocupado(hoy, diaSiguiente(hoy))));
}
