'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>エラーが発生しました</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>サーバーでエラーが発生しました。</p>
          <button
            onClick={() => reset()}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
