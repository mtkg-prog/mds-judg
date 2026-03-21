'use client';

import { useActionState } from 'react';
import type { Employee } from '@prisma/client';
import {
  createEmployee,
  updateEmployee,
  type EmployeeFormState,
} from '@/app/actions/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { POSITIONS } from '@/lib/types';

interface EmployeeFormProps {
  employee?: Employee | null;
  employees?: Pick<Employee, 'id' | 'name'>[];
}

export function EmployeeForm({ employee, employees = [] }: EmployeeFormProps) {
  const action = employee ? updateEmployee : createEmployee;
  const [state, formAction, isPending] = useActionState<
    EmployeeFormState,
    FormData
  >(action, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{employee ? '社員編集' : '社員登録'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {employee && <input type="hidden" name="id" value={employee.id} />}

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeNumber">社員番号</Label>
              <Input
                id="employeeNumber"
                name="employeeNumber"
                required
                defaultValue={employee?.employeeNumber}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">氏名</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={employee?.name}
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
                defaultValue={employee?.department}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">役職</Label>
              <select
                id="position"
                name="position"
                required
                defaultValue={employee?.position}
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
                defaultValue={employee?.grade}
                placeholder="A1, L2 等"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={employee?.email}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerId">上長</Label>
            <select
              id="managerId"
              name="managerId"
              defaultValue={employee?.managerId ?? ''}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">なし</option>
              {employees
                .filter((e) => e.id !== employee?.id)
                .map((e) => (
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
