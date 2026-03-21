import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EmployeeForm } from '@/components/admin/employee-form';
import { Button } from '@/components/ui/button';

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <Link href="/admin/employees">
          <Button variant="outline" size="sm">
            ← 戻る
          </Button>
        </Link>
      </div>
      <EmployeeForm employee={employee} employees={employees} />
    </div>
  );
}
