/* DragaNova Therapy · web y reservas */
(() => {
  'use strict';

  const C = window.DN_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Fechas y horas (siempre en hora de Lloret) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const hhmm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const hora = m => `${Math.floor(m / 60)}:${pad(m % 60)}`;
  const keyToUTC = k => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const utcToKey = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const addDays = (k, n) => { const d = keyToUTC(k); d.setUTCDate(d.getUTCDate() + n); return utcToKey(d); };
  const dow = k => keyToUTC(k).getUTCDay();
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const fmt = opts => new Intl.DateTimeFormat('es-ES', { ...opts, timeZone: 'UTC' });
  const fLargo = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
  const fMes = fmt({ month: 'long', year: 'numeric' });
  const fCorto = fmt({ weekday: 'long', day: 'numeric' });
  const fDiaSem = fmt({ weekday: 'long' });
  const largo = k => cap(fLargo.format(keyToUTC(k)));

  const fAhora = new Intl.DateTimeFormat('en-CA', {
    timeZone: C.zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function ahora() {
    const p = Object.fromEntries(fAhora.formatToParts(new Date()).map(x => [x.type, x.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
  }
  const limite = () => addDays(ahora().key, C.diasVista);
  const rangos = k => (C.cerrado.includes(k) ? [] : C.horario[dow(k)] || []).map(([a, b]) => [toMin(a), toMin(b)]);

  /* ---------- Agenda ---------- */
  const ocupado = new Map(); // 'AAAA-MM-DD' -> [[inicio, fin], ...] en minutos
  const addBusy = (k, a, b) => { if (!ocupado.has(k)) ocupado.set(k, []); ocupado.get(k).push([a, b]); };
  const choca = (k, a, b) => (ocupado.get(k) || []).some(([x, y]) => a < y && b > x);

  // Modo demostración: agenda simulada (siempre igual para el mismo día) + reservas de este navegador
  const LS = 'dn_reservas_v1';
  const leerLocal = () => { try { return JSON.parse(localStorage.getItem(LS)) || []; } catch { return []; } };
  const guardarLocal = arr => { try { localStorage.setItem(LS, JSON.stringify(arr)); } catch { /* sin almacenamiento */ } };
  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  const Demo = {
    async cargar(desde, hasta) {
      let i = 0;
      for (let k = desde; k <= hasta; k = addDays(k, 1), i++) {
        const r = rng(hash('draganova' + k));
        const cerca = i < 2 ? 0.2 : i < 6 ? 0.1 : i < 14 ? 0.04 : 0;
        const sab = dow(k) === 6 ? 0.08 : 0;
        const lleno = i > 0 && r() < 0.03 + cerca * 0.2;
        for (const [a, b] of rangos(k)) {
          if (lleno) { addBusy(k, a, b); continue; }
          let t = a;
          while (t < b) {
            if (r() < 0.2 + cerca + sab) {
              const len = [60, 60, 90, 60, 30, 90][Math.floor(r() * 6)];
              addBusy(k, t, Math.min(t + len, b));
              t += len;
            } else t += 30;
          }
        }
      }
      for (const x of leerLocal()) addBusy(x.fecha, x.ini, x.fin);
    },
    async reservar(d) {
      if (choca(d.fecha, d.ini, d.fin)) return { ok: false, error: 'ocupado' };
      const arr = leerLocal();
      arr.push({ fecha: d.fecha, ini: d.ini, fin: d.fin }); // solo el hueco, sin datos personales
      guardarLocal(arr);
      return { ok: true };
    }
  };

  // Modo real: Google Apps Script + Google Calendar del negocio
  const Remoto = {
    async cargar(desde, hasta) {
      const res = await fetch(`${C.endpoint}?action=busy&from=${desde}&to=${hasta}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'agenda');
      for (const b of j.busy) {
        const [kd, ti] = b.start.split('T');
        const [ke, te] = b.end.split('T');
        addBusy(kd, toMin(ti), ke === kd ? toMin(te) : 24 * 60);
      }
    },
    async reservar(d) {
      const res = await fetch(C.endpoint, { method: 'POST', body: JSON.stringify({ action: 'book', ...d.envio }) });
      return res.json();
    }
  };

  const real = Boolean(C.endpoint);
  const Agenda = real ? Remoto : Demo;

  /* ---------- Disponibilidad ---------- */
  function horasDe(k, dur) {
    const n = ahora();
    const out = [];
    for (const [a, b] of rangos(k)) {
      for (let t = a; t + dur <= b; t += C.intervalo) {
        let estado = 'libre';
        if (k < n.key || (k === n.key && t < n.min + C.antelacionMin)) estado = 'pasada';
        else if (choca(k, t, t + C.intervalo)) estado = 'ocupada';
        else if (choca(k, t, t + dur)) estado = 'corta';
        out.push({ t, estado, tarde: t >= 14 * 60 });
      }
    }
    return out;
  }

  function infoDia(k, dur) {
    const hoy = ahora().key;
    if (k < hoy || k > limite()) return { tipo: 'fuera', libres: 0, total: 0 };
    if (!rangos(k).length) return { tipo: 'cerrado', libres: 0, total: 0 };
    const hs = horasDe(k, dur).filter(h => h.estado !== 'pasada');
    const libres = hs.filter(h => h.estado === 'libre').length;
    const tipo = !libres ? 'completo' : libres <= 3 ? 'pocas' : 'libre';
    return { tipo, libres, total: hs.length };
  }

  const etiqueta = inf => ({
    fuera: 'no disponible', cerrado: 'cerrado', completo: 'completo',
    pocas: `quedan ${inf.libres} ${inf.libres === 1 ? 'hora' : 'horas'}`, libre: `${inf.libres} horas libres`
  })[inf.tipo];

  function proximoLibre() {
    const hoy = ahora().key;
    for (let i = 0; i <= C.diasVista; i++) {
      const k = addDays(hoy, i);
      const h = horasDe(k, durActual()).find(x => x.estado === 'libre');
      if (h) return { k, t: h.t, i };
    }
    return null;
  }

  /* ---------- Estado de la reserva ---------- */
  const S = { trat: null, fecha: null, t: null, mes: null, listo: false };
  const durActual = () => (S.trat ? S.trat.duracion : 60);

  /* ---------- Paso 1: tratamiento ---------- */
  function pintarOpciones() {
    const box = $('[data-op-trat]');
    box.innerHTML = C.tratamientos.map(t => `
      <label class="op" data-id="${t.id}">
        <input type="radio" name="tratamiento" value="${t.id}">
        <span class="op-nom">${t.nombre}</span>
        <span class="op-dur">${t.duracion} min</span>
      </label>`).join('');
    box.addEventListener('change', e => elegirTrat(e.target.value));
  }

  function elegirTrat(id) {
    S.trat = C.tratamientos.find(t => t.id === id) || null;
    $$('.op').forEach(o => {
      const on = o.dataset.id === id;
      o.classList.toggle('sel', on);
      o.querySelector('input').checked = on;
    });
    if (S.listo && S.fecha && S.t != null) {
      const h = horasDe(S.fecha, durActual()).find(x => x.t === S.t);
      if (!h || h.estado !== 'libre') {
        S.t = null;
        aviso(`A esa hora no hay ${S.trat.duracion} minutos libres seguidos. Elige otra, por favor.`);
      }
    }
    refrescar();
  }

  /* ---------- Paso 2: calendario ---------- */
  function pintarCal() {
    const hoy = ahora().key;
    const primero = `${S.mes}-01`;
    const [y, m] = S.mes.split('-').map(Number);
    const hueco = (dow(primero) + 6) % 7; // semana de lunes a domingo
    const dias = new Date(Date.UTC(y, m, 0)).getUTCDate();
    $('[data-cal-mes]').textContent = cap(fMes.format(keyToUTC(primero)));

    let html = '<span class="dia vacio" aria-hidden="true"></span>'.repeat(hueco);
    for (let d = 1; d <= dias; d++) {
      const k = `${S.mes}-${pad(d)}`;
      const inf = S.listo ? infoDia(k, durActual()) : { tipo: 'cargando', libres: 0, total: 0 };
      const off = !S.listo || ['fuera', 'cerrado', 'completo'].includes(inf.tipo);
      const pct = inf.total ? Math.max(8, Math.round(100 * inf.libres / inf.total)) : 0;
      const cls = ['dia', inf.tipo, k === hoy && 'hoy', k === S.fecha && 'sel'].filter(Boolean).join(' ');
      const barra = ['libre', 'pocas'].includes(inf.tipo) ? `<i class="barra"><b style="width:${pct}%"></b></i>` : '';
      const label = S.listo ? `${largo(k)}: ${etiqueta(inf)}` : largo(k);
      html += `<button type="button" class="${cls}" data-k="${k}" ${off ? 'disabled' : ''} aria-pressed="${k === S.fecha}" aria-label="${label}" title="${S.listo ? cap(etiqueta(inf)) : ''}"><span>${d}</span>${barra}</button>`;
    }
    const dias$ = $('[data-cal-dias]');
    dias$.innerHTML = html;
    dias$.classList.toggle('cargando', !S.listo);
    $('[data-cal-prev]').disabled = S.mes <= hoy.slice(0, 7);
    $('[data-cal-next]').disabled = S.mes >= limite().slice(0, 7);
  }

  function moverMes(n) {
    const [y, m] = S.mes.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    S.mes = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
    pintarCal();
  }

  function elegirDia(k) {
    S.fecha = k;
    S.mes = k.slice(0, 7);
    if (S.t != null) {
      const h = horasDe(k, durActual()).find(x => x.t === S.t);
      if (!h || h.estado !== 'libre') S.t = null;
    }
    aviso('');
    refrescar();
  }

  /* ---------- Paso 3: horas ---------- */
  function pintarHoras() {
    const box = $('[data-horas]');
    if (!S.listo) { box.innerHTML = '<p class="vacio">Cargando la agenda…</p>'; return; }
    if (!S.fecha) { box.innerHTML = '<p class="vacio">Elige un día en el calendario para ver las horas.</p>'; return; }
    const hs = horasDe(S.fecha, durActual()).filter(h => h.estado !== 'pasada');
    const titulo = `<p class="horas-dia">${largo(S.fecha)}${S.trat ? '' : ' <span class="opc">· sesión de 60 min</span>'}</p>`;
    if (!hs.some(h => h.estado === 'libre')) {
      box.innerHTML = titulo + '<p class="vacio">Este día ya no quedan horas libres. Prueba con otro día.</p>';
      return;
    }
    const boton = h => {
      const txt = { libre: 'libre', ocupada: 'ocupada', corta: 'sin tiempo suficiente para este tratamiento' }[h.estado];
      return `<button type="button" class="hora ${h.estado}${S.t === h.t ? ' sel' : ''}" data-t="${h.t}" ${h.estado !== 'libre' ? 'disabled' : ''} aria-pressed="${S.t === h.t}" aria-label="${hora(h.t)}, ${txt}" title="${cap(txt)}">${hora(h.t)}</button>`;
    };
    const grupo = (nom, lista) => lista.length ? `<div class="horas-grupo"><h4>${nom}</h4><div class="horas-lista">${lista.map(boton).join('')}</div></div>` : '';
    box.innerHTML = titulo
      + grupo('Mañana', hs.filter(h => !h.tarde))
      + grupo('Tarde', hs.filter(h => h.tarde))
      + '<p class="horas-ley"><span><i></i>libre</span><span><i class="oc"></i>ocupada</span><span><i class="co"></i>no da tiempo a la sesión</span></p>';
  }

  /* ---------- Resumen ---------- */
  function pintarResumen() {
    const set = (sel, txt, vacio) => { const el = $(sel); el.textContent = txt; el.classList.toggle('vacio', vacio); };
    set('[data-r-trat]', S.trat ? `${S.trat.nombre} · ${S.trat.duracion} min` : 'Elige un tratamiento', !S.trat);
    set('[data-r-fecha]', S.fecha ? largo(S.fecha) : 'Elige un día', !S.fecha);
    set('[data-r-hora]', S.t != null ? `${hora(S.t)} – ${hora(S.t + durActual())}` : 'Elige una hora', S.t == null);
    $('[data-confirmar]').disabled = !(S.listo && S.trat && S.fecha && S.t != null);
  }

  function aviso(txt, mal = false) {
    const el = $('[data-aviso]');
    el.textContent = txt;
    el.classList.toggle('mal', mal);
  }

  function refrescar() { pintarCal(); pintarHoras(); pintarResumen(); pintarProximo(); }

  /* ---------- Paso 4: datos y confirmación ---------- */
  function validar(form) {
    const f = Object.fromEntries(new FormData(form));
    const errores = {};
    if ((f.nombre || '').trim().length < 2) errores.nombre = 'Escribe tu nombre.';
    if ((f.telefono || '').replace(/\D/g, '').length < 9) errores.telefono = 'Necesitamos un teléfono para confirmar la cita.';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errores.email = 'Revisa el email.';
    if (!f.acepto) errores.acepto = 'Marca la casilla para poder reservar.';
    $$('[data-err]', form).forEach(el => { el.textContent = errores[el.dataset.err] || ''; });
    $$('input', form).forEach(i => i.setAttribute('aria-invalid', errores[i.name] ? 'true' : 'false'));
    const primero = Object.keys(errores)[0];
    if (primero) form.elements[primero].focus();
    return primero ? null : f;
  }

  async function enviar(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!(S.trat && S.fecha && S.t != null)) { aviso('Te falta elegir tratamiento, día u hora.', true); return; }
    const f = validar(form);
    if (!f) { aviso('Revisa tus datos, por favor.', true); return; }

    const btn = $('[data-confirmar]');
    btn.disabled = true;
    btn.textContent = 'Reservando…';
    aviso('');
    const cita = { trat: S.trat, fecha: S.fecha, ini: S.t, fin: S.t + S.trat.duracion };
    const datos = { nombre: f.nombre.trim(), telefono: f.telefono.trim(), email: (f.email || '').trim(), notas: (f.notas || '').trim() };
    try {
      const r = await Agenda.reservar({
        fecha: cita.fecha, ini: cita.ini, fin: cita.fin,
        envio: { start: `${cita.fecha}T${hhmm(cita.ini)}`, duracion: cita.trat.duracion, tratamiento: cita.trat.nombre, ...datos, web: f.web || '' }
      });
      if (r && r.ok) {
        addBusy(cita.fecha, cita.ini, cita.fin);
        form.reset();
        exito(cita, datos);
      } else if (r && r.error === 'ocupado') {
        addBusy(cita.fecha, cita.ini, cita.ini + C.intervalo);
        S.t = null;
        refrescar();
        aviso('Vaya, alguien acaba de reservar esa hora. Elige otra, por favor.', true);
      } else {
        aviso('No hemos podido guardar la reserva. Inténtalo de nuevo o llámanos al ' + C.negocio.telefonoTxt + '.', true);
      }
    } catch (err) {
      console.warn(err);
      aviso('No hay conexión con la agenda. Inténtalo de nuevo o llámanos al ' + C.negocio.telefonoTxt + '.', true);
    } finally {
      btn.textContent = 'Confirmar reserva';
      pintarResumen();
    }
  }

  function exito(cita, datos) {
    const fechaTxt = largo(cita.fecha);
    const msg = `Hola Ana, acabo de reservar en la web:\n• ${cita.trat.nombre} (${cita.trat.duracion} min)\n• ${fechaTxt}, a las ${hora(cita.ini)}\n• A nombre de ${datos.nombre}, tel. ${datos.telefono}`
      + (datos.notas ? `\n• Nota: ${datos.notas}` : '');
    const compacta = (k, m) => `${k.replaceAll('-', '')}T${hhmm(m).replace(':', '')}00`;
    const gcal = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + `&text=${encodeURIComponent(cita.trat.nombre + ' · DragaNova Therapy')}`
      + `&dates=${compacta(cita.fecha, cita.ini)}/${compacta(cita.fecha, cita.fin)}`
      + `&ctz=${encodeURIComponent(C.zonaHoraria)}`
      + `&location=${encodeURIComponent(C.negocio.direccion)}`
      + `&details=${encodeURIComponent('Para cambiar o anular la cita: ' + C.negocio.telefonoTxt)}`;

    const x = $('[data-exito]');
    $('[data-x-titulo]', x).textContent = real ? 'Tu cita está reservada' : 'Tu hora está apartada';
    $('[data-x-det]', x).textContent = `${cita.trat.nombre} · ${fechaTxt} a las ${hora(cita.ini)}`;
    $('[data-x-texto]', x).textContent = real
      ? `Ya está en la agenda de DragaNova${datos.email ? ' y te hemos enviado un email de confirmación' : ''}. Si necesitas cambiarla, llama o escribe al ${C.negocio.telefonoTxt}.`
      : 'Último paso: envía la confirmación a Ana por WhatsApp para que te la guarde. Si necesitas cambiarla, llama al ' + C.negocio.telefonoTxt + '.';
    const wa = $('[data-x-wa]', x);
    wa.href = `https://wa.me/${C.negocio.whatsapp}?text=${encodeURIComponent(msg)}`;
    wa.className = real ? 'btn btn-linea' : 'btn btn-oro';
    $('[data-x-gcal]', x).href = gcal;

    $('[data-reserva]').hidden = true;
    x.hidden = false;
    x.scrollIntoView({ behavior: 'smooth', block: 'center' });
    x.focus({ preventScroll: true });
  }

  function otraReserva() {
    S.t = null;
    $('[data-exito]').hidden = true;
    $('[data-reserva]').hidden = false;
    refrescar();
    $('#reservar').scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- Próxima hora libre (inicio) ---------- */
  function pintarProximo() {
    const b = $('[data-proximo]');
    if (!S.listo) return;
    const p = proximoLibre();
    if (!p) { b.hidden = true; return; }
    const cuando = p.i === 0 ? 'Hoy' : p.i === 1 ? 'Mañana' : cap(fCorto.format(keyToUTC(p.k)));
    $('[data-proximo-txt]').textContent = `${cuando} a las ${hora(p.t)}`;
    b.dataset.k = p.k;
    b.dataset.t = p.t;
    b.hidden = false;
  }

  /* ---------- Tratamientos y filtro por necesidad ---------- */
  function pintarTratamientos() {
    const nombre = id => (C.preocupaciones.find(p => p.id === id) || {}).nombre || id;
    $('[data-tratamientos]').innerHTML = C.tratamientos.map(t => `
      <article class="trat rv" data-id="${t.id}" data-para="${t.para.join(' ')}">
        <div class="trat-cab"><h3>${t.nombre}</h3><span class="dur">${t.duracion} min</span></div>
        ${t.etiqueta ? `<p class="trat-sub">${t.etiqueta}</p>` : ''}
        <p>${t.desc}</p>
        <ul class="trat-tags" aria-label="Indicado para">${t.para.map(p => `<li data-p="${p}">${nombre(p)}</li>`).join('')}</ul>
        <div class="trat-pie">
          ${t.precio ? `<span class="precio">${t.precio}</span>` : '<span></span>'}
          <button type="button" class="trat-reservar" data-reservar="${t.id}">Reservar <span aria-hidden="true">→</span></button>
        </div>
      </article>`).join('');

    const filtros = $('[data-filtros]');
    filtros.innerHTML = '<button type="button" class="chip" data-f="" aria-pressed="true">Todos</button>'
      + C.preocupaciones.map(p => `<button type="button" class="chip" data-f="${p.id}" aria-pressed="false">${p.nombre}</button>`).join('');
    filtros.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const f = chip.dataset.f;
      $$('.chip', filtros).forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      $$('.trat').forEach(card => {
        const ok = !f || card.dataset.para.split(' ').includes(f);
        card.classList.toggle('match', Boolean(f) && ok);
        card.classList.toggle('dim', Boolean(f) && !ok);
        card.style.order = f && ok ? -1 : 0;
        $$('.trat-tags li', card).forEach(li => li.classList.toggle('on', li.dataset.p === f));
      });
      $('[data-consejo]').textContent = f ? C.preocupaciones.find(p => p.id === f).consejo : '';
    });
  }

  /* ---------- Horario y "abierto ahora" ---------- */
  function estadoAhora() {
    const n = ahora();
    const hoy = rangos(n.key);
    const dentro = hoy.find(([a, b]) => n.min >= a && n.min < b);
    if (dentro) return { abierto: true, txt: `Abierto ahora · cierra a las ${hora(dentro[1])}` };
    const luego = hoy.find(([a]) => a > n.min);
    if (luego) return { abierto: false, txt: `Cerrado ahora · abre hoy a las ${hora(luego[0])}` };
    for (let i = 1; i <= 14; i++) {
      const k = addDays(n.key, i);
      const r = rangos(k);
      if (r.length) return { abierto: false, txt: `Cerrado ahora · abre ${i === 1 ? 'mañana' : 'el ' + fDiaSem.format(keyToUTC(k))} a las ${hora(r[0][0])}` };
    }
    return { abierto: false, txt: 'Cerrado temporalmente' };
  }

  function pintarEstado() {
    const e = estadoAhora();
    $$('[data-estado]').forEach(el => { el.textContent = e.txt; el.classList.add('estado'); el.classList.toggle('abierto', e.abierto); });
  }

  function pintarHorario() {
    const nombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoy = dow(ahora().key);
    $('[data-horario]').innerHTML = '<tbody>' + [1, 2, 3, 4, 5, 6, 0].map(d => {
      const r = C.horario[d] || [];
      const txt = r.length ? r.map(([a, b]) => `${hora(toMin(a))} – ${hora(toMin(b))}`).join(' · ') : 'Cerrado';
      return `<tr class="${d === hoy ? 'hoy' : ''}"><td>${nombres[d]}</td><td>${txt}</td></tr>`;
    }).join('') + '</tbody>';
  }

  /* ---------- Interfaz general ---------- */
  function interfaz() {
    const top = $('[data-top]');
    const onScroll = () => top.classList.toggle('scrolled', scrollY > 30);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const menu = $('[data-menu]');
    const burger = $('[data-burger]');
    const cerrarMenu = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menú'); };
    burger.addEventListener('click', () => {
      const abrir = !menu.classList.contains('open');
      menu.classList.toggle('open', abrir);
      burger.setAttribute('aria-expanded', String(abrir));
      burger.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) cerrarMenu(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });

    // Comparador antes / después
    const comp = $('[data-comparador]');
    const rango = $('input', comp);
    rango.addEventListener('input', () => comp.style.setProperty('--pos', rango.value + '%'));

    // Aparición al entrar en pantalla
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); }
    }), { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    $$('.rv, .led').forEach(el => io.observe(el));

    // Barra móvil: se esconde en la sección de reserva
    const barra = $('[data-barra]');
    new IntersectionObserver(([en]) => barra.classList.toggle('oculta', en.isIntersecting), { threshold: 0.05 }).observe($('#reservar'));

    $$('[data-anio]').forEach(el => { el.textContent = ahora().key.slice(0, 4); });
  }

  /* ---------- Arranque ---------- */
  async function init() {
    pintarTratamientos();
    interfaz();
    pintarHorario();
    pintarEstado();
    pintarOpciones();

    S.mes = ahora().key.slice(0, 7);
    refrescar();

    $('[data-cal-prev]').addEventListener('click', () => moverMes(-1));
    $('[data-cal-next]').addEventListener('click', () => moverMes(1));
    $('[data-cal-dias]').addEventListener('click', e => { const b = e.target.closest('button.dia'); if (b && !b.disabled) elegirDia(b.dataset.k); });
    $('[data-horas]').addEventListener('click', e => {
      const b = e.target.closest('.hora');
      if (!b || b.disabled) return;
      S.t = Number(b.dataset.t);
      aviso('');
      refrescar();
      if (matchMedia('(max-width: 980px)').matches) $('.resumen').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    $('[data-form]').addEventListener('submit', enviar);
    $('[data-x-otra]').addEventListener('click', otraReserva);

    document.addEventListener('click', e => {
      const b = e.target.closest('[data-reservar]');
      if (!b) return;
      elegirTrat(b.dataset.reservar);
      $('#reservar').scrollIntoView({ behavior: 'smooth' });
    });
    $('[data-proximo]').addEventListener('click', e => {
      const b = e.currentTarget;
      S.t = Number(b.dataset.t);
      elegirDia(b.dataset.k);
      $('#reservar').scrollIntoView({ behavior: 'smooth' });
    });

    try {
      await Agenda.cargar(ahora().key, limite());
      S.listo = true;
    } catch (err) {
      console.warn('Agenda no disponible', err);
      $('[data-horas]').innerHTML = `<p class="vacio">No hemos podido cargar la agenda ahora mismo. Llámanos al <a href="tel:${C.negocio.telefono}">${C.negocio.telefonoTxt}</a> o escríbenos por <a href="https://wa.me/${C.negocio.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>.</p>`;
      $('[data-cal-dias]').classList.remove('cargando');
      return;
    }
    if (!real) console.info('DragaNova: agenda en modo demostración. Configura "endpoint" en js/config.js para usar Google Calendar.');
    refrescar();

    setInterval(() => { pintarEstado(); pintarProximo(); }, 60 * 1000);
  }

  init();
})();
