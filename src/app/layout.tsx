import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "مجوهرات هاني النمر - إدارة المشتريات",
  description: "نظام تسجيل ومتابعة عمليات شراء واسترداد الذهب والمجوهرات",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-[var(--font-tajawal)]">
        {children}
      </body>
    </html>
  );
}
