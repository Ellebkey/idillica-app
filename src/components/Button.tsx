import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'salvia';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-burgundy-600 text-crema-100',
  secondary: 'bg-fill text-ink',
  outline: 'border-[1.5px] border-burgundy-600 bg-transparent text-burgundy-600',
  danger: 'border-[1.5px] border-rojo-600 bg-transparent text-rojo-600',
  salvia: 'bg-salvia-600 text-crema-100',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  sm?: boolean;
  block?: boolean;
}

/** Botón del handoff: primarios 54px, radio 14px, peso 700 */
export function Button({
  variant = 'primary',
  sm,
  block,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap transition-opacity'
        + ' disabled:opacity-45 active:opacity-85 [&_svg]:size-[18px] [&_svg]:flex-none',
        sm ? 'h-11 rounded-xl px-4 text-[14px]' : 'h-[54px] rounded-[14px] px-[18px] text-[15.5px]',
        block && 'w-full',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    />
  );
}
