// app/(dashboard)/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Network, CalendarClock, Handshake,
  ClipboardList, FileText, RefreshCcw, Calendar,
  UserCircle, Banknote, BrainCircuit, Wifi, LogOut, X, Camera, MoreHorizontal, Contact
} from "lucide-react";

// ============================================================
// Icon SVG nội tuyến cho 2 theme (Đen Trắng & Xanh Y Tế)
// ============================================================
const MonoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" fill="black" stroke="black" strokeWidth="1" />
    <circle cx="7" cy="7" r="6" fill="white" clipPath="inset(0 50% 0 0)" />
  </svg>
);

const BlueIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" fill="#0077B6" />
    <path d="M7 4v6M4.5 6.5l2.5-2.5 2.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type ThemeColor = "mono" | "blue";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string>("user");
  const [name, setName] = useState<string>("Đang tải...");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ---- THEME STATE ----
  const [theme, setTheme] = useState<ThemeColor>("mono");
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  // Áp dụng theme class lên <html>
  useEffect(() => {
    const saved = (localStorage.getItem("hrm_theme") as ThemeColor) || "mono";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const applyTheme = (t: ThemeColor) => {
    const html = document.documentElement;
    if (t === "blue") {
      html.classList.add("theme-blue");
    } else {
      html.classList.remove("theme-blue");
    }
  };

  const handleThemeChange = (t: ThemeColor) => {
    setTheme(t);
    localStorage.setItem("hrm_theme", t);
    applyTheme(t);
    setIsThemePickerOpen(false); // Đóng menu sau khi chọn xong
  };

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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("hrm_token");
      localStorage.removeItem("hrm_role");
      localStorage.removeItem("hrm_name");
      localStorage.removeItem("hrm_username");
      router.push("/login");
    }
  };

  const menuItems = [
    { id: "nav-dashboard", label: "TỔNG QUAN", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "user"] },
    { id: "nav-departments", label: "SƠ ĐỒ TỔ CHỨC", href: "/departments", icon: Network, roles: ["admin"] },
    { id: "nav-employees", label: "QUẢN LÝ NHÂN SỰ", href: "/employees", icon: Users, roles: ["admin"] },
    { id: "nav-shifts", label: "DANH MỤC LỊCH", href: "/shifts", icon: CalendarClock, roles: ["admin"] },
    { id: "nav-assignments", label: "PHÂN CÔNG LỊCH", href: "/assignments", icon: Handshake, roles: ["admin", "manager", "user"] },
    { id: "nav-scan", label: "QUÉT MẶT BẰNG CAMERA", href: "/enroll", icon: Camera, roles: ["admin", "manager", "user"] },
    { id: "nav-attendance", label: "NHẬT KÝ CHẤM CÔNG", href: "/attendance", icon: ClipboardList, roles: ["admin", "manager", "user"] },
    { id: "nav-explanation", label: "GIẢI TRÌNH", href: "/explanation", icon: FileText, roles: ["admin", "manager", "user"] },
    { id: "nav-shift-swap", label: "ĐỔI CA", href: "/shift-swap", icon: RefreshCcw, roles: ["admin", "manager", "user"] },
    { id: "nav-calendar", label: "LỊCH CHẤM CÔNG", href: "/calendar", icon: Calendar, roles: ["admin", "manager", "user"] },
    { id: "nav-personal", label: "QUẢN LÝ LỊCH CÁ NHÂN", href: "/personal-schedule", icon: Contact, roles: ["admin", "manager", "user"] },
    { id: "nav-payroll", label: "BẢNG TÍNH LƯƠNG", href: "/payroll", icon: Banknote, roles: ["admin"] },
    { id: "nav-faces", label: "QUẢN LÝ AI CORE", href: "/faces", icon: BrainCircuit, roles: ["admin"] },
    { id: "nav-tb-online", label: "MỞ TB CHẤM CÔNG", href: "/tb-cham-cong", icon: Camera, roles: ["admin", "manager"] },
    { id: "nav-tb-local", label: "MỞ TB CHẤM CÔNG LOCAL", href: "/tb-cham-cong-local", icon: Camera, roles: ["admin", "manager"] },
    { id: "nav-user_info", label: "THÔNG TIN NHÂN VIÊN", href: "/profile", icon: UserCircle, roles: ["admin", "manager", "user"] },
    { id: "nav-wifi", label: "CẤU HÌNH WIFI", href: "/wifi", icon: Wifi, roles: ["admin"] },
  ];

  const bottomNavItems = [
    { id: "bottom-1", label: "TỔNG QUAN", href: "/dashboard", icon: LayoutDashboard },
    { id: "bottom-2", label: "NHẬT KÝ", href: "/attendance", icon: ClipboardList },
    { id: "bottom-3", label: "QUÉT TB", href: "/tb-cham-cong", icon: Camera },
    { id: "bottom-4", label: "PHÂN CÔNG", href: "/assignments", icon: Handshake },
  ];

  const themes: { key: ThemeColor; label: string; sublabel: string; bg: string; dot: string }[] = [
    { key: "mono", label: "ĐEN TRẮNG", sublabel: "Editorial Classic", bg: "bg-slate-50 border-slate-900", dot: "bg-slate-900" },
    { key: "blue", label: "XANH Y TẾ", sublabel: "Medical Blue", bg: "bg-blue-50 border-[#0077B6]", dot: "bg-[#0077B6]" },
  ];

  return (
    // 1. FIX ROOT: Đổi thành h-screen (hoặc h-[100dvh]) và overflow-hidden để khóa toàn bộ trang.
    <div className="flex h-screen h-[100dvh] bg-background text-foreground w-full overflow-hidden">

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col flex-shrink-0 h-full">
        <div className="h-16 px-6 border-b border-border flex items-center justify-between shrink-0">
          <span className="font-black tracking-tighter text-xl uppercase text-foreground">BND HRM</span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            if (!item.roles.includes(role)) return null;
            const isActive = pathname === item.href;
            return (
              <Link key={item.id} href={item.href} className={`
                flex items-center gap-3 p-3 rounded-xl transition-all
                ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}
              `}>
                <item.icon size={16} />
                <span className="text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border bg-card shrink-0">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-xl transition-all">
            <LogOut size={16} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
          MAIN CONTENT
          ========================================== */}
      {/* 2. FIX MAIN: Ép h-full và overflow-hidden để không bao giờ bị dãn ra ngoài */}
      <main className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden relative pb-18 md:pb-0">

        {/* HEADER */}
        <header className="h-16 border-b border-border bg-card flex items-center px-4 md:px-8 justify-between shrink-0 w-full relative z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              {menuItems.find(m => m.href === pathname)?.label || "Trang chủ"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
                title="Đổi giao diện màu sắc"
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-all text-[9px] font-black uppercase tracking-widest relative z-50
                  ${theme === "blue" ? "border-[#0077B6] bg-blue-50 text-[#0077B6]" : "border-foreground bg-secondary text-foreground"}
                `}
              >
                {theme === "blue" ? <BlueIcon /> : <MonoIcon />}
                <span className="hidden sm:inline">{theme === "blue" ? "XANH Y TẾ" : "ĐEN TRẮNG"}</span>
              </button>

              {isThemePickerOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsThemePickerOpen(false)} />
                  <div className="absolute right-0 top-12 w-52 bg-card border border-border rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2 pt-1 pb-2">Chọn giao diện</p>
                    {themes.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => handleThemeChange(t.key)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl mb-1 transition-all border-2
                          ${theme === t.key ? t.bg + " shadow-sm" : "border-transparent hover:bg-secondary"}
                        `}
                      >
                        <span className={`w-4 h-4 rounded-full shrink-0 ${t.dot}`} />
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{t.label}</p>
                          <p className="text-[9px] text-muted-foreground">{t.sublabel}</p>
                        </div>
                        {theme === t.key && <span className="ml-auto text-[10px] font-black text-primary">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Xin chào,</p>
              <p className="text-[12px] font-bold text-foreground uppercase">{name}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-[12px] uppercase shrink-0">
              {name.charAt(0)}
            </div>
          </div>
        </header>

        {/* 3. FIX CHILDREN WRAPPER: Chuyển thành flex-1 overflow-y-auto. 
             Đây chính là phần bọc các file page.tsx. */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500 custom-scrollbar relative z-10">
          {children}
        </div>
      </main>

      {/* BOTTOM NAVIGATION BAR (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-card border-t border-border z-50 flex justify-between items-center px-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)] h-16 shrink-0">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href && !isMobileMenuOpen;
          const isSpecial = item.id === "bottom-3"; // Chọn nút QUÉT TB làm nút nổi bật

          // Giao diện riêng cho nút nổi bật (QUÉT TB)
          if (isSpecial) {
            return (
              <Link key={item.id} href={item.href} className="flex flex-col items-center justify-end w-1/5 h-full pb-[6px] relative">
                <div className={`
                  absolute -top-5 w-14 h-14 rounded-full border-[4px] border-card shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95
                  ${isActive ? "bg-primary text-primary-foreground scale-105" : "bg-foreground text-background"}
                `}>
                  <item.icon size={24} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest mt-auto ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          // Giao diện cho các nút bình thường
          return (
            <Link key={item.id} href={item.href} className="flex flex-col items-center justify-center w-1/5 py-2">
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                <item.icon size={20} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex flex-col items-center justify-center w-1/5 py-2"
        >
          <div className={`p-1.5 rounded-lg transition-colors ${isMobileMenuOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {isMobileMenuOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isMobileMenuOpen ? "text-foreground" : "text-muted-foreground"}`}>
            MENU
          </span>
        </button>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bottom-16 bg-background z-40 overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-4 flex flex-col gap-2">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 pl-3">TẤT CẢ TÍNH NĂNG</h3>
            {menuItems.map((item) => {
              if (!item.roles.includes(role)) return null;
              const isActive = pathname === item.href;
              return (
                <Link key={item.id} href={item.href} className={`
                  flex items-center gap-4 p-4 rounded-xl transition-all border
                  ${isActive ? "bg-card border-primary shadow-sm" : "bg-card border-border text-muted-foreground hover:border-primary/30"}
                `}>
                  <div className={`${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    <item.icon size={20} />
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${isActive ? "text-foreground" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <button onClick={handleLogout} className="mt-2 flex items-center justify-center gap-3 p-4 bg-card border border-border text-foreground rounded-xl hover:bg-secondary transition-all">
              <LogOut size={18} />
              <span className="text-[11px] font-black uppercase tracking-widest">Đăng xuất hệ thống</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}