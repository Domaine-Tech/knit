import React, { useMemo, useState } from 'react';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { copyTextWithToast } from '../../utils/clipboardUtils';
import { buildPathCopyMenuItem } from '../../utils';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';

interface ImageViewProps {
  path: string;
}

/**
 * Vue onglet dédiée aux médias du coffre (svg/png/…).
 * Affiche l'image via resolveAssetUrl — aucun binaire lu comme Markdown.
 */
export const ImageView: React.FC<ImageViewProps> = ({ path }) => {
  const [failed, setFailed] = useState(false);
  const fileName = path.replace(/\\/g, '/').split('/').pop() || path;
  const altBase = fileName.replace(/\.[^.]+$/, '') || fileName;
  const src = useMemo(() => resolveAssetUrl(path), [path]);
  const markdownLink = `![${altBase}](${path.replace(/\\/g, '/')})`;

  const handleCopyMarkdown = () => {
    void copyTextWithToast(markdownLink, 'Lien Markdown copié', markdownLink);
  };

  const handleReveal = () => {
    void vaultStore.revealInExplorer(path);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const absPath = vaultStore.getAbsolutePath(path);
    contextMenu.show(e, [
      buildPathCopyMenuItem({
        relPath: path,
        absPath,
        name: fileName,
        nameChildLabel: 'Nom du fichier',
        markdownAlias: altBase,
        markdownAsImage: true,
      }),
      { id: 'div-img-1', divider: true },
      {
        id: 'reveal',
        label: 'Révéler dans l\'explorateur',
        icon: 'external-link',
        onClick: handleReveal,
      },
    ]);
  };

  return (
    <div className="knit-image-view" onContextMenu={handleContextMenu}>
      <div className="knit-image-view-toolbar">
        <div className="knit-image-view-meta">
          <DuotoneIcon name="image" size={14} style={{ color: 'var(--knit-primary)' }} />
          <div className="knit-image-view-titles">
            <span className="knit-image-view-name">{fileName}</span>
            <span className="knit-image-view-path">{path.replace(/\\/g, '/')}</span>
          </div>
        </div>
        <div className="knit-image-view-actions">
          <button
            type="button"
            className="knit-btn"
            data-tooltip="Copier ![légende](chemin)"
            onClick={handleCopyMarkdown}
          >
            <DuotoneIcon name="link" size={12} />
            <span>Lien MD</span>
          </button>
          <button
            type="button"
            className="knit-btn"
            data-tooltip="Copier le chemin relatif"
            onClick={() => void copyRelativePath(path)}
          >
            <DuotoneIcon name="clipboard" size={12} />
            <span>Chemin</span>
          </button>
          <button
            type="button"
            className="knit-btn"
            data-tooltip="Révéler dans l'explorateur"
            onClick={handleReveal}
          >
            <DuotoneIcon name="external-link" size={12} />
            <span>Explorer</span>
          </button>
        </div>
      </div>

      <div className="knit-image-view-stage">
        {failed ? (
          <div className="knit-image-view-fallback">
            <DuotoneIcon name="image" size={28} style={{ color: 'var(--knit-text-muted)' }} />
            <span className="knit-image-view-fallback-title">Image introuvable</span>
            <span className="knit-image-view-fallback-url">{path.replace(/\\/g, '/')}</span>
          </div>
        ) : (
          <img
            className="knit-image-view-img"
            src={src}
            alt={altBase}
            onError={() => setFailed(true)}
            onLoad={() => setFailed(false)}
          />
        )}
      </div>
    </div>
  );
};
