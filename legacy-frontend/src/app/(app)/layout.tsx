"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { navForRole } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/labels";
import { Spinner } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) return <Spinner />;
  if (!user) return <Spinner label="Redirigiendo…" />;

  const items = navForRole(user.role);

  function isActive(href: string): boolean {
    if (href === "/solicitudes/nueva") return pathname === "/solicitudes/nueva";
    if (href === "/solicitudes") {
      return (
        pathname === "/solicitudes" ||
        (pathname.startsWith("/solicitudes/") && pathname !== "/solicitudes/nueva")
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Monte Esmeralda</div>
        <nav>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="user-box">
          <div className="name">{user.full_name}</div>
          <div className="role">{ROLE_LABELS[user.role]}</div>
          <button
            className="btn-secondary"
            style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
