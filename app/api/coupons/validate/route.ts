import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCoupon, couponAmountOff } from "@/lib/discounts/server";

// Valida un cupón para mostrar el descuento en vivo en el checkout.
// NO es la fuente de verdad: el monto definitivo se recalcula al crear
// la orden en /api/orders.
export async function POST(req: NextRequest) {
  const { code, subtotal } = (await req.json()) as {
    code?: string;
    subtotal?: number;
  };

  if (!code?.trim()) {
    return NextResponse.json({ valid: false, error: "Ingresá un código" }, { status: 400 });
  }

  const supabase = await createClient();
  const coupon = await validateCoupon(supabase, code);

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Cupón inválido o vencido" });
  }

  const base = typeof subtotal === "number" && subtotal > 0 ? subtotal : 0;
  const amountOff = couponAmountOff(base, coupon);

  return NextResponse.json({
    valid: true,
    amountOff,
    valueType: coupon.value_type,
    value: coupon.value,
  });
}
