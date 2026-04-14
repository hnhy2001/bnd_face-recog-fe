// app/(dashboard)/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Network, CalendarClock, Handshake,
  ClipboardList, FileText, RefreshCcw, Calendar,
  UserCircle, Banknote, BrainCircuit, Wifi, LogOut, Menu, X, Camera, MoreHorizontal, Contact
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string>("user");
  const [name, setName] = useState<string>("Đang tải...");

  // Trạng thái cho Mobile Menu (khi ấn nút thứ 5 ở dưới đáy)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("hrm_token");
    const storedRole = localStorage.getItem("hrm_role") || "user";
    const storedName = localStorage.getItem("hrm_name") || "Nhân viên";

    if (!token) {
      router.push("/login");
      return;
    }

    setRole(storedRole.toLowerCase());
    setName(storedName);
  }, [router]);

  // Tự động đóng Mobile Menu khi chuyển trang
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.clear();
      router.push("/login");
    }
  };

  // FULL MENU ITEMS (Đã bổ sung các thiết bị Camera và loại bỏ màu sắc để chuẩn B&W Editorial)
  const menuItems = [
    { id: "nav-dashboard", label: "TỔNG QUAN", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "user"] },
    { id: "nav-departments", label: "SƠ ĐỒ TỔ CHỨC", href: "/departments", icon: Network, roles: ["admin"] },
    { id: "nav-employees", label: "QUẢN LÝ NHÂN SỰ", href: "/employees", icon: Users, roles: ["admin"] },
    { id: "nav-shifts", label: "DANH MỤC LỊCH", href: "/shifts", icon: CalendarClock, roles: ["admin"] },
    { id: "nav-assignments", label: "PHÂN CÔNG LỊCH", href: "/assignments", icon: Handshake, roles: ["admin", "manager", "user"] },
    { id: "nav-scan", label: "QUÉT MẶT BẰNG CAMERA", href: "/scan", icon: Camera, roles: ["admin", "manager", "user"] },
    { id: "nav-attendance", label: "NHẬT KÝ CHẤM CÔNG", href: "/attendance", icon: ClipboardList, roles: ["admin", "manager", "user"] },
    { id: "nav-explanation", label: "GIẢI TRÌNH", href: "/explanation", icon: FileText, roles: ["admin", "manager", "user"] },
    { id: "nav-shift-swap", label: "ĐỔI CA", href: "/shift-swap", icon: RefreshCcw, roles: ["admin", "manager", "user"] },
    { id: "nav-calendar", label: "LỊCH CHẤM CÔNG", href: "/calendar", icon: Calendar, roles: ["admin", "manager", "user"] },
    { id: "nav-personal", label: "QUẢN LÝ LỊCH CÁ NHÂN", href: "/personal-schedule", icon: Contact, roles: ["admin", "manager", "user"] },
    { id: "nav-payroll", label: "BẢNG TÍNH LƯƠNG", href: "/payroll", icon: Banknote, roles: ["admin"] },
    { id: "nav-faces", label: "QUẢN LÝ AI CORE", href: "/faces", icon: BrainCircuit, roles: ["admin"] },
    { id: "nav-tb-online", label: "MỞ TB CHẤM CÔNG", href: "/tb-cham-cong", icon: Camera, roles: ["admin", "manager"] },
    { id: "nav-tb-local", label: "MỞ TB CHẤM CÔNG LOCAL", href: "/tb-cham-cong-local", icon: Camera, roles: ["admin", "manager"] },
    { id: "nav-user_info", label: "THÔNG TIN NHÂN VIÊN", href: "/user_info", icon: UserCircle, roles: ["admin", "manager", "user"] },
    { id: "nav-wifi", label: "CẤU HÌNH WIFI", href: "/wifi", icon: Wifi, roles: ["admin"] },
  ];

  // Các nút xuất hiện ở Bottom Tab Bar (Mobile)
  const bottomNavItems = [
    { id: "bottom-1", label: "TỔNG QUAN", href: "/dashboard", icon: LayoutDashboard },
    { id: "bottom-2", label: "NHẬT KÝ", href: "/attendance", icon: ClipboardList },
    { id: "bottom-3", label: "QUÉT TB", href: "/tb-cham-cong", icon: Camera },
    { id: "bottom-4", label: "PHÂN CÔNG", href: "/assignments", icon: Handshake },
  ];

  return (
    <div className="flex min-h-screen bg-[#fafafa] text-slate-900 w-full">

      {/* ==========================================
          SIDEBAR DESKTOP (Ẩn trên màn hình nhỏ)
          ========================================== */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col sticky top-0 h-screen z-50 flex-shrink-0">
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
          <span className="font-black tracking-tighter text-xl uppercase text-slate-900">BND HRM</span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {menuItems.map((item) => {
            if (!item.roles.includes(role)) return null;
            const isActive = pathname === item.href;

            return (
              <Link key={item.id} href={item.href} className={`
                flex items-center gap-3 p-3 rounded-xl transition-all
                ${isActive ? "bg-black text-white" : "hover:bg-slate-100 text-slate-600"}
              `}>
                <item.icon size={16} />
                <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 mt-auto bg-white shrink-0">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all">
            <LogOut size={16} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
          MAIN CONTENT AREA
          ========================================== */}
      {/* Padding bottom 20 để nội dung không bị che bởi Bottom Nav trên Mobile */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa] pb-20 md:pb-0">

        {/* Header Chung */}
        <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center px-4 md:px-8 justify-between w-full">
          <div className="flex items-center gap-4">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {menuItems.find(m => m.href === pathname)?.label || "Trang chủ"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Xin chào,</p>
              <p className="text-[12px] font-bold text-slate-900 uppercase">{name}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-black flex items-center justify-center text-white font-black text-[12px] uppercase">
              {name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* ==========================================
          BOTTOM NAVIGATION BAR (Chỉ Mobile/Tablet)
          ========================================== */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 flex justify-between items-center px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)] h-16">

        {/* 4 Nút chính */}
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href && !isMobileMenuOpen;
          return (
            <Link key={item.id} href={item.href} className="flex flex-col items-center justify-center w-1/5 py-2">
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-black text-white" : "text-slate-400"}`}>
                <item.icon size={20} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isActive ? "text-slate-900" : "text-slate-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Nút MENU Thứ 5 */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex flex-col items-center justify-center w-1/5 py-2"
        >
          <div className={`p-1.5 rounded-lg transition-colors ${isMobileMenuOpen ? "bg-black text-white" : "text-slate-400"}`}>
            {isMobileMenuOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isMobileMenuOpen ? "text-slate-900" : "text-slate-400"}`}>
            MENU
          </span>
        </button>
      </div>

      {/* ==========================================
          MOBILE MENU OVERLAY (Mở lên khi bấm nút MENU)
          ========================================== */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bottom-16 bg-[#fafafa] z-40 overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-4 flex flex-col gap-2">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-3">TẤT CẢ TÍNH NĂNG</h3>
            {menuItems.map((item) => {
              if (!item.roles.includes(role)) return null;
              const isActive = pathname === item.href;

              return (
                <Link key={item.id} href={item.href} className={`
                  flex items-center gap-4 p-4 rounded-xl transition-all border
                  ${isActive ? "bg-white border-black shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}
                `}>
                  <div className={`${isActive ? "text-black" : "text-slate-400"}`}>
                    <item.icon size={20} />
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${isActive && "text-black"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <button onClick={handleLogout} className="mt-4 flex items-center justify-center gap-3 p-4 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-slate-100 transition-all">
              <LogOut size={18} />
              <span className="text-[11px] font-black uppercase tracking-widest">Đăng xuất hệ thống</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}