import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Card del handoff: radio 20px, borde 1.5px, sombra sutil burgundy */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[20px] border-[1.5px] border-line bg-card shadow-[0_2px_8px_rgba(94,26,25,0.05)]',
        className,
      )}
      {...rest}
    />
  );
}
