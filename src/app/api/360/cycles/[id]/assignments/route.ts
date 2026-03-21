import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { load360Assignments } from '@/lib/master-data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id } = await params;
    const assignments = await prisma.evaluationAssignment.findMany({
      where: { cycleId: id },
      include: {
        evaluator: { select: { id: true, name: true, department: true } },
        evaluatee: { select: { id: true, name: true, department: true } },
      },
      orderBy: [{ evaluatee: { name: 'asc' } }, { relationship: 'asc' }],
    });

    return NextResponse.json({ success: true, assignments });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `割当取得エラー: ${e}` },
      { status: 500 }
    );
  }
}

interface AssignmentInput {
  evaluateeId: string;
  evaluators: { employeeId: string; relationship: string }[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id: cycleId } = await params;

    const cycle = await prisma.evaluationCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      return NextResponse.json({ success: false, error: 'サイクルが見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const { assignments: inputs, autoAssign, importFromSheet } = body as {
      assignments?: AssignmentInput[];
      autoAssign?: boolean;
      importFromSheet?: boolean;
    };

    if (importFromSheet) {
      return await handleSheetImport(cycleId);
    }

    if (autoAssign) {
      return await handleAutoAssign(cycleId);
    }

    if (!inputs || inputs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'assignments, autoAssign, または importFromSheet が必要です' },
        { status: 400 }
      );
    }

    const data = inputs.flatMap((input) =>
      input.evaluators.map((ev) => ({
        cycleId,
        evaluateeId: input.evaluateeId,
        evaluatorId: ev.employeeId,
        relationship: ev.relationship,
      }))
    );

    let created = 0;
    for (const d of data) {
      const exists = await prisma.evaluationAssignment.findUnique({
        where: { cycleId_evaluatorId_evaluateeId: { cycleId: d.cycleId, evaluatorId: d.evaluatorId, evaluateeId: d.evaluateeId } },
      });
      if (!exists) {
        await prisma.evaluationAssignment.create({ data: d });
        created++;
      }
    }

    return NextResponse.json({ success: true, created }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `割当作成エラー: ${e}` },
      { status: 500 }
    );
  }
}

async function handleAutoAssign(cycleId: string) {
  const employees = await prisma.employee.findMany({
    select: { id: true, managerId: true, department: true },
  });

  const data: { cycleId: string; evaluateeId: string; evaluatorId: string; relationship: string }[] = [];

  for (const emp of employees) {
    // 本人（self）
    data.push({ cycleId, evaluateeId: emp.id, evaluatorId: emp.id, relationship: '本人' });

    // 上司（manager evaluates subordinate）
    if (emp.managerId) {
      data.push({ cycleId, evaluateeId: emp.id, evaluatorId: emp.managerId, relationship: '上司' });
    }

    // 部下（subordinates evaluate manager）
    const subordinates = employees.filter((e) => e.managerId === emp.id);
    for (const sub of subordinates) {
      data.push({ cycleId, evaluateeId: emp.id, evaluatorId: sub.id, relationship: '部下' });
    }

    // 同僚（same department, excluding manager/subordinates/self）
    const peers = employees.filter(
      (e) =>
        e.id !== emp.id &&
        e.department === emp.department &&
        e.id !== emp.managerId &&
        e.managerId !== emp.id
    );
    for (const peer of peers) {
      data.push({ cycleId, evaluateeId: emp.id, evaluatorId: peer.id, relationship: '同僚' });
    }
  }

  let created = 0;
  for (const d of data) {
    const exists = await prisma.evaluationAssignment.findUnique({
      where: { cycleId_evaluatorId_evaluateeId: { cycleId: d.cycleId, evaluatorId: d.evaluatorId, evaluateeId: d.evaluateeId } },
    });
    if (!exists) {
      await prisma.evaluationAssignment.create({ data: d });
      created++;
    }
  }

  return NextResponse.json({ success: true, created }, { status: 201 });
}

function normalizeEmployeeNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  return digits.padStart(4, '0');
}

async function handleSheetImport(cycleId: string) {
  const rows = await load360Assignments();
  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: '360assignシートにデータがありません。シートタブが存在し、データが入力されているか確認してください' },
      { status: 400 }
    );
  }

  const employees = await prisma.employee.findMany({
    select: { id: true, employeeNumber: true },
  });

  // Build normalized employeeNumber -> id map
  const numberToId = new Map<string, string>();
  for (const emp of employees) {
    numberToId.set(normalizeEmployeeNumber(emp.employeeNumber), emp.id);
  }

  // Validate all employee numbers (normalized)
  const unmatchedNumbers: string[] = [];
  for (const row of rows) {
    const evaluateeNum = normalizeEmployeeNumber(row.evaluateeNumber);
    const evaluatorNum = normalizeEmployeeNumber(row.evaluatorNumber);
    if (!numberToId.has(evaluateeNum)) unmatchedNumbers.push(row.evaluateeNumber);
    if (!numberToId.has(evaluatorNum)) unmatchedNumbers.push(row.evaluatorNumber);
  }

  if (unmatchedNumbers.length > 0) {
    const unique = [...new Set(unmatchedNumbers)];
    return NextResponse.json(
      { success: false, error: `以下の社員番号が見つかりません: ${unique.join(', ')}` },
      { status: 400 }
    );
  }

  // Build assignment data from sheet rows
  const data: { cycleId: string; evaluateeId: string; evaluatorId: string; relationship: string }[] = [];

  for (const row of rows) {
    data.push({
      cycleId,
      evaluateeId: numberToId.get(normalizeEmployeeNumber(row.evaluateeNumber))!,
      evaluatorId: numberToId.get(normalizeEmployeeNumber(row.evaluatorNumber))!,
      relationship: row.relationship,
    });
  }

  // Auto-generate self-evaluations for all evaluatees
  const evaluateeIds = [...new Set(data.map((d) => d.evaluateeId))];
  for (const evaluateeId of evaluateeIds) {
    data.push({ cycleId, evaluateeId, evaluatorId: evaluateeId, relationship: '本人' });
  }

  // Insert with duplicate check
  let created = 0;
  for (const d of data) {
    const exists = await prisma.evaluationAssignment.findUnique({
      where: { cycleId_evaluatorId_evaluateeId: { cycleId: d.cycleId, evaluatorId: d.evaluatorId, evaluateeId: d.evaluateeId } },
    });
    if (!exists) {
      await prisma.evaluationAssignment.create({ data: d });
      created++;
    }
  }

  return NextResponse.json({ success: true, created }, { status: 201 });
}
