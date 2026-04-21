'use client';

import { AlertCircle } from 'lucide-react';

export function ErrorBanner({ error }: { error: string }) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
      <AlertCircle size={16} />
      <span>{error}</span>
    </div>
  );
}
