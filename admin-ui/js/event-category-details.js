/* ==========================================================================
   event-category-details.js — Event Category Details page (opened with ?id=...).
   Edit opens the same "Category" dialog as the Event Categories page.
   ========================================================================== */
(function () {
  var ui = CMS.ui, db = CMS.db.eventCategories, events = CMS.db.events;

  function put(id, value) { document.getElementById(id).textContent = value; }
  function eventCount(id) { return events.list().filter(function (e) { return e.categoryId === id; }).length; }

  function init() {
    var id = ui.getParam('id'), cat = db.get(id);
    if (!cat) { ui.flash('That category was not found.', 'error'); window.location.href = 'event-categories.html'; return; }

    function render() {
      cat = db.get(id);
      put('detailTitle', cat.name); put('detailDescription', cat.description || '\u2014'); put('detailCount', String(eventCount(id)));
      document.title = cat.name + ' | PSU CMS';
    }
    render();

    ui.bindDetailActions({
      onEdit: function () { CMS.eventCategoryDialog.open(cat, render); },
      /* a category that still has events cannot be deleted */
      blocked: function () {
        var n = eventCount(id);
        return n ? { title: 'Category in use', text: '\u201C' + cat.name + '\u201D is used by ' + n + (n === 1 ? ' event' : ' events') + '. Move those events to another category or delete them first.' } : null;
      },
      remove: function () { return db.remove(id); }, listHref: 'event-categories.html'
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
