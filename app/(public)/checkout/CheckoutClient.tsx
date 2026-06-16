"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Store, AlertCircle } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { formatPrice } from "@/lib/utils/format";

type DeliveryType = "pickup" | "delivery";

type ShippingForm = {
  full_name: string;
  phone: string;
  street: string;
  number: string;
  floor_apt: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  notes: string;
};

const EMPTY_FORM: ShippingForm = {
  full_name: "",
  phone: "",
  street: "",
  number: "",
  floor_apt: "",
  localidad: "",
  provincia: "",
  codigo_postal: "",
  notes: "",
};

const PROVINCIAS = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

export default function CheckoutClient() {
  const router = useRouter();
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const [delivery, setDelivery] = useState<DeliveryType>("pickup");
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<ShippingForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Carrito vacío → volver al carrito (efecto, no durante el render)
  useEffect(() => {
    if (items.length === 0) {
      router.replace("/carrito");
    }
  }, [items.length, router]);

  if (items.length === 0) return null;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ShippingForm]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    if (delivery === "pickup") return true;

    const required: (keyof ShippingForm)[] = [
      "full_name",
      "phone",
      "street",
      "number",
      "localidad",
      "provincia",
      "codigo_postal",
    ];

    const next: Partial<ShippingForm> = {};
    for (const field of required) {
      if (!form[field].trim()) {
        next[field] = "Campo requerido";
      }
    }
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
          items,
          delivery_type: delivery,
          shipping_address: delivery === "delivery" ? form : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Sesión expirada → mandar a login y volver al checkout
          router.push("/login?redirect=/checkout");
          return;
        }
        throw new Error(data.error ?? "Error al crear la orden");
      }

      // Redirige a MercadoPago. El carrito se vacía en /checkout/success.
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/carrito"
        className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al carrito
      </Link>

      <h1 className="mb-8 font-display text-5xl tracking-widest">CHECKOUT</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Formulario */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Tipo de entrega */}
            <div>
              <p className="mb-3 text-xs font-semibold tracking-widest uppercase text-neutral-500">
                Tipo de entrega
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDelivery("pickup")}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-semibold transition-all ${
                    delivery === "pickup"
                      ? "border-red-600 bg-red-600/10 text-white"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  <Store size={20} />
                  Retiro en local
                  <span className="text-xs font-normal opacity-70">Sin costo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDelivery("delivery")}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-semibold transition-all ${
                    delivery === "delivery"
                      ? "border-red-600 bg-red-600/10 text-white"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  <MapPin size={20} />
                  Envío a domicilio
                  <span className="text-xs font-normal opacity-70">Dentro de CABA</span>
                </button>
              </div>
            </div>

            {/* Datos de retiro */}
            {delivery === "pickup" && (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
                <p className="font-semibold text-neutral-200 mb-1">Punto de retiro</p>
                <p>Te contactamos por WhatsApp para coordinar el retiro.</p>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Tu WhatsApp / Nombre
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Nombre y número de WhatsApp"
                    className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Formulario de dirección */}
            {delivery === "delivery" && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold tracking-widest uppercase text-neutral-500">
                  Dirección de entrega
                </p>

                <Field label="Nombre completo" error={errors.full_name}>
                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Juan García"
                    className={inputClass(!!errors.full_name)}
                  />
                </Field>

                <Field label="Teléfono / WhatsApp" error={errors.phone}>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="11 2345-6789"
                    className={inputClass(!!errors.phone)}
                  />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="Calle" error={errors.street}>
                      <input
                        name="street"
                        value={form.street}
                        onChange={handleChange}
                        placeholder="Av. Corrientes"
                        className={inputClass(!!errors.street)}
                      />
                    </Field>
                  </div>
                  <Field label="Número" error={errors.number}>
                    <input
                      name="number"
                      value={form.number}
                      onChange={handleChange}
                      placeholder="1234"
                      className={inputClass(!!errors.number)}
                    />
                  </Field>
                </div>

                <Field label="Piso / Depto (opcional)">
                  <input
                    name="floor_apt"
                    value={form.floor_apt}
                    onChange={handleChange}
                    placeholder="3° B"
                    className={inputClass(false)}
                  />
                </Field>

                <Field label="Localidad" error={errors.localidad}>
                  <input
                    name="localidad"
                    value={form.localidad}
                    onChange={handleChange}
                    placeholder="San Justo"
                    className={inputClass(!!errors.localidad)}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Provincia" error={errors.provincia}>
                    <select
                      name="provincia"
                      value={form.provincia}
                      onChange={handleChange}
                      className={inputClass(!!errors.provincia)}
                    >
                      <option value="">Seleccioná</option>
                      {PROVINCIAS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Código postal" error={errors.codigo_postal}>
                    <input
                      name="codigo_postal"
                      value={form.codigo_postal}
                      onChange={handleChange}
                      placeholder="1754"
                      className={inputClass(!!errors.codigo_postal)}
                    />
                  </Field>
                </div>

                <Field label="Aclaraciones (opcional)">
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Entre calles, referencia, etc."
                    className={`${inputClass(false)} resize-none`}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Resumen de orden */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="mb-4 font-display text-2xl tracking-wider">TU ORDEN</h2>

              <div className="flex flex-col gap-2 text-sm mb-4">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex justify-between gap-2"
                  >
                    <span className="text-neutral-400 truncate">
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

              <div className="border-t border-neutral-700 pt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Envío</span>
                  <span>{delivery === "pickup" ? "Sin costo" : "A coordinar"}</span>
                </div>
                <div className="flex justify-between font-bold text-base mt-1">
                  <span>Total</span>
                  <span className="text-red-500">{formatPrice(totalPrice)}</span>
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
                className="mt-6 w-full rounded-lg bg-red-600 px-6 py-4 text-sm font-bold tracking-wider uppercase text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Procesando..." : "Confirmar pedido"}
              </button>
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
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded border ${
    hasError ? "border-red-500" : "border-neutral-700"
  } bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none transition-colors`;
}
