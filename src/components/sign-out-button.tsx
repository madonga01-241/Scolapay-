"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-ink"
    >
      Se déconnecter
    </button>
  );
} 
