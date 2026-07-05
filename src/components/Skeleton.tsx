import { cn } from '../lib/cn';

/** Bloque de carga con shimmer (utilidad .skel) */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skel', className)} />;
}
