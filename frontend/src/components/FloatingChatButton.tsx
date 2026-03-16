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
        .brain-float-button {
          position: fixed;
          right: 24px;
          bottom: 24px;
          width: 60px;
          height: 60px;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          z-index: 50;
          background:
            radial-gradient(circle at 50% 50%, rgba(16, 18, 42, 0.98) 0%, rgba(10, 10, 26, 0.97) 58%, rgba(4, 5, 14, 0.98) 100%);
          box-shadow:
            0 0 0 1px rgba(130, 180, 255, 0.14),
            0 10px 20px rgba(0, 0, 0, 0.45),
            0 0 14px rgba(70, 80, 255, 0.12),
            0 0 22px rgba(135, 65, 255, 0.12),
            inset 0 0 14px rgba(120, 140, 255, 0.06),
            inset 0 -8px 16px rgba(0, 0, 0, 0.25);
          transition: transform .22s ease, box-shadow .22s ease, filter .22s ease, opacity .2s ease;
          animation: brainButtonFloat 4.2s ease-in-out infinite;
          overflow: visible;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .brain-float-button:hover {
          transform: translateY(-2px) scale(1.06);
          box-shadow:
            0 0 0 1px rgba(150, 200, 255, 0.18),
            0 14px 26px rgba(0, 0, 0, 0.5),
            0 0 16px rgba(63, 224, 255, 0.16),
            0 0 30px rgba(182, 72, 255, 0.18),
            inset 0 0 18px rgba(120, 140, 255, 0.08),
            inset 0 -10px 20px rgba(0, 0, 0, 0.28);
        }

        .brain-float-button:active {
          transform: scale(0.97);
        }

        .brain-float-button--open {
          transform: scale(0.95);
          opacity: 0.9;
        }

        @keyframes brainButtonFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0px); }
        }

        .brain-shell {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 50%, rgba(95, 125, 255, 0.08) 0%, rgba(0, 0, 0, 0) 54%),
            radial-gradient(circle at 30% 32%, rgba(72, 235, 255, 0.10) 0%, rgba(0, 0, 0, 0) 32%),
            radial-gradient(circle at 74% 72%, rgba(255, 83, 194, 0.10) 0%, rgba(0, 0, 0, 0) 30%);
          filter: blur(0.2px);
        }

        .brain-halo {
          position: absolute;
          width: 76px;
          height: 76px;
          border-radius: 999px;
          pointer-events: none;
          background:
            conic-gradient(
              from 0deg,
              rgba(71, 230, 255, 0.00),
              rgba(71, 230, 255, 0.18),
              rgba(111, 127, 255, 0.12),
              rgba(201, 88, 255, 0.18),
              rgba(255, 106, 167, 0.12),
              rgba(255, 190, 55, 0.16),
              rgba(71, 230, 255, 0.00)
            );
          filter: blur(7px);
          opacity: .62;
          animation: haloSpin 10s linear infinite;
        }

        @keyframes haloSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .brain-svg {
          width: 42px;
          height: 42px;
          overflow: visible;
          z-index: 2;
          filter:
            drop-shadow(0 0 4px rgba(97, 234, 255, 0.32))
            drop-shadow(0 0 7px rgba(170, 89, 255, 0.2))
            drop-shadow(0 0 10px rgba(255, 128, 80, 0.11));
        }

        .brain-outer,
        .brain-inner-left,
        .brain-inner-right,
        .brain-center-line,
        .brain-center-core-ring {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .brain-outer {
          stroke: url(#brainMainGradient);
          stroke-width: 11;
          filter:
            drop-shadow(0 0 4px rgba(83, 235, 255, 0.7))
            drop-shadow(0 0 9px rgba(255, 109, 85, 0.4))
            drop-shadow(0 0 13px rgba(186, 83, 255, 0.4));
          animation: outerPulse 2.6s ease-in-out infinite;
        }

        .brain-inner-left {
          stroke: url(#brainWarmGradient);
          stroke-width: 8.2;
          filter:
            drop-shadow(0 0 4px rgba(255, 184, 58, 0.7))
            drop-shadow(0 0 8px rgba(255, 107, 86, 0.5));
          animation: pathPulseWarm 2.1s ease-in-out infinite;
        }

        .brain-inner-right {
          stroke: url(#brainCoolGradient);
          stroke-width: 8.2;
          filter:
            drop-shadow(0 0 4px rgba(137, 225, 255, 0.7))
            drop-shadow(0 0 8px rgba(213, 107, 255, 0.5));
          animation: pathPulseCool 2.1s ease-in-out infinite;
        }

        .brain-center-line {
          stroke: url(#brainCenterGradient);
          stroke-width: 8.8;
          filter:
            drop-shadow(0 0 4px rgba(255, 182, 84, 0.65))
            drop-shadow(0 0 9px rgba(255, 85, 170, 0.58))
            drop-shadow(0 0 13px rgba(123, 232, 255, 0.35));
          animation: centerPulse 1.6s ease-in-out infinite;
        }

        .brain-center-core-ring {
          stroke: rgba(255,255,255,0.72);
          stroke-width: 2;
          opacity: .75;
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.45));
        }

        .brain-center-core {
          fill: url(#brainCoreGradient);
          filter:
            drop-shadow(0 0 7px rgba(255, 94, 177, 0.7))
            drop-shadow(0 0 12px rgba(255, 154, 90, 0.42))
            drop-shadow(0 0 17px rgba(150, 90, 255, 0.32));
          animation: coreBeat 1.5s ease-in-out infinite;
          transform-origin: 128px 128px;
          transform-box: fill-box;
        }

        .brain-group {
          animation: brainTilt 5s ease-in-out infinite;
          transform-origin: 128px 128px;
          transform-box: fill-box;
        }

        @keyframes brainTilt {
          0% { transform: translateY(0px) rotate(-1.2deg) scale(1); }
          50% { transform: translateY(-3px) rotate(1.2deg) scale(1.02); }
          100% { transform: translateY(0px) rotate(-1.2deg) scale(1); }
        }

        @keyframes outerPulse {
          0%, 100% { opacity: .94; stroke-width: 11; }
          50% { opacity: 1; stroke-width: 11.8; }
        }

        @keyframes pathPulseWarm {
          0%, 100% { opacity: .92; }
          50% { opacity: 1; }
        }

        @keyframes pathPulseCool {
          0%, 100% { opacity: .92; }
          50% { opacity: 1; }
        }

        @keyframes centerPulse {
          0%, 100% { opacity: .88; stroke-width: 8.8; }
          50% { opacity: 1; stroke-width: 9.6; }
        }

        @keyframes coreBeat {
          0%, 100% { transform: scale(1); opacity: .95; }
          50% { transform: scale(1.14); opacity: 1; }
        }

        .energy-path {
          fill: none;
          stroke: rgba(255,255,255,0.0);
          stroke-width: 14;
          stroke-linecap: round;
        }

        .energy-dot {
          r: 5.4;
          filter:
            drop-shadow(0 0 6px rgba(255,255,255,0.72))
            drop-shadow(0 0 11px rgba(255,130,120,0.62))
            drop-shadow(0 0 14px rgba(121,223,255,0.56));
        }

        .energy-dot-left-1 { fill: #ffba3a; }
        .energy-dot-left-2 { fill: #ff6f8a; }
        .energy-dot-right-1 { fill: #67f0ff; }
        .energy-dot-right-2 { fill: #d07bff; }
        .energy-dot-center { fill: #ffd7f4; }

        .brain-ring {
          position: absolute;
          width: 70px;
          height: 70px;
          border-radius: 999px;
          pointer-events: none;
          border: 1px solid rgba(118, 165, 255, 0.08);
          box-shadow:
            0 0 10px rgba(104, 137, 255, 0.06),
            inset 0 0 12px rgba(77, 92, 255, 0.04);
          animation: ringPulse 2.8s ease-in-out infinite;
        }

        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: .55; }
          50% { transform: scale(1.03); opacity: .85; }
        }
      `}</style>

      <button
        onClick={onClick}
        aria-label={t(locale, 'chat.open')}
        className={cn('brain-float-button', isOpen ? 'brain-float-button--open' : '')}
      >
        <div className="brain-halo" />
        <div className="brain-ring" />
        <div className="brain-shell" />

        <svg
          className="brain-svg"
          viewBox="0 0 256 256"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="brainMainGradient" x1="28" y1="220" x2="228" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffd326" />
              <stop offset="18%" stopColor="#ff8b2b" />
              <stop offset="38%" stopColor="#ff5fa2" />
              <stop offset="58%" stopColor="#b86cff" />
              <stop offset="76%" stopColor="#64f2ff" />
              <stop offset="100%" stopColor="#76d8ff" />
            </linearGradient>

            <linearGradient id="brainWarmGradient" x1="42" y1="210" x2="122" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffe124" />
              <stop offset="42%" stopColor="#ff9c31" />
              <stop offset="75%" stopColor="#ff5f86" />
              <stop offset="100%" stopColor="#ff77d5" />
            </linearGradient>

            <linearGradient id="brainCoolGradient" x1="132" y1="48" x2="218" y2="208" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#74ebff" />
              <stop offset="34%" stopColor="#5fb8ff" />
              <stop offset="70%" stopColor="#b36fff" />
              <stop offset="100%" stopColor="#ff82d3" />
            </linearGradient>

            <linearGradient id="brainCenterGradient" x1="128" y1="38" x2="128" y2="222" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7fe9ff" />
              <stop offset="46%" stopColor="#ff74c8" />
              <stop offset="100%" stopColor="#ffb347" />
            </linearGradient>

            <radialGradient id="brainCoreGradient" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#ffd6fb" />
              <stop offset="30%" stopColor="#ff78bb" />
              <stop offset="62%" stopColor="#ff8c5d" />
              <stop offset="100%" stopColor="#6a54ff" />
            </radialGradient>
          </defs>

          <g className="brain-group">
            <path
              className="brain-outer"
              d="
                M128 30
                C109 16, 79 20, 62 40
                C36 44, 24 66, 27 92
                C16 108, 16 134, 27 151
                C24 184, 43 213, 75 224
                C96 235, 115 231, 128 217
                C141 231, 160 235, 181 224
                C213 213, 232 184, 229 151
                C240 134, 240 108, 229 92
                C232 66, 220 44, 194 40
                C177 20, 147 16, 128 30
              "
            />

            <path
              className="brain-center-line"
              d="M128 36 C128 58,128 76,128 97 C128 109,128 121,128 128 C128 137,128 147,128 160 C128 181,128 197,128 218"
            />

            <path
              className="brain-inner-left"
              d="M116 50 C101 42,84 45,74 58 C61 59,52 70,51 84 C40 95,39 111,47 124 C40 139,43 159,58 171 C60 188,74 202,92 205"
            />
            <path
              className="brain-inner-left"
              d="M104 62 C92 63,81 68,76 79 C68 82,64 91,65 101 C56 109,56 121,64 129 C61 140,64 151,72 159 C74 171,84 180,96 184"
            />
            <path
              className="brain-inner-left"
              d="M108 84 C96 85,88 92,87 102 C78 108,77 119,84 126 C82 136,85 145,92 151"
            />
            <path
              className="brain-inner-left"
              d="M118 104 C104 105,96 114,97 124 C97 135,104 143,116 147"
            />
            <path className="brain-inner-left" d="M78 154 C90 149,101 149,112 155" />
            <path className="brain-inner-left" d="M71 112 C82 108,93 108,104 112" />
            <path className="brain-inner-left" d="M76 189 C83 186,88 190,91 198" />

            <path
              className="brain-inner-right"
              d="M140 50 C155 42,172 45,182 58 C195 59,204 70,205 84 C216 95,217 111,209 124 C216 139,213 159,198 171 C196 188,182 202,164 205"
            />
            <path
              className="brain-inner-right"
              d="M152 62 C164 63,175 68,180 79 C188 82,192 91,191 101 C200 109,200 121,192 129 C195 140,192 151,184 159 C182 171,172 180,160 184"
            />
            <path
              className="brain-inner-right"
              d="M148 84 C160 85,168 92,169 102 C178 108,179 119,172 126 C174 136,171 145,164 151"
            />
            <path
              className="brain-inner-right"
              d="M138 104 C152 105,160 114,159 124 C159 135,152 143,140 147"
            />
            <path className="brain-inner-right" d="M178 154 C166 149,155 149,144 155" />
            <path className="brain-inner-right" d="M185 112 C174 108,163 108,152 112" />
            <path className="brain-inner-right" d="M180 189 C173 186,168 190,165 198" />

            <circle className="brain-center-core" cx="128" cy="128" r="12" />
            <circle className="brain-center-core-ring" cx="128" cy="128" r="18" />

            <path id="energyPathLeftUpper" className="energy-path" d="M116 50 C101 42,84 45,74 58 C61 59,52 70,51 84" />
            <path id="energyPathLeftMid" className="energy-path" d="M104 62 C92 63,81 68,76 79 C68 82,64 91,65 101 C56 109,56 121,64 129" />
            <path id="energyPathRightUpper" className="energy-path" d="M140 50 C155 42,172 45,182 58 C195 59,204 70,205 84" />
            <path id="energyPathRightMid" className="energy-path" d="M152 62 C164 63,175 68,180 79 C188 82,192 91,191 101 C200 109,200 121,192 129" />
            <path id="energyPathCenter" className="energy-path" d="M128 36 C128 58,128 76,128 97 C128 109,128 121,128 128 C128 137,128 147,128 160 C128 181,128 197,128 218" />

            <circle className="energy-dot energy-dot-left-1">
              <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
                <mpath href="#energyPathLeftUpper" />
              </animateMotion>
            </circle>

            <circle className="energy-dot energy-dot-left-2">
              <animateMotion dur="3.1s" repeatCount="indefinite" rotate="auto" begin="0.6s">
                <mpath href="#energyPathLeftMid" />
              </animateMotion>
            </circle>

            <circle className="energy-dot energy-dot-right-1">
              <animateMotion dur="2.5s" repeatCount="indefinite" rotate="auto" begin="0.2s">
                <mpath href="#energyPathRightUpper" />
              </animateMotion>
            </circle>

            <circle className="energy-dot energy-dot-right-2">
              <animateMotion dur="3.2s" repeatCount="indefinite" rotate="auto" begin="0.8s">
                <mpath href="#energyPathRightMid" />
              </animateMotion>
            </circle>

            <circle className="energy-dot energy-dot-center">
              <animateMotion dur="2.1s" repeatCount="indefinite" rotate="auto">
                <mpath href="#energyPathCenter" />
              </animateMotion>
            </circle>
          </g>
        </svg>

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
