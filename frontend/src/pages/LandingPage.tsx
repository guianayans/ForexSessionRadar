import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants
} from 'framer-motion';
import { ArrowRight, Clock3, Globe2, Sparkles, Waves } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { LandingTimelineSection } from '@/components/landing/LandingTimelineSection';
import { fetchDashboard } from '@/services/api';
import { PreviewStatusChips } from '@/components/landing/PreviewStatusChips';
import { buildPreviewClocks, buildPreviewStatusChips, type PreviewClock } from '@/lib/preview-clocks';
import type { CurrentSession, DashboardPayload } from '@/types/dashboard';

const easeOut = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay, ease: easeOut }
  })
};

type ClockTone = PreviewClock['tone'];

const moments = [
  {
    icon: Globe2,
    title: 'O mundo no mesmo relance',
    body: 'Você olha uma vez e entende quem está acordado: Brasil, Europa, Estados Unidos — sem contar fuso na cabeça.'
  },
  {
    icon: Sparkles,
    title: 'Quando o dia fica sério',
    body: 'Há um intervalo em que Londres e Nova York se encontram. O app acende esse momento para você não passar batido.'
  },
  {
    icon: Waves,
    title: 'O que costuma fazer sentido agora',
    body: 'Sugestões leves de ativos para o clima do horário. Não é recomendação mágica — é contexto para você decidir melhor.'
  }
];

function clockCardClass(tone: ClockTone) {
  if (tone === 'gold') {
    return 'border-amber-400/45 bg-amber-500/10 shadow-[0_0_28px_rgba(245,158,11,0.24)]';
  }
  if (tone === 'cyan') {
    return 'border-cyan/40 bg-cyan/10 shadow-[0_0_22px_rgba(34,211,238,0.2)]';
  }
  return 'border-slate-700/80 bg-slate-950/50 opacity-70 saturate-[0.65]';
}

function ClockCard({
  city,
  time,
  tone,
  tag,
  delay
}: PreviewClock & { delay: number }) {
  const gold = tone === 'gold';
  const cyan = tone === 'cyan';
  const muted = tone === 'muted';

  return (
    <motion.div
      custom={delay}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={`flex h-[92px] min-w-0 flex-col justify-between rounded-xl border px-3 py-2.5 backdrop-blur-md ${clockCardClass(tone)}`}
    >
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <Clock3
          className={`h-3.5 w-3.5 shrink-0 ${gold ? 'text-amber-300' : cyan ? 'text-cyan' : 'text-slate-500'}`}
        />
        <span className="truncate">{city}</span>
      </div>
      <p
        className={`font-mono text-xl font-semibold tracking-tight ${
          gold ? 'text-amber-200' : cyan ? 'text-cyan' : 'text-slate-500'
        }`}
      >
        {time}
      </p>
      <span
        className={`inline-block w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
          gold
            ? 'bg-amber-400/90 text-slate-950'
            : cyan
              ? 'bg-cyan/90 text-slate-950'
              : 'border border-slate-600 bg-slate-800/80 text-slate-400'
        }`}
      >
        {tag}
      </span>
    </motion.div>
  );
}

function HeroClockGrid({
  clocks,
  desktopStatusChips,
  mobileStatusChips,
  reduceMotion
}: {
  clocks: { mobile: PreviewClock[]; desktop: PreviewClock[] } | null;
  desktopStatusChips: ReturnType<typeof buildPreviewStatusChips>;
  mobileStatusChips: ReturnType<typeof buildPreviewStatusChips>;
  reduceMotion: boolean | null;
}) {
  if (!clocks) {
    return (
      <div className="grid w-full max-w-md grid-cols-2 gap-2.5 md:max-w-[34rem] md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[92px] animate-pulse rounded-xl bg-slate-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md md:max-w-[34rem]">
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="md:hidden"
      >
        <PreviewStatusChips
          chips={mobileStatusChips}
          className="mb-2 justify-end"
          variant="inline"
        />
        <div className="grid grid-cols-2 gap-2.5">
        {clocks.mobile.map((clock, index) => (
          <ClockCard key={`m-${clock.id}`} {...clock} delay={0.06 + index * 0.05} />
        ))}
        </div>
      </motion.div>

      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block"
      >
        <div className="mb-2 flex items-center justify-end gap-3 text-[10px] uppercase tracking-wider text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan" />
            Aberto
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Overlap
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-600" />
            Fechado
          </span>
        </div>

        <PreviewStatusChips
          chips={desktopStatusChips}
          className="mb-2 justify-end"
          variant="inline"
        />

        <div className="grid grid-cols-3 gap-2.5">
          {clocks.desktop.map((clock, index) => (
            <ClockCard key={`d-${clock.id}`} {...clock} delay={0.08 + index * 0.04} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [scrubNowIso, setScrubNowIso] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void fetchDashboard().then((payload) => {
      setDashboard(payload);
      setScrubNowIso(payload.nowIso);
    });
  }, []);

  const previewPack = useMemo(() => {
    if (!dashboard || !scrubNowIso) {
      return null;
    }

    return buildPreviewClocks(
      dashboard.timeline.sessions,
      scrubNowIso,
      dashboard.baseTimezone,
      dashboard.marketState.isOpen
    );
  }, [dashboard, scrubNowIso]);

  const heroStatusChips = useMemo(() => {
    if (!previewPack) {
      return { mobile: [], desktop: [] };
    }
    return {
      mobile: buildPreviewStatusChips(previewPack.mobile),
      desktop: buildPreviewStatusChips(previewPack.desktop)
    };
  }, [previewPack]);

  const previewSession = useMemo((): CurrentSession | null => {
    if (!previewPack) {
      return null;
    }

    if (previewPack.goldenOverlap) {
      return {
        id: 'gold',
        label: 'Janela de Ouro',
        volatility: 'Muito Alta',
        startIso: previewPack.goldenOverlap.startIso,
        endIso: previewPack.goldenOverlap.endIso,
        recommendedAssets: dashboard?.currentSession.recommendedAssets || []
      };
    }

    return dashboard?.currentSession || null;
  }, [dashboard, previewPack]);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const blobY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 140]);
  const blobY2 = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -90]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, reduceMotion ? 1 : 0.15]);
  const heroScale = useSpring(useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 0.94]), {
    stiffness: 120,
    damping: 28
  });

  return (
    <div className="landing-page relative min-h-[100dvh] overflow-x-hidden text-slate-100">
      <div className="landing-grain pointer-events-none fixed inset-0 z-[1] opacity-[0.35]" aria-hidden />

      <motion.div
        style={{ y: blobY }}
        className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-cyan/20 blur-[100px]"
        aria-hidden
      />
      <motion.div
        style={{ y: blobY2 }}
        className="pointer-events-none absolute -right-24 top-48 h-[380px] w-[380px] rounded-full bg-amber-500/15 blur-[90px]"
        aria-hidden
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <AppLogo size={44} showGlow className="transition group-hover:scale-[1.03]" />
          <div>
            <p className="font-landing-display text-lg leading-none tracking-tight text-slate-50">Forex Session Radar</p>
            <p className="text-xs text-slate-400">O ritmo do mercado, em uma tela</p>
          </div>
        </Link>
        <Link
          to="/app"
          className="hidden rounded-full border border-slate-600/80 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan/50 hover:text-white sm:inline-flex"
        >
          Já conheço
        </Link>
      </header>

      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative z-10 mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-10 md:px-8 md:pb-28 md:pt-14"
      >
        <div>
          <motion.p
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/50 px-3 py-1 text-xs text-slate-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Gratuito · sem cadastro
          </motion.p>

          <motion.h1
            custom={0.08}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="font-landing-display max-w-xl text-[2.35rem] leading-[1.05] tracking-tight text-slate-50 sm:text-5xl md:text-[3.35rem]"
          >
            Saiba quando o mercado <span className="text-cyan">acorda</span> — e quando o dia fica{' '}
            <span className="text-amber-300">sério</span>.
          </motion.h1>

          <motion.p
            custom={0.16}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-5 max-w-lg text-base leading-relaxed text-slate-300 md:text-lg"
          >
            Um painel calmo que mostra quem está aberto agora, quando Londres e Nova York se encontram, e o que
            costuma merecer sua atenção nesse instante. Sem planilha, sem barulho.
          </motion.p>

          <motion.div
            custom={0.24}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_40px_rgba(34,211,238,0.35)] transition hover:bg-cyan/90"
            >
              Abrir o radar agora
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <p className="text-sm text-slate-400">Leva dois segundos. Funciona no navegador.</p>
          </motion.div>
        </div>

        <div className="relative flex justify-center pb-10 md:justify-end md:pb-12">
          <HeroClockGrid
            clocks={previewPack ? { mobile: previewPack.mobile, desktop: previewPack.desktop } : null}
            desktopStatusChips={heroStatusChips.desktop}
            mobileStatusChips={heroStatusChips.mobile}
            reduceMotion={reduceMotion}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="absolute bottom-0 left-0 right-0 text-center text-xs text-slate-500 md:text-right"
          >
            Horários mudam conforme você arrasta o fundo da linha do tempo
          </motion.p>
        </div>
      </motion.section>

      {dashboard && scrubNowIso && previewSession ? (
        <LandingTimelineSection
          dashboard={dashboard}
          scrubNowIso={scrubNowIso}
          anchorIso={dashboard.nowIso}
          onScrubNowChange={setScrubNowIso}
          currentSession={previewSession}
        />
      ) : null}

      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="mb-10 max-w-2xl"
        >
          <h2 className="font-landing-display text-3xl tracking-tight text-slate-50 md:text-4xl">
            Para quem cansou de adivinhar o relógio
          </h2>
          <p className="mt-3 text-slate-300">
            Você não precisa decorar fusos. O app traduz o dia em cores, horários e um aviso claro quando o mundo
            inteiro parece respirar junto.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {moments.map((item, index) => (
            <motion.article
              key={item.title}
              custom={index * 0.1}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              className="rounded-2xl border border-slate-700/70 bg-slate-950/55 p-6 shadow-panel backdrop-blur-sm"
            >
              <item.icon className="mb-4 h-6 w-6 text-cyan" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="overflow-hidden rounded-3xl border border-slate-700/60 bg-[linear-gradient(135deg,rgba(8,22,48,0.95),rgba(18,12,8,0.92))] p-8 md:p-12"
        >
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300/90">Janela de ouro</p>
              <h2 className="font-landing-display mt-2 text-3xl text-slate-50 md:text-4xl">
                O pedaço do dia em que tudo acelera
              </h2>
              <p className="mt-4 max-w-xl text-slate-300">
                Quando Londres e Nova York estão abertas juntas, o mercado costuma ficar mais vivo. O radar destaca esse
                trecho — você vê, sente o timing e decide se vale a pena estar na mesa.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 font-mono text-sm">
              <span className="text-amber-200">Londres + Nova York</span>
              <span className="text-slate-400">~10h às 13h · horário de Brasília</span>
              <span className="text-xs text-slate-500">Varia com feriados e horário de verão</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 border-t border-slate-800/80 bg-slate-950/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-16 text-center md:px-8">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="font-landing-display max-w-lg text-3xl text-slate-50"
          >
            Pronto para olhar o mercado com calma?
          </motion.h2>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-full border border-cyan/50 bg-cyan/15 px-7 py-3.5 text-base font-semibold text-cyan transition hover:bg-cyan/25"
            >
              Entrar no painel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <p className="text-xs text-slate-500">Forex Session Radar · feito para traders que respeitam o relógio</p>
        </div>
      </section>
    </div>
  );
}
