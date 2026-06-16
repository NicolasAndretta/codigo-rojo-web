// Re-exporta desde CartContext para que todos los componentes
// compartan la misma instancia de estado.
export { useCart, type CartItem } from "@/lib/context/CartContext";
