import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, email, name, passwordHash, role, employeeCode } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    if (action === "create") {
      const existing = await prisma.user.findUnique({
        where: { email },
        include: { employee: true },
      });

      if (existing) {
        let updated = false;

        // User は存在するが Employee が無い場合は Employee を作成
        if (!existing.employee) {
          const empNumber = employeeCode || email.split("@")[0];
          const empExists = await prisma.employee.findUnique({ where: { employeeNumber: empNumber } });
          if (!empExists) {
            await prisma.employee.create({
              data: {
                employeeNumber: empNumber,
                name: name || email.split("@")[0],
                department: "",
                position: "",
                grade: "",
                email,
                userId: existing.id,
              },
            });
            updated = true;
          }
        }

        // パスワードがランダムUUID由来の場合、初期パスワードで上書き
        if (passwordHash) {
          await prisma.user.update({
            where: { email },
            data: { passwordHash },
          });
          updated = true;
        } else if (existing.mustChangePassword) {
          // hr-faq 側で未変更 → 初期パスワード「password」に揃える
          const defaultHash = await hashPassword("password");
          await prisma.user.update({
            where: { email },
            data: { passwordHash: defaultHash },
          });
          updated = true;
        }

        return NextResponse.json({
          status: updated ? "updated" : "skipped",
          reason: updated ? undefined : "already exists",
        });
      }

      // mds-judg の User.passwordHash は required なので、
      // パスワードがない場合は初期パスワード「password」のハッシュを設定
      const hash = passwordHash || await hashPassword("password");

      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          role: role || "employee",
          mustChangePassword: true,
        },
      });

      // Employee レコードも作成
      const empNumber = employeeCode || email.split("@")[0];
      const empExists = await prisma.employee.findUnique({ where: { employeeNumber: empNumber } });
      if (!empExists) {
        await prisma.employee.create({
          data: {
            employeeNumber: empNumber,
            name: name || email.split("@")[0],
            department: "",
            position: "",
            grade: "",
            email,
            userId: newUser.id,
          },
        });
      }

      return NextResponse.json({ status: "created" }, { status: 201 });
    }

    if (action === "update-password") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ status: "skipped", reason: "user not found" });
      }

      // passwordHash が null の場合（hr-faqでリセットされた場合）、
      // 初期パスワード「password」のハッシュを設定して mustChangePassword=true にする
      const hash = passwordHash || await hashPassword("password");

      await prisma.user.update({
        where: { email },
        data: {
          passwordHash: hash,
          mustChangePassword: passwordHash == null,
        },
      });

      return NextResponse.json({ status: "updated" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("sync-user エラー:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
