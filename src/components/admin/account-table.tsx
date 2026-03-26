'use client';

import Link from 'next/link';
import type { User, Employee } from '@prisma/client';
import { deleteAccount } from '@/app/actions/accounts';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ROLE_LABEL: Record<string, string> = {
  admin: '管理者',
  manager: '上長',
  employee: '社員',
};

interface AccountTableProps {
  users: (User & { employee: Employee | null })[];
}

export function AccountTable({ users }: AccountTableProps) {
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>社員番号</TableHead>
          <TableHead>氏名</TableHead>
          <TableHead>メールアドレス</TableHead>
          <TableHead>部署</TableHead>
          <TableHead>役職</TableHead>
          <TableHead>ロール</TableHead>
          <TableHead>作成日</TableHead>
          <TableHead className="w-[100px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              アカウントがありません
            </TableCell>
          </TableRow>
        )}
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.employee?.employeeNumber ?? '-'}</TableCell>
            <TableCell>{user.employee?.name ?? '-'}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.employee?.department ?? '-'}</TableCell>
            <TableCell>{user.employee?.position ?? '-'}</TableCell>
            <TableCell>
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                {ROLE_LABEL[user.role] || user.role}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {user.createdAt.toLocaleDateString('ja-JP')}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Link href={`/admin/accounts/${user.id}`}>
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                </Link>
                <form
                  action={async () => {
                    if (confirm(`${user.email} を削除しますか？`)) {
                      await deleteAccount(user.id);
                    }
                  }}
                >
                  <Button variant="outline" size="sm" type="submit">
                    削除
                  </Button>
                </form>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
