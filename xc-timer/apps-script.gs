/**
 * XC Timer: Google Apps Script for the registration Sheet.
 * Paste into the Sheet: Extensions → Apps Script, replace everything, Save,
 * then Deploy → New deployment → type "Web app", Execute as: Me, Who has access: Anyone.
 * Copy the /exec URL into the timing app (Setup → both URL boxes).
 *
 *  GET  <url>                → registrations as CSV (the Form responses tab)
 *  GET  <url>?type=results   → latest results as JSON (used by results.html)
 *  POST <url>                → timing app sends results here (writes "Results" + "Crossings" tabs)
 */
const REG_SHEET = ''; // leave blank to use the first tab (Form responses)

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (e && e.parameter && e.parameter.type === 'results') {
    const sh = ss.getSheetByName('Results');
    const props = PropertiesService.getScriptProperties();
    const out = { raceName: props.getProperty('raceName') || '', date: props.getProperty('date') || '', updated: props.getProperty('updated') || '', header: [], rows: [] };
    if (sh && sh.getLastRow() > 0) {
      const v = sh.getDataRange().getDisplayValues();
      out.header = v[0]; out.rows = v.slice(1);
    }
    return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
  }
  const sh = REG_SHEET ? ss.getSheetByName(REG_SHEET) : ss.getSheets()[0];
  const csv = sh.getDataRange().getDisplayValues()
    .map(r => r.map(c => /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join(',')).join('\n');
  return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  writeTab_(ss, 'Results', [d.header].concat(d.rows));
  writeTab_(ss, 'Crossings', [['Time', 'Bib', 'Name']].concat(d.taps || []));
  PropertiesService.getScriptProperties().setProperties({
    raceName: String(d.raceName || ''), date: String(d.date || ''), updated: new Date().toISOString()
  });
  return ContentService.createTextOutput('ok');
}

function writeTab_(ss, name, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  if (!rows.length || !rows[0].length) return;
  const w = Math.max.apply(null, rows.map(r => r.length));
  const data = rows.map(r => { const x = r.map(String); while (x.length < w) x.push(''); return x; });
  sh.getRange(1, 1, data.length, w).setNumberFormat('@').setValues(data);
  sh.setFrozenRows(1);
}
