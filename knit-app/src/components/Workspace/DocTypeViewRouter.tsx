import React, { useCallback } from 'react';
import { Editor } from '../Editor/Editor';
import { KanbanView } from '../Kanban/KanbanView';
import { TableView } from '../Table/TableView';
import { ImageView } from '../Media/ImageView';
import { CalendarView } from '../Calendar/CalendarView';
import { CanvasView } from '../Canvas/CanvasView';
import { SlidesView } from '../Slides/SlidesView';
import { GalleryView } from '../Gallery/GalleryView';
import type { DocTypeViewRouterProps } from '../../types';

const noopAsync = async (): Promise<void> => undefined;
const noopChange = (_content: string): void => undefined;

/**
 * Routage Doc-Driven partagé : onglets (`DocumentPane`) et Hover Preview.
 * En `preview`, aucune écriture disque et pas de bascule Source.
 */
export const DocTypeViewRouter: React.FC<DocTypeViewRouterProps> = ({
  path,
  content,
  docType,
  mode = 'page',
  readOnly: readOnlyProp = false,
  viewMode = 'visual',
  isDirty = false,
  initialLine,
  onChange,
  onSave,
  onUpdateContent,
  onOpenFile,
  onSwitchToEditor,
  onNavigateFile,
}) => {
  const isPreview = mode === 'preview';
  const isReadOnly = isPreview || readOnlyProp;
  const handleChange = onChange ?? noopChange;
  const handleSave = onSave ?? (() => undefined);
  const handleUpdate = isReadOnly ? noopAsync : (onUpdateContent ?? noopAsync);
  const switchEditor = isPreview || readOnlyProp ? undefined : onSwitchToEditor;

  const openFile = useCallback(
    (filePath: string, line?: number, opts?: { newTab?: boolean }) => {
      onOpenFile?.(filePath, line, opts);
    },
    [onOpenFile]
  );

  const wrapPreview = (node: React.ReactNode): React.ReactNode =>
    isPreview ? <div className="knit-hover-doctype-root">{node}</div> : node;

  if (viewMode === 'source' && !isPreview) {
    return (
      <Editor
        path={path}
        content={content}
        isDirty={isDirty}
        viewMode="source"
        initialLine={initialLine}
        onChange={handleChange}
        onSave={handleSave}
        onNavigateFile={onNavigateFile}
      />
    );
  }

  switch (docType) {
    case 'image':
      return wrapPreview(<ImageView path={path} />);
    case 'kanban':
      return wrapPreview(
        <KanbanView
          activeFilePath={path}
          activeFileContent={content}
          onUpdateContent={handleUpdate}
          onOpenFile={(p) => openFile(p)}
          onSwitchToEditor={switchEditor}
          readOnly={isReadOnly}
          compactChrome={isPreview}
        />
      );
    case 'table':
      return wrapPreview(
        <TableView
          activeFilePath={path}
          activeFileContent={content}
          onUpdateContent={handleUpdate}
          onOpenFile={(p) => openFile(p)}
          onSwitchToEditor={switchEditor}
          readOnly={isReadOnly}
          compactChrome={isPreview}
        />
      );
    case 'calendar':
      return wrapPreview(
        <CalendarView
          activeFilePath={path}
          variant={isPreview ? 'modal' : 'page'}
          onOpenFile={(p, line, opts) => openFile(p, line, opts)}
          onSwitchToEditor={switchEditor}
          readOnly={isReadOnly}
          compactChrome={isPreview}
        />
      );
    case 'canvas':
      return wrapPreview(
        <CanvasView
          path={path}
          content={content}
          onUpdateContent={handleUpdate}
          onOpenFile={(p) => openFile(p)}
          onSwitchToEditor={switchEditor}
          readOnly={isReadOnly}
          compactChrome={isPreview}
        />
      );
    case 'slides':
      return wrapPreview(
        <SlidesView
          content={content}
          onSwitchToEditor={switchEditor}
          readOnly={isReadOnly}
          compactChrome={isPreview}
        />
      );
    case 'gallery':
      return wrapPreview(
        <GalleryView
          path={path}
          content={content}
          onOpenFile={(p) => openFile(p)}
          onSwitchToEditor={switchEditor}
          readOnly={isReadOnly}
          compactChrome={isPreview}
        />
      );
    case 'note':
      return wrapPreview(
        <Editor
          path={path}
          content={content}
          isDirty={isDirty}
          viewMode="visual"
          variant={isPreview ? 'preview' : 'page'}
          readOnly={isReadOnly}
          initialLine={initialLine}
          onChange={handleChange}
          onSave={handleSave}
          onNavigateFile={onNavigateFile ?? ((p) => openFile(p))}
        />
      );
    default: {
      const _exhaustive: never = docType;
      return _exhaustive;
    }
  }
};
