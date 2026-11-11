/**
 * La franja fina de arriba de la tienda. Con un mensaje queda quieta; con
 * varios, pasan de derecha a izquierda (se frena con el mouse encima, y no se
 * mueve si el celular tiene "reducir movimiento").
 *
 * Sin hooks: la usa el layout de la tienda y la vista previa del panel.
 */
export default function AnuncioBar({ mensajes }: { mensajes: string[] }) {
  if (!mensajes.length) return null;

  const franja =
    // En celu, letra y espaciado un poco más chicos: así "10% OFF pagando con
    // transferencia o efectivo" entra en un renglón en 390 px.
    "anuncio-franja overflow-hidden bg-red-600 text-[10px] font-bold uppercase leading-snug tracking-[0.1em] text-white sm:text-[11px] sm:tracking-[0.18em]";

  if (mensajes.length === 1) {
    return (
      <div className={franja} role="region" aria-label="Anuncio">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center">{mensajes[0]}</p>
      </div>
    );
  }

  // Dos copias iguales, cada una de al menos un ancho de pantalla: la pista
  // se corre la mitad (una copia) y vuelve a empezar sin que se note el salto.
  const largo = mensajes.join("").length;
  const segundos = Math.max(18, Math.round(largo * 0.4));
  const copia = (oculta: boolean) => (
    <ul
      aria-hidden={oculta || undefined}
      className="flex min-w-[100vw] shrink-0 items-center justify-around"
    >
      {mensajes.map((m, i) => (
        <li key={i} className="flex items-center whitespace-nowrap py-2">
          <span className="px-6">{m}</span>
          <span aria-hidden className="text-red-200">✦</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={franja} role="region" aria-label="Anuncios">
      <div className="anuncio-pista" style={{ animationDuration: `${segundos}s` }}>
        {copia(false)}
        {copia(true)}
      </div>
    </div>
  );
}
