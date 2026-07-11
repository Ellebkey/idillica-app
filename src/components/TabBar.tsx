// Tab bar del handoff: 88px, translúcida con blur, visible SOLO en las 5
// pantallas raíz. Activo burgundy, inactivo topo (variables por tema).
import { NavLink } from 'react-router-dom';
import {
  AdjustmentsHorizontalIcon,
  BookOpenIcon,
  CubeIcon,
  HomeIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { Icon, type IconType } from './Icon';

interface TabItem {
  to: string;
  label: string;
  icon: IconType;
  end?: boolean;
}

const TABS: TabItem[] = [
  { to: '/', label: 'Inicio', icon: HomeIcon, end: true },
  { to: '/recetas', label: 'Recetas', icon: BookOpenIcon },
  { to: '/ingredientes', label: 'Ingredientes', icon: ShoppingBagIcon },
  { to: '/inventario', label: 'Inventario', icon: CubeIcon },
  { to: '/ajustes', label: 'Ajustes', icon: AdjustmentsHorizontalIcon },
];

export function TabBar() {
  return (
    <nav
      className="flex-none border-t-[1.5px] border-line pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      style={{ background: 'var(--tab-bg)' }}
    >
      <div className="flex h-[88px] items-stretch px-1 pb-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className="flex flex-1 flex-col items-center justify-center gap-1"
            style={({ isActive }) => ({ color: isActive ? 'var(--tab-active)' : 'var(--tab-inactive)' })}
          >
            <Icon icon={tab.icon} className="h-6 w-6" />
            <span className="text-[11px] font-bold">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
