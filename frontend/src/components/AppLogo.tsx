import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export function AppLogo({ size = 40, className, showGlow = false }: AppLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Forex Session Radar"
      width={size}
      height={size}
      className={cn(
        'rounded-[22%] object-cover',
        showGlow && 'shadow-[0_0_28px_rgba(34,211,238,0.35)]',
        className
      )}
    />
  );
}
