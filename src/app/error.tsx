'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">エラーが発生しました</h2>
        <p className="text-sm text-muted-foreground mb-4">
          ページの読み込みに失敗しました。
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-700"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
