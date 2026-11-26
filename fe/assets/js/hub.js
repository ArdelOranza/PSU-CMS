/* Launcher page: reset the mock data kept in localStorage. */
document.getElementById('resetData').addEventListener('click', function () {
  if (window.confirm('Reset all sample data (personnel, documents, media, layout)?')) { PSU.db.reset(); window.alert('Sample data restored.'); }
});
