'use client';

import { useActionState } from 'react';
import { resetPassword, type AccountFormState } from '@/app/actions/accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState<
    AccountFormState,
    FormData
  >(resetPassword, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>パスワードリセット</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={userId} />

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">新しいパスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="6文字以上"
            />
          </div>

          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? 'リセット中...' : 'パスワードをリセット'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
