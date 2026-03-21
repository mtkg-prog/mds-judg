import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AccountTable } from '@/components/admin/account-table';
import { Button } from '@/components/ui/button';

export default async function AccountsPage() {
  const users = await prisma.user.findMany({
    include: { employee: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">アカウント管理</h1>
        <Link href="/admin/accounts/new">
          <Button>アカウント作成</Button>
        </Link>
      </div>
      <AccountTable users={users} />
    </div>
  );
}
