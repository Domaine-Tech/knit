import React from 'react';
import { useHoverPreview } from '../../hooks';
import { HoverPreviewPortal } from './HoverPreviewPortal';

/**
 * Hôte global Hover Preview (B-053) — monté une fois au layout racine.
 * Permet l'aperçu hors Editor (Agenda, Canvas, recherche, etc.).
 */
export const HoverPreviewHost: React.FC = () => {
  const {
    hoverPreview,
    nestedHoverPreview,
    isPreviewPinned,
    setPreviewHovered,
    pinPreview,
    showNestedHoverPreview,
    hideNestedHoverPreview,
    hideHoverPreview,
    handleNavigate,
  } = useHoverPreview();

  return (
    <HoverPreviewPortal
      hoverPreview={hoverPreview}
      nestedHoverPreview={nestedHoverPreview}
      isPreviewPinned={isPreviewPinned}
      setPreviewHovered={setPreviewHovered}
      onPinPreview={pinPreview}
      showNestedHoverPreview={showNestedHoverPreview}
      hideNestedHoverPreview={hideNestedHoverPreview}
      hideHoverPreview={hideHoverPreview}
      onNavigate={handleNavigate}
    />
  );
};
