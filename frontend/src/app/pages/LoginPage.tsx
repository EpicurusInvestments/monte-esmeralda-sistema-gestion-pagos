/** Placeholder de /login. La autenticación real (port de `auth.tsx` + formulario con
 *  RHF + Zod contra POST /auth/login) llega en el siguiente incremento.
 */

export function LoginPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Iniciar sesión</h1>
      <p style={{ color: "#6b7280" }}>
        Pantalla pendiente: se implementa al portar <code>auth.tsx</code>.
      </p>
    </main>
  );
}
