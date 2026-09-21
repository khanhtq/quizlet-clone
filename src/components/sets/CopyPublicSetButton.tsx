'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2 } from 'lucide-react';

interface Props {
  slug: string;
}

export default function CopyPublicSetButton({ slug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCopy() {
    setLoading(true);
    try {
      const res = await fetch('/api/sets/clone-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/sets/${data.setId}`);
      } else {
        alert('Không thể sao chép học phần. Vui lòng thử lại.');
      }
    } catch {
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm min-h-[44px] cursor-pointer disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang sao chép...</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>Sao chép vào học phần của tôi</span>
        </>
      )}
    </button>
  );
}
