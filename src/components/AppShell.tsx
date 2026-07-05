// Shell de las 4 pantallas raíz: contenido + tab bar. Las pantallas de
// detalle/editor/wizard viven FUERA del shell (sin tab bar, con back "‹").
import { Outlet } from 'react-router-dom';
import { useOnline } from '../hooks/useOnline';
import { TabBar } from './TabBar';

export function AppShell() {
  const online = useOnline();

  return (
    <div className="flex h-full flex-col bg-surface">
      {!online && (
        <div className="flex-none bg-ambar-100 px-5 py-1.5 text-center text-[13px] font-bold text-ambar-600">
          Sin conexión
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
