'use client';

import { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname === '/login') return null;

  const faqUrl = process.env.NEXT_PUBLIC_FAQ_URL;

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
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-bold text-lg">
          MDS AI判定
        </Link>
        <nav className="hidden md:flex gap-4">
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
          {faqUrl && (
            <a
              href={faqUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              FAQ
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </nav>
        {user && (
          <div className="ml-auto hidden md:flex items-center gap-3">
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
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニュー"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </Button>
      </div>
      {menuOpen && (
        <div className="border-t md:hidden px-4 pb-4 space-y-2">
          <nav className="flex flex-col gap-1 pt-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'text-sm py-2 px-2 rounded transition-colors hover:bg-gray-100',
                  pathname === item.href
                    ? 'text-foreground font-medium bg-gray-50'
                    : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
            {faqUrl && (
              <a
                href={faqUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="text-sm py-2 px-2 rounded text-blue-600 hover:bg-gray-100 transition-colors"
              >
                FAQ ↗
              </a>
            )}
          </nav>
          {user && (
            <div className="flex items-center justify-between border-t pt-3">
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
      )}
    </header>
  );
}
