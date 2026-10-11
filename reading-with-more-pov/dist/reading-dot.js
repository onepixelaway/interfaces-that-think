// The reading dot: in the live styles, a dot in the left margin marks the line
// in focus (see focus.js), which is what the readers talk about. It rides along
// with that line as you scroll, then glides down to the next. On the reading
// couch, when a reader starts talking about the line, it becomes their face for
// a moment, and a dot again as soon as the line moves off the words they're
// talking about.
import { portrait } from './critters.js?v=b65e4435c03d';

// The longest the dot stays a face.
const FACE_TIME = 2200;

export function createReadingDot({ dot, article, focus }) {
  let on = false;
  let faceTimer;
  // The words the face's reader is talking about.
  let faceSpans = null;

  function unface() {
    clearTimeout(faceTimer);
    faceSpans = null;
    dot.classList.remove('face');
  }

  function place() {
    if (!on) return;
    const line = focus.line();
    dot.hidden = !line;
    if (!line) return;
    if (faceSpans && !focus.near(faceSpans, line)) unface();
    const column = article.getBoundingClientRect();
    // Just left of the text, or where the margin is narrow (a phone), in the
    // middle of it.
    const x = column.left < 60 ? column.left / 2 : column.left - 22;
    dot.style.transform = `translate(${x}px, ${line.top + line.height / 2}px)`;
  }

  addEventListener('scroll', place, { passive: true });
  addEventListener('resize', place);

  return {
    // The dot becomes this reader's face, looking at the text, then a dot again.
    face(reader, spans) {
      if (!on) return;
      clearTimeout(faceTimer);
      faceSpans = spans;
      dot.innerHTML = portrait(reader);
      dot.classList.add('face');
      faceTimer = setTimeout(unface, FACE_TIME);
    },
    set(show) {
      on = show;
      dot.hidden = !show;
      unface();
      if (!show) return;
      // Arriving, it appears in place rather than gliding in from the corner.
      dot.classList.add('placing');
      place();
      requestAnimationFrame(() => dot.classList.remove('placing'));
    },
  };
}
