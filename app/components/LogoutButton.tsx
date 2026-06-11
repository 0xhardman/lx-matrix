"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Full reload so the server re-renders nav/pages without the session.
    window.location.assign("/login");
  }
  return (
    <button
      onClick={logout}
      className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-alternate hover:text-foreground"
    >
      退出
    </button>
  );
}
