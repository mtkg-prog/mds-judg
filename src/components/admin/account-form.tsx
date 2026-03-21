'use client';

import { useActionState } from 'react';
import type { User, Employee } from '@prisma/client';
import {
  createAccount,
  updateAccount,
  type AccountFormState,
} from '@/app/actions/accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AccountFormProps {
  user?: (User & { employee: Employee | null }) | null;
  unlinkedEmployees?: Pick<Employee, 'id' | 'name'>[];
}

export function AccountForm({ user, unlinkedEmployees = [] }: AccountFormProps) {
  const action = user ? updateAccount : createAccount;
  const [state, formAction, isPending] = useActionState<
    AccountFormState,
    FormData
  >(action, {});

  const employeeOptions = [
    ...unlinkedEmployees,
    ...(user?.employee ? [{ id: user.employee.id, name: user.employee.name }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user ? 'アカウント編集' : 'アカウント作成'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {user && <input type="hidden" name="id" value={user.id} />}

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user?.email}
            />
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="6文字以上"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">ロール</Label>
            <select
              id="role"
              name="role"
              required
              defaultValue={user?.role ?? 'employee'}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="employee">社員</option>
              <option value="manager">上長</option>
              <option value="admin">管理者</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId">紐付け社員</Label>
            <select
              id="employeeId"
              name="employeeId"
              defaultValue={user?.employee?.id ?? ''}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">なし</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
