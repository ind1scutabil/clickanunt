import CardPaymentClient from './CardPaymentClient';

function getFirstQueryValue(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function CardPaymentPage({
  params,
  searchParams,
}: {
  // Next.js may provide `params` as a Promise in some runtime modes.
  // Unwrap to avoid runtime error: "params is a Promise".
  params: Promise<{ id: string }> | { id: string };
  // Same for `searchParams` in some Next.js versions.
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const id = (await params).id;
  const resolvedSearchParams = await searchParams;
  const packageId = getFirstQueryValue(resolvedSearchParams.package);
  const price = getFirstQueryValue(resolvedSearchParams.price);

  // Read at server runtime so production live keys take effect without requiring a rebuild.
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  return (
    <CardPaymentClient
      listingId={id}
      packageId={packageId ?? null}
      price={price ?? null}
      stripePublishableKey={stripePublishableKey}
    />
  );
}

