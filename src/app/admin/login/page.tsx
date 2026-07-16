import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center">
          <p className="text-sm text-neutral-500">Loading secure login...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
