import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PreviewStatusChips } from '@/components/landing/PreviewStatusChips';
import { SessionTimeline } from '@/components/SessionTimeline';
import { buildPreviewClocks, buildPreviewStatusChips } from '@/lib/preview-clocks';
import type { CurrentSession, DashboardPayload } from '@/types/dashboard';

interface LandingTimelineSectionProps {
  dashboard: DashboardPayload;
  scrubNowIso: string;
  anchorIso: string;
  onScrubNowChange: (iso: string) => void;
  currentSession: CurrentSession;
}

export function LandingTimelineSection({
  dashboard,
  scrubNowIso,
  anchorIso,
  onScrubNowChange,
  currentSession
}: LandingTimelineSectionProps) {
  const handleScrubNowChange = useCallback(
    (iso: string) => {
      onScrubNowChange(iso);
    },
    [onScrubNowChange]
  );

  // Autoplay desligado: o usuário arrasta o fundo manualmente.

  const statusChips = useMemo(() => {
    const pack = buildPreviewClocks(
      dashboard.timeline.sessions,
      scrubNowIso,
      dashboard.baseTimezone,
      dashboard.marketState.isOpen
    );
    return buildPreviewStatusChips(pack.desktop);
  }, [
    dashboard.baseTimezone,
    dashboard.marketState.isOpen,
    dashboard.timeline.sessions,
    scrubNowIso
  ]);

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 pb-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 max-w-2xl"
      >
        <h2 className="font-landing-display text-3xl tracking-tight text-slate-50 md:text-4xl">
          Arraste e veja o dia mudar
        </h2>
        <p className="mt-3 text-slate-300">
          A mesma linha do tempo do app. Arraste o fundo das sessões — a linha do relógio no centro mostra o horário; os relógios em cima acompanham.
        </p>
        <div className="mt-2 flex min-h-[1.75rem] flex-wrap items-center gap-2 text-sm text-slate-400">
          {statusChips.length > 0 ? (
            <>
              <span className="shrink-0">Agora:</span>
              <PreviewStatusChips chips={statusChips} />
            </>
          ) : (
            <span className="text-slate-500">Arraste para ver quando as sessões se encontram</span>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.65, delay: 0.1 }}
        className="min-h-[360px] sm:min-h-0"
      >
        <SessionTimeline
          seedNowIso={anchorIso}
          rangeAnchorIso={anchorIso}
          baseTimezone={dashboard.baseTimezone}
          locale="pt-BR"
          sessions={dashboard.timeline.sessions}
          isPaused={!dashboard.marketState.isOpen}
          marketState={dashboard.marketState}
          currentSession={currentSession}
          upcomingEvents={dashboard.upcomingEvents}
          scrubMode
          slimNowLine
          scrubNowIso={scrubNowIso}
          onScrubNowChange={handleScrubNowChange}
          scrubStatusChips={statusChips}
        />
      </motion.div>
    </section>
  );
}
