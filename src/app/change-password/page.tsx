'use client';

import { useActionState } from 'react';
import { changePassword, type ChangePasswordState } from '@/app/actions/change-password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    {},
  );

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">パスワード変更</CardTitle>
          <CardDescription className="text-center">
            初回ログインのため、パスワードを変更してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                {state.error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
                placeholder="6文字以上"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? '変更中...' : 'パスワードを変更'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
