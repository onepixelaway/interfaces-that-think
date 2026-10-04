import {
  collapseSecondaryInformation,
  emphasizeKeyInformation,
  fadeSecondaryInformation,
} from './text-emphasis.js?v=8e863dc0fe81';
import { collapseSections } from './section-summaries.js?v=05c584ae087b';
import { summarizeCollapsed } from './collapse-summaries.js?v=62231193fd37';
import { regroupLists } from './regroup-lists.js?v=191527662b07';
import { listCarousels } from './list-carousels.js?v=c9be61b226b9';

// Reading ideas that the Intelligence menu turns on and off, listed in menu order.
// Each idea is one entry:
//
//   {
//     id: 'section-summaries',          // stable; used to remember the choice
//     label: 'Summarize each section',  // shown in the menu
//     on: true,                          // whether it starts on (default off)
//     excludes: ['other-id'],            // ideas it can't run with; turning one on
//                                        // turns the other off
//     parent: 'parent-id',               // an idea it refines: it runs only while
//                                        // the parent is on, listed after it
//     start({ essay, notes }) {
//       // Set the idea up. Return a function that undoes it when it's turned off.
//     },
//   }
//
// start receives the essay's <article> element and its notes: what an idea
// needs to know about the essay, written once and stored, so nothing calls a
// model while you read. A pasted article brings its own notes. Ideas that were
// left on start when the page loads.
export const FEATURES = [
  emphasizeKeyInformation,
  fadeSecondaryInformation,
  collapseSecondaryInformation,
  summarizeCollapsed,
  collapseSections,
  regroupLists,
  listCarousels,
];

const STORAGE_KEY = 'reading-long-form.features';

// Starts and stops each idea as it's switched, and remembers the choice in this browser.
export class FeatureSwitches {
  constructor(features, context, { storage = null, onError = () => {} } = {}) {
    this.features = features;
    this.context = context;
    this.storage = storage;
    this.onError = onError;
    this.stops = new Map();
    this.saved = {};
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object') this.saved = saved;
    } catch {}
  }
  isOn(id) {
    return this.stops.has(id);
  }
  // Whether the idea is chosen, even if it can't run now because its parent is off.
  wants(id) {
    const feature = this.features.find(feature => feature.id === id);
    return Boolean(feature && (this.saved[id] ?? feature.on ?? false));
  }
  // Whether the idea can run: it has no parent, or its parent is on.
  available(id) {
    const parent = this.features.find(feature => feature.id === id)?.parent;
    return !parent || this.isOn(parent);
  }
  // Starts the ideas that were left on, or that start on by default.
  startAll() {
    for (const feature of this.features) {
      if (this.wants(feature.id) && this.available(feature.id)) {
        this.set(feature.id, true, false);
      }
    }
  }
  // Ideas that can't run together with this one, in either direction.
  conflicts(feature) {
    return this.features.filter(
      other =>
        other !== feature &&
        (feature.excludes?.includes(other.id) || other.excludes?.includes(feature.id)),
    );
  }
  children(feature) {
    return this.features.filter(child => child.parent === feature.id);
  }
  // Returns whether the idea is on afterwards. An idea that fails to start stays
  // off, and starting one turns off the ideas it can't run with. An idea whose
  // parent is off can't start. Turning a parent off stops its children, and
  // turning it on starts the ones that were chosen.
  set(id, on, remember = true) {
    const feature = this.features.find(feature => feature.id === id);
    if (!feature) return false;
    if (on && !this.available(id)) return false;
    if (on && !this.isOn(id)) {
      for (const other of this.conflicts(feature)) this.set(other.id, false, remember);
    }
    if (on !== this.isOn(id)) {
      if (on) {
        try {
          const stop = feature.start?.(this.context);
          this.stops.set(id, typeof stop === 'function' ? stop : () => {});
        } catch (error) {
          this.onError(feature, error);
          return false;
        }
      } else {
        for (const child of this.children(feature)) this.stop(child);
        this.stop(feature);
      }
    }
    if (remember) {
      this.saved[id] = on;
      try {
        this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.saved));
      } catch {}
    }
    if (on && this.isOn(id)) {
      for (const child of this.children(feature)) {
        if (this.wants(child.id)) this.set(child.id, true, false);
      }
    }
    return this.isOn(id);
  }
  // Stops an idea without changing whether it's chosen.
  stop(feature) {
    const stop = this.stops.get(feature.id);
    if (!stop) return;
    this.stops.delete(feature.id);
    try {
      stop();
    } catch (error) {
      this.onError(feature, error);
    }
  }
  // Stops every idea, the last started first, keeping which are chosen, so the
  // page can change underneath them and startAll can bring them back.
  stopAll() {
    for (const feature of [...this.features].reverse()) this.stop(feature);
  }
}
