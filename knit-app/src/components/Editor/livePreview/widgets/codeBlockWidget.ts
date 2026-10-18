import { WidgetType, type EditorView } from '@codemirror/view';
import { copyTextWithToast } from '../../../../utils';
import { isLivePreviewVisualLocked } from '../visualLock';

function formatLanguageName(raw: string): string {
  const lower = raw.trim().toLowerCase();
  switch (lower) {
    case 'powershell':
    case 'pwsh':
      return 'PowerShell';
    case 'bash':
    case 'sh':
    case 'zsh':
      return 'Bash';
    case 'cmd':
    case 'bat':
      return 'Command';
    case 'javascript':
    case 'js':
      return 'JavaScript';
    case 'typescript':
    case 'ts':
      return 'TypeScript';
    case 'jsx':
      return 'React JSX';
    case 'tsx':
      return 'React TSX';
    case 'python':
    case 'py':
      return 'Python';
    case 'rust':
    case 'rs':
      return 'Rust';
    case 'go':
    case 'golang':
      return 'Go';
    case 'csharp':
    case 'cs':
      return 'C#';
    case 'cpp':
    case 'c++':
      return 'C++';
    case 'c':
      return 'C';
    case 'java':
      return 'Java';
    case 'kotlin':
    case 'kt':
      return 'Kotlin';
    case 'swift':
      return 'Swift';
    case 'php':
      return 'PHP';
    case 'ruby':
    case 'rb':
      return 'Ruby';
    case 'sql':
      return 'SQL';
    case 'html':
      return 'HTML';
    case 'css':
      return 'CSS';
    case 'scss':
      return 'SCSS';
    case 'json':
      return 'JSON';
    case 'yaml':
    case 'yml':
      return 'YAML';
    case 'toml':
      return 'TOML';
    case 'xml':
      return 'XML';
    case 'markdown':
    case 'md':
      return 'Markdown';
    case 'dockerfile':
    case 'docker':
      return 'Docker';
    case 'diff':
      return 'Diff';
    case '':
      return 'Code';
    default:
      return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
}

/**
 * 7. Carte de bloc de code unifiée (style Tableau / Mermaid)
 */
export class CodeBlockCardWidget extends WidgetType {
  private lang: string;
  private code: string;
  private from: number;
  private to: number;
  private ro?: ResizeObserver;

  constructor(lang: string, code: string, from: number, to: number) {
    super();
    this.lang = lang;
    this.code = code;
    this.from = from;
    this.to = to;
  }

  eq(other: CodeBlockCardWidget) {
    return (
      other.lang === this.lang &&
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  get estimatedHeight(): number {
    const lineCount = Math.max(1, this.code.split('\n').length);
    return 36 + lineCount * 22 + 16;
  }

  coordsAt(dom: HTMLElement): DOMRect | null {
    return dom.getBoundingClientRect();
  }

  destroy() {
    if (this.ro) {
      this.ro.disconnect();
      this.ro = undefined;
    }
  }

  ignoreEvent(_event: Event): boolean {
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const card = document.createElement('div');
    card.className = 'knit-rendered-code-card';
    card.title = 'Cliquer pour éditer le code en mode source';

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(card);

    // En-tête avec badge de langage et bouton copier
    const header = document.createElement('div');
    header.className = 'knit-code-block-header';

    const langContainer = document.createElement('div');
    langContainer.className = 'knit-code-lang-tag';

    const icon = document.createElement('span');
    icon.className = 'knit-code-lang-icon';
    icon.textContent = '>_';

    const langName = document.createElement('span');
    langName.className = 'knit-code-lang-name';
    langName.textContent = formatLanguageName(this.lang);

    langContainer.appendChild(icon);
    langContainer.appendChild(langName);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'knit-code-copy-btn';
    copyBtn.type = 'button';
    copyBtn.title = 'Copier le code dans le presse-papier';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Copier</span>
    `;

    copyBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await copyTextWithToast(this.code, 'Code copié');
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Copié !</span>
        `;
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copier</span>
          `;
        }, 2000);
      } catch {
        // fallback
      }
    };

    header.appendChild(langContainer);
    header.appendChild(copyBtn);
    card.appendChild(header);

    // Contenu du code pré-formaté
    const pre = document.createElement('pre');
    pre.className = 'knit-code-pre';
    const codeEl = document.createElement('code');
    codeEl.className = `knit-code-content language-${this.lang}`;
    codeEl.textContent = this.code;
    pre.appendChild(codeEl);
    card.appendChild(pre);

    // Déclencher le mode source au mousedown et au click (sauf lecture verrouillée)
    const activateSource = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.knit-code-copy-btn')) return;
      e.preventDefault();
      e.stopPropagation();
      if (isLivePreviewVisualLocked(view.state)) return;

      const rect = card.getBoundingClientRect();
      const relativeY = Math.max(0, e.clientY - rect.top - 24);
      const lineIdx = Math.floor(relativeY / 20);

      const doc = view.state.doc;
      const firstLine = doc.lineAt(this.from);
      const codeLinesCount = Math.max(1, this.code.split(/\r?\n/).length);
      const targetLineNum = Math.min(
        doc.lines,
        firstLine.number + 1 + Math.min(lineIdx, codeLinesCount - 1)
      );
      const targetLine = doc.line(targetLineNum);

      view.dispatch({
        selection: { anchor: targetLine.from },
        scrollIntoView: true,
      });
      view.focus();
    };

    card.onmousedown = activateSource;
    card.onclick = activateSource;

    return card;
  }
}
