import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

export default function useFetch(url, params, enabled = true) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const latest = useRef(0);
  const key = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++latest.current; // ignore out-of-order responses
    setLoading(true);
    try {
      const res = await api.get(url, { params });
      if (id === latest.current) { setData(res.data); setError(''); }
    } catch (e) {
      if (id === latest.current) setError(e.response?.data?.message || 'Failed to load data');
    } finally {
      if (id === latest.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, enabled]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}