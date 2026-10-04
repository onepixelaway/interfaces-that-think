// Add summary in collapsed area: inside a collapsed run's … pill, a short
// first-person sentence that says what the hidden text says and bridges the
// visible text on either side of it. It refines Collapse secondary information,
// so it runs only while that's on. The bridges were written once for an essay
// and are stored in its notes, keyed by the fingerprint of the text each run
// hides, which the run's … carries (data-key); runs that read fine without one
// keep a plain … pill.

// Puts a bridge inside a pill, to the left of the …, as text only.
function showBridge(marker, bridge) {
  marker.querySelector('.emph-summary')?.remove();
  const text = document.createElement('span');
  text.className = 'emph-summary';
  text.textContent = bridge;
  marker.prepend(text);
  marker.setAttribute('aria-label', `${bridge} Show the full text`);
}

function clearBridge(marker) {
  marker.querySelector('.emph-summary')?.remove();
  marker.setAttribute('aria-label', 'Show hidden text');
}

export const summarizeCollapsed = {
  id: 'summarize-collapsed',
  label: 'Add summary in collapsed area',
  parent: 'collapse-secondary-information',
  on: true,
  start({ essay, notes }) {
    const apply = () => {
      for (const marker of essay.querySelectorAll('.emph-more')) {
        const bridge = notes.bridges[marker.dataset.key];
        if (bridge) showBridge(marker, bridge);
      }
    };
    // The key sentences may be marked again, for example after another idea
    // restarts them.
    essay.addEventListener('keysentences:marked', apply);
    apply();
    return () => {
      essay.removeEventListener('keysentences:marked', apply);
      for (const marker of essay.querySelectorAll('.emph-more')) clearBridge(marker);
    };
  },
};
