/**
 * Mi taller de cerámica · puente entre la app (GitHub Pages) y Google Sheets.
 *
 * Los datos viven en este Google Sheet (pestañas Proyectos, Ideas, Placas, Listas)
 * y las fotos en una carpeta de Google Drive.
 *
 * Instalación (una sola vez):
 *  1. En el Google Sheet: Extensiones > Apps Script. Pega este archivo entero en Código.gs.
 *  2. Configuración del proyecto (rueda dentada) > Propiedades del script > añade:
 *       PIN = el código que quieras (mejor 6 cifras o más)
 *  3. Elige la función "setup" arriba y pulsa Ejecutar (acepta los permisos).
 *  4. Implementar > Gestionar implementaciones > lápiz > Versión: Nueva versión.
 *     Ejecutar como "Yo", acceso "Cualquier usuario" > Implementar.
 */

const HOJAS = {
  proyectos: {
    nombre: 'Proyectos',
    cols: ['id', 'creado', 'actualizado', 'fecha', 'titulo', 'estado', 'tecnica', 'barro',
      'esmaltes', 'capas', 'aplicacion', 'coccion', 'horno', 'valoracion', 'defectos',
      'notas', 'hariaDistinto', 'fotos', 'ideaId'],
  },
  ideas: {
    nombre: 'Ideas',
    cols: ['id', 'creado', 'actualizado', 'titulo', 'texto', 'links', 'etiquetas', 'fotos', 'proyectoId'],
  },
  placas: {
    nombre: 'Placas',
    cols: ['id', 'creado', 'actualizado', 'fecha', 'titulo', 'barro', 'esmaltes', 'capas',
      'aplicacion', 'coccion', 'horno', 'valoracion', 'defectos', 'notas', 'hariaDistinto', 'fotos'],
  },
};

const HOJA_LISTAS = 'Listas';

// Valores iniciales de las etiquetas. Después se editan en la pestaña "Listas"
// o desde la propia app con "+ añadir".
const LISTAS_INICIALES = {
  barros: ['Luna', 'Marte', 'Blanco CT', 'Blanco Impalpable', 'Negro'],
  esmaltes: [],
  estados: ['Modelando', 'Secando', 'Bizcochado', 'Esmaltado', 'Terminado', 'Fallido'],
  tecnicas: ['Torno', 'Pellizco', 'Churros', 'Planchas', 'Molde'],
  aplicacion: ['Inmersión', 'Pincel', 'Aspersión', 'Vertido'],
  coccion: ['Baja (≈1000 °C)', 'Media (≈1150 °C)', 'Alta (≈1250 °C)'],
  hornos: [],
  defectos: ['Escurrido', 'Burbujas', 'Craquelado', 'Pinhole', 'Grieta', 'Alabeo',
    'Se pegó a la placa', 'Color inesperado'],
  etiquetasIdeas: ['Taza', 'Plato', 'Cuenco', 'Jarrón', 'Textura', 'Color', 'Forma'],
};

const CAMPOS_LISTA = ['esmaltes', 'defectos', 'etiquetas', 'links'];
const CAMPOS_JSON = ['fotos'];
const SEP = ' | ';

/* ---------- Entrada ---------- */

// Lo que la app puede pedir. El PIN viaja siempre en el cuerpo de un POST, nunca en la URL.
const ACCIONES = {
  getTodo: getTodo,
  guardar: guardar,
  borrar: borrar,
  subirFoto: subirFoto,
  anadirALista: anadirALista,
};

function doGet() {
  return responder_(function () { return 'Mi taller está funcionando'; });
}

function doPost(e) {
  return responder_(function () {
    const body = JSON.parse(e.postData.contents);
    comprobarPin_(body.pin);
    const fn = ACCIONES[body.action];
    if (!fn) throw new Error('Acción desconocida: ' + body.action);
    if (body.action === 'getTodo') asegurarHojas_();
    return fn.apply(null, body.args || []);
  });
}

function responder_(fn) {
  let out;
  try {
    out = { ok: true, data: fn() };
  } catch (err) {
    out = { ok: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function comprobarPin_(pin) {
  const cache = CacheService.getScriptCache();
  const fallos = Number(cache.get('fallosPin') || 0);
  if (fallos >= 20) throw new Error('Demasiados intentos. Espera 10 minutos.');
  const real = PropertiesService.getScriptProperties().getProperty('PIN');
  if (!real) throw new Error('Falta configurar el PIN en las propiedades del script.');
  if (String(pin || '') !== real) {
    cache.put('fallosPin', String(fallos + 1), 600);
    throw new Error('PIN incorrecto');
  }
}

// Si alguien abre la app antes de ejecutar setup, se prepara solo.
function asegurarHojas_() {
  const ss = libro_();
  const falta = Object.values(HOJAS).some(function (h) { return !ss.getSheetByName(h.nombre); }) ||
    !ss.getSheetByName(HOJA_LISTAS);
  if (falta) setup();
}

/* ---------- Instalación ---------- */

function setup() {
  const ss = libro_();
  Object.values(HOJAS).forEach(function (h) { prepararHoja_(ss, h); });

  if (!ss.getSheetByName(HOJA_LISTAS)) {
    const sh = ss.insertSheet(HOJA_LISTAS);
    const claves = Object.keys(LISTAS_INICIALES);
    const alto = Math.max.apply(null, claves.map(function (k) { return LISTAS_INICIALES[k].length; }));
    const filas = [claves];
    for (let i = 0; i < alto; i++) {
      filas.push(claves.map(function (k) { return LISTAS_INICIALES[k][i] || ''; }));
    }
    sh.getRange(1, 1, filas.length, claves.length).setNumberFormat('@').setValues(filas);
    sh.getRange(1, 1, 1, claves.length).setFontWeight('bold').setBackground('#f3dccd');
    sh.setFrozenRows(1);
  }

  // Quita la hoja vacía que trae un Sheet nuevo
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });

  carpeta_();
  Logger.log('Listo. Hoja: ' + ss.getUrl());
  Logger.log('Carpeta de fotos: ' + carpeta_().getUrl());
}

function prepararHoja_(ss, h) {
  let sh = ss.getSheetByName(h.nombre);
  if (!sh) sh = ss.insertSheet(h.nombre);
  // Todo como texto para que Sheets no convierta fechas ni números por su cuenta
  sh.getRange(1, 1, sh.getMaxRows(), Math.max(h.cols.length, sh.getMaxColumns())).setNumberFormat('@');
  const actuales = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].filter(String) : [];
  const faltan = h.cols.filter(function (c) { return actuales.indexOf(c) < 0; });
  if (faltan.length) {
    sh.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]);
  }
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#f3dccd');
  sh.setFrozenRows(1);
}

function libro_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SS_ID');
  if (id) return SpreadsheetApp.openById(id);
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) ss = SpreadsheetApp.create('Mi taller de cerámica');
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

function carpeta_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* se borró: crear otra */ }
  }
  const f = DriveApp.createFolder('Mi taller de cerámica · fotos');
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

/* ---------- Lectura ---------- */

function getTodo() {
  return {
    proyectos: leer_('proyectos'),
    ideas: leer_('ideas'),
    placas: leer_('placas'),
    listas: leerListas_(),
  };
}

function leer_(clave) {
  const sh = libro_().getSheetByName(HOJAS[clave].nombre);
  if (!sh) throw new Error('Falta la pestaña ' + HOJAS[clave].nombre + '. Ejecuta setup.');
  const vals = sh.getDataRange().getValues();
  const cab = vals.shift() || [];
  return vals
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      const o = {};
      cab.forEach(function (k, i) { if (k) o[k] = deserializar_(k, r[i]); });
      return o;
    });
}

function leerListas_() {
  const sh = libro_().getSheetByName(HOJA_LISTAS);
  if (!sh) return LISTAS_INICIALES;
  const vals = sh.getDataRange().getValues();
  const cab = vals.shift() || [];
  const out = {};
  cab.forEach(function (k, i) {
    if (!k) return;
    out[k] = vals.map(function (r) { return String(r[i]).trim(); }).filter(String);
  });
  return out;
}

function deserializar_(k, v) {
  if (v instanceof Date) v = v.toISOString();
  if (CAMPOS_JSON.indexOf(k) >= 0) {
    try { return v ? JSON.parse(v) : []; } catch (e) { return []; }
  }
  if (CAMPOS_LISTA.indexOf(k) >= 0) {
    return v === '' || v == null ? [] : String(v).split(SEP).map(function (s) { return s.trim(); }).filter(String);
  }
  return v === '' || v == null ? '' : String(v);
}

function serializar_(k, v) {
  if (CAMPOS_JSON.indexOf(k) >= 0) return JSON.stringify(v || []);
  if (CAMPOS_LISTA.indexOf(k) >= 0) return (v || []).join(SEP);
  return v == null ? '' : String(v);
}

/* ---------- Escritura ---------- */

function guardar(clave, obj) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = libro_().getSheetByName(HOJAS[clave].nombre);
    const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const ahora = new Date().toISOString();
    if (!obj.id) {
      obj.id = Utilities.getUuid().slice(0, 8);
      obj.creado = ahora;
    }
    obj.actualizado = ahora;
    const fila = cab.map(function (k) { return serializar_(k, obj[k]); });
    const fil = filaDe_(sh, obj.id);
    if (fil) {
      sh.getRange(fil, 1, 1, cab.length).setValues([fila]);
    } else {
      const n = sh.getLastRow() + 1;
      sh.getRange(n, 1, 1, cab.length).setNumberFormat('@').setValues([fila]);
    }
    return obj;
  } finally {
    lock.releaseLock();
  }
}

function borrar(clave, id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = libro_().getSheetByName(HOJAS[clave].nombre);
    const fil = filaDe_(sh, id);
    if (fil) sh.deleteRow(fil);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function filaDe_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function subirFoto(dataUrl) {
  const m = String(dataUrl).match(/^data:(.+?);base64,(.*)$/);
  if (!m) throw new Error('Formato de imagen no válido');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'foto_' + Date.now() + '.jpg');
  const file = carpeta_().createFile(blob);
  try {
    // Necesario para que la app pueda mostrar la miniatura
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) { /* algunas cuentas no lo permiten; la foto se ve igualmente estando logueada */ }
  return file.getId();
}

function anadirALista(lista, valor) {
  valor = String(valor || '').trim();
  if (!valor) return leerListas_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = libro_().getSheetByName(HOJA_LISTAS);
    const cab = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
    let col = cab.indexOf(lista) + 1;
    if (!col) {
      col = sh.getLastColumn() + 1;
      sh.getRange(1, col).setValue(lista).setFontWeight('bold').setBackground('#f3dccd');
    }
    const alto = Math.max(sh.getLastRow() - 1, 0);
    const vals = alto ? sh.getRange(2, col, alto, 1).getValues().map(function (r) { return String(r[0]).trim(); }) : [];
    if (vals.indexOf(valor) < 0) {
      const hueco = vals.indexOf('');
      const fila = hueco >= 0 ? hueco + 2 : alto + 2;
      sh.getRange(fila, col).setNumberFormat('@').setValue(valor);
    }
    return leerListas_();
  } finally {
    lock.releaseLock();
  }
}
