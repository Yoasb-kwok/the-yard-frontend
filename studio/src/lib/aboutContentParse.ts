export type AboutSection = { title: string; body: string };

export type ParsedAboutBody = {
  intro: string;
  sections: AboutSection[];
  introIsHtml: boolean;
  sectionBodiesAreHtml: boolean;
};

function looksLikeHtmlBlock(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith('<')) return true;
  return /<h2\b/i.test(t);
}

function parseAboutMarkdown(content: string): { intro: string; sections: AboutSection[] } {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n');
  const headingRegex = /^##\s+(.+)$/;
  const hasHeadings = lines.some((line) => headingRegex.test(line.trim()));

  if (!hasHeadings) {
    return { intro: normalized, sections: [] };
  }

  const introLines: string[] = [];
  const sections: AboutSection[] = [];
  let currentSection: AboutSection | null = null;
  let firstHeadingSeen = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = line.trim().match(headingRegex);

    if (headingMatch) {
      if (currentSection) {
        currentSection.body = currentSection.body.trim();
        sections.push(currentSection);
      }
      currentSection = { title: headingMatch[1].trim(), body: '' };
      firstHeadingSeen = true;
      continue;
    }

    if (!firstHeadingSeen) {
      introLines.push(line);
      continue;
    }

    if (currentSection) {
      currentSection.body = currentSection.body
        ? `${currentSection.body}\n${line}`
        : line;
    }
  }

  if (currentSection) {
    currentSection.body = currentSection.body.trim();
    sections.push(currentSection);
  }

  return { intro: introLines.join('\n').trim(), sections };
}

function parseAboutHtmlByH2(html: string): { intro: string; sections: AboutSection[] } {
  if (typeof DOMParser === 'undefined') {
    return { intro: html.trim(), sections: [] };
  }

  const wrapped = `<div id="about-parse-root">${html}</div>`;
  const doc = new DOMParser().parseFromString(wrapped, 'text/html');
  const root = doc.getElementById('about-parse-root');
  if (!root) {
    return { intro: html.trim(), sections: [] };
  }

  const childList = Array.from(root.childNodes);
  const hasH2 = childList.some(
    (n) => n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName.toLowerCase() === 'h2'
  );

  if (!hasH2) {
    return { intro: root.innerHTML.trim(), sections: [] };
  }

  const sections: AboutSection[] = [];
  const introFrag = doc.createElement('div');
  let i = 0;

  while (i < childList.length) {
    const node = childList[i];
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'h2') {
      break;
    }
    introFrag.appendChild(node.cloneNode(true));
    i++;
  }

  while (i < childList.length) {
    const node = childList[i];
    if (node.nodeType !== Node.ELEMENT_NODE || (node as Element).tagName.toLowerCase() !== 'h2') {
      i++;
      continue;
    }
    const title = (node as Element).textContent?.trim() || '';
    i++;
    const bodyFrag = doc.createElement('div');
    while (i < childList.length) {
      const n = childList[i];
      if (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName.toLowerCase() === 'h2') {
        break;
      }
      bodyFrag.appendChild(n.cloneNode(true));
      i++;
    }
    sections.push({ title, body: bodyFrag.innerHTML.trim() });
  }

  return { intro: introFrag.innerHTML.trim(), sections };
}

/** Prefer visual editor unless content looks like legacy Markdown-only. */
export function deriveSiteContentEditorMode(content: string): 'visual' | 'code' {
  const t = (content || '').trim();
  if (!t) return 'visual';
  if (t.startsWith('<') || /<h2\b/i.test(t)) return 'visual';
  if (/^##\s/m.test(t)) return 'code';
  return 'visual';
}

/** Parse About body: HTML (WordPress-style, split on &lt;h2&gt;) or legacy Markdown (## headings). */
export function parseAboutBody(raw: string): ParsedAboutBody {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { intro: '', sections: [], introIsHtml: false, sectionBodiesAreHtml: false };
  }

  if (looksLikeHtmlBlock(normalized)) {
    const { intro, sections } = parseAboutHtmlByH2(normalized);
    const hasHtmlSections = sections.length > 0;
    return {
      intro,
      sections,
      introIsHtml: true,
      sectionBodiesAreHtml: hasHtmlSections,
    };
  }

  const md = parseAboutMarkdown(normalized);
  return {
    intro: md.intro,
    sections: md.sections,
    introIsHtml: false,
    sectionBodiesAreHtml: false,
  };
}
