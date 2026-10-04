// Group lists by other principles: Group by, as in a table, for the essay's
// lists. Dario organized each list by some principle, usually without naming it.
// Above each list Claude regrouped, a sentence names his grouping and a dropdown
// offers others: "These limits are organized [one at a time]." Resting on the
// dropdown stacks every option around the chosen one, like a vertical segmented
// control. Picking another shows the same items under new headings, written as
// plain phrases ("Limits that won't loosen:"), with a few words changed where the
// new order would leave them wrong, and hides his list until his grouping is
// picked again. Nothing animates. The groupings were written once for an essay
// and are stored in its notes.
//
// A regrouped list shows copies of Dario's items with the marks the other ideas
// put on them (key sentences, collapsed text and its bridges), copied again
// whenever those marks change. His list stays in the page, hidden, so the other
// ideas keep working on it. Before and after a list changes how it's shown, the
// list says so ('list:regrouping', then 'list:regrouped'), so ideas that show it
// another way can follow.
import { removeClasses } from './text-emphasis.js?v=8e863dc0fe81';
import { copyItem, lendIds, notedLists, returnIds } from './list-copies.js?v=e3d70997da26';

let controls = 0;

// What a list shows now, for ideas that show it another way: the list itself,
// or, while it's regrouped, the list under each group heading, with the heading
// as its label.
export function shownLists(list) {
  if (!list.classList.contains('regroup-away')) return [{ list, label: null }];
  const view = list.nextElementSibling;
  if (!view?.matches('.regrouped')) return [];
  return [...view.querySelectorAll(':scope > ul, :scope > ol')].map(group => ({
    list: group,
    label: group.previousElementSibling.textContent.replace(/:$/, ''),
  }));
}

// Swaps the first place a text node holds Dario's words for the new words,
// marked so you can tell, with his words on hover.
function edit(item, from, to) {
  // Not the words of a … pill or its bridge, which aren't the item's own.
  const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT, {
    acceptNode: node =>
      node.parentElement.closest('.emph-more')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const at = node.data.indexOf(from);
    if (at < 0) continue;
    const rest = node.splitText(at);
    rest.data = rest.data.slice(from.length);
    const changed = document.createElement('span');
    changed.className = 'regroup-edit';
    changed.title = `I originally wrote “${from}”`;
    changed.textContent = to;
    rest.before(changed);
    return;
  }
}

// The items under a principle's group headings, each a phrase that introduces
// its items, like the essay's own list intros. Each copy keeps its number in
// Dario's list, which a numbered list shows.
function regrouped({ list, items, tag }, principle) {
  const view = document.createElement('div');
  view.className = 'regrouped';
  for (const [name, numbers] of principle.groups) {
    const heading = document.createElement('h3');
    heading.className = 'regroup-heading';
    heading.textContent = `${name}:`;
    const group = document.createElement(list.localName);
    for (const number of numbers) {
      if (!items[number - 1]) continue;
      const copy = copyItem(items[number - 1], tag);
      copy.dataset.item = number;
      if (list.localName === 'ol') copy.value = number;
      for (const [at, from, to] of principle.edits ?? []) {
        if (at === number) edit(copy, from, to);
      }
      group.append(copy);
    }
    view.append(heading, group);
  }
  return view;
}

// Shows Dario's list again, exactly as it was.
function restore(found) {
  found.view?.remove();
  found.view = null;
  returnIds(found.list);
  removeClasses(found.list, 'regroup-away');
}

// Tells other ideas a list is about to change how it's shown, or just has.
const announce = (found, name) =>
  found.list.dispatchEvent(new CustomEvent(name, { bubbles: true }));

// Shows a list under a principle, or as Dario wrote it when there's none.
function show(found, principle) {
  announce(found, 'list:regrouping');
  restore(found);
  found.principle = principle;
  if (principle) {
    found.view = regrouped(found, principle);
    lendIds(found.list);
    found.list.classList.add('regroup-away');
    found.list.after(found.view);
  }
  announce(found, 'list:regrouped');
}

// How long the pointer rests on a dropdown before it opens, and how long after
// the pointer leaves it closes.
const HOVER_MS = 100;
const LEAVE_MS = 200;

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

// The sentence above a list, finished by a dropdown and a period. The dropdown
// shows the chosen grouping, Dario's at first. Resting the pointer on it (or a
// tap, or a key) stacks every option with the chosen one right over the
// dropdown, the others above and below it, like a vertical segmented control.
// Hovering an option says what it means; a click picks it.
function controlFor(found) {
  const id = `regroup-${++controls}`;
  const choices = [
    { name: found.notes.asWritten, about: 'How I wrote it', principle: null },
    ...found.notes.by.map(principle => ({ ...principle, principle })),
  ];
  let chosen = 0;

  // A div, not a paragraph, so the other ideas don't read it as Dario's text.
  const line = document.createElement('div');
  line.className = 'regroup';
  const start = document.createElement('span');
  start.id = id;
  start.textContent = found.notes.sentence;
  const picker = document.createElement('span');
  picker.className = 'regroup-picker';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'regroup-trigger';
  trigger.id = `${id}-value`;
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-labelledby', `${id} ${id}-value`);
  const value = document.createElement('span');
  value.textContent = choices[0].name;
  trigger.append(value);
  trigger.insertAdjacentHTML('beforeend', CHEVRON);
  const menu = document.createElement('span');
  menu.className = 'regroup-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-labelledby', id);
  menu.hidden = true;
  const options = choices.map((choice, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'regroup-option';
    option.setAttribute('role', 'menuitemradio');
    option.setAttribute('aria-checked', String(index === chosen));
    option.tabIndex = -1;
    option.title = choice.about;
    option.textContent = choice.name;
    option.addEventListener('click', () => pick(index));
    return option;
  });
  menu.append(...options);
  picker.append(trigger, menu);
  // The dropdown and the period wrap to the next line together.
  const end = document.createElement('span');
  end.className = 'regroup-end';
  end.append(picker, '.');
  line.append(start, ' ', end);

  // Lines the chosen option up over the dropdown, kept on the screen.
  const place = () => {
    const option = options[chosen];
    menu.style.left = `${-option.offsetLeft}px`;
    menu.style.top = `${-option.offsetTop}px`;
    const over = menu.getBoundingClientRect().right - (document.documentElement.clientWidth - 8);
    if (over > 0) menu.style.left = `${-option.offsetLeft - over}px`;
  };
  const open = focus => {
    if (menu.hidden) {
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      place();
    }
    if (focus) options[chosen].focus();
  };
  const close = refocus => {
    if (menu.hidden) return;
    if (refocus) trigger.focus();
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const pick = index => {
    chosen = index;
    for (const [at, option] of options.entries()) {
      option.setAttribute('aria-checked', String(at === index));
    }
    value.textContent = choices[index].name;
    close(menu.contains(document.activeElement));
    show(found, choices[index].principle);
  };

  let enter;
  let leave;
  picker.addEventListener('pointerenter', event => {
    clearTimeout(leave);
    if (event.pointerType === 'mouse') enter = setTimeout(() => open(false), HOVER_MS);
  });
  picker.addEventListener('pointerleave', event => {
    clearTimeout(enter);
    // A menu opened with the keyboard stays open while it has focus.
    if (event.pointerType === 'mouse' && !menu.contains(document.activeElement)) {
      leave = setTimeout(() => close(false), LEAVE_MS);
    }
  });
  // A tap or a click on the dropdown (a mouse usually lands on the open menu).
  trigger.addEventListener('click', () => (menu.hidden ? open(false) : close(false)));
  trigger.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open(true);
    }
  });
  menu.addEventListener('keydown', event => {
    const at = options.indexOf(document.activeElement);
    const move = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (move) {
      event.preventDefault();
      options[(at + move + options.length) % options.length].focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      options.at(event.key === 'Home' ? 0 : -1).focus();
    } else if (event.key === 'Escape') {
      // Only the menu closes, not an open run of collapsed text behind it.
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Tab') close(false);
  });
  picker.addEventListener('focusout', event => {
    if (!picker.contains(event.relatedTarget)) close(false);
  });
  return { line, picker, close };
}

export const regroupLists = {
  id: 'regroup-lists',
  label: 'Group lists by other principles',
  on: true,
  start({ essay, notes }) {
    const lists = notedLists(essay, notes.groupings).map((found, index) => ({
      ...found,
      tag: `g${index + 1}`,
      principle: null,
      view: null,
    }));
    for (const found of lists) {
      found.control = controlFor(found);
      found.list.before(found.control.line);
    }
    // A click or tap anywhere else closes an open dropdown.
    const onPointer = event => {
      for (const { control } of lists) {
        if (!control.picker.contains(event.target)) control.close(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    // When the key sentences are marked again, copy the newly marked items.
    const recopy = () => {
      for (const found of lists) if (found.principle) show(found, found.principle);
    };
    essay.addEventListener('keysentences:marked', recopy);

    return () => {
      essay.removeEventListener('keysentences:marked', recopy);
      document.removeEventListener('pointerdown', onPointer);
      for (const found of lists) {
        announce(found, 'list:regrouping');
        restore(found);
        found.control.line.remove();
        announce(found, 'list:regrouped');
      }
    };
  },
};
