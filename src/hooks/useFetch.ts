import { useCallback, useEffect, useRef, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Fetch declarativo con recarga; ignora respuestas obsoletas al cambiar deps */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[]): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    fetcher().then(
      (result) => {
        if (gen === generation.current) {
          setData(result);
          setLoading(false);
        }
      },
      (err: unknown) => {
        if (gen === generation.current) {
          setError(err instanceof Error ? err.message : 'Error');
          setLoading(false);
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

/** Valor con debounce (búsquedas en vivo) */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
