"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    Plus, Edit2, Trash2, X, Save, Search, Wifi, MapPin, Globe, Filter,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface WifiRecord {
    id: number;
    name: string;
    password: string;
    location: string;
    ip_address: string;
    status: 'active' | 'inactive';
    note: string;
}

export default function WifiManagementPage() {
    // --- States Dữ liệu ---
    const [wifis, setWifis] = useState<WifiRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- States Lọc & Phân trang ---
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // --- States Drawer (Form) ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const initialFormState = {
        name: "", password: "", location: "", ip_address: "", status: "active", note: ""
    };
    const [formData, setFormData] = useState<any>(initialFormState);

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchWifis = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("hrm_token");
            const res = await fetch(`${API_BASE_URL}/api/wifi`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setWifis(data);
            } else if (res.status === 403) {
                alert("Bạn không có quyền xem trang này!");
            }
        } catch (error) {
            console.error("Lỗi tải danh sách Wifi:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWifis();
    }, [fetchWifis]);

    // ==========================================
    // LOGIC LỌC & PHÂN TRANG (Client-side)
    // ==========================================
    const filteredData = useMemo(() => {
        return wifis.filter(item => {
            const matchName = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchStatus = statusFilter === "" || item.status === statusFilter;
            return matchName && matchStatus;
        });
    }, [wifis, searchQuery, statusFilter]);

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [totalPages, page]);

    const paginatedData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, page, pageSize]);

    // ==========================================
    // FORM HANDLERS
    // ==========================================
    const handleAddNew = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setIsPanelOpen(true);
    };

    const handleEdit = (item: WifiRecord) => {
        setEditingId(item.id);
        setFormData({
            name: item.name,
            password: item.password,
            location: item.location || "",
            ip_address: item.ip_address || "",
            status: item.status,
            note: item.note || ""
        });
        setIsPanelOpen(true);
    };

    const handleClosePanel = () => {
        setIsPanelOpen(false);
        setTimeout(() => {
            setEditingId(null);
            setFormData(initialFormState);
        }, 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            name: formData.name.trim(),
            password: formData.password.trim(),
            location: formData.location.trim(),
            ip_address: formData.ip_address.trim(),
            status: formData.status,
            note: formData.note.trim()
        };

        const url = editingId ? `${API_BASE_URL}/api/wifi/${editingId}` : `${API_BASE_URL}/api/wifi`;
        const method = editingId ? 'PUT' : 'POST';

        try {
            const token = localStorage.getItem("hrm_token");
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(editingId ? "Cập nhật Wifi thành công!" : "Thêm Wifi thành công!");
                handleClosePanel();
                fetchWifis();
            } else {
                const result = await res.json();
                alert("Lỗi: " + result.detail);
            }
        } catch (err) {
            alert("Lỗi kết nối Server.");
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (confirm(`⚠️ Bạn có chắc chắn muốn xóa mạng Wifi [${name}] không?\nNhân viên sẽ không thể chấm công bằng mạng này nữa.`)) {
            try {
                const token = localStorage.getItem("hrm_token");
                const res = await fetch(`${API_BASE_URL}/api/wifi/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    fetchWifis();
                } else {
                    alert("Lỗi khi xóa Wifi!");
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
                        <Wifi className="w-6 h-6 text-primary" />
                        Danh Mục Mạng Wifi
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Quản lý mạng nội bộ cho phép chấm công</p>
                </div>
                <button onClick={handleAddNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm">
                    <Plus size={16} /> Thêm Wifi Mới
                </button>
            </div>

            {/* MAIN CONTENT CARD */}
            <div className="hrm-card flex-1 flex flex-col min-h-0 overflow-hidden bg-card border border-border rounded-xl shadow-sm">

                {/* CARD HEADER & LỌC */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row justify-between gap-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0 flex items-center">
                        Danh Sách Thiết Lập
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm theo tên Wifi..."
                                className="h-9 pl-9 pr-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full sm:w-[200px] outline-none focus:border-primary"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-9 pl-9 pr-8 bg-background text-foreground rounded-lg border border-border text-[12px] w-full sm:w-auto outline-none focus:border-primary cursor-pointer appearance-none"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="active">🟢 Đang hoạt động</option>
                                <option value="inactive">🔴 Ngừng hoạt động</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* VÙNG CHỨA BẢNG ĐƯỢC PHÉP SCROLL */}
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar relative bg-card">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                        </div>
                    ) : paginatedData.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <Wifi className="w-10 h-10 opacity-20 mb-2" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Chưa có mạng Wifi nào.</span>
                        </div>
                    ) : (
                        <>
                            {/* ========================================= */}
                            {/* 1. MOBILE VIEW (Dạng Block/Card) */}
                            {/* ========================================= */}
                            <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                {paginatedData.map((item) => (
                                    <div key={item.id} className="bg-card border border-border rounded-xl p-4 shadow-sm relative">
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                            <button onClick={() => handleEdit(item)} className="p-1.5 text-primary bg-primary/10 rounded-md border border-primary/20 hover:bg-primary/20 transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-destructive bg-destructive/10 rounded-md border border-destructive/20 hover:bg-destructive/20 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="pr-16 mb-3">
                                            <h4 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                                                <Wifi size={14} className="text-primary" /> {item.name}
                                            </h4>
                                            <code className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">Mật khẩu: {item.password}</code>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            {item.status === 'active'
                                                ? <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">🟢 Hoạt động</span>
                                                : <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 text-[9px] font-black uppercase tracking-widest">🔴 Tạm ngưng</span>
                                            }
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2.5 rounded-lg border border-border w-full text-[11px]">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1"><MapPin size={10} /> Vị trí</span>
                                                <span className="font-medium text-foreground mt-0.5 truncate" title={item.location}>{item.location || '--'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1"><Globe size={10} /> IP Address</span>
                                                <span className="font-mono text-foreground mt-0.5">{item.ip_address || '--'}</span>
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
                                            {["TÊN WIFI (SSID)", "MẬT KHẨU", "VỊ TRÍ", "IP", "TRẠNG THÁI", "THAO TÁC"].map((h, i) => (
                                                <th key={i} className={`relative py-3 px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-border ${i === 5 ? 'text-center' : ''}`}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((item) => (
                                            <tr key={item.id} className="hover:bg-accent/50 transition-colors border-b border-border group">
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <strong className="text-[13px] font-black text-foreground block text-primary">{item.name}</strong>
                                                    {item.note && <span className="text-[10px] text-muted-foreground">{item.note}</span>}
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <code className="text-[11px] font-bold bg-background text-muted-foreground px-2 py-1 rounded border border-border">{item.password}</code>
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap text-[12px] font-medium text-muted-foreground">
                                                    {item.location || '--'}
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap text-[12px] font-mono text-muted-foreground">
                                                    {item.ip_address || '--'}
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    {item.status === 'active'
                                                        ? <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">Hoạt động</span>
                                                        : <span className="px-2 py-1 rounded bg-destructive/10 text-destructive border border-destructive/20 text-[9px] font-black uppercase tracking-widest">Tạm ngưng</span>
                                                    }
                                                </td>
                                                <td className="py-3 px-5 whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleEdit(item)} className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors border border-primary/20" title="Sửa">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors border border-destructive/20" title="Xóa">
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
                {/* GIAO DIỆN PHÂN TRANG */}
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

            <div className={`fixed top-0 right-0 bottom-0 w-full max-w-[450px] bg-card md:border-l border-border shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col pb-20 md:pb-0 ${isPanelOpen ? "translate-x-0" : "translate-x-full"}`}>

                {/* Header Drawer */}
                <div className="flex-shrink-0 flex items-center justify-between p-5 bg-transparent border-b border-border">
                    <div className="flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">
                            {editingId ? "Cập Nhật Wifi" : "Thêm Wifi Mới"}
                        </h3>
                    </div>
                    <button onClick={handleClosePanel} className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body Form */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="drawerForm" onSubmit={handleSubmit} className="flex flex-col gap-5">

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Tên Wifi (SSID) *</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="VD: CongTy_T1" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full focus:border-primary" />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Mật khẩu *</label>
                            <input type="text" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Nhập mật khẩu..." className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-mono w-full focus:border-primary" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Vị Trí</label>
                                <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Tầng 1..." className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">IP Address</label>
                                <input type="text" value={formData.ip_address} onChange={e => setFormData({ ...formData, ip_address: e.target.value })} placeholder="192.168.1.1" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-mono w-full focus:border-primary" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Trạng Thái</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-medium w-full bg-background text-foreground cursor-pointer focus:border-primary">
                                <option value="active">🟢 Đang hoạt động</option>
                                <option value="inactive">🔴 Ngừng hoạt động</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ghi chú</label>
                            <textarea rows={3} value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Thông tin bổ sung..." className="hrm-input p-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full resize-none focus:border-primary" />
                        </div>
                    </form>
                </div>

                {/* Footer Drawer */}
                <div className="flex-shrink-0 p-5 bg-transparent border-t border-border flex gap-3">
                    <button type="button" onClick={handleClosePanel} className="flex-1 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border">
                        Hủy Bỏ
                    </button>
                    <button type="submit" form="drawerForm" className="flex-1 flex items-center justify-center gap-2 h-11 text-primary-foreground bg-primary hover:opacity-90 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md">
                        <Save size={16} /> {editingId ? "Cập Nhật" : "Lưu Wifi"}
                    </button>
                </div>
            </div>
        </div>
    );
}