import type { InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export function FieldLabel({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1.5 block text-[13px] font-bold text-ink-2', className)} {...rest} />
  );
}

/** Caja de campo del handoff: 54px, radio 16px, borde crema-300, fondo card */
export const fieldShellClass =
  'flex h-[54px] w-full items-center gap-2.5 rounded-2xl border-[1.5px] border-line bg-card px-4'
  + ' text-[15.5px] text-ink focus-within:border-burgundy-600';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Prefijo visual (p. ej. "$") */
  prefix?: string;
  shellClassName?: string;
}

export function Field({ label, prefix, shellClassName, className, id, ...rest }: FieldProps) {
  return (
    <div className="min-w-0">
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <label className={cn(fieldShellClass, shellClassName)}>
        {prefix && <span className="font-bold text-ink-3">{prefix}</span>}
        <input
          id={id}
          className={cn('w-full min-w-0 bg-transparent outline-none placeholder:text-ink-3', className)}
          {...rest}
        />
      </label>
    </div>
  );
}
