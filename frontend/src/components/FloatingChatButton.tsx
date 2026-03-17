import { Sparkles } from 'lucide-react';
import { t, type SupportedLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface FloatingChatButtonProps {
  locale: SupportedLocale;
  isOpen: boolean;
  unreadCount: number;
  pulseActive: boolean;
  onClick: () => void;
}

export function FloatingChatButton({ locale, isOpen, unreadCount, pulseActive, onClick }: FloatingChatButtonProps) {
  return (
    <>
      <style>{`
        .radar-chat-fab {
          position: fixed;
          right: 24px;
          bottom: 24px;
          width: 64px;
          height: 64px;
          border: 1px solid rgba(73, 205, 255, 0.22);
          border-radius: 50%;
          cursor: pointer;
          z-index: 9999;
          padding: 0;
          overflow: visible;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 35% 30%, rgba(18, 61, 122, 0.95) 0%, rgba(7, 20, 48, 0.98) 48%, rgba(4, 10, 28, 1) 100%);
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(255, 197, 61, 0.06),
            inset 0 0 18px rgba(81, 212, 255, 0.08),
            inset 0 -8px 16px rgba(0, 0, 0, 0.28);
          transition:
            transform .22s ease,
            box-shadow .22s ease,
            border-color .22s ease,
            opacity .2s ease;
          animation: fabFloat 3.8s ease-in-out infinite;
          backdrop-filter: blur(6px);
          -webkit-tap-highlight-color: transparent;
        }

        .radar-chat-fab:hover {
          transform: translateY(-3px) scale(1.05);
          border-color: rgba(73, 205, 255, 0.4);
          box-shadow:
            0 14px 34px rgba(0, 0, 0, 0.52),
            0 0 24px rgba(31, 173, 255, 0.18),
            0 0 0 1px rgba(255, 197, 61, 0.12),
            inset 0 0 20px rgba(81, 212, 255, 0.12),
            inset 0 -8px 16px rgba(0, 0, 0, 0.3);
        }

        .radar-chat-fab:active {
          transform: scale(0.97);
        }

        .radar-chat-fab--open {
          transform: scale(0.96);
          opacity: 0.9;
        }

        @keyframes fabFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }

        .radar-chat-core {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at center, rgba(10, 44, 88, 0.88) 0%, rgba(4, 19, 42, 0.96) 64%, rgba(2, 10, 24, 1) 100%);
          box-shadow:
            inset 0 0 10px rgba(77, 214, 255, 0.08),
            inset 0 0 1px rgba(255, 196, 72, 0.16);
        }

        .radar-chat-ring,
        .radar-chat-ring-2,
        .radar-chat-pulse {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .radar-chat-ring {
          inset: -7px;
          border: 1px solid rgba(70, 201, 255, 0.15);
          box-shadow: 0 0 10px rgba(53, 180, 255, 0.08);
        }

        .radar-chat-ring-2 {
          inset: 6px;
          border: 1px dashed rgba(255, 190, 56, 0.18);
          opacity: .9;
          animation: slowSpin 8s linear infinite;
        }

        .radar-chat-pulse {
          inset: -10px;
          border: 1px solid rgba(69, 203, 255, 0.22);
          animation: pulseOut 2.2s ease-out infinite;
        }

        @keyframes pulseOut {
          0% {
            transform: scale(.88);
            opacity: 0;
          }
          20% {
            opacity: .55;
          }
          100% {
            transform: scale(1.22);
            opacity: 0;
          }
        }

        @keyframes slowSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .radar-sweep {
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          background:
            conic-gradient(
              from 0deg,
              rgba(0,0,0,0) 0deg,
              rgba(0,0,0,0) 285deg,
              rgba(81, 224, 255, 0.04) 320deg,
              rgba(81, 224, 255, 0.24) 342deg,
              rgba(255, 190, 54, 0.22) 352deg,
              rgba(0,0,0,0) 360deg
            );
          filter: blur(.2px);
          animation: sweepSpin 2.8s linear infinite;
          pointer-events: none;
        }

        @keyframes sweepSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .radar-grid {
          position: absolute;
          inset: 9px;
          border-radius: 50%;
          pointer-events: none;
          background:
            radial-gradient(circle, transparent 47%, rgba(79, 208, 255, 0.11) 48%, transparent 49%),
            radial-gradient(circle, transparent 68%, rgba(79, 208, 255, 0.10) 69%, transparent 70%),
            linear-gradient(rgba(79, 208, 255, 0.08), rgba(79, 208, 255, 0.08)),
            linear-gradient(90deg, rgba(79, 208, 255, 0.08), rgba(79, 208, 255, 0.08));
          background-size: 100% 100%, 100% 100%, 1px 100%, 100% 1px;
          background-position: center, center, center, center;
          background-repeat: no-repeat;
          opacity: .9;
        }

        .radar-chat-icon {
          position: relative;
          width: 22px;
          height: 22px;
          z-index: 3;
          filter:
            drop-shadow(0 0 6px rgba(67, 214, 255, 0.18))
            drop-shadow(0 0 10px rgba(255, 191, 61, 0.08));
        }

        .radar-chat-icon svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .radar-chat-dot {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #49d3ff;
          box-shadow:
            0 0 8px rgba(73, 211, 255, 0.32),
            0 0 12px rgba(255, 190, 56, 0.12);
          z-index: 2;
        }

        .dot-a {
          top: 9px;
          right: 10px;
          animation: pingA 2.1s ease-in-out infinite;
        }

        .dot-b {
          bottom: 12px;
          left: 9px;
          background: #ffc33a;
          box-shadow:
            0 0 8px rgba(255, 195, 58, 0.24),
            0 0 12px rgba(73, 211, 255, 0.10);
          animation: pingB 2.7s ease-in-out infinite;
        }

        @keyframes pingA {
          0%, 100% { transform: scale(1); opacity: .8; }
          50% { transform: scale(1.45); opacity: 1; }
        }

        @keyframes pingB {
          0%, 100% { transform: scale(1); opacity: .72; }
          50% { transform: scale(1.35); opacity: 1; }
        }

        .radar-chat-label {
          position: absolute;
          right: 78px;
          bottom: 12px;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 12px;
          line-height: 1;
          letter-spacing: .02em;
          color: rgba(236, 245, 255, 0.94);
          background:
            linear-gradient(180deg, rgba(8, 24, 51, 0.92), rgba(5, 15, 34, 0.92));
          border: 1px solid rgba(73, 205, 255, 0.16);
          box-shadow:
            0 8px 24px rgba(0,0,0,.35),
            inset 0 0 10px rgba(73, 205, 255, 0.04);
          white-space: nowrap;
          pointer-events: none;
          opacity: .92;
        }

        .radar-chat-label strong {
          color: #49d3ff;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .radar-chat-fab {
            right: 18px;
            bottom: 18px;
            width: 60px;
            height: 60px;
          }

          .radar-chat-core {
            width: 46px;
            height: 46px;
          }

          .radar-chat-label {
            display: none;
          }
        }
      `}</style>

      <button
        type="button"
        className={cn('radar-chat-fab', isOpen ? 'radar-chat-fab--open' : '')}
        onClick={onClick}
        aria-label={t(locale, 'chat.open')}
      >
        <div className="radar-chat-label">
          <strong>Assistente IA</strong>
        </div>

        <div className="radar-chat-core">
          <div className="radar-chat-pulse" />
          <div className="radar-chat-ring" />
          <div className="radar-chat-ring-2" />
          <div className="radar-sweep" />
          <div className="radar-grid" />
          <div className="radar-chat-dot dot-a" />
          <div className="radar-chat-dot dot-b" />

          <div className="radar-chat-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="iconStroke" x1="2" y1="2" x2="22" y2="22">
                  <stop offset="0%" stopColor="#49d3ff" />
                  <stop offset="65%" stopColor="#6ecbff" />
                  <stop offset="100%" stopColor="#ffc43d" />
                </linearGradient>
              </defs>

              <path
                d="M12 3.2a8.8 8.8 0 1 0 5.38 15.77l3.02.75-.83-2.78A8.8 8.8 0 0 0 12 3.2Z"
                stroke="url(#iconStroke)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M8.1 11.8h7.8" stroke="url(#iconStroke)" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9.4 8.8h5.2" stroke="url(#iconStroke)" strokeWidth="1.8" strokeLinecap="round" opacity=".9" />
              <path d="M9.4 14.8h3.8" stroke="url(#iconStroke)" strokeWidth="1.8" strokeLinecap="round" opacity=".85" />
            </svg>
          </div>
        </div>

        {pulseActive ? <span className="absolute inset-0 rounded-full border border-cyan/50 animate-ping" /> : null}

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-slate-900 shadow">
            <Sparkles className="mr-0.5 h-3 w-3" />
            {Math.min(unreadCount, 9)}
          </span>
        ) : null}
      </button>
    </>
  );
}
