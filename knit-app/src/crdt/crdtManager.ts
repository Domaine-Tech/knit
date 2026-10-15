import * as Y from 'yjs';
import diff from 'fast-diff';

export class CRDTManager {
  private docs: Map<string, Y.Doc> = new Map();
  private fileObservers: Map<string, Set<(content: string) => void>> = new Map();

  public getDoc(path: string): Y.Doc {
    let doc = this.docs.get(path);
    if (!doc) {
      doc = new Y.Doc();
      this.docs.set(path, doc);
    }
    return doc;
  }

  public getYText(path: string): Y.Text {
    const doc = this.getDoc(path);
    return doc.getText('codemirror');
  }

  public initDocument(path: string, initialContent: string): Y.Text {
    const doc = this.getDoc(path);
    const ytext = doc.getText('codemirror');
    if (ytext.length === 0 && initialContent.length > 0) {
      doc.transact(() => {
        ytext.insert(0, initialContent);
      }, 'init');
    }
    return ytext;
  }

  public getContent(path: string): string {
    const doc = this.docs.get(path);
    if (!doc) return '';
    return doc.getText('codemirror').toString();
  }

  /**
   * Applique une modification externe (provenant du File Watcher / Agent IA)
   * sous forme de diff granulaire dans la transaction Yjs pour préserver le curseur de l'utilisateur.
   */
  public applyExternalContent(path: string, newContent: string): boolean {
    const doc = this.docs.get(path);
    if (!doc) return false;

    const ytext = doc.getText('codemirror');
    const currentText = ytext.toString();

    if (currentText === newContent) {
      return false; // Contenu identique, aucun diff nécessaire
    }

    const diffs = diff(currentText, newContent);

    doc.transact(() => {
      let index = 0;
      for (const [op, text] of diffs) {
        if (op === diff.EQUAL) {
          index += text.length;
        } else if (op === diff.DELETE) {
          ytext.delete(index, text.length);
        } else if (op === diff.INSERT) {
          ytext.insert(index, text);
          index += text.length;
        }
      }
    }, 'external-fs');

    return true;
  }

  public subscribe(path: string, listener: (content: string) => void): () => void {
    if (!this.fileObservers.has(path)) {
      this.fileObservers.set(path, new Set());
    }
    const set = this.fileObservers.get(path)!;
    set.add(listener);

    const doc = this.getDoc(path);
    const ytext = doc.getText('codemirror');
    const observer = () => {
      listener(ytext.toString());
    };
    ytext.observe(observer);

    return () => {
      set.delete(listener);
      ytext.unobserve(observer);
    };
  }

  public removeDoc(path: string) {
    const doc = this.docs.get(path);
    if (doc) {
      doc.destroy();
      this.docs.delete(path);
    }
    this.fileObservers.delete(path);
  }
}

export const crdtManager = new CRDTManager();
