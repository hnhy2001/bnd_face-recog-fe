// components/hrm-ui.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// --- PAGE HEADER (Tiêu đề trang chuẩn mới) ---
export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <div>
                <h3 className="text-2xl font-extrabold text-slate-800 m-0">{title}</h3>
                {description && <div className="text-sm text-slate-500 mt-1 font-medium">{description}</div>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
    )
}

// --- SECTION CARD (Card trắng, bo tròn 2xl, bóng đổ mềm) ---
export function SectionCard({ title, children, className, headerActions }: { title?: React.ReactNode; children: React.ReactNode; className?: string; headerActions?: React.ReactNode }) {
    return (
        <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.03)] overflow-hidden", className)}>
            {(title || headerActions) && (
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    {typeof title === 'string' ? <h3 className="text-lg font-bold text-slate-800 m-0">{title}</h3> : title}
                    {headerActions && <div>{headerActions}</div>}
                </div>
            )}
            <div className="p-0">
                {children}
            </div>
        </div>
    )
}

// --- DATA TABLE (Bảng dữ liệu chuẩn màu pastel) ---
export function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-y border-slate-200">
                        {headers.map((h, i) => (
                            <th key={i} className="py-3 px-5 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    )
}

export function Tr({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
    return (
        <tr
            onClick={onClick}
            className={cn(
                "border-b border-slate-100 transition-colors group",
                onClick ? "cursor-pointer hover:bg-blue-50/50" : "hover:bg-slate-50/50",
                className
            )}
        >
            {children}
        </tr>
    )
}

export function Td({ children, className, mono = false }: { children: React.ReactNode; className?: string; mono?: boolean }) {
    return (
        <td className={cn("py-3 px-5 whitespace-nowrap text-sm text-slate-700", mono && "font-mono font-bold tracking-tight", className)}>
            {children}
        </td>
    )
}

// --- FILTER BAR (Thanh tìm kiếm/lọc có bóng đổ nhẹ) ---
export function FilterBar({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl mb-4 border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mx-5 mt-5">
            {children}
        </div>
    )
}

// --- BADGE (Tag trạng thái bo tròn dạng viên thuốc - Pill) ---
export function Badge({ children, variant = "info" }: { children: React.ReactNode; variant?: "success" | "warning" | "danger" | "info" | "default" }) {
    const variants = {
        success: "bg-emerald-100 text-emerald-700 border-emerald-300",
        warning: "bg-amber-100 text-amber-700 border-amber-300",
        danger: "bg-rose-100 text-rose-700 border-rose-300",
        info: "bg-sky-100 text-sky-700 border-sky-300",
        default: "bg-slate-100 text-slate-700 border-slate-300",
    }

    return (
        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold inline-block border", variants[variant])}>
            {children}
        </span>
    )
}