/* ================================================================
   DragaNova Therapy · configuración de la web
   Todo lo que el negocio puede querer cambiar está aquí.
   ================================================================ */
window.DN_CONFIG = {
  negocio: {
    nombre: 'DragaNova Therapy',
    telefono: '+34646125803',
    telefonoTxt: '646 12 58 03',
    whatsapp: '34646125803',
    direccion: 'Carrer del Carme, 2, 17310 Lloret de Mar, Girona',
    instagram: 'https://www.instagram.com/draganova_therapy/',
    maps: 'https://maps.app.goo.gl/vyKC9tDRnLBS5REG8'
  },

  /* URL de la aplicación web de Google Apps Script (ver apps-script/LEEME.md).
     Con ella, la agenda es el Google Calendar del negocio: cada reserva crea un
     evento y cualquier evento que pongas allí bloquea esas horas en la web.
     Vacío = modo demostración (agenda simulada y reservas guardadas solo en
     el navegador de quien reserva; la confirmación se envía por WhatsApp). */
  endpoint: '',

  zonaHoraria: 'Europe/Madrid',
  intervalo: 30,        // minutos entre una hora de inicio y la siguiente
  diasVista: 60,        // cuántos días hacia delante se puede reservar
  antelacionMin: 60,    // minutos mínimos de antelación para reservar hoy

  // 0 = domingo, 1 = lunes … 6 = sábado
  horario: {
    0: [],
    1: [['09:00', '19:00']],
    2: [['09:00', '19:00']],
    3: [['09:00', '19:00']],
    4: [['09:00', '19:00']],
    5: [['09:00', '19:00']],
    6: [['09:00', '13:00'], ['15:00', '19:00']]
  },

  // Días cerrados puntuales (festivos, vacaciones), p. ej. ['2026-12-25', '2027-01-06']
  cerrado: [],

  preocupaciones: [
    { id: 'piernas', nombre: 'Piernas cansadas', consejo: 'Para la pesadez de piernas, el drenaje linfático es el punto de partida; combinado con maderoterapia se nota todavía más.' },
    { id: 'liquidos', nombre: 'Retención de líquidos', consejo: 'El drenaje linfático manual ayuda a eliminar el exceso de líquidos. Muchas clientas notan la diferencia desde la primera sesión.' },
    { id: 'celulitis', nombre: 'Celulitis', consejo: 'La maderoterapia y el masaje linfomodelante trabajan la piel de naranja. Con un pack de sesiones el resultado es más visible.' },
    { id: 'volumen', nombre: 'Reducir volumen', consejo: 'Para perder medidas se combinan técnicas manuales reductoras y aparatología, según tu caso.' },
    { id: 'rostro', nombre: 'Rostro hinchado', consejo: 'El drenaje facial desinflama, define el óvalo y deja la piel con más luz. Ideal antes de un evento.' },
    { id: 'tension', nombre: 'Contracturas', consejo: 'Para espalda, cuello y hombros cargados, el masaje descontracturante es tu tratamiento.' },
    { id: 'estres', nombre: 'Estrés', consejo: 'Si lo que necesitas es parar, el masaje relajante es una hora solo para ti.' }
  ],

  // precio: opcional, p. ej. '45 €'. Si se deja vacío no se muestra.
  tratamientos: [
    { id: 'maderoterapia', nombre: 'Maderoterapia', duracion: 60, etiqueta: 'Pregunta por los packs', precio: '',
      desc: 'Instrumentos de madera que moldean la silueta, activan la circulación y trabajan la celulitis y la flacidez.',
      para: ['celulitis', 'volumen', 'piernas'] },
    { id: 'drenaje', nombre: 'Drenaje linfático corporal', duracion: 60, etiqueta: 'Método Manuela Shala', precio: '',
      desc: 'Maniobras suaves y rítmicas que ayudan a eliminar líquidos y toxinas. Deshincha, alivia la pesadez y deja el cuerpo ligero.',
      para: ['liquidos', 'piernas', 'volumen'] },
    { id: 'linfomodelante', nombre: 'Masaje linfomodelante', duracion: 60, etiqueta: 'Drenaje + modelado', precio: '',
      desc: 'Une drenaje y modelado en una misma sesión para reducir volumen y redefinir el contorno.',
      para: ['volumen', 'celulitis', 'liquidos'] },
    { id: 'reductor', nombre: 'Tratamiento reductor natural', duracion: 60, etiqueta: 'Sin agujas ni cirugía', precio: '',
      desc: 'Plan personalizado de técnicas manuales reductoras para perder medidas de forma natural.',
      para: ['volumen', 'celulitis'] },
    { id: 'aparatologia', nombre: 'Vacum Slim · I‑Model', duracion: 45, etiqueta: 'Aparatología corporal', precio: '',
      desc: 'Tecnología que complementa el trabajo manual para potenciar el drenaje, el modelado y la firmeza de la piel.',
      para: ['celulitis', 'volumen', 'liquidos'] },
    { id: 'facial', nombre: 'Drenaje linfático facial', duracion: 45, etiqueta: 'Efecto buena cara', precio: '',
      desc: 'Desinflama el rostro, define el óvalo y despierta la piel. Perfecto antes de un evento.',
      para: ['rostro', 'liquidos'] },
    { id: 'descontracturante', nombre: 'Masaje descontracturante', duracion: 60, etiqueta: 'Espalda, cuello y hombros', precio: '',
      desc: 'Trabajo profundo para soltar contracturas, aliviar el dolor muscular y recuperar movilidad.',
      para: ['tension', 'estres'] },
    { id: 'relajante', nombre: 'Masaje relajante', duracion: 60, etiqueta: 'Una hora para ti', precio: '',
      desc: 'Ritmo lento y presión envolvente para bajar revoluciones, dormir mejor y desconectar de verdad.',
      para: ['estres', 'tension'] }
  ]
};
