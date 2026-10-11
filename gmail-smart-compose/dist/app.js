const $ = id => document.getElementById(id);
const compose = document.querySelector('.compose');
const initial =
  'Hey --\nI have an extra ticket for the Matilda movie on Saturday. \n\n\n--\nCharlie';
const body = $('body');
const phrases = [
  'Do you want to go?',
  'Would you like to join me?',
  'Let me know what you think.',
  'Let me know if that works for you.',
  'Looking forward to hearing from you.',
  'Looking forward to seeing you!',
  'Thank you for your help.',
  'Thanks for getting back to me.',
  'I hope you are doing well.',
  'Please let me know if you have any questions.',
  'Are you free this weekend?',
  'See you soon!',
  'Have a great weekend!',
  'I have an extra ticket for the Matilda movie on Saturday.',
];
let suggestion = '';
let dismissed = '';
let composing = false;
let timer;
function complete(prefix) {
  const typed = prefix
    .split(/\n|(?<=[.!?])\s+/)
    .at(-1)
    .trimStart();
  if (typed) {
    const phrase = phrases.find(
      p => p.toLowerCase().startsWith(typed.toLowerCase()) && p.length > typed.length,
    );
    if (phrase) return phrase.slice(typed.length);
  }
  if (/\b(thank you|thanks)\s+$/i.test(prefix)) return 'for your help.';
  if (/\blooking forward to\s+$/i.test(prefix)) return 'hearing from you.';
  return '';
}
function render() {
  const at = body.selectionStart;
  const text = body.value;
  const prefix = text.slice(0, at);
  const key = `${text}|${at}`;
  suggestion =
    !composing &&
    $('smart').checked &&
    at === body.selectionEnd &&
    (at === text.length || text[at] === '\n') &&
    dismissed !== key
      ? complete(prefix)
      : '';
  const mirror = $('mirror');
  mirror.replaceChildren();
  const actual = document.createElement('div');
  actual.textContent = text + '\u200b';
  mirror.append(actual);
  if (suggestion) {
    const overlay = document.createElement('div');
    overlay.className = 'suggestion-overlay';
    const before = document.createElement('span');
    before.style.visibility = 'hidden';
    before.textContent = prefix;
    overlay.append(before);
    const ghost = document.createElement('span');
    ghost.className = 'ghost';
    ghost.textContent = suggestion;
    overlay.append(ghost);
    const keycap = document.createElement('kbd');
    keycap.textContent = 'tab';
    overlay.append(keycap);
    mirror.append(overlay);
  }
  mirror.scrollTop = body.scrollTop;
}
function showSubject() {
  $('window-title').textContent = $('subject').value || 'New Message';
}
function reset() {
  body.value = initial;
  $('recipient').value = 'grandpa.joe@example.com';
  $('subject').value = 'Movie Night';
  showSubject();
  dismissed = '';
  body.focus();
  body.setSelectionRange(initial.indexOf('\n\n'), initial.indexOf('\n\n'));
  render();
}
body.addEventListener('input', () => {
  dismissed = '';
  render();
});
body.addEventListener('select', render);
body.addEventListener('click', render);
body.addEventListener('keyup', render);
body.addEventListener('scroll', () => {
  $('mirror').scrollTop = body.scrollTop;
});
body.addEventListener('compositionstart', () => {
  composing = true;
  render();
});
body.addEventListener('compositionend', () => {
  composing = false;
  render();
});
body.addEventListener('keydown', event => {
  if (event.key === 'Tab' && !event.shiftKey && suggestion && !composing) {
    event.preventDefault();
    // Typed in, so undo takes it back; setRangeText where that isn't supported.
    if (!document.execCommand('insertText', false, suggestion)) {
      const at = body.selectionStart;
      body.setRangeText(suggestion, at, at, 'end');
    }
    dismissed = '';
    render();
  }
  if (event.key === 'Escape') {
    dismissed = `${body.value}|${body.selectionStart}`;
    render();
  }
});
$('subject').addEventListener('input', showSubject);
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(timer);
  timer = setTimeout(() => $('toast').classList.remove('visible'), 2800);
}
const icons = [
  ['Formatting options', '<span class="format">A</span>'],
  [
    'Attach files',
    '<svg viewBox="0 0 24 24"><path d="M9 16V5a3 3 0 0 1 6 0v13a5 5 0 0 1-10 0V7m4 0v11a1 1 0 0 0 2 0V5"/></svg>',
  ],
  [
    'Insert link',
    '<svg viewBox="0 0 24 24"><path d="M9 7H6a5 5 0 0 0 0 10h3m6-10h3a5 5 0 0 1 0 10h-3M7 12h10"/></svg>',
  ],
  [
    'Insert emoji',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M7 14q5 7 10 0"/><path d="M8 8h.1M16 8h.1" stroke-width="3"/></svg>',
  ],
  [
    'Insert from Drive',
    '<svg viewBox="0 0 24 24"><path d="m9 2 6 0 8 14h-6ZM8 3 1 16l3 6 7-13Zm-2 19h14l3-5H9Z" fill="currentColor" stroke="none"/></svg>',
  ],
  [
    'Insert photo',
    '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="1" fill="currentColor" stroke="none"/><path d="m4 19 5-7 4 4 4-6 4 9" fill="#202124" stroke="none"/></svg>',
  ],
  [
    'Confidential mode',
    '<svg viewBox="0 0 24 24"><path d="M4 10V6a4 4 0 0 1 8 0v4M3 10h10v11H3Z"/><circle cx="16" cy="16" r="7" fill="#202124"/><path d="M16 12v4l3 2"/></svg>',
  ],
  ['Insert payment', '<span class="dollar">$</span>'],
];
for (const [index, [label, icon]] of icons.entries()) {
  const button = document.createElement('button');
  button.className = 'icon' + (index > 3 ? ' secondary' : '');
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = icon;
  button.onclick = () => {
    if (label === 'Insert emoji') {
      body.setRangeText('☺', body.selectionStart, body.selectionEnd, 'end');
      body.focus();
      render();
    } else toast(`${label} is outside this compose experiment.`);
  };
  $('tools').append(button);
}
$('send').onclick = () => toast('Demo only — your message has not been sent.');
$('discard').onclick = () => {
  body.value = '';
  dismissed = '';
  body.focus();
  render();
  toast('Draft cleared');
};
$('minimize').onclick = () => compose.classList.toggle('minimized');
$('expand').onclick = () => {
  compose.classList.toggle('expanded');
  render();
};
$('close').onclick = () => {
  compose.hidden = true;
  $('reopen').hidden = false;
};
$('reopen').onclick = () => {
  compose.hidden = false;
  $('reopen').hidden = true;
};
$('more').onclick = () => {
  $('options').hidden = !$('options').hidden;
};
$('smart').onchange = render;
$('reset').onclick = () => {
  reset();
  $('options').hidden = true;
};
reset();

if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: 'update_draft',
          description: 'Update the visible demo email draft without sending it.',
          inputSchema: {
            type: 'object',
            properties: {
              recipient: { type: 'string' },
              subject: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['recipient', 'subject', 'message'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute(input) {
            if (
              !input ||
              ['recipient', 'subject', 'message'].some(key => typeof input[key] !== 'string')
            ) {
              throw new Error('All draft fields must be strings.');
            }
            $('recipient').value = input.recipient;
            $('subject').value = input.subject;
            showSubject();
            body.value = input.message;
            body.setSelectionRange(body.value.length, body.value.length);
            dismissed = '';
            render();
            return { updated: true, suggestion };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
