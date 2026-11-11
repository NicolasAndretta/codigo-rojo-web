// Lo que devuelven las actions del panel cuando algo no se pudo hacer.
//
// POR QUÉ EXISTE (11/11/2026): las actions avisaban los problemas lanzando un
// Error con el mensaje para Agustina ("Para activar la transferencia, cargá tu
// alias"). En desarrollo se veía bien, pero en producción Next no manda al
// navegador el mensaje de un error lanzado en el servidor: llegaba "Minified
// React error #441" (le pasó a Nico activando Cobros). Los problemas esperables
// se DEVUELVEN, y el panel los muestra tal cual.

export type Fallo = { ok: false; motivo: string };

export function fallo(motivo: string): Fallo {
  return { ok: false, motivo };
}

/** Error de la base: el detalle va al log del servidor, el motivo a Agustina. */
export function falloDeBase(error: { message: string }, motivo: string): Fallo {
  console.error(`[admin] ${motivo} — ${error.message}`);
  return fallo(motivo);
}

export function esFallo(r: unknown): r is Fallo {
  return (
    typeof r === "object" &&
    r !== null &&
    (r as { ok?: unknown }).ok === false &&
    typeof (r as { motivo?: unknown }).motivo === "string"
  );
}

/**
 * El texto para un error que no se esperaba. Si es el genérico de producción
 * (React no manda el mensaje real), uno en criollo.
 */
export function textoDeError(err: unknown, porDefecto = "No se pudo guardar. Probá de nuevo."): string {
  if (!(err instanceof Error) || !err.message) return porDefecto;
  if (/Minified React error|Server Components render|omitted in production/i.test(err.message)) {
    return porDefecto;
  }
  return err.message;
}
