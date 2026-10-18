import React from 'react';
import { Editor } from '../Editor/Editor';
import { KanbanView } from '../Kanban/KanbanView';
import { TableView } from '../Table/TableView';
import { ImageView } from '../Media/ImageView';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { vaultStore } from '../../stores/vaultStore';
import { tabStore } from '../../stores/tabStore';
import { toast } from '../../stores/toastStore';
import type { Tab } from '../../types';

export interface DocumentPaneProps {
  tab: Tab | undefined;
  groupId?: 1 | 2;
  activeTabId: string | null;
  activeGroup2TabId: string | null;
  targetLine: number | undefined;
  onSave: () => void;
  onSelectFile: (path: string, preview: boolean) => void;
}

const EmptyDocumentState: React.FC = () => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--knit-text-muted)',
      gap: 16,
      padding: 32,
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        backgroundColor: 'var(--knit-surface-hover)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <DuotoneIcon name="file-markdown" size={28} />
    </div>

    <div style={{ textAlign: 'center' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--knit-text)', marginBottom: 6 }}>
        Aucun document ouvert
      </h3>
      <p style={{ fontSize: 13, maxWidth: 360, lineHeight: 1.5 }}>
        Sélectionnez un fichier dans la barre latérale ou créez une nouvelle note avec{' '}
        <kbd
          style={{
            padding: '2px 6px',
            background: 'var(--knit-surface-hover)',
            border: '1px solid var(--knit-border)',
            borderRadius: 4,
            fontFamily: 'var(--knit-font-mono)',
          }}
        >
          Ctrl+N
        </kbd>
        .
      </p>
    </div>

    <div
      style={{
        display: 'flex',
        gap: 12,
        marginTop: 10,
        fontSize: 12,
        color: 'var(--knit-text-secondary)',
      }}
    >
      <div>
        <kbd>Ctrl+O</kbd> Sauter à...
      </div>
      <div>•</div>
      <div>
        <kbd>Ctrl+P</kbd> Commandes
      </div>
      <div>•</div>
      <div>
        <kbd>Ctrl+\</kbd> Scinder vue
      </div>
      <div>•</div>
      <div>
        <kbd>Ctrl+Shift+J</kbd> Note du jour
      </div>
    </div>
  </div>
);

/**
 * Routage Doc-Driven Views : image | source | kanban | table | note visuelle.
 */
export const DocumentPane: React.FC<DocumentPaneProps> = ({
  tab,
  groupId = 1,
  activeTabId,
  activeGroup2TabId,
  targetLine,
  onSave,
  onSelectFile,
}) => {
  if (!tab) {
    return <EmptyDocumentState />;
  }

  const initialLine =
    tab.id === (groupId === 2 ? activeGroup2TabId : activeTabId) ? targetLine : undefined;

  let paneNode: React.ReactNode;

  if (tab.docType === 'image') {
    paneNode = <ImageView key={`${tab.id}-image-g${groupId}`} path={tab.path} />;
  } else if (tab.viewMode === 'source') {
    paneNode = (
      <Editor
        key={`${tab.id}-source-g${groupId}`}
        path={tab.path}
        content={tab.content}
        isDirty={tab.isDirty}
        viewMode="source"
        initialLine={initialLine}
        onChange={(newContent) => {
          tabStore.updateContent(tab.id, newContent);
        }}
        onSave={onSave}
        onNavigateFile={(targetPath) => onSelectFile(targetPath, false)}
      />
    );
  } else if (tab.docType === 'kanban') {
    paneNode = (
      <KanbanView
        key={`${tab.id}-kanban-g${groupId}`}
        activeFilePath={tab.path}
        activeFileContent={tab.content}
        onUpdateContent={async (path, content) => {
          try {
            tabStore.updateContent(tab.id, content);
            await vaultStore.writeFile(path || tab.path, content);
          } catch (err: unknown) {
            console.error('Erreur sauvegarde Kanban:', err);
            toast.error('Erreur de sauvegarde', String(err));
          }
        }}
        onOpenFile={(path) => onSelectFile(path, false)}
        onSwitchToEditor={() => tabStore.toggleViewMode(tab.id, groupId)}
      />
    );
  } else if (tab.docType === 'table') {
    paneNode = (
      <TableView
        key={`${tab.id}-table-g${groupId}`}
        activeFilePath={tab.path}
        activeFileContent={tab.content}
        onUpdateContent={async (path, content) => {
          try {
            tabStore.updateContent(tab.id, content);
            await vaultStore.writeFile(path || tab.path, content);
          } catch (err: unknown) {
            console.error('Erreur sauvegarde Tableau:', err);
            toast.error('Erreur de sauvegarde', String(err));
          }
        }}
        onOpenFile={(path) => onSelectFile(path, false)}
        onSwitchToEditor={() => tabStore.toggleViewMode(tab.id, groupId)}
      />
    );
  } else {
    paneNode = (
      <Editor
        key={`${tab.id}-visual-g${groupId}`}
        path={tab.path}
        content={tab.content}
        isDirty={tab.isDirty}
        viewMode="visual"
        initialLine={initialLine}
        onChange={(newContent) => {
          tabStore.updateContent(tab.id, newContent);
        }}
        onSave={onSave}
        onNavigateFile={(targetPath) => onSelectFile(targetPath, false)}
      />
    );
  }

  return (
    <ErrorBoundary
      key={`${tab.id}-eb-g${groupId}`}
      fallbackTitle={`Erreur lors de l'affichage de ${tab.title}`}
    >
      {paneNode}
    </ErrorBoundary>
  );
};
