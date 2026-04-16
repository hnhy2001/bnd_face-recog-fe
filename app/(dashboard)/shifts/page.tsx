"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    Plus, Edit2, Trash2, X, Save, Clock, CalendarClock, Search,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight // Thêm icon phân trang
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface Shift {
    shift_code: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    is_overnight: number;
    is_on_call: number;
    checkin_from?: string;
    checkin_to?: string;
    checkout_from?: string;
    checkout_to?: string;
    work_hours?: number;
    work_days?: number;
    day_coefficient?: number;
    notes?: string;
}

export default function ShiftsPage() {
    // --- States Dữ liệu ---
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- States Phân trang ---
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // --- States Drawer (Form) ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const initialFormState = {
        shift_code: "", shift_name: "", start_time: "", end_time: "",
        is_overnight: 0, is_on_call: 0, checkin_from: "", checkin_to: "",
        checkout_from: "", checkout_to: "", work_hours: "", work_days: "",
        day_coefficient: "", notes: ""
    };
    const [formData, setFormData] = useState<any>(initialFormState);

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchShifts = useCallback(async () => {
        setIsLoading(true);
        try {
            // [CẬP NHẬT] Truyền tham số phân trang vào API
            const res = await fetch(`${API_BASE_URL}/api/shifts?page=${page}&size=${pageSize}`);
            if (res.ok) {
                const data = await res.json();

                // Tương thích với API trả về object phân trang hoặc array thuần
                if (data.items) {
                    setShifts(data.items);
                    setTotalPages(data.total_pages || 1);
                    setTotalItems(data.total || 0);
                } else {
                    setShifts(data);
                    setTotalPages(1);
                    setTotalItems(data.length || 0);
                }
            }
        } catch (error) {
            console.error("Lỗi tải danh mục ca trực:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize]); // Cập nhật lại khi page/pageSize thay đổi

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    // ==========================================
    // FORM HANDLERS
    // ==========================================
    const handleAddNew = () => {
        setEditingCode(null);
        setFormData(initialFormState);
        setIsPanelOpen(true);
    };

    const handleEdit = (shift: Shift) => {
        setEditingCode(shift.shift_code);
        setFormData({
            shift_code: shift.shift_code,
            shift_name: shift.shift_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            is_overnight: shift.is_overnight,
            is_on_call: shift.is_on_call || 0,
            checkin_from: shift.checkin_from || "",
            checkin_to: shift.checkin_to || "",
            checkout_from: shift.checkout_from || "",
            checkout_to: shift.checkout_to || "",
            work_hours: shift.work_hours || "",
            work_days: shift.work_days || "",
            day_coefficient: shift.day_coefficient || "",
            notes: shift.notes || ""
        });
        setIsPanelOpen(true);
    };

    const handleClosePanel = () => {
        setIsPanelOpen(false);
        setTimeout(() => {
            setEditingCode(null);
            setFormData(initialFormState);
        }, 300);
    };

    const formatTime = (timeStr: string) => {
        if (timeStr && timeStr.length === 5) return `${timeStr}:00`;
        return timeStr || null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            shift_code: formData.shift_code.trim().toUpperCase(),
            shift_name: formData.shift_name.trim(),
            start_time: formatTime(formData.start_time),
            end_time: formatTime(formData.end_time),
            is_overnight: Number(formData.is_overnight),
            is_on_call: Number(formData.is_on_call),
            notes: formData.notes.trim() || null,
            checkin_from: formatTime(formData.checkin_from),
            checkin_to: formatTime(formData.checkin_to),
            checkout_from: formatTime(formData.checkout_from),
            checkout_to: formatTime(formData.checkout_to),
            work_hours: formData.work_hours ? parseFloat(formData.work_hours) : null,
            work_days: formData.work_days ? parseFloat(formData.work_days) : null,
            day_coefficient: formData.day_coefficient ? parseFloat(formData.day_coefficient) : null
        };

        const url = editingCode ? `${API_BASE_URL}/api/shifts/${editingCode}` : `${API_BASE_URL}/api/shifts`;
        const method = editingCode ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(editingCode ? "Cập nhật ca trực thành công!" : "Thêm ca trực thành công!");
                handleClosePanel();
                fetchShifts();
            } else {
                const result = await res.json();
                alert("Lỗi: " + result.detail);
            }
        } catch (err) {
            alert("Lỗi kết nối Server.");
        }
    };

    const handleDelete = async (shift_code: string) => {
        if (confirm(`⚠️ Bạn có chắc chắn muốn xóa ca trực [${shift_code}] không?`)) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/shifts/${shift_code}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchShifts();
                } else {
                    alert("Lỗi khi xóa ca trực!");
                }
            } catch (e) {
                alert("Lỗi kết nối Server");
            }
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* HEADER */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <CalendarClock className="w-6 h-6 text-primary" />
                        Danh Mục Lịch Làm Việc
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Cấu hình tham số và quy tắc các ca trực</p>
                </div>
                <button onClick={handleAddNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm">
                    <Plus size={16} /> Thêm Ca Trực
                </button>
            </div>

            {/* MAIN CONTENT CARD */}
            <div className="hrm-card flex-1 flex flex-col min-h-0 overflow-hidden bg-card border border-border rounded-xl shadow-sm">

                {/* CARD HEADER (Cố định) */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">Danh Sách Ca Làm Việc</h3>
                </div>

                {/* VÙNG CHỨA BẢNG ĐƯỢC PHÉP SCROLL */}
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar relative bg-card">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                        </div>
                    ) : shifts.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <CalendarClock className="w-10 h-10 opacity-20 mb-2" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Chưa có ca làm việc nào.</span>
                        </div>
                    ) : (
                        <>
                            {/* ========================================= */}
                            {/* 1. MOBILE VIEW (Dạng Block/Card) */}
                            {/* ========================================= */}
                            <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                {shifts.map((shift) => (
                                    <div key={shift.shift_code} className="bg-card border border-border rounded-xl p-4 shadow-sm relative">

                                        {/* Nút Action ở góc phải trên */}
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                            <button onClick={() => handleEdit(shift)} className="p-1.5 text-primary bg-primary/10 rounded-md border border-primary/20 hover:bg-primary/20 transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(shift.shift_code)} className="p-1.5 text-destructive bg-destructive/10 rounded-md border border-destructive/20 hover:bg-destructive/20 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Tên và Mã Ca */}
                                        <div className="pr-16 mb-3">
                                            <h4 className="text-sm font-bold text-foreground mb-1">{shift.shift_name}</h4>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">MÃ: {shift.shift_code}</p>
                                        </div>

                                        {/* Badges (Tags) */}
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            {shift.is_overnight === 1
                                                ? <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-widest border border-destructive/20">🌙 Qua ngày</span>
                                                : <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[9px] font-black uppercase tracking-widest border border-sky-500/20">☀️ Trong ngày</span>
                                            }
                                            {shift.is_on_call === 1
                                                ? <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">🚨 Ca Trực</span>
                                                : <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[9px] font-black uppercase tracking-widest border border-border">🏢 Bình thường</span>
                                            }
                                        </div>

                                        {/* Thông tin thời gian và công suất (Lưới 2 cột cho gọn) */}
                                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2.5 rounded-lg border border-border w-full text-[11px]">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase">Giờ làm</span>
                                                <span className="font-mono text-foreground font-bold mt-0.5">{shift.start_time || '--'} - {shift.end_time || '--'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase">Số giờ / Ngày</span>
                                                <span className="font-mono text-foreground mt-0.5">{shift.work_hours || '--'}h / {shift.work_days || '--'} ngày</span>
                                            </div>
                                            <div className="flex flex-col mt-1">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase">In (Từ-Đến)</span>
                                                <span className="font-mono text-muted-foreground mt-0.5">{shift.checkin_from || '--'} - {shift.checkin_to || '--'}</span>
                                            </div>
                                            <div className="flex flex-col mt-1">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase">Out (Từ-Đến)</span>
                                                <span className="font-mono text-muted-foreground mt-0.5">{shift.checkout_from || '--'} - {shift.checkout_to || '--'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ========================================= */}
                            {/* 2. DESKTOP VIEW (Dạng Bảng Truyền Thống) */}
                            {/* ========================================= */}
                            <div className="hidden md:block w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-[30] bg-muted">
                                        <tr>
                                            {["MÃ CA", "TÊN CA LÀM VIỆC", "LỊCH LÀM VIỆC", "GIỜ CHECK-IN", "GIỜ CHECK-OUT", "QUY TẮC CÔNG", "LOẠI CA", "THAO TÁC"].map((h, i) => (
                                                <th key={i} className="relative py-3 px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-border">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shifts.map((shift) => (
                                            <tr key={shift.shift_code} className="hover:bg-accent/50 transition-colors border-b border-border group">
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <strong className="text-[13px] font-black text-foreground block">{shift.shift_code}</strong>
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <span className="text-[12px] font-bold text-foreground block">{shift.shift_name}</span>
                                                    {shift.notes && <span className="text-[10px] text-muted-foreground">{shift.notes}</span>}
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 text-[11px]">
                                                        <span className="text-muted-foreground">Vào ca: <strong className="font-mono bg-background border border-border px-1.5 py-0.5 rounded text-foreground">{shift.start_time || '--'}</strong></span>
                                                        <span className="text-muted-foreground">Tan ca: <strong className="font-mono bg-background border border-border px-1.5 py-0.5 rounded text-foreground">{shift.end_time || '--'}</strong></span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 text-[11px]">
                                                        <span className="text-muted-foreground">Từ: <strong className="font-mono text-foreground">{shift.checkin_from || '--'}</strong></span>
                                                        <span className="text-muted-foreground">Đến: <strong className="font-mono text-foreground">{shift.checkin_to || '--'}</strong></span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 text-[11px]">
                                                        <span className="text-muted-foreground">Từ: <strong className="font-mono text-foreground">{shift.checkout_from || '--'}</strong></span>
                                                        <span className="text-muted-foreground">Đến: <strong className="font-mono text-foreground">{shift.checkout_to || '--'}</strong></span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap text-[11px]">
                                                    <div className="flex flex-col gap-1 text-muted-foreground">
                                                        <span>Giờ: <strong className="text-foreground">{shift.work_hours || '--'}</strong></span>
                                                        <span>Ngày: <strong className="text-foreground">{shift.work_days || '--'}</strong></span>
                                                        <span>Hệ số: <strong className="text-foreground">{shift.day_coefficient || '--'}</strong></span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        {shift.is_overnight === 1
                                                            ? <span className="px-2 py-1 rounded bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-widest border border-destructive/20">🌙 Qua ngày</span>
                                                            : <span className="px-2 py-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[9px] font-black uppercase tracking-widest border border-sky-500/20">☀️ Trong ngày</span>
                                                        }
                                                        {shift.is_on_call === 1
                                                            ? <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">🚨 Ca Trực</span>
                                                            : <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-[9px] font-black uppercase tracking-widest border border-border">🏢 Bình thường</span>
                                                        }
                                                    </div>
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleEdit(shift)} className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors border border-primary/20" title="Sửa">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(shift.shift_code)} className="p-2 text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors border border-destructive/20" title="Xóa">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* ==================================================== */}
                {/* [MỚI] GIAO DIỆN PHÂN TRANG */}
                {/* ==================================================== */}
                {!isLoading && totalPages > 0 && (
                    <div className="flex-none flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-border bg-card">
                        <div className="flex items-center gap-1">
                            <button disabled={page === 1} onClick={() => setPage(1)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 transition-colors"><ChevronsLeft size={16} /></button>
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 transition-colors"><ChevronLeft size={16} /></button>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mx-3">Trang {page} / {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 transition-colors"><ChevronRight size={16} /></button>
                            <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 transition-colors"><ChevronsRight size={16} /></button>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>Tổng: <strong className="text-foreground">{totalItems}</strong></span>
                            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="p-1 border border-border rounded bg-background text-foreground cursor-pointer outline-none">
                                <option value="15">15 dòng</option>
                                <option value="30">30 dòng</option>
                                <option value="50">50 dòng</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* ==================================================== */}
            {/* SLIDE-OUT DRAWER FORM */}
            {/* ==================================================== */}
            {isPanelOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] transition-opacity" onClick={handleClosePanel} />}

            <div
                // [FIX]: Giao diện trong suốt và tối ưu Mobile (md:border-l, pb-20 md:pb-0)
                className={`fixed top-0 right-0 bottom-0 w-full max-w-[500px] bg-card md:border-l border-border shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col pb-20 md:pb-0 ${isPanelOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* [FIX]: Header trong suốt */}
                <div className="flex-shrink-0 flex items-center justify-between p-5 bg-transparent">
                    <div className="flex items-center gap-2">
                        {editingCode ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">
                            {editingCode ? `Sửa Ca: ${editingCode}` : "Thêm Ca Làm Việc"}
                        </h3>
                    </div>
                    <button onClick={handleClosePanel} className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="drawerForm" onSubmit={handleSubmit} className="flex flex-col gap-5">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Mã Ca *</label>
                                <input type="text" required disabled={!!editingCode} value={formData.shift_code} onChange={e => setFormData({ ...formData, shift_code: e.target.value })} placeholder="VD: CA_DEM" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold uppercase w-full disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Tên Ca *</label>
                                <input type="text" required value={formData.shift_name} onChange={e => setFormData({ ...formData, shift_name: e.target.value })} placeholder="Ca Đêm Hồi Sức" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                            </div>
                        </div>

                        <div className="p-4 bg-muted/30 border border-border rounded-xl flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Giờ Bắt Đầu *</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input type="time" required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className="hrm-input h-10 pl-9 pr-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-mono w-full" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Giờ Kết Thúc *</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input type="time" required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} className="hrm-input h-10 pl-9 pr-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-mono w-full" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Thời Gian Trực</label>
                                    <select value={formData.is_overnight} onChange={e => setFormData({ ...formData, is_overnight: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-medium w-full bg-background text-foreground cursor-pointer">
                                        <option value="0">☀️ Trong ngày</option>
                                        <option value="1">🌙 Qua ngày (Đêm)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Tính Chất Ca</label>
                                    <select value={formData.is_on_call} onChange={e => setFormData({ ...formData, is_on_call: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-medium w-full bg-background text-foreground cursor-pointer">
                                        <option value="0">🏢 Bình thường</option>
                                        <option value="1">🚨 Ca Trực (On-call)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border border-border p-3 rounded-xl bg-background shadow-sm">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Bắt đầu Check-in</label>
                                <input type="time" value={formData.checkin_from} onChange={e => setFormData({ ...formData, checkin_from: e.target.value })} className="hrm-input h-9 px-3 bg-muted text-foreground rounded-md border border-border text-[12px] font-mono w-full" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Kết thúc Check-in</label>
                                <input type="time" value={formData.checkin_to} onChange={e => setFormData({ ...formData, checkin_to: e.target.value })} className="hrm-input h-9 px-3 bg-muted text-foreground rounded-md border border-border text-[12px] font-mono w-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border border-border p-3 rounded-xl bg-background shadow-sm">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Bắt đầu Check-out</label>
                                <input type="time" value={formData.checkout_from} onChange={e => setFormData({ ...formData, checkout_from: e.target.value })} className="hrm-input h-9 px-3 bg-muted text-foreground rounded-md border border-border text-[12px] font-mono w-full" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Kết thúc Check-out</label>
                                <input type="time" value={formData.checkout_to} onChange={e => setFormData({ ...formData, checkout_to: e.target.value })} className="hrm-input h-9 px-3 bg-muted text-foreground rounded-md border border-border text-[12px] font-mono w-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block" title="Số giờ công">Giờ công</label>
                                <input type="number" step="0.1" value={formData.work_hours} onChange={e => setFormData({ ...formData, work_hours: e.target.value })} placeholder="8.0" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block" title="Số ngày công">Ngày công</label>
                                <input type="number" step="0.1" value={formData.work_days} onChange={e => setFormData({ ...formData, work_days: e.target.value })} placeholder="1.0" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block" title="Hệ số công">Hệ số</label>
                                <input type="number" step="0.1" value={formData.day_coefficient} onChange={e => setFormData({ ...formData, day_coefficient: e.target.value })} placeholder="1.0" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ghi chú</label>
                            <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Tùy chọn ghi chú thêm..." className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full" />
                        </div>
                    </form>
                </div>

                {/* [FIX]: Footer trong suốt */}
                <div className="flex-shrink-0 p-5 bg-transparent flex gap-3">
                    <button type="button" onClick={handleClosePanel} className="flex-1 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border">
                        Hủy Bỏ
                    </button>
                    <button type="submit" form="drawerForm" className="flex-1 flex items-center justify-center gap-2 h-11 text-primary-foreground bg-primary hover:opacity-90 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md">
                        <Save size={16} /> {editingCode ? "Cập Nhật" : "Lưu Ca"}
                    </button>
                </div>
            </div>
        </div>
    );
}