/** Comprobación previa a los e2e: el backend tiene que estar arriba y sembrado.
 *
 * Sin esto, un backend apagado se manifiesta como un login que «no responde» y cuesta
 * diagnosticar. Aquí falla de inmediato con la instrucción exacta para levantarlo.
 *
 * También avisa si el backend está apuntando a SQL Server: los e2e **crean y modifican datos**
 * (solicitudes, adjuntos, transiciones), así que deben correr contra la SQLite local y nunca
 * contra la instancia de AWS, que es la base oficial y está compartida.
 */

const API = process.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const COMO_LEVANTARLO = `
El backend no responde en ${API}. Los e2e lo necesitan corriendo y sembrado:

  cd backend
  # .env con DB_BACKEND=sqlite  (¡nunca sqlserver para pruebas!)
  alembic upgrade head
  python -m app.seed
  uvicorn app.main:app --reload
`;

async function globalSetup(): Promise<void> {
  let resp: Response;
  try {
    resp = await fetch(`${API}/health`);
  } catch {
    throw new Error(COMO_LEVANTARLO);
  }
  if (!resp.ok) throw new Error(COMO_LEVANTARLO);

  // El seed tiene que estar aplicado: sin usuarios no hay forma de iniciar sesión.
  const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@monteesmeralda.mx",
      password: "admin123",
    }),
  });
  if (!login.ok) {
    throw new Error(
      `El backend responde en ${API} pero el usuario semilla no inicia sesión ` +
        `(HTTP ${login.status}). ¿Falta 'python -m app.seed'?`,
    );
  }
}

export default globalSetup;
