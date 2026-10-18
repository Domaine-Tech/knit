import React, { useState } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import { useCalendarIndex } from '../../hooks/useCalendarIndex';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';
import {
  buildDailyJournalTemplate,
  journalPathForDate,
} from '../../utils';
import { QuickAddEventModal } from './QuickAddEventModal';
import { MiniMonthGrid } from './MiniMonthGrid';

/**
 * Mini-widget calendrier mensuel pour la barre latérale (B-031a).
 * Clic date / titre → modale Agenda global (pas un onglet virtuel).
 */
export const MiniCalendarWidget: React.FC<{
  onSelectFile: (path: string, preview: boolean) => void;
  onOpenGlobalAgenda?: (iso?: string) => void;
}> = ({ onSelectFile, onOpenGlobalAgenda }) => {
  const [cursor, setCursor] = useState(() => new Date());
  const { events, reload } = useCalendarIndex();
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  const openGlobalAgenda = (iso?: string) => {
    onOpenGlobalAgenda?.(iso);
  };

  const openJournalNote = async (iso: string) => {
    const journalPath = journalPathForDate(iso);
    try {
      await vaultStore.readFile(journalPath);
      onSelectFile(journalPath, false);
    } catch {
      try {
        await vaultStore.createFile(journalPath, buildDailyJournalTemplate(iso));
        toast.info('Note quotidienne créée', journalPath);
        onSelectFile(journalPath, false);
      } catch (err) {
        toast.error('Erreur lors de la création de la note', String(err));
      }
    }
  };

  const handleDayContextMenu = (e: React.MouseEvent, iso: string) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      {
        id: 'open-agenda-day',
        label: 'Ouvrir l\'Agenda global sur ce jour',
        icon: 'calendar',
        onClick: () => openGlobalAgenda(iso),
      },
      {
        id: 'open-journal',
        label: `Ouvrir la note de journal (${journalPathForDate(iso)})`,
        icon: 'file-markdown',
        onClick: () => void openJournalNote(iso),
      },
      {
        id: 'quick-add-event',
        label: 'Ajouter une tâche / événement à cette date...',
        icon: 'plus',
        onClick: () => setQuickAddDate(iso),
      },
    ]);
  };

  return (
    <div
      style={{
        borderTop: '1px solid var(--knit-border)',
        padding: '8px 10px',
        background: 'var(--knit-bg)',
      }}
    >
      <MiniMonthGrid
        cursor={cursor}
        events={events}
        onCursorChange={setCursor}
        onDayClick={(iso) => openGlobalAgenda(iso)}
        onDayContextMenu={handleDayContextMenu}
        onTitleClick={() => openGlobalAgenda()}
        titleMode="short"
        dayTooltip={(iso, count) =>
          count > 0 ? `${iso} (${count} tâche(s)/événement(s))` : `Agenda du ${iso}`
        }
      />

      {quickAddDate && (
        <QuickAddEventModal
          initialDate={quickAddDate}
          collaborators={[]}
          defaultRelPath={journalPathForDate(quickAddDate)}
          onClose={() => setQuickAddDate(null)}
          onCreated={async (eventData) => {
            await vaultStore.addCalendarEvent(eventData.targetPath, eventData);
            toast.success('Événement créé', `Ajouté dans ${eventData.targetPath}`);
            await reload();
          }}
        />
      )}
    </div>
  );
};
