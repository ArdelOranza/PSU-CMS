/* ==========================================================================
   sanitize.js — allow-list HTML cleaner for the rich-text editor.
   NOTE: this is only a front-end safeguard for the prototype. When the pages
   become PHP views, content must ALSO be cleaned on the server.
   ========================================================================== */
window.CMS = window.CMS || {};

CMS.sanitize = (function () {
  /* tag -> attributes that may stay */
  var ALLOWED = {
    P: [], DIV: [], BR: [], B: [], STRONG: [], I: [], EM: [], U: [],
    UL: [], OL: [], LI: [], A: ['href'], IMG: ['src', 'alt']
  };
  /* tags removed together with everything inside them */
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1, TEMPLATE: 1, LINK: 1, META: 1, SVG: 1, MATH: 1, FORM: 1, TEXTAREA: 1, SELECT: 1 };
  var SAFE_HREF = /^(https?:|mailto:)/i;
  var SAFE_IMG = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+\/=]+$/i;

  function cleanNode(node, outDoc) {
    var frag = outDoc.createDocumentFragment();
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {                      // text
        frag.appendChild(outDoc.createTextNode(child.nodeValue));
        return;
      }
      if (child.nodeType !== 1) return;                // ignore comments etc.
      var tag = child.tagName.toUpperCase();
      if (DROP[tag]) return;
      if (!ALLOWED.hasOwnProperty(tag)) {              // unknown tag: keep its text/children
        frag.appendChild(cleanNode(child, outDoc));
        return;
      }
      var el = outDoc.createElement(tag.toLowerCase());
      ALLOWED[tag].forEach(function (attr) {
        var value = child.getAttribute(attr);
        if (value === null) return;
        value = value.trim();
        if (tag === 'A' && attr === 'href' && !SAFE_HREF.test(value)) return;
        if (tag === 'IMG' && attr === 'src' && !SAFE_IMG.test(value)) return;
        el.setAttribute(attr, value);
      });
      if (tag === 'IMG' && !el.getAttribute('src')) return;   // image without safe source: drop
      if (tag === 'A') {
        if (!el.getAttribute('href')) { frag.appendChild(cleanNode(child, outDoc)); return; }
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
      if (tag !== 'BR' && tag !== 'IMG') el.appendChild(cleanNode(child, outDoc));
      frag.appendChild(el);
    });
    return frag;
  }

  /* Returns a cleaned DOM fragment (nothing from the input is ever executed:
     DOMParser documents are inert). */
  function toFragment(html) {
    var parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
    return cleanNode(parsed.body, document);
  }

  /* Returns a cleaned HTML string, for saving to localStorage. */
  function clean(html) {
    var holder = document.createElement('div');
    holder.appendChild(toFragment(html));
    return holder.innerHTML;
  }

  /* Puts cleaned content into an element WITHOUT assigning innerHTML. */
  function render(el, html) {
    el.replaceChildren(toFragment(html));
  }

  /* Plain text version (for snippets, search and empty checks). */
  function text(html) {
    var holder = document.createElement('div');
    holder.appendChild(toFragment(html));
    return (holder.textContent || '').replace(/\s+/g, ' ').trim();
  }

  return { clean: clean, render: render, text: text, toFragment: toFragment };
})();
