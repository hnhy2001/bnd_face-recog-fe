"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    Plus, Edit2, X, Save, Search, Filter,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Check, Ban, ImageIcon, CalendarDays
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface LeaveRequest {
    id: number;
    username: string;
    fullname: string;
    type_id: number | string;
    type_name: string;
    from_date: string;
    from_session: string;
    to_date: string;
    to_session: string;
    reason: string;
    status: string; // PENDING, APPROVED, REJECTED
    approver_username?: string;
    approver_fullname?: string;
    attached_image?: string;
}

interface LeaveType {
    id: number | string;
    name: string;
}

interface Manager {
    username: string;
    full_name: string;
}

export default function LeaveRequestsPage() {
    // --- States Dữ liệu ---
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [managers, setManagers] = useState<Manager[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- States User/Phân quyền ---
    const [currentUser, setCurrentUser] = useState({ username: "", fullname: "", role: "user" });

    // --- States Lọc (Filter) & Phân trang ---
    const [filters, setFilters] = useState({ search: "", status: "" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // --- States Drawer (Form) & Modal Image ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

    const initialFormState = {
        username: "",
        fullname: "",
        type_id: "",
        from_date: "",
        from_session: "Cả ngày",
        to_date: "",
        to_session: "Cả ngày",
        reason: "",
        approver_username: "",
        attached_file: null as File | null
    };
    const [formData, setFormData] = useState<any>(initialFormState);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // ==========================================
    // INITIALIZATION & FETCH DATA
    // ==========================================
    useEffect(() => {
        const fetchInitialData = async () => {
            const token = localStorage.getItem("hrm_token");
            const headers = { 'Authorization': `Bearer ${token}` };

            // 1. Lấy thông tin user hiện tại
            try {
                const userRes = await fetch(`${API_BASE_URL}/api/employees/me`, { headers });
                if (userRes.ok) {
                    const payload = await userRes.json();
                    const roles = (payload.data.role || "user").split(",").map((r: string) => r.trim().toLowerCase());
                    let role = "user";
                    if (roles.includes("admin")) role = "admin";
                    else if (roles.includes("manager")) role = "manager";

                    setCurrentUser({
                        username: payload.data.username,
                        fullname: payload.data.full_name,
                        role
                    });
                }
            } catch (e) { console.error("Lỗi lấy thông tin user:", e); }

            // 2. Lấy danh mục loại nghỉ phép
            try {
                const typeRes = await fetch(`${API_BASE_URL}/leave-types/api`, { headers });
                if (typeRes.ok) setLeaveTypes(await typeRes.json());
            } catch (e) { console.error("Lỗi tải loại phép:", e); }

            // 3. Lấy danh sách người duyệt (managers)
            try {
                const managerRes = await fetch(`${API_BASE_URL}/api/employees/managers`, { headers });
                if (managerRes.ok) {
                    // Khai báo rõ rawManagers là mảng chứa các object kiểu Manager
                    const rawManagers: Manager[] = await managerRes.json();

                    // TypeScript giờ đã hiểu m là Manager
                    const uniqueManagers = Array.from(
                        new Map(rawManagers.map(m => [m.username, m])).values()
                    );

                    setManagers(uniqueManagers);
                }
            } catch (e) {
                console.error("Lỗi tải danh sách quản lý:", e);
            }
        };

        fetchInitialData();
    }, []);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("hrm_token");
            const url = `${API_BASE_URL}/leave-requests/api?page=${page}&size=${pageSize}&search=${encodeURIComponent(filters.search)}&status=${filters.status}`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.ok) {
                const data = await res.json();
                setRequests(data.items || []);
                setTotalItems(data.total || 0);
                setTotalPages(data.total_pages || 1);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách đơn từ:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, filters]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchRequests();
        }, 400);
        return () => clearTimeout(timer);
    }, [fetchRequests]);

    // ==========================================
    // UI ACTIONS (FORM & MODALS)
    // ==========================================
    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            ...initialFormState,
            username: currentUser.username,
            fullname: currentUser.fullname,
            from_date: new Date().toISOString().split('T')[0],
            to_date: new Date().toISOString().split('T')[0]
        });
        setPreviewUrl(null);
        setIsPanelOpen(true);
    };

    const handleEdit = (item: LeaveRequest) => {
        setEditingId(item.id);
        setFormData({
            username: item.username,
            fullname: item.fullname,
            type_id: item.type_id,
            from_date: item.from_date,
            from_session: item.from_session,
            to_date: item.to_date,
            to_session: item.to_session,
            reason: item.reason,
            approver_username: item.approver_username || "",
            attached_file: null
        });
        setPreviewUrl(item.attached_image ? (item.attached_image.startsWith('http') ? item.attached_image : `${API_BASE_URL}/${item.attached_image}`) : null);
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

    // Logic đồng bộ buổi khi cùng ngày
    const updateSessionLogic = (field: string, value: string, currentData: any) => {
        let newData = { ...currentData, [field]: value };
        if (newData.from_date && newData.to_date && newData.from_date === newData.to_date) {
            if (field === "from_session" || field === "from_date" || field === "to_date") {
                newData.to_session = newData.from_session;
            }
        }
        setFormData(newData);
    };

    // ==========================================
    // API SUBMISSIONS
    // ==========================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (new Date(formData.from_date) > new Date(formData.to_date)) {
            alert("Lỗi: Ngày bắt đầu không thể lớn hơn ngày kết thúc!");
            return;
        }

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'attached_file') {
                if (formData[key]) data.append(key, formData[key]);
            } else {
                data.append(key, formData[key]);
            }
        });

        try {
            const token = localStorage.getItem("hrm_token");
            let url = `${API_BASE_URL}/leave-requests/api`;
            let method = editingId ? "PUT" : "POST";
            if (editingId) url += `/${editingId}`;

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            if (res.ok) {
                alert(editingId ? "Cập nhật thành công!" : "Gửi yêu cầu thành công!");
                handleClosePanel();
                fetchRequests();
            } else {
                const err = await res.json();
                alert("Lỗi: " + (err.detail || "Không thể thực hiện"));
            }
        } catch (err) { alert("Lỗi kết nối hệ thống!"); }
    };

    const callStatusAPI = async (id: number, status: string) => {
        try {
            const token = localStorage.getItem("hrm_token");
            const res = await fetch(`${API_BASE_URL}/leave-requests/api/${id}/status`, {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status,
                    approver_username: currentUser.username,
                    approver_fullname: currentUser.fullname
                })
            });
            if (res.ok) fetchRequests();
            else alert("Lỗi cập nhật trạng thái");
        } catch (e) { alert("Lỗi kết nối!"); }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const getStatusUI = (status: string) => {
        if (status === "PENDING") return <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">⏳ Chờ duyệt</span>;
        if (status === "APPROVED") return <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">✔️ Đã duyệt</span>;
        if (status === "REJECTED") return <span className="px-2 py-1 rounded bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-widest border border-destructive/20">❌ Từ chối</span>;
        return <span className="px-2 py-1 rounded bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-widest border border-border">{status}</span>;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";

        // 1. Nếu API đã trả về sẵn định dạng DD/MM/YYYY (có dấu /) thì giữ nguyên
        if (dateStr.includes("/")) {
            return dateStr;
        }

        // 2. Cắt bỏ phần giờ nếu API trả về ISO String (VD: 2026-04-23T00:00:00)
        const datePart = dateStr.split("T")[0];

        // 3. Nếu là định dạng YYYY-MM-DD thì format lại
        if (datePart.includes("-")) {
            const [y, m, d] = datePart.split("-");
            return `${d}/${m}/${y}`;
        }

        return dateStr;
    };

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* --- HEADER --- */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-primary" />
                        Quản Lý Xin Nghỉ
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Đăng ký và phê duyệt các yêu cầu nghỉ phép của nhân viên</p>
                </div>
                <button onClick={handleAddNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm">
                    <Plus size={16} /> Tạo Đơn Mới
                </button>
            </div>

            {/* MAIN CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar bg-background gap-4 pb-20 md:pb-0">
                {/* --- BỘ LỌC (FILTERS) --- */}
                <div className="flex flex-col md:flex-row gap-4 p-4 hrm-card bg-card border-border shadow-sm shrink-0">
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block flex items-center gap-1"><Search size={12} /> Tìm kiếm</label>
                        <input
                            type="text"
                            placeholder="Mã NV, Họ tên..."
                            value={filters.search}
                            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
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
                            <option value="">Tất cả đơn từ</option>
                            <option value="PENDING">⏳ Chờ duyệt</option>
                            <option value="APPROVED">✔️ Đã duyệt</option>
                            <option value="REJECTED">❌ Từ chối</option>
                        </select>
                    </div>
                </div>

                {/* --- TABLE CONTAINER --- */}
                <div className="flex-1 shrink-0 md:shrink flex flex-col min-h-[400px] md:min-h-0 md:hrm-card md:bg-card md:border md:border-border md:shadow-sm md:rounded-xl md:overflow-hidden relative">
                    <div className="hidden md:flex flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30">
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">Danh Sách Yêu Cầu</h3>
                    </div>

                    <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar relative w-full bg-card">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải...</span>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <CalendarDays className="w-10 h-10 opacity-20 mb-2" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Không có dữ liệu đơn từ.</span>
                            </div>
                        ) : (
                            <>
                                {/* MOBILE VIEW */}
                                <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                    {requests.map((item) => {
                                        const canApprove = (currentUser.role === "admin" || currentUser.role === "manager");
                                        return (
                                            <div key={item.id} className="bg-card border border-border rounded-xl p-4 shadow-sm relative">
                                                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                                    {canApprove && item.status === "PENDING" && (
                                                        <>
                                                            <button onClick={() => { if (confirm("Duyệt đơn này?")) callStatusAPI(item.id, "APPROVED") }} className="p-1.5 text-emerald-600 bg-emerald-500/10 rounded-md border border-emerald-500/20 hover:bg-emerald-500/20">
                                                                <Check size={14} />
                                                            </button>
                                                            <button onClick={() => { if (confirm("Từ chối đơn này?")) callStatusAPI(item.id, "REJECTED") }} className="p-1.5 text-destructive bg-destructive/10 rounded-md border border-destructive/20 hover:bg-destructive/20">
                                                                <Ban size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === "PENDING" && item.username === currentUser.username && (
                                                        <button onClick={() => handleEdit(item)} className="p-1.5 text-primary bg-primary/10 rounded-md border border-primary/20 hover:bg-primary/20">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="pr-16 mb-3">
                                                    <h4 className="text-sm font-bold text-primary mb-1">{item.username}</h4>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.fullname}</p>
                                                </div>

                                                <div className="mb-3">{getStatusUI(item.status)}</div>

                                                <div className="bg-muted/50 p-3 rounded-lg border border-border w-full text-[12px] flex flex-col gap-2">
                                                    <div>
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase block mb-0.5">Loại phép & Lý do</span>
                                                        <span className="font-bold text-foreground">{item.type_name}</span> - <i className="text-muted-foreground">{item.reason}</i>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase block mb-0.5">Thời gian nghỉ</span>
                                                        <span className="font-bold">{formatDate(item.from_date)} ({item.from_session})</span> đến <span className="font-bold">{formatDate(item.to_date)} ({item.to_session})</span>
                                                    </div>
                                                    {item.attached_image && (
                                                        <button onClick={() => setImageModalUrl(item.attached_image as string)} className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1 w-fit hover:underline">
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
                                                {["NHÂN VIÊN", "LOẠI PHÉP", "THỜI GIAN", "LÝ DO", "TRẠNG THÁI", "THAO TÁC"].map((h, i) => (
                                                    <th key={i} className="py-3 px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap border-b border-border">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requests.map((item) => {
                                                const canApprove = (currentUser.role === "admin" || currentUser.role === "manager");
                                                return (
                                                    <tr key={item.id} className="hover:bg-accent/50 transition-colors border-b border-border group">
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            <strong className="text-[13px] font-black text-primary block">{item.username}</strong>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.fullname}</span>
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            <span className="text-[12px] font-bold text-foreground block">{item.type_name}</span>
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            <div className="text-[11px] font-bold">
                                                                {formatDate(item.from_date)} <span className="text-[9px] px-1 bg-muted rounded">{item.from_session}</span>
                                                            </div>
                                                            <div className="text-[11px] font-bold mt-1">
                                                                {formatDate(item.to_date)} <span className="text-[9px] px-1 bg-muted rounded">{item.to_session}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-5">
                                                            <div className="text-[12px] text-foreground italic max-w-sm line-clamp-2">
                                                                {item.reason}
                                                            </div>
                                                            {item.attached_image && (
                                                                <button onClick={() => setImageModalUrl(item.attached_image as string)} className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1 hover:underline">
                                                                    <ImageIcon size={12} /> Xem ảnh
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            {getStatusUI(item.status)}
                                                        </td>
                                                        <td className="py-3 px-5 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                {canApprove && item.status === "PENDING" && (
                                                                    <>
                                                                        <button onClick={() => { if (confirm("Duyệt đơn này?")) callStatusAPI(item.id, "APPROVED") }} className="p-2 text-emerald-600 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/20" title="Duyệt">
                                                                            <Check size={14} />
                                                                        </button>
                                                                        <button onClick={() => { if (confirm("Từ chối đơn này?")) callStatusAPI(item.id, "REJECTED") }} className="p-2 text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 border border-destructive/20" title="Từ chối">
                                                                            <Ban size={14} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {item.status === "PENDING" && item.username === currentUser.username && (
                                                                    <button onClick={() => handleEdit(item)} className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 border border-primary/20" title="Sửa">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                )}
                                                                {!(item.status === "PENDING") && (
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
                                    <option value="15">15 dòng</option>
                                    <option value="30">30 dòng</option>
                                    <option value="50">50 dòng</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================================================== */}
            {/* SLIDE-OUT DRAWER FORM */}
            {/* ==================================================== */}
            {isPanelOpen && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] transition-opacity" onClick={handleClosePanel} />}

            <div className={`fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-card md:border-l border-border shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col pb-20 md:pb-0 ${isPanelOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex-shrink-0 flex items-center justify-between p-5 bg-transparent">
                    <div className="flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">
                            {editingId ? `Cập Nhật Đơn #${editingId}` : "Tạo Đơn Xin Nghỉ Mới"}
                        </h3>
                    </div>
                    <button onClick={handleClosePanel} className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="drawerForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Mã Nhân Viên *</label>
                                <input type="text" disabled value={formData.username} className="hrm-input h-10 px-3 bg-muted text-muted-foreground rounded-lg border border-border text-[12px] font-bold w-full opacity-70" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Họ Tên *</label>
                                <input type="text" disabled value={formData.fullname} className="hrm-input h-10 px-3 bg-muted text-muted-foreground rounded-lg border border-border text-[12px] font-bold w-full opacity-70" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Loại Nghỉ Phép *</label>
                            <select required value={formData.type_id} onChange={e => setFormData({ ...formData, type_id: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground cursor-pointer">
                                <option value="">-- Chọn loại phép --</option>
                                {leaveTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Từ Ngày *</label>
                                <input type="date" required value={formData.from_date} onChange={e => updateSessionLogic("from_date", e.target.value, formData)} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Buổi *</label>
                                <select value={formData.from_session} onChange={e => updateSessionLogic("from_session", e.target.value, formData)} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground cursor-pointer">
                                    <option value="Cả ngày">Cả ngày</option>
                                    <option value="Sáng">Sáng</option>
                                    <option value="Chiều">Chiều</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Đến Ngày *</label>
                                <input type="date" required value={formData.to_date} onChange={e => updateSessionLogic("to_date", e.target.value, formData)} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Buổi *</label>
                                <select
                                    value={formData.to_session}
                                    onChange={e => setFormData({ ...formData, to_session: e.target.value })}
                                    disabled={formData.from_date === formData.to_date}
                                    className={`hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground cursor-pointer ${formData.from_date === formData.to_date ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="Cả ngày">Cả ngày</option>
                                    <option value="Sáng">Sáng</option>
                                    <option value="Chiều">Chiều</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Lý do nghỉ chi tiết *</label>
                            <textarea required rows={4} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Nhập lý do chi tiết để cấp trên phê duyệt..." className="hrm-input p-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full resize-none custom-scrollbar" />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Người duyệt đơn *</label>
                            <select required value={formData.approver_username} onChange={e => setFormData({ ...formData, approver_username: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground cursor-pointer">
                                <option value="">-- Chọn quản lý phê duyệt --</option>
                                {managers.map(m => (
                                    <option key={m.username} value={m.username}>{m.full_name} ({m.username})</option>
                                ))}
                            </select>
                        </div>

                        <div className="p-4 bg-muted/30 border border-border rounded-xl">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Ảnh minh chứng (Nếu có)</label>
                            <div className="relative border-2 border-dashed border-border rounded-lg bg-background p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <span className="text-[11px] font-bold text-muted-foreground">Click để tải ảnh lên</span>
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

                <div className="flex-shrink-0 p-5 bg-transparent flex gap-3">
                    <button type="button" onClick={handleClosePanel} className="flex-1 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border">
                        Đóng
                    </button>
                    <button type="submit" form="drawerForm" className="flex-1 flex items-center justify-center gap-2 h-11 text-primary-foreground bg-primary hover:opacity-90 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md">
                        <Save size={16} /> {editingId ? "Cập Nhật" : "Gửi Đơn"}
                    </button>
                </div>
            </div>

            {/* ==================================================== */}
            {/* IMAGE MODAL OVERLAY */}
            {/* ==================================================== */}
            {imageModalUrl && (
                <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setImageModalUrl(null)}>
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setImageModalUrl(null)} className="absolute -top-4 -right-4 bg-destructive text-destructive-foreground p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                            <X size={18} />
                        </button>
                        <img
                            src={imageModalUrl.startsWith('http') ? imageModalUrl : `${API_BASE_URL}/${imageModalUrl}`}
                            alt="Attachment Full"
                            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border border-border object-contain bg-muted"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}