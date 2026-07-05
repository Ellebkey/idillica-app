// Login — fondo crema, logo 200px, tagline del handoff.
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../lib/http';
import { Button, Field } from '../../components';

function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400 || err.status === 401 || err.status === 422) {
      return 'Correo o contraseña incorrectos.';
    }
    return 'Ocurrió un error. Intenta de nuevo.';
  }
  return 'No se pudo conectar con el servidor.';
}

export function LoginScreen() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(loginErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-auto bg-crema-50 px-6">
      <img src="/logo-crema.png" alt="Idílica" className="mb-2 w-[200px] rounded-3xl bg-burgundy-600 p-6" />
      <p className="mb-8 text-[14.5px] text-choco-400">Costeo de recetas, sin hojas de cálculo.</p>

      <form onSubmit={onSubmit} className="w-full max-w-[360px] space-y-3.5">
        <Field
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div role="alert" className="text-[13px] font-bold text-rojo-600">{error}</div>
        )}

        <Button type="submit" block disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar a mi cocina'}
        </Button>

        <button type="button" className="block w-full py-2 text-center text-[13.5px] font-bold text-burgundy-600">
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
  );
}
