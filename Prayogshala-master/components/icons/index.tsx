import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };
}

/* Brand mark: a bracketed bench with a single drop. */
export function LogoMark({ size = 28, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <rect x="1.5" y="1.5" width="29" height="29" rx="6" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8h14M12 8v7.5L7.5 23.5A1 1 0 0 0 8.4 25h15.2a1 1 0 0 0 .9-1.5L20 15.5V8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 21h12" stroke="#fe5b2a" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconFlask(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 3h6M10 3v6.5L4.6 19.2A1.2 1.2 0 0 0 5.7 21h12.6a1.2 1.2 0 0 0 1.1-1.8L14 9.5V3" />
      <path d="M7.5 16h9" />
    </svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H13L13 2Z" />
    </svg>
  );
}

export function IconPendulum(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 3h16M12 3v3" />
      <path d="M12 6l4.5 9" />
      <circle cx="17.5" cy="17.5" r="3" />
      <path d="M12 6l-4.5 9" strokeDasharray="2 3" opacity=".5" />
    </svg>
  );
}

export function IconFunnel(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
    </svg>
  );
}

export function IconMicroscope(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 3h3l1 2-1 2H9L8 5l1-2Z" />
      <path d="M10.5 7v6" />
      <path d="M6 13h9a4 4 0 0 1 4 4v1" />
      <path d="M4 21h16" />
      <path d="M8 17l-1 4M13 17l1 4" />
      <path d="M10.5 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

export function IconDroplet(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2.5s6.5 7 6.5 12a6.5 6.5 0 0 1-13 0c0-5 6.5-12 6.5-12Z" />
      <path d="M9 14.5a3 3 0 0 0 3 3" opacity=".6" />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20.5s-8-4.7-8-11a4.2 4.2 0 0 1 8-1.8 4.2 4.2 0 0 1 8 1.8c0 6.3-8 11-8 11Z" />
      <path d="M4 11h4l1.5-2.5L12 13l1.5-2h6.5" />
    </svg>
  );
}

export function IconSpring(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 3h14M12 3v2" />
      <path d="M12 5c-3 0-3 1.3 0 1.3s3 1.3 0 1.3-3 1.3 0 1.3 3 1.3 0 1.3-3 1.3 0 1.3 3 1.3 0 1.3-3 1.3 0 1.3 3 1.3 0 1.3" />
      <path d="M12 15.5v1.5" />
      <rect x="8.5" y="17" width="7" height="4.5" rx="1" />
    </svg>
  );
}

export function IconPrism(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 21 20H3L12 3Z" />
      <path d="M2 11h6.5" />
      <path d="M14.5 15.5 22 14M14.5 16.5 22 17.5M14.5 14.5 22 10.5" stroke="#fe5b2a" opacity=".9" />
    </svg>
  );
}

export function IconElectrolysis(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
      <path d="M4 13h16" opacity=".5" />
      <path d="M8 3v11M16 3v11" />
      <path d="M6 3h4M14 3h4" />
      <circle cx="8" cy="17" r=".7" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="19" r=".7" fill="currentColor" stroke="none" />
      <circle cx="16" cy="18" r=".7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconLeaf(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 4c-9 0-15 5-15 12 0 1.5.3 2.7.8 3.6C9 16 12 12 20 4Z" />
      <path d="M5.8 19.6C9 16 12 12 20 4" />
      <path d="M9 20.5c3.5-.3 7-2 9-6" opacity=".5" />
    </svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function IconArrowReturn(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4v7a3 3 0 0 0 3 3h11M15 10l4 4-4 4" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.3 3 14.7 0 18M12 3c-3 3.3-3 14.7 0 18" />
    </svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconGrip(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="2.5" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4.5v15l12-7.5-12-7.5Z" />
    </svg>
  );
}

export function IconReset(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
    </svg>
  );
}

export function IconFlame(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3c1 3 4 4.5 4 9a4 4 0 0 1-8 0c0-1.5.5-2.5 1.2-3.3C9.5 10.5 10.5 12 11 12c.5-2 0-5 1-9Z" />
    </svg>
  );
}

export function IconAward(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4 19h16" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

export const EXPERIMENT_ICON_MAP = {
  flask: IconFlask,
  zap: IconBolt,
  pendulum: IconPendulum,
  filter: IconFunnel,
  microscope: IconMicroscope,
  droplets: IconDroplet,
  heart: IconHeart,
  spring: IconSpring,
  prism: IconPrism,
  electrolysis: IconElectrolysis,
  leaf: IconLeaf,
} as const;

export type ExperimentIconName = keyof typeof EXPERIMENT_ICON_MAP;
