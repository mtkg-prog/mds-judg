import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { EmployeeTable } from '@/components/admin/employee-table';
import { Button } from '@/components/ui/button';

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { employeeNumber: 'asc' },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">社員管理</h1>
        <Link href="/admin/employees/new">
          <Button>社員登録</Button>
        </Link>
      </div>
      <EmployeeTable employees={employees} />
    </div>
  );
}
