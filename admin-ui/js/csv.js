/* ==========================================================================
   csv.js — builds and downloads a .csv file in the browser.
   Uses a data: URL (not blob:) because the site CSP / team rules avoid blob:.
   Escapes commas, quotes and line breaks, and neutralises spreadsheet
   formulas (cells starting with = + - @) so Excel does not run them.
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.csv = (function () {
  function cell(value) {
    var s = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function build(headers, rows) {
    return [headers].concat(rows).map(function (r) { return r.map(cell).join(','); }).join('\r\n');
  }
  function download(filename, headers, rows) {
    var text = '\uFEFF' + build(headers, rows);          // BOM so Excel reads UTF-8
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  return { build: build, download: download, cell: cell };
})();
