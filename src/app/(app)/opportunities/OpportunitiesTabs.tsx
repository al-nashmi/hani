import Link from "next/link";

export default function OpportunitiesTabs({ active }: { active: "for_sale" | "wanted" }) {
  const tabClass = (isActive: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      isActive ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/opportunities/for-sale" className={tabClass(active === "for_sale")}>
        فرص شراء
      </Link>
      <Link href="/opportunities/wanted" className={tabClass(active === "wanted")}>
        فرص بيع
      </Link>
    </div>
  );
}
