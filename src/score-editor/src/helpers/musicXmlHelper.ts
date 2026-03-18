import type {
  MusicXmlAttributes,
  MusicXmlDocument,
  MusicXmlMeasure,
  MusicXmlMeasureElement,
  MusicXmlNote,
  MusicXmlPart,
} from '../models/musicXmlDocument';

function firstChildElement(parent: Element, name: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children.item(i);
    if (!c) continue;
    if ((c.localName || c.nodeName) === name) return c;
  }
  return null;
}

function childText(parent: Element, name: string): string | null {
  const el = firstChildElement(parent, name);
  const v = el?.textContent ?? null;
  return v && v.trim().length > 0 ? v.trim() : null;
}

function childNumber(parent: Element, name: string): number | null {
  const t = childText(parent, name);
  if (t == null) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function serializeElement(el: Element): string {
  return new XMLSerializer().serializeToString(el);
}

function parseNote(noteEl: Element): MusicXmlNote {
  const staff = childNumber(noteEl, 'staff') ?? 1;
  const voice = childText(noteEl, 'voice') ?? undefined;
  const chord = firstChildElement(noteEl, 'chord') != null;
  const duration = childNumber(noteEl, 'duration') ?? 0;
  const type = childText(noteEl, 'type') ?? undefined;
  const dots = Math.min(2, noteEl.getElementsByTagName('dot').length) as 0 | 1 | 2;
  const accidental = childText(noteEl, 'accidental') ?? undefined;

  const pitchEl = firstChildElement(noteEl, 'pitch');
  const pitch =
    pitchEl
      ? {
          step: childText(pitchEl, 'step') ?? '',
          octave: childNumber(pitchEl, 'octave') ?? 0,
          alter: childNumber(pitchEl, 'alter') ?? undefined,
        }
      : undefined;

  const ties: Array<'start' | 'stop'> = [];
  const tieEls = noteEl.getElementsByTagName('tie');
  for (let i = 0; i < tieEls.length; i++) {
    const t = tieEls.item(i);
    const typeAttr = t?.getAttribute('type') ?? null;
    if (typeAttr === 'start' || typeAttr === 'stop') ties.push(typeAttr);
  }

  return {
    kind: 'note',
    rawXml: serializeElement(noteEl),
    staff: Number.isFinite(staff) && staff > 0 ? staff : 1,
    voice,
    chord,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    type,
    dots,
    pitch: pitch?.step ? pitch : undefined,
    accidental,
    ties,
  };
}

function parseAttributes(attrsEl: Element): MusicXmlAttributes {
  const divisions = childNumber(attrsEl, 'divisions') ?? undefined;
  const keyEl = firstChildElement(attrsEl, 'key');
  const keyFifths = keyEl ? (childNumber(keyEl, 'fifths') ?? undefined) : undefined;
  return { kind: 'attributes', divisions, keyFifths, rawXml: serializeElement(attrsEl) };
}

function parseMeasure(measureEl: Element, measureIndex: number): MusicXmlMeasure {
  const number = measureEl.getAttribute('number') ?? undefined;
  const elements: MusicXmlMeasureElement[] = [];

  for (let i = 0; i < measureEl.children.length; i++) {
    const el = measureEl.children.item(i);
    if (!el) continue;
    const name = el.localName || el.nodeName;
    if (name === 'note') {
      elements.push(parseNote(el));
    } else if (name === 'backup') {
      elements.push({ kind: 'backup', duration: childNumber(el, 'duration') ?? 0 });
    } else if (name === 'forward') {
      elements.push({ kind: 'forward', duration: childNumber(el, 'duration') ?? 0 });
    } else if (name === 'attributes') {
      elements.push(parseAttributes(el));
    } else {
      elements.push({ kind: 'raw', rawXml: serializeElement(el) });
    }
  }

  return { measureIndex, number, elements };
}

function parsePart(partEl: Element): MusicXmlPart {
  const id = partEl.getAttribute('id') ?? undefined;
  const measures: MusicXmlMeasure[] = [];
  const measureEls = partEl.getElementsByTagName('measure');
  for (let i = 0; i < measureEls.length; i++) {
    const m = measureEls.item(i);
    if (!m) continue;
    measures.push(parseMeasure(m, i));
  }
  return { id, measures };
}

export function musicXmlFromString(xml: string): MusicXmlDocument {
  const parser = new DOMParser();
  const dom = parser.parseFromString(xml, 'application/xml');
  const root = dom.documentElement;
  const version = root.getAttribute('version') ?? undefined;
  const headerRawElements: string[] = [];
  for (let i = 0; i < root.children.length; i++) {
    const el = root.children.item(i);
    if (!el) continue;
    const name = el.localName || el.nodeName;
    if (name === 'part') continue;
    headerRawElements.push(serializeElement(el));
  }
  const partEls = root.getElementsByTagName('part');
  const parts: MusicXmlPart[] = [];
  for (let i = 0; i < partEls.length; i++) {
    const p = partEls.item(i);
    if (!p) continue;
    parts.push(parsePart(p));
  }
  return { sourceXml: xml, headerRawElements, version, parts };
}

function appendRawXml(doc: Document, parent: Element, rawXml: string) {
  const ns = doc.documentElement?.namespaceURI ?? 'http://www.musicxml.org/ns/musicxml';
  const parser = new DOMParser();
  const wrapped = parser.parseFromString(`<wrap xmlns="${ns}">${rawXml}</wrap>`, 'application/xml');
  const wrapEl = wrapped.documentElement;
  for (let i = 0; i < wrapEl.childNodes.length; i++) {
    const n = wrapEl.childNodes.item(i);
    if (n?.nodeType === Node.ELEMENT_NODE) {
      parent.appendChild(doc.importNode(n, true));
    }
  }
}

function getOrCreateChild(doc: Document, parent: Element, name: string): Element {
  const ns = doc.documentElement?.namespaceURI ?? null;
  const list = ns ? parent.getElementsByTagNameNS(ns, name) : parent.getElementsByTagName(name);
  const direct = (() => {
    for (let i = 0; i < parent.children.length; i++) {
      const c = parent.children.item(i);
      if (!c) continue;
      const cn = c.localName || c.nodeName;
      if (cn === name) return c;
    }
    return null;
  })();
  if (direct) return direct;
  const created = ns ? doc.createElementNS(ns, name) : doc.createElement(name);
  parent.appendChild(created);
  void list;
  return created;
}

function removeDirectChildren(parent: Element, name: string) {
  const toRemove: Element[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children.item(i);
    if (!c) continue;
    const cn = c.localName || c.nodeName;
    if (cn === name) toRemove.push(c);
  }
  for (const c of toRemove) parent.removeChild(c);
}

function buildNote(doc: Document, n: MusicXmlNote): Element {
  const ns = doc.documentElement?.namespaceURI ?? null;
  const createEl = (name: string) => (ns ? doc.createElementNS(ns, name) : doc.createElement(name));

  // Start from the original `<note>` to preserve beams/stems/flags/etc.
  let noteEl: Element | null = null;
  if (n.rawXml) {
    const wrapped = new DOMParser().parseFromString(`<wrap xmlns="${ns ?? ''}">${n.rawXml}</wrap>`, 'application/xml');
    const first = wrapped.documentElement.firstElementChild;
    if (first) noteEl = doc.importNode(first, true) as Element;
  }
  noteEl = noteEl ?? createEl('note');

  // chord marker
  if (n.chord) {
    if (!firstChildElement(noteEl, 'chord')) noteEl.insertBefore(createEl('chord'), noteEl.firstChild);
  } else {
    const chordEl = firstChildElement(noteEl, 'chord');
    if (chordEl) noteEl.removeChild(chordEl);
  }

  // pitch/rest
  if (n.pitch) {
    const restEl = firstChildElement(noteEl, 'rest');
    if (restEl) noteEl.removeChild(restEl);
    const pitchEl = getOrCreateChild(doc, noteEl, 'pitch');
    getOrCreateChild(doc, pitchEl, 'step').textContent = n.pitch.step;
    getOrCreateChild(doc, pitchEl, 'octave').textContent = String(n.pitch.octave);
    if (typeof n.pitch.alter === 'number') {
      getOrCreateChild(doc, pitchEl, 'alter').textContent = String(n.pitch.alter);
    } else {
      removeDirectChildren(pitchEl, 'alter');
    }
  } else {
    const pitchEl = firstChildElement(noteEl, 'pitch');
    if (pitchEl) noteEl.removeChild(pitchEl);
    if (!firstChildElement(noteEl, 'rest')) noteEl.insertBefore(createEl('rest'), noteEl.firstChild);
  }

  // core edited fields
  getOrCreateChild(doc, noteEl, 'duration').textContent = String(Math.max(1, Math.round(n.duration)));
  getOrCreateChild(doc, noteEl, 'staff').textContent = String(n.staff);
  if (n.voice) getOrCreateChild(doc, noteEl, 'voice').textContent = n.voice;
  if (n.type) getOrCreateChild(doc, noteEl, 'type').textContent = n.type;

  removeDirectChildren(noteEl, 'dot');
  for (let i = 0; i < (n.dots ?? 0); i++) noteEl.appendChild(createEl('dot'));

  if (n.accidental) getOrCreateChild(doc, noteEl, 'accidental').textContent = n.accidental;
  else removeDirectChildren(noteEl, 'accidental');

  // ties: replace only tie markers and tied notations, preserve other notations
  removeDirectChildren(noteEl, 'tie');
  for (const t of n.ties) {
    const tieEl = createEl('tie');
    tieEl.setAttribute('type', t);
    noteEl.insertBefore(tieEl, noteEl.firstChild);
  }

  if (n.ties.length) {
    const notations = getOrCreateChild(doc, noteEl, 'notations');
    // remove existing tied elements only
    const tiedToRemove: Element[] = [];
    for (let i = 0; i < notations.children.length; i++) {
      const c = notations.children.item(i);
      if (!c) continue;
      const cn = c.localName || c.nodeName;
      if (cn === 'tied') tiedToRemove.push(c);
    }
    for (const c of tiedToRemove) notations.removeChild(c);
    for (const t of n.ties) {
      const tied = createEl('tied');
      tied.setAttribute('type', t);
      notations.appendChild(tied);
    }
  }

  return noteEl;
}

export function musicXmlToString(model: MusicXmlDocument): string {
  const parser = new DOMParser();
  const dom = parser.parseFromString(model.sourceXml, 'application/xml');
  const root = dom.documentElement;
  const ns = root.namespaceURI;

  const partEls = ns ? root.getElementsByTagNameNS(ns, 'part') : root.getElementsByTagName('part');

  const findPartEl = (partId: string | undefined, index: number): Element | null => {
    if (partId) {
      for (let i = 0; i < partEls.length; i++) {
        const p = partEls.item(i);
        if (!p) continue;
        if (p.getAttribute('id') === partId) return p;
      }
    }
    return partEls.item(index);
  };

  const createEl = (name: string) => (ns ? dom.createElementNS(ns, name) : dom.createElement(name));

  for (let pi = 0; pi < model.parts.length; pi++) {
    const partModel = model.parts[pi]!;
    const partEl = findPartEl(partModel.id, pi);
    if (!partEl) continue;

    const measureEls = ns ? partEl.getElementsByTagNameNS(ns, 'measure') : partEl.getElementsByTagName('measure');
    for (let mi = 0; mi < partModel.measures.length; mi++) {
      const measureModel = partModel.measures[mi]!;
      const measureEl = measureEls.item(mi);
      if (!measureEl) continue;

      while (measureEl.firstChild) measureEl.removeChild(measureEl.firstChild);

      for (const e of measureModel.elements) {
        if (e.kind === 'note') {
          const built = buildNote(dom, e);
          if (ns) {
            const imported = dom.importNode(built, true) as Element;
            measureEl.appendChild(imported);
          } else {
            measureEl.appendChild(built);
          }
        } else if (e.kind === 'backup') {
          const b = createEl('backup');
          const d = createEl('duration');
          d.textContent = String(Math.max(0, Math.round(e.duration)));
          b.appendChild(d);
          measureEl.appendChild(b);
        } else if (e.kind === 'forward') {
          const f = createEl('forward');
          const d = createEl('duration');
          d.textContent = String(Math.max(0, Math.round(e.duration)));
          f.appendChild(d);
          measureEl.appendChild(f);
        } else if (e.kind === 'attributes') {
          appendRawXml(dom, measureEl, e.rawXml);
        } else {
          appendRawXml(dom, measureEl, e.rawXml);
        }
      }
    }
  }

  return new XMLSerializer().serializeToString(dom);
}

export function getIndexedPart(doc: MusicXmlDocument, partId?: string): MusicXmlPart | null {
  if (partId) {
    const exact = doc.parts.find((p) => p.id === partId);
    if (exact) return exact;
  }
  return doc.parts[0] ?? null;
}

export function rebuildMusicXmlIndexes(doc: MusicXmlDocument): MusicXmlDocument {
  return doc;
}

