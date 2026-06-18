import SuccessClient from "./SuccessClient";

export const metadata = {
  title: "Compra confirmada | Código Rojo",
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const orderId = order ? Number(order) : undefined;
  return <SuccessClient orderId={Number.isFinite(orderId) ? orderId : undefined} />;
}
