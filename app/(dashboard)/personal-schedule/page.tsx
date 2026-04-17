"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    Plus, Edit2, Trash2, X, Save, Search, Filter,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    MessageSquareWarning, Check, Ban, ImageIcon // Đã đồng bộ icon CheckCircle và XCircle
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface Explanation {
    id: number;
    username: string;
    date: string;
    shift_code: string;
    shift_name?: string;
    reason: string;
    attached_file?: string;
    status: number | string;
}

interface ShiftCategory {
    shift_code: string;
    shift_name: string;
}

export default function ExplanationsPage() {
    // --- States Dữ liệu ---
    const [explanations, setExplanations] = useState<Explanation[]>([]);
    const [shiftCategories, setShiftCategories] = useState<ShiftCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- States User/Phân quyền ---
    const [currentUser, setCurrentUser] = useState({ username: "", role: "user" });

    // --- States Lọc (Filter) & Phân trang ---
    const [filters, setFilters] = useState({ username: "", status: "1" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // --- States Drawer (Form) & Modal Image ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

    const initialFormState = {
        date: "",
        shift_code: "",
        reason: "",
        attached_file: null as File | null
    };
    const [formData, setFormData] = useState<any>(initialFormState);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // ==========================================
    // INITIALIZATION & FETCH DATA
    // ==========================================
    useEffect(() => {
        const fetchInitialData = async () => {
            // 1. Lấy user role
            try {
                const token = localStorage.getItem("hrm_token");
                const userRes = await fetch(`${API_BASE_URL}/api/employees/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (userRes.ok) {
                    const payload = await userRes.json();
                    const roles = (payload.data.role || "user").split(",").map((r: string) => r.trim().toLowerCase());
                    let role = "user";
                    if (roles.includes("admin")) role = "admin";
                    else if (roles.includes("manager")) role = "manager";

                    setCurrentUser({ username: payload.data.username, role });
                }
            } catch (e) { console.error("Lỗi lấy thông tin user:", e); }

            // 2. Lấy danh mục ca
            try {
                const token = localStorage.getItem("hrm_token");
                const catRes = await fetch(`${API_BASE_URL}/api/shift-categories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (catRes.ok) {
                    setShiftCategories(await catRes.json());
                }
            } catch (e) { console.error("Lỗi tải danh mục ca:", e); }
        };

        fetchInitialData();
    }, []);

    const fetchExplanations = useCallback(async () => {
        setIsLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            let url = `${API_BASE_URL}/api/explanations?skip=${skip}&limit=${pageSize}`;

            if (filters.username.trim()) url += `&username=${filters.username.trim()}`;
            if (filters.status !== "") url += `&status=${filters.status}`;

            const token = localStorage.getItem("hrm_token");
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.ok) {
                const data = await res.json();
                setExplanations(data.items || []);
                setTotalItems(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách giải trình:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, filters]);

    useEffect(() => {
        // Debounce cho filter
        const timer = setTimeout(() => {
            fetchExplanations();
        }, 400);
        return () => clearTimeout(timer);
    }, [fetchExplanations]);

    // ==========================================
    // UI ACTIONS (FORM & MODALS)
    // ==========================================
    const handleAddNew = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1); // Default to yesterday like old code

        setEditingId(null);
        setFormData({
            ...initialFormState,
            date: d.toISOString().split('T')[0]
        });
        setPreviewUrl(null);
        setIsPanelOpen(true);
    };

    const handleEdit = (item: Explanation) => {
        setEditingId(item.id);
        setFormData({
            date: item.date,
            shift_code: item.shift_code,
            reason: item.reason,
            attached_file: null // Will only update if user selects new file
        });
        setPreviewUrl(item.attached_file ? (item.attached_file.startsWith('/') ? item.attached_file : '/' + item.attached_file) : null);
        setIsPanelOpen(true);
    };

    const handleClosePanel = () => {
        setIsPanelOpen(false);
        setTimeout(() => {
            setEditingId(null);
            setFormData(initialFormState);
            setPreviewUrl(null);
        }, 300);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, attached_file: file });
            const reader = new FileReader();
            reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setFormData({ ...formData, attached_file: null });
            setPreviewUrl(null);
        }
    };

    // ==========================================
    // API SUBMISSIONS
    // ==========================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = new FormData();
        data.append("date", formData.date);
        data.append("shift_code", formData.shift_code);
        data.append("reason", formData.reason);
        if (formData.attached_file) {
            data.append("attached_file", formData.attached_file);
        }

        try {
            const token = localStorage.getItem("hrm_token");
            let url = `${API_BASE_URL}/api/explanations`;
            let method = "POST";

            if (editingId) {
                url = `${url}/${editingId}`;
                method = "PUT";
            } else {
                data.append("username", currentUser.username);
                data.append("status", "1");
            }

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            if (res.ok) {
                alert(editingId ? "Cập nhật thành công!" : "Gửi giải trình thành công!");
                handleClosePanel();
                fetchExplanations();
            } else {
                const err = await res.json();
                alert("Lỗi: " + (err.detail || "Không thể thực hiện"));
            }
        } catch (err) {
            alert("Lỗi kết nối! Chỉ có thể giải trình ở ngày trong quá khứ.");
        }
    };

    const callStatusAPI = async (id: number, action: "approve" | "reject") => {
        try {
            const token = localStorage.getItem("hrm_token");
            const res = await fetch(`${API_BASE_URL}/api/explanations/${id}/${action}`, {
                method: "PUT",
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchExplanations();
            } else {
                const err = await res.json();
                alert(err.detail);
            }
        } catch (e) { alert("Lỗi kết nối!"); }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const getStatusUI = (status: number | string) => {
        const s = parseInt(status.toString());
        if (s === 1) return <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">⏳ Chờ duyệt</span>;
        if (s === 2) return <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">✔️ Đã duyệt</span>;
        if (s === 3) return <span className="px-2 py-1 rounded bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-widest border border-destructive/20">❌ Từ chối</span>;
        return <span className="px-2 py-1 rounded bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-widest border border-border">Không Rõ</span>;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* --- HEADER --- */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <MessageSquareWarning className="w-6 h-6 text-primary" />
                        Quản Lý Giải Trình
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Theo dõi và xử lý giải trình chấm công của nhân viên</p>
                </div>
                <button onClick={handleAddNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm">
                    <Plus size={16} /> Thêm Giải Trình
                </button>
            </div>

            {/* --- BỘ LỌC (FILTERS) --- */}
            <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 hrm-card bg-card border-border">
                <div className="flex-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block flex items-center gap-1"><Search size={12} /> Mã Nhân Viên</label>
                    <input
                        type="text"
                        placeholder="Nhập mã NV..."
                        value={filters.username}
                        onChange={(e) => { setFilters({ ...filters, username: e.target.value }); setPage(1); }}
                        className="hrm-input h-9 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full uppercase"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block flex items-center gap-1"><Filter size={12} /> Trạng Thái</label>
                    <select
                        value={filters.status}
                        onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                        className="hrm-input h-9 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground cursor-pointer"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="1">⏳ Chờ duyệt</option>
                        <option value="2">✔️ Đã duyệt</option>
                        <option value="3">❌ Từ chối</option>
                    </select>
                </div>
            </div>

            {/* --- MAIN CONTENT CARD --- */}
            <div className="hrm-card flex-1 flex flex-col min-h-0 overflow-hidden bg-card border border-border rounded-xl shadow-sm">
                <div className="flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">Danh Sách Giải Trình</h3>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar relative bg-card">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                        </div>
                    ) : explanations.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <MessageSquareWarning className="w-10 h-10 opacity-20 mb-2" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Không tìm thấy giải trình nào.</span>
                        </div>
                    ) : (
                        <>
                            {/* MOBILE VIEW */}
                            <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                {explanations.map((item) => {
                                    const statusInt = parseInt(item.status.toString());
                                    const canApprove = (currentUser.role === "admin" || currentUser.role === "manager");

                                    return (
                                        <div key={item.id} className="bg-card border border-border rounded-xl p-4 shadow-sm relative">
                                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                                {canApprove && statusInt === 1 && (
                                                    <>
                                                        <button onClick={() => { if (confirm("Duyệt đơn này?")) callStatusAPI(item.id, "approve") }} className="p-1.5 text-emerald-600 bg-emerald-500/10 rounded-md border border-emerald-500/20 hover:bg-emerald-500/20">
                                                            <Check size={16} /> {/* Đã cập nhật */}
                                                        </button>
                                                        <button onClick={() => { if (confirm("Từ chối đơn này?")) callStatusAPI(item.id, "reject") }} className="p-1.5 text-destructive bg-destructive/10 rounded-md border border-destructive/20 hover:bg-destructive/20">
                                                            <Ban size={16} /> {/* Đã cập nhật */}
                                                        </button>
                                                    </>
                                                )}
                                                {statusInt === 1 && item.username === currentUser.username && (
                                                    <button onClick={() => handleEdit(item)} className="p-1.5 text-primary bg-primary/10 rounded-md border border-primary/20 hover:bg-primary/20">
                                                        <Edit2 size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="pr-20 mb-3">
                                                <h4 className="text-sm font-bold text-primary mb-1">{item.username}</h4>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{formatDate(item.date)}</p>
                                            </div>

                                            <div className="mb-3">{getStatusUI(item.status)}</div>

                                            <div className="bg-muted/50 p-3 rounded-lg border border-border w-full text-[12px] flex flex-col gap-2">
                                                <div>
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase block mb-0.5">Ca Làm Việc</span>
                                                    <span className="font-bold">{item.shift_name || item.shift_code || "Không xác định"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase block mb-0.5">Lý do</span>
                                                    <i className="text-muted-foreground">{item.reason}</i>
                                                </div>
                                                {item.attached_file && (
                                                    <button onClick={() => setImageModalUrl(item.attached_file as string)} className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1 w-fit hover:underline">
                                                        <ImageIcon size={12} /> Xem đính kèm
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* DESKTOP VIEW */}
                            <div className="hidden md:block w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-[30] bg-muted">
                                        <tr>
                                            {["MÃ NV", "NGÀY & CA", "LÝ DO", "TRẠNG THÁI", "THAO TÁC"].map((h, i) => (
                                                <th key={i} className="py-3 px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap border-b border-border">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {explanations.map((item) => {
                                            const statusInt = parseInt(item.status.toString());
                                            const canApprove = (currentUser.role === "admin" || currentUser.role === "manager");

                                            return (
                                                <tr key={item.id} className="hover:bg-accent/50 transition-colors border-b border-border group">
                                                    <td className="py-3 px-5 whitespace-nowrap">
                                                        <strong className="text-[13px] font-black text-primary block">{item.username}</strong>
                                                    </td>
                                                    <td className="py-3 px-5 whitespace-nowrap">
                                                        <span className="text-[12px] font-bold text-foreground block">{formatDate(item.date)}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground mt-0.5 flex items-center gap-1">
                                                            ↳ {item.shift_name || item.shift_code || "Không xác định"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-5">
                                                        <div className="text-[12px] text-foreground italic max-w-sm whitespace-normal">
                                                            {item.reason}
                                                        </div>
                                                        {item.attached_file && (
                                                            <button onClick={() => setImageModalUrl(item.attached_file as string)} className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1 hover:underline">
                                                                <ImageIcon size={12} /> Xem đính kèm
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-5 whitespace-nowrap">
                                                        {getStatusUI(item.status)}
                                                    </td>
                                                    <td className="py-3 px-5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            {canApprove && statusInt === 1 && (
                                                                <>
                                                                    <button onClick={() => { if (confirm("Duyệt đơn này?")) callStatusAPI(item.id, "approve") }} className="p-2 text-emerald-600 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/20" title="Duyệt">
                                                                        <Check size={14} /> {/* Đã cập nhật */}
                                                                    </button>
                                                                    <button onClick={() => { if (confirm("Từ chối đơn này?")) callStatusAPI(item.id, "reject") }} className="p-2 text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 border border-destructive/20" title="Từ chối">
                                                                        <Ban size={14} /> {/* Đã cập nhật */}
                                                                    </button>
                                                                </>
                                                            )}
                                                            {statusInt === 1 && item.username === currentUser.username && (
                                                                <button onClick={() => handleEdit(item)} className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 border border-primary/20" title="Sửa">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                            {/* Hiển thị dấu gạch nếu không có quyền gì */}
                                                            {!(canApprove && statusInt === 1) && !(statusInt === 1 && item.username === currentUser.username) && (
                                                                <span className="text-muted-foreground text-[10px] font-bold">---</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* --- PHÂN TRANG --- */}
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

            <div className={`fixed top-0 right-0 bottom-0 w-full max-w-[450px] bg-card md:border-l border-border shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col pb-20 md:pb-0 ${isPanelOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex-shrink-0 flex items-center justify-between p-5 bg-transparent border-b border-border">
                    <div className="flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">
                            {editingId ? `Cập Nhật Giải Trình #${editingId}` : "Thêm Giải Trình Mới"}
                        </h3>
                    </div>
                    <button onClick={handleClosePanel} className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="drawerForm" onSubmit={handleSubmit} className="flex flex-col gap-5">

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Người Gửi (Mã NV)</label>
                            <input type="text" disabled value={currentUser.username} className="hrm-input h-10 px-3 bg-muted text-muted-foreground rounded-lg border border-border text-[12px] font-bold w-full opacity-70 cursor-not-allowed" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ngày Vi Phạm *</label>
                                <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ca Làm Việc *</label>
                                <select required value={formData.shift_code} onChange={e => setFormData({ ...formData, shift_code: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground cursor-pointer">
                                    <option value="">-- Chọn ca --</option>
                                    {shiftCategories.map(cat => (
                                        <option key={cat.shift_code} value={cat.shift_code}>{cat.shift_name} ({cat.shift_code})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Lý do chi tiết *</label>
                            <textarea required rows={4} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Nhập lý do giải trình..." className="hrm-input p-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full resize-none custom-scrollbar" />
                        </div>

                        <div className="p-4 bg-muted/30 border border-border rounded-xl">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Ảnh đính kèm (Tùy chọn)</label>

                            <div className="relative border-2 border-dashed border-border rounded-lg bg-background p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <span className="text-[11px] font-bold text-muted-foreground">Kéo thả hoặc Click chọn ảnh</span>
                                </div>
                            </div>

                            {previewUrl && (
                                <div className="mt-4 text-center relative rounded-lg border border-border p-2 bg-background shadow-sm">
                                    <img src={previewUrl} alt="Preview" className="max-h-[150px] mx-auto rounded-md object-contain" />
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="flex-shrink-0 p-5 bg-transparent border-t border-border flex gap-3">
                    <button type="button" onClick={handleClosePanel} className="flex-1 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border">
                        Hủy Bỏ
                    </button>
                    <button type="submit" form="drawerForm" className="flex-1 flex items-center justify-center gap-2 h-11 text-primary-foreground bg-primary hover:opacity-90 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md">
                        <Save size={16} /> {editingId ? "Lưu Thay Đổi" : "Gửi Giải Trình"}
                    </button>
                </div>
            </div>

            {/* ==================================================== */}
            {/* IMAGE MODAL OVERLAY */}
            {/* ==================================================== */}
            {imageModalUrl && (
                <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setImageModalUrl(null)}>
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setImageModalUrl(null)} className="absolute -top-4 -right-4 md:-top-6 md:-right-6 bg-destructive text-destructive-foreground p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                            <X size={18} />
                        </button>
                        <img
                            src={imageModalUrl.startsWith('/') ? imageModalUrl : '/' + imageModalUrl}
                            alt="Attachment Full"
                            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border border-border object-contain bg-muted"
                        />
                    </div>
                </div>
            )}

        </div>
    );
}