import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AccountForm } from '@/components/admin/account-form';
import { ResetPasswordForm } from '@/components/admin/reset-password-form';
import { Button } from '@/components/ui/button';

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!user) notFound();

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
      <div className="space-y-6">
        <AccountForm user={user} employees={employees} />
        <ResetPasswordForm userId={user.id} />
      </div>
    </div>
  );
}
