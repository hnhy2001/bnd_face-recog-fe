"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    Plus, Edit2, Trash2, X, Save, Search, Filter,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Repeat, Check, Ban, ImageIcon, CalendarClock, UserSquare2
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface ShiftSwap {
    id: number;
    employee_source_id: number;
    source_name?: string;
    employee_target_id?: number;
    target_name?: string;
    swap_type: string; // "SWAP" | "COVER"
    is_all_day: number;
    source_date: string;
    source_shift_code?: string;
    target_date?: string;
    target_shift_code?: string;
    reason: string;
    attached_file?: string;
    status: string; // "PENDING" | "APPROVED" | "REJECTED"
}

interface ShiftCategory {
    shift_code: string;
    shift_name: string;
    is_on_call: number;
}

interface Employee {
    id: number;
    username: string;
    full_name: string;
}

// ==========================================
// COMPONENT: CUSTOM EMPLOYEE PICKER
// ==========================================
const EmployeeSelect = ({
    label, value, onChange, options, placeholder, emptyLabel, required
}: {
    label: string; value: number | string; onChange: (val: string) => void;
    options: Employee[]; placeholder: string; emptyLabel?: string; required?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filtered = options.filter(emp =>
        emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.username.toLowerCase().includes(search.toLowerCase())
    );

    const selectedEmp = options.find(e => String(e.id) === String(value));

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">
                {label} {required && "*"}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left h-10 px-3 border border-border rounded-lg text-[12px] font-bold outline-none transition-all flex items-center justify-between ${isOpen ? 'ring-2 ring-primary/20 border-primary' : ''} ${selectedEmp ? 'bg-background text-foreground' : 'bg-muted/30 text-muted-foreground'}`}
            >
                <span className="truncate">{selectedEmp ? `${selectedEmp.full_name} (@${selectedEmp.username})` : placeholder}</span>
                <ChevronRight size={14} className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-full bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 border-b border-border bg-muted/30">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Tìm theo tên, mã NV..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-[12px] outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1">
                        {emptyLabel && (
                            <button
                                type="button"
                                onClick={() => { onChange(""); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-bold transition-colors hover:bg-destructive/10 text-destructive mb-1 flex items-center gap-2 ${!value ? 'bg-destructive/10' : ''}`}
                            >
                                <X size={12} /> {emptyLabel}
                            </button>
                        )}
                        {filtered.length === 0 ? (
                            <div className="p-3 text-center text-muted-foreground text-[11px] font-medium">Không tìm thấy nhân sự</div>
                        ) : (
                            filtered.map(emp => {
                                const initials = emp.full_name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();
                                const isSelected = String(emp.id) === String(value);
                                return (
                                    <button
                                        key={emp.id} type="button"
                                        onClick={() => { onChange(String(emp.id)); setIsOpen(false); }}
                                        className={`w-full text-left flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-muted ${isSelected ? 'bg-primary/10' : ''}`}
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                            {initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[12px] font-bold text-foreground truncate">{emp.full_name}</div>
                                            <div className="text-[10px] text-muted-foreground">@{emp.username}</div>
                                        </div>
                                        {isSelected && <Check size={14} className="text-primary shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function ShiftSwapsPage() {
    // --- States Dữ liệu ---
    const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
    const [shiftCategories, setShiftCategories] = useState<ShiftCategory[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- States User/Phân quyền ---
    const [currentUser, setCurrentUser] = useState({ id: 0, username: "", role: "user" });

    // --- States Lọc (Filter) & Phân trang ---
    const [filters, setFilters] = useState({ start_date: "", end_date: "", status: "PENDING" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // --- States Drawer (Form) & Modal Image ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

    const initialFormState = {
        employee_source_id: "",
        swap_type: "SWAP",
        is_all_day: "0",
        source_date: "",
        source_shift_code: "",
        target_date: "",
        target_shift_code: "",
        employee_target_id: "",
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
            try {
                const token = localStorage.getItem("hrm_token");
                const [userRes, catRes, empRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/employees/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/api/shift-categories`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/api/employees/dropdown`, { headers: { 'Authorization': `Bearer ${token}` } }) // Chỉ lấy danh sách nếu có quyền
                ]);

                if (userRes.ok) {
                    const payload = await userRes.json();
                    const roles = (payload.data.role || "user").split(",").map((r: string) => r.trim().toLowerCase());
                    let role = "user";
                    if (roles.includes("admin")) role = "admin";
                    else if (roles.includes("manager")) role = "manager";
                    setCurrentUser({ id: payload.data.id, username: payload.data.username, role });
                }

                if (catRes.ok) setShiftCategories(await catRes.json());
                if (empRes.ok) setEmployees(await empRes.json());

            } catch (e) { console.error("Lỗi tải data ban đầu:", e); }
        };
        fetchInitialData();
    }, []);

    const fetchShiftSwaps = useCallback(async () => {
        setIsLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            let url = `${API_BASE_URL}/api/shift-swaps?skip=${skip}&limit=${pageSize}`;

            if (filters.start_date) url += `&start_date=${filters.start_date}`;
            if (filters.end_date) url += `&end_date=${filters.end_date}`;
            if (filters.status !== "") url += `&status=${filters.status}`;

            const token = localStorage.getItem("hrm_token");
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.ok) {
                const data = await res.json();
                setSwaps(data.items || []);
                setTotalItems(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / pageSize) || 1);
            }
        } catch (error) { console.error("Lỗi tải danh sách:", error); }
        finally { setIsLoading(false); }
    }, [page, pageSize, filters]);

    useEffect(() => {
        const timer = setTimeout(() => fetchShiftSwaps(), 400);
        return () => clearTimeout(timer);
    }, [fetchShiftSwaps]);

    // ==========================================
    // UI ACTIONS (FORM & MODALS)
    // ==========================================
    const handleAddNew = () => {
        const today = new Date().toISOString().split('T')[0];
        setEditingId(null);
        setFormData({ ...initialFormState, source_date: today, target_date: today });
        setPreviewUrl(null);
        setIsPanelOpen(true);
    };

    const handleEdit = (item: ShiftSwap) => {
        setEditingId(item.id);
        const guessedSwapType = item.swap_type || (item.target_date && item.target_date !== item.source_date ? "SWAP" : "COVER");

        setFormData({
            employee_source_id: String(item.employee_source_id),
            swap_type: guessedSwapType,
            is_all_day: String(item.is_all_day),
            source_date: item.source_date,
            source_shift_code: item.source_shift_code || "",
            target_date: guessedSwapType === "COVER" ? "" : (item.target_date || ""),
            target_shift_code: guessedSwapType === "COVER" ? "" : (item.target_shift_code || ""),
            employee_target_id: item.employee_target_id ? String(item.employee_target_id) : "",
            reason: item.reason || "",
            attached_file: null
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

        if (!formData.employee_source_id) {
            alert("Vui lòng chọn nhân viên xin đổi!");
            return;
        }

        const data = new FormData();
        data.append("swap_type", formData.swap_type);
        data.append("employee_source_id", formData.employee_source_id);
        data.append("is_all_day", formData.is_all_day);
        data.append("source_date", formData.source_date);
        data.append("reason", formData.reason);

        if (formData.swap_type === "SWAP") {
            data.append("target_date", formData.target_date);
            if (formData.is_all_day === "0") data.append("target_shift_code", formData.target_shift_code);
        }
        if (formData.is_all_day === "0") data.append("source_shift_code", formData.source_shift_code);
        if (formData.employee_target_id) data.append("employee_target_id", formData.employee_target_id);
        if (formData.attached_file) data.append("attached_file", formData.attached_file);

        try {
            const token = localStorage.getItem("hrm_token");
            let url = `${API_BASE_URL}/api/shift-swaps`;
            let method = "POST";

            if (editingId) {
                url = `${url}/${editingId}`;
                method = "PUT";
            }

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            if (res.ok) {
                alert(editingId ? "Cập nhật thành công!" : "Tạo yêu cầu thành công!");
                handleClosePanel();
                fetchShiftSwaps();
            } else {
                const err = await res.json();
                alert("Lỗi: " + (err.detail || "Không thể thực hiện"));
            }
        } catch (err) { alert("Lỗi kết nối server!"); }
    };

    const callStatusAPI = async (id: number, action: "approve" | "reject") => {
        try {
            const token = localStorage.getItem("hrm_token");
            const res = await fetch(`${API_BASE_URL}/api/shift-swaps/${id}/${action}`, {
                method: "PUT",
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchShiftSwaps();
            else { const err = await res.json(); alert(err.detail); }
        } catch (e) { alert("Lỗi kết nối!"); }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "---";
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
    };

    const getStatusUI = (status: string) => {
        if (status === "PENDING") return <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">⏳ Chờ duyệt</span>;
        if (status === "APPROVED") return <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">✔️ Đã duyệt</span>;
        if (status === "REJECTED") return <span className="px-2 py-1 rounded bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-widest border border-destructive/20">❌ Từ chối</span>;
        return <span className="px-2 py-1 rounded bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-widest border border-border">Không Rõ</span>;
    };

    // Quyền đặc biệt: Chỉ Admin / Manager mới được duyệt, thêm mới và thấy tất cả.
    const isAdminOrManager = currentUser.role === "admin" || currentUser.role === "manager";

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* --- HEADER --- */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <Repeat className="w-6 h-6 text-primary" />
                        Quản Lý Đổi Ca
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Theo dõi và xử lý yêu cầu xin đổi/chuyển ca trực</p>
                </div>
                {isAdminOrManager && (
                    <button onClick={handleAddNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm">
                        <Plus size={16} /> Tạo Yêu Cầu
                    </button>
                )}
            </div>

            {/* MAIN CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar bg-background gap-4 pb-20 md:pb-0">
                {/* --- BỘ LỌC (FILTERS) --- */}
                <div className="flex flex-col md:flex-row gap-4 p-4 hrm-card bg-card border-border shadow-sm shrink-0">
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block flex items-center gap-1"><CalendarClock size={12} /> Từ ngày (Ca gốc)</label>
                        <input type="date" value={filters.start_date} onChange={e => { setFilters({ ...filters, start_date: e.target.value }); setPage(1); }} className="hrm-input h-9 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block flex items-center gap-1"><CalendarClock size={12} /> Đến ngày</label>
                        <input type="date" value={filters.end_date} onChange={e => { setFilters({ ...filters, end_date: e.target.value }); setPage(1); }} className="hrm-input h-9 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                    </div>
                    <div className="flex-1 md:flex-[1.5]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block flex items-center gap-1"><Filter size={12} /> Trạng Thái</label>
                        <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }} className="hrm-input h-9 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground cursor-pointer">
                            <option value="">Tất cả trạng thái</option>
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
                            <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                        </div>
                    ) : swaps.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <Repeat className="w-10 h-10 opacity-20 mb-2" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Không tìm thấy yêu cầu đổi ca nào.</span>
                        </div>
                    ) : (
                        <>
                            {/* MOBILE VIEW */}
                            <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                {swaps.map((item) => {
                                    const canApprove = isAdminOrManager;
                                    const isSwap = item.swap_type !== "COVER";

                                    return (
                                        <div key={item.id} className="bg-card border border-border rounded-xl p-4 shadow-sm relative">
                                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                                {canApprove && item.status === "PENDING" && (
                                                    <>
                                                        <button onClick={() => { if (confirm("Duyệt đơn này?")) callStatusAPI(item.id, "approve") }} className="p-1.5 text-emerald-600 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                                            <Check size={14} />
                                                        </button>
                                                        <button onClick={() => { if (confirm("Từ chối đơn này?")) callStatusAPI(item.id, "reject") }} className="p-1.5 text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                                                            <Ban size={14} />
                                                        </button>
                                                        <button onClick={() => handleEdit(item)} className="p-1.5 text-primary bg-primary/10 rounded-md border border-primary/20">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            <div className="pr-20 mb-3">
                                                <div className="mb-2">
                                                    {isSwap ? <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">🔄 Đổi ca 2 chiều</span>
                                                        : <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-widest border border-border">🤝 Nhờ làm thay</span>}
                                                </div>
                                                <h4 className="text-[13px] font-black text-foreground mb-0.5 flex items-center gap-1"><UserSquare2 size={14} /> {item.source_name}</h4>
                                                <p className="text-[10px] font-bold text-muted-foreground">↳ Đổi với: {item.target_name || 'Tự làm bù'}</p>
                                            </div>

                                            <div className="mb-3">{getStatusUI(item.status)}</div>

                                            <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2.5 rounded-lg border border-border w-full text-[11px] mb-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase">Ca Gốc</span>
                                                    <span className="font-bold text-foreground mt-0.5">{formatDate(item.source_date)}</span>
                                                    <span className="text-muted-foreground">{item.source_shift_code || 'Cả ngày'}</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border pl-2">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase">Mục tiêu</span>
                                                    {isSwap ? (
                                                        <>
                                                            <span className="font-bold text-foreground mt-0.5">{formatDate(item.target_date)}</span>
                                                            <span className="text-muted-foreground">{item.target_shift_code || 'Cả ngày'}</span>
                                                        </>
                                                    ) : <span className="text-muted-foreground italic mt-0.5">Làm thay</span>}
                                                </div>
                                            </div>

                                            <div className="text-[11px]">
                                                <i className="text-muted-foreground">"{item.reason}"</i>
                                                {item.attached_file && (
                                                    <button onClick={() => setImageModalUrl(item.attached_file as string)} className="font-bold text-primary flex items-center gap-1 mt-1 hover:underline">
                                                        <ImageIcon size={12} /> Xem ảnh
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
                                            {["NHÂN SỰ", "TỪ CA (GỐC)", "SANG CA (MỤC TIÊU)", "TRẠNG THÁI & LÝ DO", "THAO TÁC"].map((h, i) => (
                                                <th key={i} className="py-3 px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {swaps.map((item) => {
                                            const canApprove = isAdminOrManager;
                                            const isSwap = item.swap_type !== "COVER";

                                            return (
                                                <tr key={item.id} className="hover:bg-accent/50 transition-colors border-b border-border group">
                                                    <td className="py-3 px-5 align-top">
                                                        <div className="mb-1">
                                                            {isSwap ? <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 inline-block">🔄 Đổi ca 2 chiều</span>
                                                                : <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-widest border border-border inline-block">🤝 Nhờ làm thay</span>}
                                                        </div>
                                                        <strong className="text-[13px] font-black text-foreground block mt-1">{item.source_name}</strong>
                                                        <div className="text-[10px] font-bold text-muted-foreground mt-0.5">
                                                            ↳ Đổi với: <span className="text-primary">{item.target_name || 'Tự làm bù'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-5 align-top">
                                                        <span className="text-[12px] font-bold text-foreground block">{formatDate(item.source_date)}</span>
                                                        <span className="text-[11px] text-muted-foreground font-mono bg-background border border-border px-1.5 py-0.5 rounded inline-block mt-1">
                                                            {item.source_shift_code || 'Cả ngày'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-5 align-top">
                                                        {isSwap ? (
                                                            <>
                                                                <span className="text-[12px] font-bold text-foreground block">{formatDate(item.target_date)}</span>
                                                                <span className="text-[11px] text-muted-foreground font-mono bg-background border border-border px-1.5 py-0.5 rounded inline-block mt-1">
                                                                    {item.target_shift_code || 'Cả ngày'}
                                                                </span>
                                                            </>
                                                        ) : <span className="text-[11px] text-muted-foreground italic">Không có (Làm thay)</span>}
                                                    </td>
                                                    <td className="py-3 px-5 align-top max-w-[250px]">
                                                        <div className="mb-2">{getStatusUI(item.status)}</div>
                                                        <div className="text-[11px] text-foreground italic whitespace-normal line-clamp-2" title={item.reason}>
                                                            {item.reason}
                                                        </div>
                                                        {item.attached_file && (
                                                            <button onClick={() => setImageModalUrl(item.attached_file as string)} className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1 hover:underline">
                                                                <ImageIcon size={12} /> Xem đính kèm
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-5 align-top">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {canApprove && item.status === "PENDING" ? (
                                                                <>
                                                                    <button onClick={() => { if (confirm("Duyệt đơn này?")) callStatusAPI(item.id, "approve") }} className="p-2 text-emerald-600 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/20" title="Duyệt">
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button onClick={() => { if (confirm("Từ chối đơn này?")) callStatusAPI(item.id, "reject") }} className="p-2 text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 border border-destructive/20" title="Từ chối">
                                                                        <Ban size={14} />
                                                                    </button>
                                                                    <button onClick={() => handleEdit(item)} className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 border border-primary/20" title="Sửa">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                </>
                                                            ) : <span className="text-muted-foreground text-[10px] font-bold">---</span>}
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

            <div className={`fixed top-0 right-0 bottom-0 w-full max-w-[450px] bg-card md:border-l border-border shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col pb-20 md:pb-0 ${isPanelOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex-shrink-0 flex items-center justify-between p-5 bg-transparent">
                    <div className="flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">
                            {editingId ? `Cập Nhật Yêu Cầu #${editingId}` : "Tạo Yêu Cầu Đổi Ca"}
                        </h3>
                    </div>
                    <button onClick={handleClosePanel} className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="drawerForm" onSubmit={handleSubmit} className="flex flex-col gap-5">

                        <div className="p-4 bg-muted/20 border border-border rounded-xl flex flex-col gap-4">
                            <EmployeeSelect
                                label="Người xin đổi ca"
                                value={formData.employee_source_id}
                                onChange={(val) => setFormData({ ...formData, employee_source_id: val })}
                                options={employees}
                                placeholder="-- Chọn người xin đổi --"
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Loại Yêu Cầu *</label>
                                    <select value={formData.swap_type} onChange={e => setFormData({ ...formData, swap_type: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground">
                                        <option value="SWAP">🔄 Đổi 2 chiều</option>
                                        <option value="COVER">🤝 Chỉ nhờ thay</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Phạm vi *</label>
                                    <select value={formData.is_all_day} onChange={e => setFormData({ ...formData, is_all_day: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground">
                                        <option value="0">Ca cụ thể</option>
                                        <option value="1">Cả ngày</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECTION: GỐC */}
                        <div className="p-4 bg-background border border-dashed border-border rounded-xl">
                            <h4 className="text-[11px] font-black text-primary mb-3 uppercase tracking-widest flex items-center gap-1">📅 Ngày/Ca Đang Trực (Gốc)</h4>
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">Ngày Gốc *</label>
                                    <input type="date" required value={formData.source_date} onChange={e => setFormData({ ...formData, source_date: e.target.value })} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                                </div>
                                {formData.is_all_day === "0" && (
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">Ca Gốc *</label>
                                        <select required value={formData.source_shift_code} onChange={e => setFormData({ ...formData, source_shift_code: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground">
                                            <option value="">-- Chọn ca --</option>
                                            {shiftCategories.filter(c => c.is_on_call === 1).map(cat => (
                                                <option key={cat.shift_code} value={cat.shift_code}>{cat.shift_name} ({cat.shift_code})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECTION: MỤC TIÊU (Ẩn nếu COVER) */}
                        {formData.swap_type === "SWAP" && (
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-dashed border-indigo-200 dark:border-indigo-900 rounded-xl">
                                <h4 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 mb-3 uppercase tracking-widest flex items-center gap-1">🔄 Ngày/Ca Chuyển Sang</h4>
                                <div className="grid grid-cols-1 gap-3 mb-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">Ngày Mục Tiêu *</label>
                                        <input type="date" required value={formData.target_date} onChange={e => setFormData({ ...formData, target_date: e.target.value })} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                                    </div>
                                    {formData.is_all_day === "0" && (
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground mb-1.5 block">Ca Mục Tiêu *</label>
                                            <select required value={formData.target_shift_code} onChange={e => setFormData({ ...formData, target_shift_code: e.target.value })} className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-bold w-full bg-background text-foreground">
                                                <option value="">-- Chọn ca --</option>
                                                {shiftCategories.filter(c => c.is_on_call === 1).map(cat => (
                                                    <option key={cat.shift_code} value={cat.shift_code}>{cat.shift_name} ({cat.shift_code})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <EmployeeSelect
                                    label="Người làm thay gốc"
                                    value={formData.employee_target_id}
                                    onChange={(val) => setFormData({ ...formData, employee_target_id: val })}
                                    options={employees}
                                    placeholder="-- Tự làm bù (Không chọn) --"
                                    emptyLabel="Hủy chọn (Tự làm bù)"
                                />
                            </div>
                        )}

                        {/* Nếu là COVER, vẫn hiện chọn người làm thay (Nhưng không hỏi Ngày/Ca) */}
                        {formData.swap_type === "COVER" && (
                            <div className="p-4 bg-muted/20 border border-border rounded-xl">
                                <EmployeeSelect
                                    label="Người làm thay (Bắt buộc nếu COVER)"
                                    value={formData.employee_target_id}
                                    onChange={(val) => setFormData({ ...formData, employee_target_id: val })}
                                    options={employees}
                                    placeholder="-- Chọn người sẽ trực thay --"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Lý do xin đổi *</label>
                            <textarea required rows={3} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Nhập lý do..." className="hrm-input p-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full resize-none custom-scrollbar" />
                        </div>

                        <div className="p-4 bg-muted/30 border border-border rounded-xl">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Ảnh đính kèm (Tin nhắn xin đổi...)</label>
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

                <div className="flex-shrink-0 p-5 bg-transparent flex gap-3">
                    <button type="button" onClick={handleClosePanel} className="flex-1 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border">
                        Hủy Bỏ
                    </button>
                    <button type="submit" form="drawerForm" className="flex-1 flex items-center justify-center gap-2 h-11 text-primary-foreground bg-primary hover:opacity-90 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md">
                        <Save size={16} /> {editingId ? "Lưu Thay Đổi" : "Gửi Yêu Cầu"}
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