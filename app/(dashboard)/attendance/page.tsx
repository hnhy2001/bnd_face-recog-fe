"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import AttendanceDetailDrawer from "./../../../components/dashboard/attendance-detail-drawer";
import { API_BASE_URL, getImageUrl } from "@/lib/api-client";

import {
    Printer, Search, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    AlertTriangle, PenTool, Image as ImageIcon, X, Save, Eye, FileUp, CheckCircle2,
    Clock, XCircle, FileWarning
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface AttendanceRecord {
    id: number | string;
    username: string;
    full_name: string;
    date: string;
    shift_code: string;
    shift_display_name?: string;
    status: number;
    checkin_time?: string;
    checkout_time?: string;
    checkin_image_path?: string;
    checkout_image_path?: string;
    late_minutes: number;
    early_minutes: number;
    is_fraud: boolean;
    fraud_note?: string;
    is_explained: boolean;
}

export default function AttendanceLogPage() {
    const router = useRouter();

    // --- States User/Auth ---
    const [currentUserRole, setCurrentUserRole] = useState("admin");
    const [currentUsername, setCurrentUsername] = useState("");

    // --- States Dữ liệu ---
    const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- States Bộ lọc ---
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // --- States Modals ---
    const [imageModal, setImageModal] = useState({ isOpen: false, src: "", title: "" });
    const [fraudModal, setFraudModal] = useState({ isOpen: false, id: "", note: "" });
    const [explainModal, setExplainModal] = useState({
        isOpen: false,
        username: "",
        fullName: "",
        date: "",
        shiftCode: "",
        reason: "",
        file: null as File | null,
        previewUrl: ""
    });

    const [isSubmittingFraud, setIsSubmittingFraud] = useState(false);
    const [isSubmittingExplain, setIsSubmittingExplain] = useState(false);
    const [detailDrawer, setDetailDrawer] = useState({ isOpen: false, username: "", date: "", fullName: "" });

    // ==========================================
    // INIT & FETCH DATA
    // ==========================================
    useEffect(() => {
        // Init localStorage data only on client
        setCurrentUserRole(localStorage.getItem("hrm_role") || "admin");
        setCurrentUsername(localStorage.getItem("hrm_username") || "");

        const gotoUsername = sessionStorage.getItem("att_goto_username") || "";
        const gotoFullname = sessionStorage.getItem("att_goto_fullname") || "";
        const gotoStartDate = sessionStorage.getItem("att_goto_startDate") || "";
        const gotoEndDate = sessionStorage.getItem("att_goto_endDate") || "";

        sessionStorage.removeItem("att_goto_username");
        sessionStorage.removeItem("att_goto_fullname");
        sessionStorage.removeItem("att_goto_startDate");
        sessionStorage.removeItem("att_goto_endDate");

        const formatDate = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        };

        if (gotoStartDate && gotoEndDate) {
            setStartDate(gotoStartDate);
            setEndDate(gotoEndDate);
            if (gotoFullname) setSearchKeyword(gotoFullname);
        } else {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            setStartDate(formatDate(yesterday));
            setEndDate(formatDate(today));
        }
    }, []);

    const fetchAttendance = useCallback(async () => {
        if (!startDate || !endDate) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem("hrm_token");
            const res = await fetch(`https://hrm.benhnhietdoi.vn/api/monthly-records?startDate=${startDate}&endDate=${endDate}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    alert("Phiên đăng nhập không hợp lệ!");
                    router.push("/login");
                    return;
                }
                const errorText = await res.text();
                console.error("API Error:", res.status, errorText);
                throw new Error(`Lỗi Server (${res.status}): ${errorText}`);
            }

            const data = await res.json();
            setAllAttendance(data.map((item: any) => ({
                ...item,
                is_fraud: item.is_fraud || false,
                fraud_note: item.fraud_note || "",
                is_explained: item.is_explained || false
            })));
        } catch (error) {
            console.error("Lỗi tải dữ liệu chấm công:", error);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, router]);

    useEffect(() => {
        if (startDate && endDate) {
            fetchAttendance();
        }
    }, [fetchAttendance]);

    // ==========================================
    // LỌC & PHÂN TRANG (Client Side)
    // ==========================================
    const filteredData = useMemo(() => {
        const keyword = searchKeyword.toLowerCase();
        let result = allAttendance.filter(item => {
            const matchKeyword = (item.full_name?.toLowerCase().includes(keyword)) ||
                (item.username?.toLowerCase().includes(keyword));
            const matchStatus = statusFilter === "all" || item.status === parseInt(statusFilter);
            return matchKeyword && matchStatus;
        });

        // Sort theo ngày giảm dần
        result.sort((a, b) => {
            if ((b.date || "") > (a.date || "")) return 1;
            if ((b.date || "") < (a.date || "")) return -1;
            return 0;
        });
        return result;
    }, [allAttendance, searchKeyword, statusFilter]);

    // Reset trang về 1 khi đổi bộ lọc
    useEffect(() => { setPage(1); }, [searchKeyword, statusFilter, limit]);

    const totalPages = Math.ceil(filteredData.length / limit) || 1;
    const paginatedData = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredData.slice(start, start + limit);
    }, [filteredData, page, limit]);

    // ==========================================
    // TÍNH THỐNG KÊ
    // ==========================================
    const stats = useMemo(() => {
        let s = { total: filteredData.length, present: 0, late: 0, early: 0, lateEarly: 0, absent: 0, leave: 0, unpaid: 0, inProgress: 0, noSchedule: 0, sevenHours: 0 };
        filteredData.forEach(i => {
            if (i.status === 1) s.present++;
            else if (i.status === 2) s.late++;
            else if (i.status === 3) s.early++;
            else if (i.status === 6) s.lateEarly++;
            else if (i.status === 0) s.absent++;
            else if (i.status === 4) s.leave++;
            else if (i.status === 5) s.unpaid++;
            else if (i.status === 7) s.inProgress++;
            else if (i.status === 8) s.noSchedule++;
            else if (i.status === 9) s.sevenHours++;
        });
        return s;
    }, [filteredData]);

    // ==========================================
    // HELPERS & HANDLERS
    // ==========================================
    const fmtTime = (t?: string) => (!t || t === "---") ? "--:--" : t.split('.')[0];

    const handlePrint = () => window.print();

    const goToDetail = (username: string, date: string, fullname: string) => {
        setDetailDrawer({ isOpen: true, username, date, fullName: fullname || username });
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 1: return <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 border border-green-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> Đúng giờ</span>;
            case 2: return <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><AlertTriangle size={12} /> Đi muộn</span>;
            case 3: return <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><AlertTriangle size={12} /> Về sớm</span>;
            case 6: return <span className="px-2 py-1 rounded bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><XCircle size={12} /> Muộn & Sớm</span>;
            case 4: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Calendar size={12} /> Nghỉ phép</span>;
            case 5: return <span className="px-2 py-1 rounded bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Calendar size={12} /> Nghỉ KL</span>;
            case 7: return <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Clock size={12} /> Đang có mặt</span>;
            case 8: return <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">➖ Chưa có lịch</span>;
            case 9: return <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Clock size={12} /> Chế độ 7h</span>;
            default: return <span className="px-2 py-1 rounded bg-red-100 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><XCircle size={12} /> Vắng mặt</span>;
        }
    };

    const isExplainDisabled = (item: AttendanceRecord) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        firstOfLastMonth.setHours(0, 0, 0, 0);

        if (item.username !== currentUsername) return true; // Nhìn lịch người khác
        if (item.is_explained) return true;
        if ([1, 4, 5, 7, 8, 9].includes(item.status)) return true; // Trạng thái ko cần giải trình

        if (item.date) {
            const recordDate = new Date(item.date + 'T00:00:00');
            if (recordDate < firstOfLastMonth || recordDate > yesterday) return true;
        }
        return false;
    };

    // --- Fraud Handlers ---
    const handleFraudSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm("Đánh dấu vi phạm gian lận cho bản ghi này?")) return;
        setIsSubmittingFraud(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/mark_fraud`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem("hrm_token")}` },
                body: JSON.stringify({ id: parseInt(fraudModal.id), is_fraud: true, fraud_note: fraudModal.note, role: currentUserRole })
            });
            if (res.ok) {
                alert("Đã lưu cảnh báo gian lận!");
                setFraudModal({ ...fraudModal, isOpen: false });
                fetchAttendance();
            } else {
                const err = await res.json();
                alert("Lỗi: " + (err.detail || "Không thể lưu"));
            }
        } catch (error) { alert("Lỗi kết nối máy chủ!"); }
        finally { setIsSubmittingFraud(false); }
    };

    // --- Explain Handlers ---
    const handleExplainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setExplainModal(prev => ({ ...prev, file, previewUrl: url }));
        } else {
            setExplainModal(prev => ({ ...prev, file: null, previewUrl: "" }));
        }
    };

    const handleExplainSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingExplain(true);
        const formData = new FormData();
        formData.append("username", explainModal.username);
        formData.append("date", explainModal.date);
        formData.append("shift_code", explainModal.shiftCode);
        formData.append("reason", explainModal.reason);
        formData.append("status", "1");
        if (explainModal.file) formData.append("attached_file", explainModal.file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/explanations`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem("hrm_token")}` },
                body: formData
            });
            if (res.ok) {
                alert('Đã gửi giải trình thành công! Vui lòng chờ quản lý duyệt.');
                setExplainModal({ ...explainModal, isOpen: false });
                fetchAttendance();
            } else {
                const err = await res.json();
                alert('Lỗi: ' + (err.detail || 'Không thể gửi giải trình'));
            }
        } catch (err) { alert('Lỗi kết nối máy chủ!'); }
        finally { setIsSubmittingExplain(false); }
    };

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* HEADER */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        Nhật Ký Quét Khuôn Mặt & Thống Kê
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Theo dõi chấm công và xử lý vi phạm</p>
                </div>
            </div>

            {/* MAIN CONTENT CARD */}
            {/* SỬA LỖI SCROLL: Thêm overflow-y-auto trên Mobile (mặc định), giữ overflow-hidden trên md */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar bg-background gap-4 pb-20 md:pb-0">

                {/* FILTER BAR */}
                <div className="hrm-card p-4 flex flex-wrap lg:flex-nowrap items-end gap-3 bg-card border-border shadow-sm shrink-0">
                    <div className="flex flex-col flex-1 min-w-[120px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Hiển thị</label>
                        <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-bold outline-none cursor-pointer">
                            <option value={10}>10 dòng / trang</option>
                            <option value={20}>20 dòng / trang</option>
                            <option value={50}>50 dòng / trang</option>
                            <option value={100}>100 dòng / trang</option>
                        </select>
                    </div>
                    <div className="flex flex-col flex-1 min-w-[150px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Trạng thái</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-bold outline-none cursor-pointer">
                            <option value="all">Tất cả trạng thái</option>
                            <option value="1">Đúng giờ</option>
                            <option value="2">Đi muộn</option>
                            <option value="3">Về sớm</option>
                            <option value="6">Muộn & Sớm</option>
                            <option value="0">Vắng mặt</option>
                            <option value="4">Nghỉ phép</option>
                            <option value="5">Nghỉ KL</option>
                            <option value="7">Đang có mặt</option>
                            <option value="8">Chưa có lịch</option>
                            <option value="9">Chế độ 7h</option>
                        </select>
                    </div>
                    {currentUserRole !== "user" && (
                        <div className="flex flex-col flex-[2] min-w-[200px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1"><Search size={12} /> Tìm nhân viên</label>
                            <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} placeholder="Nhập tên hoặc mã NV..." className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none" />
                        </div>
                    )}
                    <div className="flex flex-col flex-1 min-w-[130px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Từ ngày</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none font-mono" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-[130px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Đến ngày</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none font-mono" />
                    </div>
                    <button onClick={handlePrint} className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all shrink-0">
                        <Printer size={16} /> Xuất B/C
                    </button>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-11 gap-2 shrink-0">
                    {[
                        { label: "Tổng số ca", value: stats.total, colorClass: "text-blue-500" },
                        { label: "Đúng giờ", value: stats.present, colorClass: "text-green-500" },
                        { label: "Đi muộn", value: stats.late, colorClass: "text-amber-500" },
                        { label: "Về sớm", value: stats.early, colorClass: "text-pink-500" },
                        { label: "Muộn & Sớm", value: stats.lateEarly, colorClass: "text-red-500" },
                        { label: "Vắng mặt", value: stats.absent, colorClass: "text-slate-500" },
                        { label: "Nghỉ phép", value: stats.leave, colorClass: "text-sky-500" },
                        { label: "Nghỉ KL", value: stats.unpaid, colorClass: "text-slate-700 dark:text-slate-400" },
                        { label: "Đang có mặt", value: stats.inProgress, colorClass: "text-blue-600" },
                        { label: "Chưa có lịch", value: stats.noSchedule, colorClass: "text-slate-400" },
                        { label: "Chế độ 7h", value: stats.sevenHours, colorClass: "text-indigo-600" },
                    ].map((stat, idx) => (
                        <div key={idx} className="hrm-card bg-card border-border p-3 flex flex-col items-center justify-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 line-clamp-1">{stat.label}</span>
                            <span className={`text-xl font-black leading-none ${stat.colorClass}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>

                {/* TABLE CONTAINER */}
                {/* SỬA LỖI: shrink-0 trên mobile để đảm bảo nội dung có thể giãn dài xuống dưới */}
                <div className="flex-1 shrink-0 md:shrink flex flex-col min-h-[400px] md:min-h-0 md:hrm-card md:bg-card md:border md:border-border md:shadow-sm md:rounded-xl md:overflow-hidden relative">

                    {/* CARD HEADER - chỉ hiện trên desktop */}
                    <div className="hidden md:flex flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30 items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">
                            Nhật Ký Chấm Công
                        </h3>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            {filteredData.length} bản ghi
                        </span>
                    </div>

                    {/* KHU VỰC CUỘN NỘI DUNG CHÍNH */}
                    {/* SỬA LỖI: overflow-visible trên mobile, overflow-y-auto trên Desktop */}
                    <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar relative w-full">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <FileWarning className="w-10 h-10 opacity-20 mb-2" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Không có dữ liệu phù hợp</span>
                            </div>
                        ) : (
                            <>
                                {/* 1. MOBILE VIEW */}
                                <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                    {paginatedData.map((item, index) => {
                                        const uniqueKey = item.id || `${item.username}-${item.date}-${item.shift_code}-${index}`;
                                        const [y, m, d] = (item.date || "").split('-');
                                        const dateStr = item.date ? `${d}/${m}/${y}` : "---";

                                        const hasCheckinImg = item.checkin_image_path && item.checkin_image_path !== "null" && item.checkin_image_path.trim() !== "";
                                        const hasCheckoutImg = item.checkout_image_path && item.checkout_image_path !== "null" && item.checkout_image_path.trim() !== "";

                                        return (
                                            /* FIX 1: Thêm overflow-hidden để cắt phần nền bị tràn */
                                            <div key={uniqueKey} className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-3 right-3 text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded">{dateStr}</div>
                                                <div className="pr-20 mb-3">
                                                    <h4 className="text-sm font-bold text-foreground mb-1">{item.full_name}</h4>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">MÃ: {item.username} | CA: <span className="text-primary">{item.shift_display_name || item.shift_code || '---'}</span></p>
                                                </div>
                                                <div className="mb-3 flex flex-wrap gap-2 items-center">
                                                    {getStatusBadge(item.status)}
                                                    {item.status !== 8 && item.status !== 9 && (
                                                        <>
                                                            {item.late_minutes > 0 && <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Muộn: {item.late_minutes}m</span>}
                                                            {item.early_minutes > 0 && <span className="text-[10px] text-orange-600 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">Sớm: {item.early_minutes}m</span>}
                                                        </>
                                                    )}
                                                </div>

                                                {/* FIX 2: Loại bỏ w-full để tránh lỗi tính toán box-sizing gây tràn viền */}
                                                <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2.5 rounded-lg border border-border text-[11px] mb-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase">Giờ Vào</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono bg-green-500/10 text-green-600 border border-green-500/20 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">{fmtTime(item.checkin_time)}</span>
                                                            {hasCheckinImg && (
                                                                <img
                                                                    src={getImageUrl(item.checkin_image_path)}
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    className="w-6 h-6 rounded object-cover border border-border cursor-pointer"
                                                                    onClick={() => setImageModal({ isOpen: true, src: getImageUrl(item.checkin_image_path), title: `Ảnh vào: ${item.full_name}` })}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase">Giờ Ra</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono bg-red-500/10 text-red-600 border border-red-500/20 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">{fmtTime(item.checkout_time)}</span>
                                                            {hasCheckoutImg && (
                                                                <img
                                                                    src={getImageUrl(item.checkout_image_path)}
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    className="w-6 h-6 rounded object-cover border border-border cursor-pointer"
                                                                    onClick={() => setImageModal({ isOpen: true, src: getImageUrl(item.checkout_image_path), title: `Ảnh ra: ${item.full_name}` })}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        disabled={isExplainDisabled(item)}
                                                        onClick={() => setExplainModal({ isOpen: true, username: currentUsername, fullName: item.full_name, date: item.date, shiftCode: item.shift_code, reason: "", file: null, previewUrl: "" })}
                                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors ${item.is_explained ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800' : isExplainDisabled(item) ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-60' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground'}`}
                                                    >
                                                        {item.is_explained ? '✔️ Đã giải trình' : '✍️ Giải trình'}
                                                    </button>
                                                    <button onClick={() => goToDetail(item.username, item.date, item.full_name)} className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors flex justify-center items-center gap-1">
                                                        <Eye size={12} /> Chi tiết
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>


                                {/* 2. DESKTOP VIEW */}
                                <div className="hidden md:block w-full">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-[30] bg-muted">
                                            <tr>
                                                {["NGÀY", "NHÂN VIÊN", "CA LÀM VIỆC", "GIỜ VÀO / RA", "VI PHẠM", "GIẢI TRÌNH", "CHI TIẾT"].map((h, i) => (
                                                    <th key={i} className={`py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap border-b border-border ${i >= 5 ? 'text-center' : ''}`}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedData.map((item, index) => {
                                                const uniqueKey = item.id || `${item.username}-${item.date}-${item.shift_code}-${index}`;
                                                const [y, m, d] = (item.date || "").split('-');
                                                const dateStr = item.date ? `${d}/${m}/${y}` : "---";

                                                const hasCheckinImg = item.checkin_image_path && item.checkin_image_path !== "null" && item.checkin_image_path.trim() !== "";
                                                const hasCheckoutImg = item.checkout_image_path && item.checkout_image_path !== "null" && item.checkout_image_path.trim() !== "";

                                                return (
                                                    <tr key={uniqueKey} className="hover:bg-accent/30 transition-colors border-b border-border group">
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <strong className="text-[12px] font-black text-foreground">{dateStr}</strong>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <strong className="text-[13px] font-bold text-foreground block">{item.full_name}</strong>
                                                            <span className="text-[10px] text-muted-foreground font-mono">Mã: {item.username}</span>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <span className="text-[12px] font-bold text-primary block">{item.shift_display_name || item.shift_code || '---'}</span>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded text-[11px] font-bold w-fit whitespace-nowrap">Vào: {fmtTime(item.checkin_time)}</span>
                                                                    {hasCheckinImg && (
                                                                        <img
                                                                            src={getImageUrl(item.checkin_image_path)}
                                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                            className="w-7 h-7 rounded object-cover border border-border cursor-pointer hover:scale-150 transition-transform relative z-10 hover:z-20"
                                                                            onClick={() => setImageModal({ isOpen: true, src: getImageUrl(item.checkin_image_path), title: `Ảnh vào: ${item.full_name}` })}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5 rounded text-[11px] font-bold w-fit whitespace-nowrap">Ra: {fmtTime(item.checkout_time)}</span>
                                                                    {hasCheckoutImg && (
                                                                        <img
                                                                            src={getImageUrl(item.checkout_image_path)}
                                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                            className="w-7 h-7 rounded object-cover border border-border cursor-pointer hover:scale-150 transition-transform relative z-10 hover:z-20"
                                                                            onClick={() => setImageModal({ isOpen: true, src: getImageUrl(item.checkout_image_path), title: `Ảnh ra: ${item.full_name}` })}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1.5 items-start">
                                                                {getStatusBadge(item.status)}
                                                                {item.status !== 8 && item.status !== 9 && (item.late_minutes > 0 || item.early_minutes > 0) && (
                                                                    <div className="flex items-center gap-1">
                                                                        {item.late_minutes > 0 && <span className="text-[10px] text-amber-600 font-bold">Muộn: {item.late_minutes}m</span>}
                                                                        {item.early_minutes > 0 && <span className="text-[10px] text-orange-600 font-bold">Sớm: {item.early_minutes}m</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap text-center align-middle">
                                                            <button
                                                                disabled={isExplainDisabled(item)}
                                                                onClick={() => setExplainModal({ isOpen: true, username: currentUsername, fullName: item.full_name, date: item.date, shiftCode: item.shift_code, reason: "", file: null, previewUrl: "" })}
                                                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors ${item.is_explained ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800' : isExplainDisabled(item) ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-60' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground'}`}
                                                            >
                                                                {item.is_explained ? '✔️ Đã giải trình' : '✍️ Giải trình'}
                                                            </button>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap text-center align-middle">
                                                            <button onClick={() => goToDetail(item.username, item.date, item.full_name)} className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors inline-flex items-center gap-1">
                                                                <Eye size={12} /> Chi tiết
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* PAGINATION */}
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
                                <span>Đang hiển thị <strong className="text-primary">{(page - 1) * limit + 1} - {Math.min(page * limit, filteredData.length)}</strong> trong <strong className="text-foreground">{filteredData.length}</strong> bản ghi</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================================================== */}
            {/* MODALS */}
            {/* ==================================================== */}

            {/* 1. Modal Xem Ảnh */}
            {imageModal.isOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setImageModal({ ...imageModal, isOpen: false })}>
                    <div className="relative max-w-3xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setImageModal({ ...imageModal, isOpen: false })} className="absolute -top-10 right-0 p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform shadow-lg">
                            <X size={20} />
                        </button>
                        <img src={imageModal.src} alt="Phóng to" className="max-w-full max-h-[80vh] rounded-xl shadow-2xl border-4 border-background" />
                        <p className="mt-4 text-foreground font-bold text-lg bg-background/50 px-4 py-1 rounded-full backdrop-blur-md">{imageModal.title}</p>
                    </div>
                </div>
            )}

            {/* 2. Modal Gian Lận */}
            {fraudModal.isOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setFraudModal({ ...fraudModal, isOpen: false })}>
                    <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border-t-4 border-t-destructive animate-in slide-in-from-bottom-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 text-destructive mb-2">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-black uppercase tracking-widest m-0">Báo cáo Gian Lận</h3>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mb-4">Bạn đang đánh dấu bản ghi này có dấu hiệu gian lận. Vui lòng ghi chú lý do chi tiết.</p>

                        <form onSubmit={handleFraudSubmit} className="flex flex-col gap-4">
                            <textarea
                                required rows={3}
                                value={fraudModal.note} onChange={e => setFraudModal({ ...fraudModal, note: e.target.value })}
                                className="hrm-input w-full p-3 bg-background text-foreground rounded-lg border border-border text-[13px] resize-y"
                                placeholder="VD: Khuôn mặt không khớp, nghi ngờ dùng điện thoại chụp lại..."
                            />
                            <div className="flex gap-3 mt-2">
                                <button type="button" onClick={() => setFraudModal({ ...fraudModal, isOpen: false })} className="flex-1 py-2.5 rounded-lg bg-secondary text-foreground text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-colors border border-border">Hủy Bỏ</button>
                                <button type="submit" disabled={isSubmittingFraud} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-colors shadow-md">
                                    {isSubmittingFraud ? "Đang xử lý..." : "Xác nhận Gian Lận"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Modal Giải Trình */}
            {explainModal.isOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setExplainModal({ ...explainModal, isOpen: false })}>
                    <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border-t-4 border-t-primary animate-in slide-in-from-bottom-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-4 border-b border-border pb-3 shrink-0">
                            <div className="flex items-center gap-2 text-primary">
                                <PenTool size={20} />
                                <h3 className="text-[14px] font-black uppercase tracking-widest m-0">Viết Giải Trình</h3>
                            </div>
                            <button onClick={() => setExplainModal({ ...explainModal, isOpen: false })} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors"><X size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                            <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4 text-[12px] text-foreground">
                                <p><strong>Nhân viên:</strong> {explainModal.fullName}</p>
                                <p className="mt-1"><strong>Ngày:</strong> {explainModal.date.split('-').reverse().join('/')}</p>
                            </div>

                            <form id="explainForm" onSubmit={handleExplainSubmit} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ca làm việc</label>
                                    <input type="text" disabled value={explainModal.shiftCode || "Không xác định"} className="hrm-input h-10 px-3 bg-muted text-foreground rounded-lg border border-border text-[13px] font-bold w-full opacity-70" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Lý do giải trình <span className="text-destructive">*</span></label>
                                    <textarea
                                        required rows={4}
                                        value={explainModal.reason} onChange={e => setExplainModal({ ...explainModal, reason: e.target.value })}
                                        className="hrm-input w-full p-3 bg-background text-foreground rounded-lg border border-border text-[13px] resize-y"
                                        placeholder="Nhập lý do chi tiết (VD: Quên chấm công lúc về, Máy chấm công lỗi...)"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ảnh đính kèm (Tùy chọn)</label>
                                    <div className="relative">
                                        <input type="file" id="fileUpload" accept="image/*" onChange={handleExplainFileChange} className="hidden" />
                                        <label htmlFor="fileUpload" className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground text-[12px] font-bold">
                                            <FileUp size={16} /> Chọn ảnh minh chứng
                                        </label>
                                    </div>
                                    {explainModal.previewUrl && (
                                        <div className="mt-3 relative w-fit mx-auto">
                                            <img src={explainModal.previewUrl} alt="Preview" className="max-h-32 rounded-lg border border-border shadow-sm" />
                                            <button type="button" onClick={() => setExplainModal({ ...explainModal, file: null, previewUrl: "" })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110"><X size={12} /></button>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="flex gap-3 mt-4 pt-4 border-t border-border shrink-0">
                            <button type="button" onClick={() => setExplainModal({ ...explainModal, isOpen: false })} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-colors border border-border">Hủy Bỏ</button>
                            <button type="submit" form="explainForm" disabled={isSubmittingExplain} className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-colors shadow-md flex justify-center items-center gap-2">
                                {isSubmittingExplain ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang gửi...</> : <><Save size={16} /> Gửi Giải Trình</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AttendanceDetailDrawer
                isOpen={detailDrawer.isOpen}
                onClose={() => setDetailDrawer({ ...detailDrawer, isOpen: false })}
                username={detailDrawer.username}
                date={detailDrawer.date}
                fullName={detailDrawer.fullName}
                currentUserRole={currentUserRole}
                currentUsername={currentUsername}
            />

        </div>
    );
}