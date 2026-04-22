"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    HardDrive, Cpu, RefreshCw, Trash2, Search, Filter, X, Save,
    Zap, CameraOff, User, Building, ShieldAlert,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface AIStatus {
    files_count: number;
    ram_count: number;
}

interface FaceData {
    username: string;
    full_name: string;
    department_name: string;
    type: 'mapped' | 'unmapped' | 'no_face';
    images: string[];
}

interface Department {
    id: number;
    unit_name: string;
}

export default function FaceManagementPage() {
    // --- States Phân quyền ---
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (localStorage.getItem("hrm_role") !== "admin") {
                alert("Chỉ Quản trị viên (Admin) mới có quyền truy cập trang này!");
                window.location.href = "/dashboard";
            }
        }
    }, []);

    // --- States Dữ liệu ---
    const [aiStatus, setAiStatus] = useState<AIStatus>({ files_count: 0, ram_count: 0 });
    const [faces, setFaces] = useState<FaceData[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAiActionLoading, setIsAiActionLoading] = useState(false);

    // --- States Phân trang & Filter ---
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [tempSearch, setTempSearch] = useState("");

    // --- States Drawer (Đăng ký nhanh) ---
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const initialFormState = { username: "", full_name: "", department_id: "", password: "123456" };
    const [formData, setFormData] = useState(initialFormState);

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchAIStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai_status`);
            if (res.ok) {
                const data = await res.json();
                setAiStatus(data);
            }
        } catch (e) { console.error("Lỗi lấy trạng thái AI:", e); }
    };

    const fetchDepartments = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/departments`);
            if (res.ok) setDepartments(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchFacesOverview = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/faces/overview?page=${page}&limit=${pageSize}&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const responseData = await res.json();
                setFaces(responseData.data || []);
                setTotalPages(responseData.total_pages || 1);
                setTotalItems(responseData.total || 0);
            }
        } catch (e) {
            console.error("Lỗi:", e);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, statusFilter, searchQuery]);

    useEffect(() => {
        fetchAIStatus();
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchFacesOverview();
    }, [fetchFacesOverview]);

    // ==========================================
    // HANDLERS
    // ==========================================
    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setSearchQuery(tempSearch);
            setPage(1);
        }
    };

    const reloadRAM = async () => {
        setIsAiActionLoading(true);
        try {
            await fetch(`${API_BASE_URL}/reload_ram`);
            alert("Nạp lại dữ liệu hoàn tất!");
            fetchAIStatus();
        } finally {
            setIsAiActionLoading(false);
        }
    };

    const clearRAM = async () => {
        if (confirm("⚠️ Tạm dừng nhận diện để giải phóng toàn bộ RAM?")) {
            await fetch(`${API_BASE_URL}/clear_ram`);
            fetchAIStatus();
        }
    };

    const deleteSingleFace = async (imgName: string) => {
        if (confirm(`Bạn có chắc chắn muốn xóa bức ảnh [${imgName}] này không?\nHành động này sẽ xóa file vật lý và giải phóng RAM ngay lập tức.`)) {
            try {
                const res = await fetch(`${API_BASE_URL}/delete_single_face`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: imgName })
                });
                if (res.ok) {
                    fetchFacesOverview();
                    fetchAIStatus();
                } else alert("Có lỗi xảy ra khi xóa ảnh này.");
            } catch (e) { alert("Lỗi kết nối máy chủ"); }
        }
    };

    const deleteFaceAll = async (username: string, name: string) => {
        if (confirm(`⚠️ CHÚ Ý: Hành động này sẽ XÓA TOÀN BỘ CÁC ẢNH AI của [${name}].\n\nBạn chắc chắn muốn tiếp tục?`)) {
            try {
                await fetch(`${API_BASE_URL}/unregister`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: username })
                });
                fetchFacesOverview();
                fetchAIStatus();
            } catch (e) { alert("Lỗi kết nối"); }
        }
    };

    const openQuickReg = (baseUsername: string) => {
        setFormData({ ...initialFormState, username: baseUsername });
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setFormData(initialFormState), 300);
    };

    const handleRegSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            username: formData.username.toUpperCase(),
            full_name: formData.full_name.trim(),
            department_id: formData.department_id ? parseInt(formData.department_id) : null,
            role: "user", status: "active", is_locked: 0,
            password: formData.password.trim()
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Tạo tài khoản thành công! Ảnh đã được tự động Map.");
                handleCloseDrawer();
                fetchFacesOverview();
            } else {
                const d = await res.json();
                alert("Lỗi: " + d.detail);
            }
        } catch (err) { alert("Lỗi kết nối."); }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const renderBadge = (type: string, count: number) => {
        switch (type) {
            case 'mapped':
                return <span className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">🟢 Đã Map ({count})</span>;
            case 'unmapped':
                return <span className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">⚠️ Mồ côi ({count})</span>;
            default:
                return <span className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-slate-400 text-white text-[9px] font-black uppercase tracking-widest shadow-sm">🔴 Trống</span>;
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* HEADER & THỐNG KÊ */}
            <div className="flex-shrink-0 flex flex-col xl:flex-row justify-between gap-4 mb-4">
                <div className="flex-1">
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <ScanFaceIcon className="w-6 h-6 text-primary" />
                        Hệ Thống Nhận Diện Khuôn Mặt (AI Core)
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Quản lý và đồng bộ dữ liệu hình ảnh sinh trắc học</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-3">
                        <div className="hrm-card px-4 py-3 min-w-[140px] flex flex-col items-center justify-center bg-card">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1"><HardDrive size={12} /> Ổ Đĩa</span>
                            <span className="text-2xl font-black text-foreground mt-1">{aiStatus.files_count}</span>
                        </div>
                        <div className="hrm-card px-4 py-3 min-w-[140px] flex flex-col items-center justify-center bg-card border-primary/30">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1"><Cpu size={12} /> Trên RAM</span>
                            <span className="text-2xl font-black text-primary mt-1">{aiStatus.ram_count}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[160px]">
                        <button onClick={reloadRAM} disabled={isAiActionLoading} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all">
                            <RefreshCw size={14} className={isAiActionLoading ? "animate-spin" : ""} /> {isAiActionLoading ? "Đang nạp..." : "Nạp Lại"}
                        </button>
                        <button onClick={clearRAM} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all">
                            <ShieldAlert size={14} /> Xóa RAM
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar bg-background gap-4 pb-20 md:pb-0">
                {/* BỘ LỌC & TÌM KIẾM */}
                <div className="hrm-card p-4 border border-border bg-card shadow-sm shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0 flex items-center gap-2">
                        <Filter size={16} className="text-primary" /> Lọc Hình Ảnh
                    </h3>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-medium bg-background text-foreground cursor-pointer min-w-[200px]"
                        >
                            <option value="all">Tất cả nhân sự & Ảnh</option>
                            <option value="mapped">🟢 Đã đăng ký chuẩn</option>
                            <option value="unmapped">⚠️ Ảnh mồ côi (Chưa ĐK)</option>
                            <option value="no_face">🔴 Chưa có ảnh</option>
                        </select>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={tempSearch}
                                onChange={(e) => setTempSearch(e.target.value)}
                                onKeyDown={handleSearch}
                                placeholder="Tìm mã NV hoặc Tên (Enter)..."
                                className="hrm-input h-10 pl-9 pr-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full sm:w-[250px]"
                            />
                        </div>
                    </div>
                </div>

                {/* TABLE CONTAINER */}
                <div className="flex-1 shrink-0 md:shrink flex flex-col min-h-[400px] md:min-h-0 md:hrm-card md:bg-card md:border md:border-border md:shadow-sm md:rounded-xl md:overflow-hidden relative">
                    <div className="hidden md:flex flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30">
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">Danh Sách Hình Ảnh</h3>
                    </div>

                    {/* GRID HIỂN THỊ ẢNH (SCROLLABLE) */}
                    <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar p-5 w-full">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải danh sách ảnh...</span>
                            </div>
                        ) : faces.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <CameraOff className="w-10 h-10 opacity-20 mb-2" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Không tìm thấy dữ liệu khuôn mặt.</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {faces.map((item) => (
                                    <div key={item.username} className={`flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-md transition-all ${item.type === 'unmapped' ? 'border-amber-500' : 'border-border'}`}>

                                        {/* Khu vực ảnh */}
                                        <div className="relative h-[200px] bg-muted/20 border-b border-border w-full overflow-hidden flex flex-col">
                                            {renderBadge(item.type, item.images ? item.images.length : 0)}

                                            {item.images && item.images.length > 0 ? (
                                                <div className="flex-1 flex overflow-x-auto gap-3 p-4 items-center custom-scrollbar">
                                                    {item.images.map(imgName => (
                                                        <div key={imgName} className="relative flex-shrink-0 group/img flex flex-col items-center h-full justify-center">
                                                            <button
                                                                onClick={() => deleteSingleFace(imgName)}
                                                                className="absolute top-1 right-1 z-20 bg-destructive text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 hover:scale-110 transition-all shadow-md"
                                                                title="Xóa bức ảnh này"
                                                            >
                                                                <X size={12} strokeWidth={4} />
                                                            </button>
                                                            <img
                                                                src={`${API_BASE_URL}/api/faces/image/${imgName}?t=${Date.now()}`}
                                                                alt={imgName}
                                                                className="h-[140px] w-[110px] object-cover rounded-lg border-2 border-background shadow-sm"
                                                            />
                                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[8px] px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap z-10 pointer-events-none">
                                                                {imgName}.jpg
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                    <CameraOff className="w-8 h-8 opacity-30" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Chưa Có Ảnh</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Thông tin & Action */}
                                        <div className="p-4 flex flex-col flex-1 bg-background">
                                            <h4 className="text-[14px] font-black text-foreground mb-1 line-clamp-1" title={item.full_name}>{item.full_name}</h4>
                                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1 text-[11px]">
                                                <User size={12} /> Mã: <strong className="text-primary font-mono">{item.username}</strong>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-muted-foreground mb-4 text-[11px] line-clamp-1">
                                                <Building size={12} /> {item.department_name || "Chưa xếp phòng ban"}
                                            </div>

                                            <div className="mt-auto flex flex-col gap-2">
                                                {item.type === 'mapped' && (
                                                    <button onClick={() => deleteFaceAll(item.username, item.full_name)} className="w-full py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                                        <Trash2 size={14} /> Xóa Toàn Bộ Ảnh
                                                    </button>
                                                )}
                                                {item.type === 'unmapped' && (
                                                    <>
                                                        <button onClick={() => openQuickReg(item.username)} className="w-full py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                            <Zap size={14} /> Đăng Ký Nhanh
                                                        </button>
                                                        <button onClick={() => deleteFaceAll(item.username, item.username)} className="w-full py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                                            <Trash2 size={14} /> Xóa Thư Mục Ảnh
                                                        </button>
                                                    </>
                                                )}
                                                {item.type === 'no_face' && (
                                                    <button disabled className="w-full py-2 bg-muted text-muted-foreground rounded-lg text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                                                        Chưa Thể Thao Tác
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* PHÂN TRANG */}
                    {!isLoading && totalPages > 0 && (
                        <div className="flex-none flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-border bg-card">
                            <div className="flex items-center gap-1">
                                <button disabled={page === 1} onClick={() => setPage(1)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 transition-colors"><ChevronsLeft size={16} /></button>
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 transition-colors"><ChevronLeft size={16} /></button>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mx-3">Trang {page} / {totalPages}</span>
                                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 transition-colors"><ChevronRight size={16} /></button>
                                <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 transition-colors"><ChevronsRight size={16} /></button>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                <span>Tổng: <strong className="text-foreground">{totalItems}</strong></span>
                                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="p-1 border border-border rounded bg-background text-foreground cursor-pointer outline-none">
                                    <option value="12">12 thẻ</option>
                                    <option value="24">24 thẻ</option>
                                    <option value="48">48 thẻ</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================================================== */}
            {/* SLIDE-OUT DRAWER FORM: ĐĂNG KÝ NHANH */}
            {/* ==================================================== */}
            {isDrawerOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] transition-opacity" onClick={handleCloseDrawer} />}

            <div className={`fixed top-0 right-0 bottom-0 w-full max-w-[450px] bg-card md:border-l border-border shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col pb-20 md:pb-0 ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>

                {/* Header Drawer */}
                <div className="flex-shrink-0 flex items-center justify-between p-5 bg-transparent border-b border-border">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-emerald-500" />
                        <div>
                            <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">Đăng Ký Nhanh Nhân Viên</h3>
                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Tạo tài khoản từ thư mục ảnh mồ côi</p>
                        </div>
                    </div>
                    <button onClick={handleCloseDrawer} className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body Form */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="quickRegForm" onSubmit={handleRegSubmit} className="flex flex-col gap-5">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Mã Nhân Viên (Từ tên file ảnh)</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.username}
                                className="hrm-input h-10 px-3 bg-muted text-muted-foreground rounded-lg border border-border text-[12px] font-bold uppercase w-full cursor-not-allowed opacity-80"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Họ và Tên *</label>
                            <input
                                type="text"
                                required
                                placeholder="Nhập tên nhân viên..."
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Phòng Ban / Đơn Vị</label>
                            <select
                                value={formData.department_id}
                                onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-medium w-full bg-background text-foreground cursor-pointer"
                            >
                                <option value="">-- Chọn đơn vị (Không bắt buộc) --</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.unit_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Mật khẩu khởi tạo *</label>
                            <input
                                type="text"
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-mono w-full"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer Drawer */}
                <div className="flex-shrink-0 p-5 bg-transparent border-t border-border flex gap-3">
                    <button type="button" onClick={handleCloseDrawer} className="flex-1 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border">
                        Hủy Bỏ
                    </button>
                    <button type="submit" form="quickRegForm" className="flex-1 flex items-center justify-center gap-2 h-11 text-white bg-emerald-500 hover:bg-emerald-600 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md">
                        <Save size={16} /> LƯU TÀI KHOẢN
                    </button>
                </div>
            </div>
        </div>
    );
}

// Sub-component phụ cho icon nếu bạn muốn tách (không bắt buộc)
function ScanFaceIcon(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" />
        </svg>
    )
}