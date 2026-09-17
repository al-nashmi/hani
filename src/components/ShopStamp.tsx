export default function ShopStamp({
  signature,
  stamp,
}: {
  signature: string | null;
  stamp: string | null;
}) {
  return (
    <div className="relative h-20 border-b border-slate-400">
      {signature && (
        // eslint-disable-next-line @next/next/no-img-element -- stored base64 signature, not an optimizable asset
        <img src={signature} alt="توقيع المحل" className="h-20 object-contain" />
      )}
      {stamp && (
        // eslint-disable-next-line @next/next/no-img-element -- stored base64 stamp image, not an optimizable asset
        <img
          src={stamp}
          alt="ختم المحل"
          className="absolute bottom-0 left-0 h-20 w-20 object-contain opacity-80 mix-blend-multiply"
        />
      )}
    </div>
  );
}
