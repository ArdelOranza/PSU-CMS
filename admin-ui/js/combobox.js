/* ==========================================================================
   combobox.js — searchable single-select dropdown (type to filter a list).
   Used for "Department Head" (faculty search). Plain DOM, no libraries.

   Markup expected (see departments/department-form.html):
     <div class="cms-combobox" id="deptHeadBox">
       <input class="cms-input" id="deptHead" type="text" ...>
     </div>
   Usage:
     var box = CMS.combobox.create(document.getElementById('deptHeadBox'), {
       items: function () { return [{ id, label, sub }]; },   // read fresh each time it opens
       emptyText: 'No matching faculty',
       clearLabel: 'No department head'
     });
     box.setValue({ id, label });  box.getValue();  // -> { id, label } or null
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.combobox = (function () {
  var uid = 0;

  function create(root, opts) {
    var ui = CMS.ui, el = ui.el;
    var input = root.querySelector('input');
    var menuId = 'cmsComboMenu' + (++uid);
    var menu = el('ul', { class: 'cms-combobox-menu', id: menuId, role: 'listbox', hidden: true });
    var clearBtn = el('button', { type: 'button', class: 'cms-combobox-clear', 'aria-label': opts.clearLabel || 'Clear selection', hidden: true }, [ui.icon('x-lg')]);
    root.appendChild(clearBtn); root.appendChild(menu);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', menuId);
    input.setAttribute('autocomplete', 'off');

    var selected = null;   // { id, label } or null
    var shown = [];        // items currently listed
    var focusIndex = -1;

    function setSelected(item) {
      selected = item ? { id: item.id, label: item.label } : null;
      input.value = selected ? selected.label : '';
      clearBtn.hidden = !selected;
    }
    function build(query) {
      var q = String(query || '').trim().toLowerCase();
      shown = (opts.items() || []).filter(function (it) {
        return !q || (it.label + ' ' + (it.sub || '')).toLowerCase().indexOf(q) !== -1;
      });
      ui.clear(menu);
      if (!shown.length) {
        menu.appendChild(el('li', { class: 'cms-combobox-empty', role: 'presentation', text: opts.emptyText || 'No results' }));
        focusIndex = -1; return;
      }
      shown.forEach(function (it, i) {
        var li = el('li', { class: 'cms-combobox-option', role: 'option', id: menuId + '-' + i, 'aria-selected': selected && selected.id === it.id ? 'true' : 'false' }, [
          el('span', { class: 'cms-combobox-label' }, [ui.highlight(it.label, q)]),
          it.sub ? el('span', { class: 'cms-combobox-sub', text: it.sub }) : null
        ]);
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
        menu.appendChild(li);
      });
      setFocus(0);
    }
    function setFocus(i) {
      var nodes = menu.querySelectorAll('.cms-combobox-option');
      if (!nodes.length) return;
      focusIndex = (i + nodes.length) % nodes.length;
      [].forEach.call(nodes, function (n, k) { n.classList.toggle('is-focus', k === focusIndex); });
      input.setAttribute('aria-activedescendant', nodes[focusIndex].id);
      nodes[focusIndex].scrollIntoView({ block: 'nearest' });
    }
    function open(query) {
      build(query); menu.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    function close() {
      menu.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
      input.value = selected ? selected.label : '';   // typed text that was not chosen is discarded
    }
    function choose(i) {
      var changed = !selected || selected.id !== shown[i].id;
      setSelected(shown[i]); menu.hidden = true; input.setAttribute('aria-expanded', 'false');
      if (changed) input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    input.addEventListener('focus', function () { input.select(); open(''); });
    input.addEventListener('click', function () { if (menu.hidden) open(''); });
    input.addEventListener('input', function () { open(input.value); });
    input.addEventListener('blur', close);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (menu.hidden) open(''); else setFocus(focusIndex + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter' && !menu.hidden) {
        e.preventDefault(); if (focusIndex >= 0 && shown[focusIndex]) choose(focusIndex);
      } else if (e.key === 'Escape' && !menu.hidden) {
        e.preventDefault(); close();
      }
    });
    clearBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    clearBtn.addEventListener('click', function () {
      setSelected(null); menu.hidden = true; input.dispatchEvent(new Event('change', { bubbles: true })); input.focus();
    });

    return { getValue: function () { return selected; }, setValue: setSelected, input: input };
  }

  return { create: create };
})();
