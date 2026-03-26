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
import { POSITIONS } from '@/lib/types';

interface AccountFormProps {
  user?: (User & { employee: Employee | null }) | null;
  employees?: Pick<Employee, 'id' | 'name'>[];
}

export function AccountForm({ user, employees = [] }: AccountFormProps) {
  const action = user ? updateAccount : createAccount;
  const [state, formAction, isPending] = useActionState<
    AccountFormState,
    FormData
  >(action, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user ? 'アカウント編集' : 'アカウント作成'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          {user && <input type="hidden" name="id" value={user.id} />}

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

          {/* アカウント情報 */}
          <div className="space-y-4">
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
          </div>

          {/* 社員情報 */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">社員情報</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">社員番号</Label>
                <Input
                  id="employeeNumber"
                  name="employeeNumber"
                  required
                  defaultValue={user?.employee?.employeeNumber}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">氏名</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={user?.employee?.name}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">部署</Label>
                <Input
                  id="department"
                  name="department"
                  required
                  defaultValue={user?.employee?.department}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">役職</Label>
                <select
                  id="position"
                  name="position"
                  required
                  defaultValue={user?.employee?.position}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">選択してください</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">等級</Label>
                <Input
                  id="grade"
                  name="grade"
                  required
                  defaultValue={user?.employee?.grade}
                  placeholder="A1, L2 等"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="managerId">上長</Label>
                <select
                  id="managerId"
                  name="managerId"
                  defaultValue={user?.employee?.managerId ?? ''}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">なし</option>
                  {employees
                    .filter((e) => e.id !== user?.employee?.id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
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
