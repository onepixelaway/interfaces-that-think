import { FEATURES, FeatureSwitches } from './features.js?v=a51fb1ac7436';
import { NOTES } from './essay-notes.js?v=1a76717430d3';
import { tryYourOwnArticle } from './your-article.js?v=51874e083e20';

const $ = id => document.getElementById(id);
let noticeTimer;
function showNotice(message) {
  clearTimeout(noticeTimer);
  $('notice').textContent = message;
  if (message) noticeTimer = setTimeout(() => ($('notice').textContent = ''), 6000);
}

let storage = null;
try {
  storage = window.localStorage;
} catch {}

// Light and dark, like darioamodei.com: a choice made here is remembered;
// until then the page follows the system setting. The <head> script applies it
// before the first paint.
const THEME_KEY = 'reading-long-form.dark-mode';
const darkMode = $('dark-mode');
const systemDark = matchMedia('(prefers-color-scheme: dark)');
let chosenTheme = null;
try {
  chosenTheme = storage?.getItem(THEME_KEY) ?? null;
} catch {}
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  darkMode.checked = dark;
}
applyTheme(document.documentElement.dataset.theme === 'dark');
darkMode.onchange = () => {
  applyTheme(darkMode.checked);
  chosenTheme = String(darkMode.checked);
  try {
    storage?.setItem(THEME_KEY, chosenTheme);
  } catch {}
};
systemDark.addEventListener('change', event => {
  if (chosenTheme === null) applyTheme(event.matches);
});
// Only animate the switch after its first position has been painted: the frame
// after next is the first one drawn after it.
requestAnimationFrame(() =>
  requestAnimationFrame(() => darkMode.parentElement.classList.add('animated')),
);

const intelligence = $('intelligence');
const switches = new FeatureSwitches(
  FEATURES,
  // Every idea reads the essay's notes from here, so another article can bring
  // its own.
  { essay: document.querySelector('.essay'), notes: NOTES },
  {
    storage,
    onError: (feature, error) => {
      console.error(error);
      showNotice(`${feature.label} ran into a problem and was turned off.`);
    },
  },
);
switches.startAll();
// An idea that refines another is indented under it, and can be switched only
// while its parent is on; until then it shows whether it's chosen, greyed out.
function refreshMenu() {
  for (const box of intelligence.querySelectorAll('input[data-feature]')) {
    const id = box.dataset.feature;
    box.disabled = !switches.available(id);
    box.checked = box.disabled ? switches.wants(id) : switches.isOn(id);
  }
}
for (const feature of FEATURES) {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.dataset.feature = feature.id;
  // Switching one idea can switch others on or off, so refresh them all.
  box.onchange = () => {
    switches.set(feature.id, box.checked);
    refreshMenu();
  };
  const label = document.createElement('label');
  if (feature.parent) label.className = 'sub-idea';
  label.append(box, feature.label);
  intelligence.querySelector('.intelligence-menu').append(label);
}
refreshMenu();
document.addEventListener('pointerdown', event => {
  if (!intelligence.contains(event.target)) intelligence.open = false;
});
intelligence.addEventListener('keydown', event => {
  if (event.key === 'Escape' && intelligence.open) {
    intelligence.open = false;
    intelligence.querySelector('summary').focus();
  }
});

// Try your own article swaps a pasted article in for the essay, and back: every
// idea stops, the page and its notes change, and the chosen ideas start again.
tryYourOwnArticle({
  swap(change, notes) {
    switches.stopAll();
    change();
    switches.context.notes = notes;
    switches.startAll();
    refreshMenu();
  },
});
