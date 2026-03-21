'use client';

import Link from 'next/link';
import type { Employee } from '@prisma/client';
import { deleteEmployee } from '@/app/actions/employees';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EmployeeTableProps {
  employees: (Employee & { user: { email: string } | null })[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>社員番号</TableHead>
          <TableHead>氏名</TableHead>
          <TableHead>部署</TableHead>
          <TableHead>役職</TableHead>
          <TableHead>等級</TableHead>
          <TableHead>アカウント</TableHead>
          <TableHead className="w-[100px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              社員が登録されていません
            </TableCell>
          </TableRow>
        )}
        {employees.map((emp) => (
          <TableRow key={emp.id}>
            <TableCell>{emp.employeeNumber}</TableCell>
            <TableCell>{emp.name}</TableCell>
            <TableCell>{emp.department}</TableCell>
            <TableCell>{emp.position}</TableCell>
            <TableCell>{emp.grade}</TableCell>
            <TableCell>
              {emp.user ? (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                  あり
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                  なし
                </span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Link href={`/admin/employees/${emp.id}`}>
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                </Link>
                <form
                  action={async () => {
                    if (confirm(`${emp.name} を削除しますか？`)) {
                      await deleteEmployee(emp.id);
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
  );
}
