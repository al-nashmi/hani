"use client";

import { useRouter } from "next/navigation";

/** A page-level "back" control for the installed PWA, where there's no browser chrome back button.
 * Pass `isDirty` for a page with unsaved form data — the user gets a confirm before leaving. */
export default function BackButton({
  isDirty = false,
  label = "رجوع",
  className = "",
}: {
  isDirty?: boolean;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (isDirty && !window.confirm("هناك بيانات لم تُحفظ، هل تريد الخروج من الصفحة بدون حفظها؟")) {
      return;
    }
    router.back();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`print:hidden inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 ${className}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </button>
  );
}
