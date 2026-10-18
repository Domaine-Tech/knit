/**
 * Vue Galerie multimédia (B-031d).
 */

export type GallerySource = 'links' | 'assets' | 'index' | 'mixed' | 'empty';

export interface GalleryCard {
  path: string;
  title: string;
  banner?: string;
  tags: string[];
  status?: string;
}
