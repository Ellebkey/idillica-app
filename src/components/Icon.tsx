import type { ComponentType, SVGProps } from 'react';

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface IconProps extends SVGProps<SVGSVGElement> {
  icon: IconType;
}

/** Heroicons outline con trazo 1.7 */
export function Icon({ icon: IconComponent, ...props }: IconProps) {
  return <IconComponent strokeWidth={1.7} aria-hidden="true" {...props} />;
}
