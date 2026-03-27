import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div className="w-full max-w-sm h-48 animate-pulse bg-gray-100 rounded-lg" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
