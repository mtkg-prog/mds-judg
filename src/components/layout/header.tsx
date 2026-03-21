'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/providers/session-provider';
import { logout } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';

const ROLE_LABEL: Record<string, string> = {
  admin: '管理者',
  manager: '上長',
  employee: '社員',
};

export function Header() {
  const pathname = usePathname();
  const user = useSession();

  if (pathname === '/login') return null;

  const navItems = [
    { href: '/', label: 'ダッシュボード' },
    { href: '/check', label: 'セルフチェック' },
    { href: '/360', label: '360度評価' },
    ...(user?.role === 'admin'
      ? [{ href: '/admin/employees', label: '社員管理' },
         { href: '/admin/accounts', label: 'アカウント管理' },
         { href: '/admin/360', label: '360管理' }]
      : []),
  ];

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="font-bold text-lg">
          MDS AI判定
        </Link>
        <nav className="flex gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm transition-colors hover:text-foreground',
                pathname === item.href
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user.employeeName || user.email}
              <span className="ml-1 text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                {ROLE_LABEL[user.role] || user.role}
              </span>
            </span>
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                ログアウト
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
