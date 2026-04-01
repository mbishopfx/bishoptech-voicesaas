'use client';

import type { ReactNode } from 'react';
import { Player } from '@remotion/player';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type MatrixHeroPlayerProps = {
  className?: string;
};

type MatrixTerminalPlayerProps = {
  className?: string;
  title: string;
  lines: string[];
};

type CommandDeckPlayerProps = {
  className?: string;
  accent?: 'cyan' | 'violet' | 'mint';
};

const heroGlyphs = [
  '░░ SIGNAL FABRIC // BISHOP TECH VOICE // ORCHESTRATION ░░',
  'voiceprint > intent > routing > transcript > conversion',
  'semantic current / living waveform / response memory /',
  '0101 0011 1100   inbound   outbound   1010 0110',
  'faq_graph > scheduler > crm_sync > follow_up',
  '<< your voice / your offers / your call outcomes >>',
];

function Wave({
  color,
  path,
  delay,
  amplitude = 12,
}: {
  color: string;
  path: string;
  delay: number;
  amplitude?: number;
}) {
  const frame = useCurrentFrame();
  const bob = interpolate((frame + delay) % 180, [0, 90, 179], [-amplitude, amplitude, -amplitude], {
    easing: Easing.inOut(Easing.sin),
  });

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
      viewBox="0 0 960 420"
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.9}
        style={{
          transform: `translateY(${bob}px)`,
        }}
      />
    </svg>
  );
}

function MatrixHeroComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 40,
  });
  const pulse = interpolate((frame + 20) % 120, [0, 60, 119], [0.72, 1, 0.72], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  });
  const scan = interpolate(frame % 180, [0, 179], [-180, 860], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 18% 24%, rgba(49, 232, 255, 0.22), transparent 20%), radial-gradient(circle at 74% 72%, rgba(167, 102, 255, 0.14), transparent 22%), linear-gradient(180deg, #0d1015 0%, #090b10 100%)',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.18,
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), transparent 92%)',
        }}
      />

      <AbsoluteFill
        style={{
          opacity: 0.46,
          color: '#8fe6ff',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 18,
          letterSpacing: '0.12em',
          padding: '28px 34px',
          transform: `translateY(${interpolate(frame % 360, [0, 359], [0, -42])}px)`,
        }}
      >
        {heroGlyphs.map((line, index) => (
          <div
            key={line}
            style={{
              marginBottom: 12,
              opacity: 0.34 + index * 0.1,
              textShadow: '0 0 12px rgba(79, 231, 255, 0.16)',
            }}
          >
            {line}
          </div>
        ))}
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 72,
          width: 380,
          padding: '18px 20px',
          borderRadius: 18,
          border: '1px solid rgba(84, 234, 255, 0.28)',
          background: 'linear-gradient(180deg, rgba(12,18,24,0.66), rgba(8,12,17,0.38))',
          boxShadow: '0 20px 40px rgba(0,0,0,0.24)',
        }}
      >
        <div
          style={{
            color: 'rgba(242,248,251,0.5)',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 11,
            letterSpacing: '0.16em',
            marginBottom: 10,
          }}
        >
          LIVE VOICE SIGNAL
        </div>
        <div
          style={{
            color: '#b5f3ff',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 18,
            lineHeight: 1.55,
            letterSpacing: '0.08em',
            whiteSpace: 'pre-wrap',
            textShadow: '0 0 14px rgba(79,231,255,0.18)',
          }}
        >
          {`MIC  >  INTENT  >  ROUTE\nFAQ  >  BOOKING >  CRM\n<< brand voice stays intact >>`}
        </div>
      </div>

      <Wave
        color="rgba(63, 239, 255, 0.95)"
        delay={0}
        path="M-20 228C74 162 154 116 236 138C324 162 400 286 486 280C572 274 644 144 738 132C810 124 888 166 980 178"
      />
      <Wave
        color="rgba(173, 101, 255, 0.88)"
        delay={34}
        amplitude={18}
        path="M-20 292C92 326 168 364 262 346C338 332 410 256 486 246C562 236 640 290 714 304C818 322 894 280 980 254"
      />
      <Wave
        color="rgba(111, 255, 147, 0.5)"
        delay={70}
        amplitude={8}
        path="M-20 208C86 214 174 196 258 204C330 212 398 236 484 236C568 236 642 210 724 202C824 192 906 210 980 216"
      />

      <div
        style={{
          position: 'absolute',
          top: 128,
          left: 160,
          width: 92,
          height: 92,
          borderRadius: 22,
          border: '1px solid rgba(84, 234, 255, 0.5)',
          background: 'rgba(14, 18, 24, 0.4)',
          boxShadow: `0 0 0 24px rgba(84, 234, 255, ${0.05 * pulse}), 0 0 0 60px rgba(84, 234, 255, ${0.018 * pulse}), 0 18px 30px rgba(0,0,0,0.24)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4ce8ff',
          fontSize: 48,
          fontWeight: 700,
          transform: `scale(${0.96 + entry * 0.06})`,
          opacity: 0.8 + entry * 0.2,
        }}
      >
        ◜◝
      </div>

      <div
        style={{
          position: 'absolute',
          inset: '14% 4% 12% auto',
          width: 2,
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)',
          opacity: 0.6,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: scan,
          width: 160,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(89, 238, 255, 0.08), transparent)',
          filter: 'blur(24px)',
          opacity: 0.44,
        }}
      />
    </AbsoluteFill>
  );
}

function MatrixTerminalComposition({ title, lines }: { title: string; lines: string[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerIn = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });
  const meterPulse = interpolate((frame + 20) % 120, [0, 60, 119], [0.55, 1, 0.55], {
    easing: Easing.inOut(Easing.sin),
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, rgba(7,10,14,1), rgba(5,7,10,1))',
        color: '#dff6ff',
        fontFamily: '"IBM Plex Mono", monospace',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 1,
          background: 'rgba(255,255,255,0.06)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 28,
          color: '#f5f8fb',
          fontFamily: 'var(--font-label)',
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '-0.06em',
          opacity: headerIn,
          transform: `translateY(${interpolate(headerIn, [0, 1], [18, 0])}px)`,
        }}
      >
        {title}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 92,
          left: 28,
          right: 340,
          display: 'grid',
          gap: 18,
        }}
      >
        {lines.map((line, index) => {
          const reveal = interpolate(frame, [index * 10, index * 10 + 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });

          return (
            <div
              key={line}
              style={{
                color: '#49e7ff',
                fontSize: 17,
                letterSpacing: '0.06em',
                opacity: reveal,
                transform: `translateX(${interpolate(reveal, [0, 1], [-18, 0])}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 54,
          right: 28,
          width: 300,
          height: 186,
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          background: 'rgba(16,18,23,0.92)',
          padding: '18px 18px 16px',
        }}
      >
        <div style={{ color: 'rgba(220,228,235,0.34)', fontSize: 10, letterSpacing: '0.14em' }}>RUNTIME HEALTH</div>
        {['Response Stability', 'Turn Accuracy', 'Prompt Safety', 'Fallback Logic'].map((row, index) => {
          const value = interpolate((frame + index * 14) % 140, [0, 70, 139], [0.42, 0.88, 0.42]);
          return (
            <div
              key={row}
              style={{
                marginTop: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'rgba(221,228,235,0.6)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                }}
              >
                <span>{row.toUpperCase()}</span>
                <span style={{ color: index % 2 === 0 ? '#70ff93' : '#48e8ff' }}>{Math.round(value * 100)}%</span>
              </div>
              <div
                style={{
                  height: 10,
                  marginTop: 8,
                  borderRadius: 999,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${value * 100}%`,
                    background: index % 2 === 0 ? 'rgba(112,255,147,0.85)' : 'rgba(72,232,255,0.9)',
                    boxShadow: `0 0 18px rgba(72,232,255,${0.16 * meterPulse})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 28,
          right: 28,
          bottom: 26,
          height: 1,
          background: 'linear-gradient(90deg, rgba(72,232,255,0.06), rgba(72,232,255,0.9), rgba(196,158,255,0.4))',
          opacity: 0.9,
        }}
      />
    </AbsoluteFill>
  );
}

function CommandDeckComposition({ accent = 'cyan' }: { accent?: 'cyan' | 'violet' | 'mint' }) {
  const frame = useCurrentFrame();
  const accentColor = accent === 'mint' ? '#76ff91' : accent === 'violet' ? '#c09cff' : '#4ae6ff';
  const signalColor = accent === 'mint' ? 'rgba(118,255,145,0.65)' : accent === 'violet' ? 'rgba(192,156,255,0.65)' : 'rgba(74,230,255,0.72)';

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 20% 30%, rgba(74,230,255,0.08), transparent 18%), linear-gradient(180deg, rgba(9,13,18,0.98), rgba(7,10,14,1))',
        overflow: 'hidden',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 900 280" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2].map((index) => {
          const yOffset = interpolate((frame + index * 18) % 180, [0, 90, 179], [-6, 10, -6]);
          return (
            <path
              key={index}
              d={`M0 ${120 + index * 34}C84 ${60 + index * 20} 180 ${170 - index * 8} 290 ${126 + index * 12}C390 ${88 - index * 10} 520 ${205 - index * 4} 640 ${148 + index * 8}C740 ${96 + index * 8} 826 ${160 - index * 6} 900 ${130 + index * 2}`}
              fill="none"
              stroke={signalColor}
              strokeWidth={2.5 - index * 0.3}
              opacity={0.82 - index * 0.18}
              style={{ transform: `translateY(${yOffset}px)` }}
            />
          );
        })}
      </svg>

      <div
        style={{
          position: 'absolute',
          left: 34,
          top: 24,
          color: accentColor,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 12,
          letterSpacing: '0.12em',
          opacity: 0.42,
        }}
      >
        {`voice_current // live_transcript // conversion_flow`}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 28,
          top: 30,
          display: 'grid',
          gap: 12,
        }}
      >
        {['Attention', 'Resolution', 'Capacity'].map((label, index) => {
          const progress = interpolate((frame + index * 20) % 120, [0, 60, 119], [0.34, 0.92, 0.34]);
          return (
            <div
              key={label}
              style={{
                minWidth: 170,
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                background: 'rgba(11,15,21,0.82)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'rgba(221,228,235,0.56)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                <span>{label}</span>
                <span style={{ color: accentColor }}>{Math.round(progress * 100)}%</span>
              </div>
              <div
                style={{
                  height: 8,
                  marginTop: 8,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.07)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    background: accentColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function PlayerFrame({ children }: { children: ReactNode }) {
  return <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>{children}</div>;
}

export function MatrixHeroPlayer({ className }: MatrixHeroPlayerProps) {
  return (
    <div className={className}>
      <PlayerFrame>
        <Player
          component={MatrixHeroComposition}
          durationInFrames={240}
          compositionWidth={960}
          compositionHeight={420}
          fps={30}
          acknowledgeRemotionLicense
          controls={false}
          autoPlay
          loop
          style={{ width: '100%', height: '100%' }}
        />
      </PlayerFrame>
    </div>
  );
}

export function MatrixTerminalPlayer({ className, title, lines }: MatrixTerminalPlayerProps) {
  return (
    <div className={className}>
      <PlayerFrame>
        <Player
          component={MatrixTerminalComposition}
          inputProps={{ title, lines }}
          durationInFrames={210}
          compositionWidth={1200}
          compositionHeight={320}
          fps={30}
          acknowledgeRemotionLicense
          controls={false}
          autoPlay
          loop
          style={{ width: '100%', height: '100%' }}
        />
      </PlayerFrame>
    </div>
  );
}

export function CommandDeckPlayer({ className, accent }: CommandDeckPlayerProps) {
  return (
    <div className={className}>
      <PlayerFrame>
        <Player
          component={CommandDeckComposition}
          inputProps={{ accent }}
          durationInFrames={180}
          compositionWidth={900}
          compositionHeight={280}
          fps={30}
          acknowledgeRemotionLicense
          controls={false}
          autoPlay
          loop
          style={{ width: '100%', height: '100%' }}
        />
      </PlayerFrame>
    </div>
  );
}
