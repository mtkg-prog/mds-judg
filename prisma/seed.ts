import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('password123', 10);

  // 管理者アカウント
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: 'admin',
    },
  });
  console.log('Admin user:', admin.email);

  // ダミー社員データ
  const employees = [
    {
      employeeNumber: 'EMP001',
      name: '田中太郎',
      department: '営業部',
      position: '課長',
      grade: 'L3',
      email: 'tanaka@example.com',
      role: 'manager',
    },
    {
      employeeNumber: 'EMP002',
      name: '佐藤花子',
      department: '営業部',
      position: 'チーフ',
      grade: 'A3',
      email: 'sato@example.com',
      role: 'employee',
    },
    {
      employeeNumber: 'EMP003',
      name: '鈴木一郎',
      department: '開発部',
      position: 'ユニットマネージャー',
      grade: 'U2',
      email: 'suzuki@example.com',
      role: 'manager',
    },
    {
      employeeNumber: 'EMP004',
      name: '高橋美咲',
      department: '開発部',
      position: '担当',
      grade: 'A1',
      email: 'takahashi@example.com',
      role: 'employee',
    },
    {
      employeeNumber: 'EMP005',
      name: '山田健一',
      department: '経営企画部',
      position: '本部長',
      grade: 'D1',
      email: 'yamada@example.com',
      role: 'admin',
    },
  ];

  for (const emp of employees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        passwordHash: userHash,
        role: emp.role,
      },
    });

    await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: {},
      create: {
        employeeNumber: emp.employeeNumber,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        grade: emp.grade,
        email: emp.email,
        userId: user.id,
      },
    });

    console.log(`Employee: ${emp.name} (${emp.email})`);
  }

  // 上長関係を設定
  const tanaka = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP001' } });
  const suzuki = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP003' } });

  if (tanaka) {
    await prisma.employee.update({
      where: { employeeNumber: 'EMP002' },
      data: { managerId: tanaka.id },
    });
  }

  if (suzuki) {
    await prisma.employee.update({
      where: { employeeNumber: 'EMP004' },
      data: { managerId: suzuki.id },
    });
  }

  console.log('Manager relations set: EMP002→EMP001, EMP004→EMP003');

  // --- 360度評価ダミーデータ ---
  const sato = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP002' } });
  const takahashi = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP004' } });

  if (!tanaka || !sato || !suzuki || !takahashi) {
    console.log('Skip 360 seed: employees not found');
    return;
  }

  // 評価サイクル作成
  const cycle = await prisma.evaluationCycle.create({
    data: {
      name: '2025年度上期 360度評価',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-09-30'),
      status: 'closed',
    },
  });
  console.log('Evaluation cycle:', cycle.name);

  // 割当と回答のデータ
  const assignmentData = [
    {
      evaluatorId: tanaka.id, evaluateeId: tanaka.id, relationship: '本人',
      scores: { leadership: 3, communication: 4, teamwork: 4, problem_solving: 3, expertise: 4 },
      comment: '自分なりにチームをまとめられたと思うが、もう少し部下への声かけを増やしたい。',
    },
    {
      evaluatorId: sato.id, evaluateeId: tanaka.id, relationship: '部下',
      scores: { leadership: 4, communication: 5, teamwork: 4, problem_solving: 4, expertise: 3 },
      comment: '的確な指示をくださり、困ったときも相談しやすい雰囲気を作ってくれます。',
    },
    {
      evaluatorId: suzuki.id, evaluateeId: tanaka.id, relationship: '同僚',
      scores: { leadership: 4, communication: 4, teamwork: 3, problem_solving: 4, expertise: 4 },
      comment: '営業部門のリーダーとして安定感がある。部門間連携がさらに良くなるとよい。',
    },
    {
      evaluatorId: sato.id, evaluateeId: sato.id, relationship: '本人',
      scores: { leadership: 3, communication: 3, teamwork: 4, problem_solving: 3, expertise: 3 },
      comment: 'まだ経験が浅いが、チームワークを大切にして取り組んでいる。',
    },
    {
      evaluatorId: tanaka.id, evaluateeId: sato.id, relationship: '上司',
      scores: { leadership: 4, communication: 3, teamwork: 5, problem_solving: 3, expertise: 3 },
      comment: '協調性が高く、チームの潤滑油的な存在。主体性がもう少し出ると良い。',
    },
    {
      evaluatorId: suzuki.id, evaluateeId: suzuki.id, relationship: '本人',
      scores: { leadership: 4, communication: 4, teamwork: 4, problem_solving: 4, expertise: 5 },
      comment: '技術力を活かしてチームを引っ張れている。マネジメントスキルも伸ばしたい。',
    },
    {
      evaluatorId: takahashi.id, evaluateeId: suzuki.id, relationship: '部下',
      scores: { leadership: 5, communication: 4, teamwork: 5, problem_solving: 4, expertise: 4 },
      comment: '技術的なアドバイスが的確で、成長を実感できる環境を作ってくれています。',
    },
    {
      evaluatorId: tanaka.id, evaluateeId: suzuki.id, relationship: '同僚',
      scores: { leadership: 3, communication: 4, teamwork: 4, problem_solving: 5, expertise: 4 },
      comment: '技術的な課題解決力が非常に高い。営業側との連携にも積極的で助かる。',
    },
    {
      evaluatorId: takahashi.id, evaluateeId: takahashi.id, relationship: '本人',
      scores: { leadership: 3, communication: 3, teamwork: 4, problem_solving: 3, expertise: 3 },
      comment: '入社して間もないが、先輩方のサポートのおかげで少しずつ成長できている。',
    },
    {
      evaluatorId: suzuki.id, evaluateeId: takahashi.id, relationship: '上司',
      scores: { leadership: 4, communication: 4, teamwork: 5, problem_solving: 3, expertise: 4 },
      comment: '素直で学習意欲が高い。基礎をしっかり固めて、今後の活躍に期待。',
    },
  ];

  for (const a of assignmentData) {
    const assignment = await prisma.evaluationAssignment.create({
      data: {
        cycleId: cycle.id,
        evaluatorId: a.evaluatorId,
        evaluateeId: a.evaluateeId,
        relationship: a.relationship,
        status: 'submitted',
      },
    });

    await prisma.evaluationResponse.create({
      data: {
        assignmentId: assignment.id,
        cycleId: cycle.id,
        evaluateeId: a.evaluateeId,
        relationship: a.relationship,
        scores: JSON.stringify(a.scores),
        comment: a.comment,
      },
    });
  }

  console.log(`360 evaluation: ${assignmentData.length} assignments + responses created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
