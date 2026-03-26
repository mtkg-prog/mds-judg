import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AccountForm } from '@/components/admin/account-form';
import { Button } from '@/components/ui/button';

export default async function NewAccountPage() {
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <Link href="/admin/accounts">
          <Button variant="outline" size="sm">
            ← 戻る
          </Button>
        </Link>
      </div>
      <AccountForm employees={employees} />
    </div>
  );
}
