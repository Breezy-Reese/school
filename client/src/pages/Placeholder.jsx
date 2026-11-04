import { useLocation } from 'react-router-dom';

export default function Placeholder() {
  const { pathname } = useLocation();
  return (
    <div>
      <h2 className="text-2xl font-bold capitalize">
        {pathname.split('/').filter(Boolean).join(' / ')}
      </h2>
      <p className="text-slate-500 mt-2">Coming soon.</p>
    </div>
  );
}