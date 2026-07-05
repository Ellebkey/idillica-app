import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { CatalogoProvider } from './state/CatalogoContext';
import { AppShell } from './components';
import { LoginScreen } from './screens/login/LoginScreen';
import { InicioScreen } from './screens/inicio/InicioScreen';
import { RecetasScreen } from './screens/recetas/RecetasScreen';
import { EditorRecetaScreen } from './screens/recetas/EditorRecetaScreen';
import { FichaTecnicaScreen } from './screens/recetas/FichaTecnicaScreen';
import { IngredientesScreen } from './screens/ingredientes/IngredientesScreen';
import { IngredienteDetalleScreen } from './screens/ingredientes/IngredienteDetalleScreen';
import { NuevoIngredienteScreen } from './screens/ingredientes/NuevoIngredienteScreen';
import { WizardMermaScreen } from './screens/ingredientes/WizardMermaScreen';
import { PantallaImpactoScreen } from './screens/impacto/PantallaImpactoScreen';
import { AjustesScreen } from './screens/ajustes/AjustesScreen';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />

          <Route element={<RequireAuth />}>
            <Route
              element={
                <CatalogoProvider>
                  <Routes>
                    {/* Raíces CON tab bar */}
                    <Route element={<AppShell />}>
                      <Route path="/" element={<InicioScreen />} />
                      <Route path="/recetas" element={<RecetasScreen />} />
                      <Route path="/ingredientes" element={<IngredientesScreen />} />
                      <Route path="/ajustes" element={<AjustesScreen />} />
                    </Route>

                    {/* Detalle/editor/wizard SIN tab bar */}
                    <Route path="/recetas/:id" element={<EditorRecetaScreen />} />
                    <Route path="/recetas/:id/ficha" element={<FichaTecnicaScreen />} />
                    <Route path="/ingredientes/nuevo" element={<NuevoIngredienteScreen />} />
                    <Route path="/ingredientes/:id" element={<IngredienteDetalleScreen />} />
                    <Route path="/ingredientes/:id/merma" element={<WizardMermaScreen />} />
                    <Route path="/impacto" element={<PantallaImpactoScreen />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </CatalogoProvider>
              }
              path="*"
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
