'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')?.trim();
    if (code) {
      router.replace(`/pair?code=${encodeURIComponent(code)}`);
    } else {
      router.replace('/pair');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      Opening invite…
    </div>
  );
}
