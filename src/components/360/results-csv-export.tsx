'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResultsCsvExportProps {
  cycleId: string;
  cycleName: string;
}

/** CSVエクスポートボタン */
export function ResultsCsvExport({ cycleId, cycleName }: ResultsCsvExportProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/360/cycles/${cycleId}/results?format=csv`);
      if (!res.ok) throw new Error('CSV取得に失敗しました');

      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const filename = `360評価結果_${cycleName}_${today}.csv`;

      // ダウンロードリンクを生成
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSVダウンロードエラー:', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
      <Download className="size-4 mr-1" />
      {downloading ? 'ダウンロード中...' : 'CSV出力'}
    </Button>
  );
}
