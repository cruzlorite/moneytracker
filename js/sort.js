// Drag to reorder. Rows are the direct children of a list matching `sel`, carry data-id and a .grip button.
// Touch, mouse and pen drag the grip; with the keyboard, focus the grip and use the up and down arrows.
// onDrop(ids) gets the list's new order, only when it changed.
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const order = (list) => [...list.children].map((r) => r.dataset.id);

/** Run `move` (which reorders DOM nodes) and slide the other rows from where they were. */
function flip(list, move, skip) {
  const rows = [...list.children], before = new Map(rows.map((r) => [r, r.offsetTop]));
  move();
  if (reduced()) return;
  for (const r of rows) {
    const dy = before.get(r) - r.offsetTop;
    if (r === skip || !dy) continue;
    r.style.transition = 'none';
    r.style.transform = `translateY(${dy}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transition = 'transform .16s ease'; r.style.transform = ''; }));
  }
}

export function sortable(root, sel, onDrop) {
  root.addEventListener('pointerdown', (e) => {
    const grip = e.target.closest('.grip');
    if (!grip || e.button > 0) return;
    const row = grip.closest('[data-id]'), list = row?.parentElement;
    if (!list?.matches(sel) || list.children.length < 2) return;
    e.preventDefault();
    const start = order(list).join();
    const grab = e.clientY - row.getBoundingClientRect().top;
    row.classList.add('dragging');
    document.documentElement.classList.add('is-dragging');
    grip.setPointerCapture(e.pointerId);

    const move = (ev) => {
      // where the row should be, in the list's coordinates (offsetTop ignores the rows' transforms)
      const want = ev.clientY - list.getBoundingClientRect().top - grab;
      const mid = want + row.offsetHeight / 2;
      const next = row.nextElementSibling, prev = row.previousElementSibling;
      if (next && mid > next.offsetTop + next.offsetHeight / 2) flip(list, () => list.insertBefore(next, row), row);
      else if (prev && mid < prev.offsetTop + prev.offsetHeight / 2) flip(list, () => list.insertBefore(row, prev), row);
      const lo = -row.offsetTop - 8, hi = list.offsetHeight - row.offsetTop - row.offsetHeight + 8;
      row.style.transform = `translateY(${Math.min(hi, Math.max(lo, want - row.offsetTop))}px)`;
      // keep the finger's row in view near the edges (the tab bar covers the bottom)
      if (ev.clientY > innerHeight - 120) scrollBy(0, 10); else if (ev.clientY < 80) scrollBy(0, -10);
    };
    const end = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      document.documentElement.classList.remove('is-dragging');
      row.style.transition = reduced() ? 'none' : 'transform .14s ease';
      row.style.transform = '';
      setTimeout(() => { row.classList.remove('dragging'); row.style.transition = ''; }, 150);
      const ids = order(list);
      if (ids.join() !== start) onDrop(ids);
    };
    // on the document, not the grip: moving the row up re-inserts it in the list, and that drops the grip's pointer capture
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  });

  root.addEventListener('keydown', (e) => {
    const grip = e.target.closest?.('.grip');
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const row = grip.closest('[data-id]'), list = row?.parentElement;
    if (!list?.matches(sel)) return;
    const other = e.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
    e.preventDefault();
    if (!other) return;
    const id = row.dataset.id;
    flip(list, () => (e.key === 'ArrowUp' ? list.insertBefore(row, other) : list.insertBefore(other, row)));
    onDrop(order(list));
    // the list is drawn again after saving: keep the focus on the same grip
    requestAnimationFrame(() => document.querySelector(`${sel} [data-id="${CSS.escape(id)}"] .grip`)?.focus());
  });
}
