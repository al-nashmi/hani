"use client";

export default function PrintButton() {
  return (
    <div className="print:hidden mb-4 flex items-center justify-between">
      <p className="text-sm text-slate-500">
        اضغط طباعة، ثم اختر &quot;حفظ كـ PDF&quot; (Save as PDF) من قائمة الطابعة لتنزيل الفاتورة.
      </p>
      <button
        onClick={() => window.print()}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        طباعة / تحميل PDF
      </button>
    </div>
  );
}
