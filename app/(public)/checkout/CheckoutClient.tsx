"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Store, AlertCircle, Tag, Check, X } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { formatPrice } from "@/lib/utils/format";
import { DELIVERY_POINT_OPTIONS } from "@/lib/delivery";
import { saveLastOrder } from "@/lib/checkout/lastOrder";
import type { DeliveryPoint } from "@/lib/types/database";

type ContactErrors = {
  name?: string;
  phone?: string;
  address?: string;
};

type CouponState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; code: string; amountOff: number }
  | { status: "invalid"; message: string };

export default function CheckoutClient() {
  const router = useRouter();
  const { items, totalPrice, totalItems, clearCart } = useCart();

  const [point, setPoint] = useState<DeliveryPoint>("haedo");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});

  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Carrito vacío → volver al carrito (en efecto, no durante el render)
  useEffect(() => {
    if (items.length === 0) router.replace("/carrito");
  }, [items.length, router]);

  const couponOff = coupon.status === "valid" ? coupon.amountOff : 0;
  const total = Math.max(0, totalPrice - couponOff);

  const isDomicilio = point === "domicilio";

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setCoupon({ status: "loading" });
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: totalPrice }),
      });
      const data = await res.json();
      if (data.valid) {
        setCoupon({ status: "valid", code, amountOff: data.amountOff });
      } else {
        setCoupon({ status: "invalid", message: data.error ?? "Cupón inválido" });
      }
    } catch {
      setCoupon({ status: "invalid", message: "No se pudo validar el cupón" });
    }
  }

  function clearCoupon() {
    setCouponCode("");
    setCoupon({ status: "idle" });
  }

  function validate(): boolean {
    const next: ContactErrors = {};
    if (!name.trim()) next.name = "Decinos tu nombre";
    if (!phone.trim()) next.phone = "Necesitamos tu teléfono";
    if (isDomicilio && !address.trim()) next.address = "Indicá tu dirección";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          delivery_point: point,
          customer: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined },
          delivery_address: isDomicilio ? address.trim() : undefined,
          delivery_notes: notes.trim() || undefined,
          coupon_code: coupon.status === "valid" ? coupon.code : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo procesar el pedido");

      // Snapshot para armar el WhatsApp en la pantalla de éxito (sobrevive
      // el redirect a MercadoPago; el carrito se vacía allá).
      saveLastOrder({
        orderId: data.order_id,
        customerName: name.trim(),
        deliveryPoint: point,
        deliveryAddress: isDomicilio ? address.trim() : null,
        total,
        items: items.map((i) => ({ name: i.name, size: i.size, quantity: i.quantity })),
      });

      if (data.mp_init_point) {
        window.location.href = data.mp_init_point;
      } else {
        clearCart();
        router.push(`/checkout/success?order=${data.order_id}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error inesperado");
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/carrito"
        className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al carrito
      </Link>

      <h1 className="mb-2 font-display text-5xl tracking-widest">CHECKOUT</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Sin cuenta, sin vueltas. Completá tus datos y pagás con MercadoPago.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Columna izquierda */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Punto de entrega */}
            <section>
              <p className="mb-3 text-xs font-semibold tracking-widest uppercase text-neutral-500">
                ¿Dónde lo recibís?
              </p>
              <div className="flex flex-col gap-3">
                {DELIVERY_POINT_OPTIONS.map((opt) => {
                  const selected = point === opt.value;
                  const Icon = opt.value === "domicilio" ? MapPin : Store;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPoint(opt.value)}
                      className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? "border-red-600 bg-red-600/10"
                          : "border-neutral-800 hover:border-neutral-600"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          selected ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-neutral-100">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-neutral-500">{opt.hint}</span>
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          selected ? "border-red-600 bg-red-600" : "border-neutral-600"
                        }`}
                      >
                        {selected && <Check size={12} className="text-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Datos de contacto */}
            <section className="flex flex-col gap-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-neutral-500">
                Tus datos
              </p>

              <Field label="Nombre" error={errors.name}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como te llamás"
                  className={inputClass(!!errors.name)}
                />
              </Field>

              <Field label="Teléfono / WhatsApp" error={errors.phone}>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="11 2843-6661"
                  inputMode="tel"
                  className={inputClass(!!errors.phone)}
                />
              </Field>

              <Field label="Email (opcional)" hint="Para enviarte la confirmación">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@email.com"
                  type="email"
                  className={inputClass(false)}
                />
              </Field>

              {isDomicilio && (
                <Field label="Dirección de entrega" error={errors.address}>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, número, localidad"
                    className={inputClass(!!errors.address)}
                  />
                </Field>
              )}

              <Field label="Aclaraciones (opcional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Horario preferido, referencia, etc."
                  className={`${inputClass(false)} resize-none`}
                />
              </Field>
            </section>
          </div>

          {/* Resumen */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="mb-4 font-display text-2xl tracking-wider">TU ORDEN</h2>

              <div className="mb-4 flex flex-col gap-2 text-sm">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex justify-between gap-2"
                  >
                    <span className="truncate text-neutral-400">
                      {item.name}
                      <span className="ml-1 text-xs text-neutral-600">
                        {item.size} ×{item.quantity}
                      </span>
                    </span>
                    <span className="shrink-0 text-neutral-300">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cupón */}
              <div className="mb-4 border-t border-neutral-800 pt-4">
                {coupon.status === "valid" ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-900 bg-green-950/40 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-green-300">
                      <Tag size={14} /> {coupon.code.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={clearCoupon}
                      className="text-green-400 hover:text-green-200"
                      aria-label="Quitar cupón"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        if (coupon.status === "invalid") setCoupon({ status: "idle" });
                      }}
                      placeholder="Cupón de descuento"
                      className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={coupon.status === "loading" || !couponCode.trim()}
                      className="shrink-0 rounded border border-neutral-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-200 hover:border-neutral-400 disabled:opacity-40"
                    >
                      {coupon.status === "loading" ? "..." : "Aplicar"}
                    </button>
                  </div>
                )}
                {coupon.status === "invalid" && (
                  <p className="mt-1.5 text-xs text-red-500">{coupon.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-neutral-700 pt-3 text-sm">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal ({totalItems} {totalItems === 1 ? "producto" : "productos"})</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                {couponOff > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Descuento</span>
                    <span>−{formatPrice(couponOff)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Envío</span>
                  <span>{isDomicilio ? "A coordinar" : "Sin costo"}</span>
                </div>
                <div className="mt-1 flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-red-500">{formatPrice(total)}</span>
                </div>
              </div>

              {submitError && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-900 bg-red-950/50 p-3 text-xs text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-red-600 px-6 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Procesando..." : "Ir a pagar"}
              </button>
              <p className="mt-3 text-center text-[11px] text-neutral-600">
                Pagás con MercadoPago: tarjeta, débito o efectivo.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        {hint && <span className="text-[11px] text-neutral-600">{hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded border ${
    hasError ? "border-red-500" : "border-neutral-700"
  } bg-neutral-800 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none transition-colors`;
}
