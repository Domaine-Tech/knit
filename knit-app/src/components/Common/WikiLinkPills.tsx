import React from 'react';
import { resolveWikiLink } from '../../utils';
import { useDelayedHoverPreview } from '../../hooks';

interface WikiLinkPillsProps {
  links: string[];
  onOpenFile: (path: string) => void;
  /** Conserve le gabarit historique de chaque vue. */
  variant?: 'kanban' | 'table';
}

interface TagPillsProps {
  tags: string[];
  variant?: 'kanban' | 'table';
}

export const WikiLinkPills: React.FC<WikiLinkPillsProps> = ({
  links,
  onOpenFile,
  variant = 'kanban',
}) => {
  const hoverPreview = useDelayedHoverPreview(0);

  if (links.length === 0) return null;

  const isKanban = variant === 'kanban';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: isKanban ? 'wrap' : undefined,
        gap: 4,
        marginTop: isKanban ? 5 : undefined,
      }}
    >
      {links.map((link) => {
        const { displayName, filePath } = resolveWikiLink(link);
        return (
          <button
            key={link}
            type="button"
            data-tooltip={`Ouvrir [[${displayName}]]`}
            onMouseEnter={(e) => hoverPreview.schedule(filePath, e.clientX, e.clientY)}
            onMouseMove={(e) => hoverPreview.schedule(filePath, e.clientX, e.clientY)}
            onMouseLeave={() => hoverPreview.cancel()}
            onClick={(e) => {
              if (isKanban) e.stopPropagation();
              hoverPreview.cancel(true);
              onOpenFile(filePath);
            }}
            style={{
              display: isKanban ? 'inline-flex' : undefined,
              alignItems: isKanban ? 'center' : undefined,
              gap: isKanban ? 3 : undefined,
              padding: isKanban ? '1px 6px' : '1px 5px',
              borderRadius: isKanban ? 4 : 3,
              backgroundColor: 'var(--knit-primary-alpha)',
              border: '1px solid var(--knit-primary)',
              color: 'var(--knit-primary)',
              fontSize: isKanban ? 11 : 10,
              cursor: 'pointer',
            }}
          >
            {isKanban ? <span>[[{displayName}]]</span> : `[[${displayName}]]`}
          </button>
        );
      })}
    </div>
  );
};

export const TagPills: React.FC<TagPillsProps> = ({ tags, variant = 'kanban' }) => {
  if (tags.length === 0) return null;

  const isKanban = variant === 'kanban';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: isKanban ? 5 : undefined,
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            fontSize: 10,
            padding: isKanban ? '1px 5px' : '1px 6px',
            borderRadius: 3,
            backgroundColor: 'var(--knit-surface-hover)',
            color: 'var(--knit-text-secondary)',
            border: '1px solid var(--knit-border)',
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
};
