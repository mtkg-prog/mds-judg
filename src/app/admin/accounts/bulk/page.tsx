'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AccountRow {
  email: string;
  role: string;
  employeeNumber: string;
}

interface BulkResult {
  created: number;
  skipped: number;
  errors: { email: string; error: string }[];
}

function parseCSV(text: string): AccountRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf('email');
  const roleIdx = header.indexOf('role');
  const empIdx = header.findIndex((h) => h === 'employeenumber' || h === 'employee_number');

  if (emailIdx === -1 || roleIdx === -1) return [];

  return lines.slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      return {
        email: cols[emailIdx] || '',
        role: cols[roleIdx] || 'employee',
        employeeNumber: empIdx !== -1 ? cols[empIdx] || '' : '',
      };
    })
    .filter((row) => row.email);
}

export default function BulkAccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [result, setResult] = useState<BulkResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setError('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError('CSVの形式が正しくありません。email, role のカラムが必要です。');
        setAccounts([]);
        return;
      }
      setAccounts(parsed);
    };
    reader.readAsText(file);
  }, []);

  const handleSubmit = async () => {
    if (accounts.length === 0) {
      setError('CSVファイルを選択してください');
      return;
    }
    if (defaultPassword.length < 6) {
      setError('パスワードは6文字以上にしてください');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/admin/accounts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts, defaultPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'エラーが発生しました');
        return;
      }

      const data: BulkResult = await res.json();
      setResult(data);
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">アカウント一括作成</h1>
        <Link href="/admin/accounts">
          <Button variant="outline">戻る</Button>
        </Link>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>CSVファイル</CardTitle>
            <CardDescription>
              カラム: email, role, employeeNumber（任意）。roleは admin / manager / employee のいずれか。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              {fileName && (
                <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultPassword">共通初期パスワード</Label>
              <Input
                id="defaultPassword"
                type="password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="6文字以上"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                全アカウントに共通の初期パスワードが設定されます。初回ログイン時にパスワード変更が強制されます。
              </p>
            </div>
          </CardContent>
        </Card>

        {accounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>プレビュー（{accounts.length}件）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">メール</th>
                      <th className="text-left py-2 px-2">ロール</th>
                      <th className="text-left py-2 px-2">社員番号</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-1 px-2">{row.email}</td>
                        <td className="py-1 px-2">{row.role}</td>
                        <td className="py-1 px-2">{row.employeeNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {accounts.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ...他 {accounts.length - 20} 件
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>結果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4">
                <div className="bg-green-50 text-green-700 rounded-md px-4 py-2">
                  作成: {result.created}件
                </div>
                <div className="bg-yellow-50 text-yellow-700 rounded-md px-4 py-2">
                  スキップ（重複）: {result.skipped}件
                </div>
                {result.errors.length > 0 && (
                  <div className="bg-red-50 text-red-700 rounded-md px-4 py-2">
                    エラー: {result.errors.length}件
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">エラー詳細:</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-600">
                      {err.email}: {err.error}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || accounts.length === 0}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? '作成中...' : `${accounts.length}件のアカウントを作成`}
        </Button>
      </div>
    </div>
  );
}
