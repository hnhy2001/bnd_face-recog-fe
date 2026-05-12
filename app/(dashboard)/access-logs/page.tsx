"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "@/lib/api-client";
import {
    Search, Calendar, History, X,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Image as ImageIcon, FileWarning
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface AccessLog {
    date: string;
    time: string;
    username: string;
    full_name: string;
    image_url?: string;
}

export default function AccessLogsPage() {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    // --- States Dữ liệu & Phân quyền ---
    const [role, setRole] = useState<string>("user");
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // --- States Phân trang & Filter ---
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalItems, setTotalItems] = useState<number>(0);

    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [searchKeyword, setSearchKeyword] = useState<string>("");

    // --- States Modal Ảnh ---
    const [imageModal, setImageModal] = useState({ isOpen: false, src: "", title: "" });

    // ==========================================
    // INITIALIZATION
    // ==========================================
    useEffect(() => {
        const todayStr = new Date().toISOString().split("T")[0];
        setStartDate(todayStr);
        setEndDate(todayStr);

        const storedRole = localStorage.getItem("hrm_role") || "user";
        setRole(storedRole.toLowerCase());
    }, []);

    const isAdmin = role === "admin" || role === "manager";

    // ==========================================
    // FETCH DATA
    // ==========================================
    const fetchLogs = useCallback(async (currentPage: number = page) => {
        if (!startDate || !endDate) return;

        setIsLoading(true);
        setPage(currentPage);

        let url = `${API_BASE_URL}/api/access_logs?page=${currentPage}&limit=${pageSize}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        if (isAdmin && searchKeyword) {
            url += `&target_username=${encodeURIComponent(searchKeyword)}`;
        }

        try {
            const token = localStorage.getItem("hrm_token") || "";
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
            });

            if (res.status === 401) {
                window.location.href = "/login";
                return;
            }

            const responseData = await res.json();
            if (res.ok || responseData.status === "success") {
                setLogs(responseData.data || []);
                setTotalItems(responseData.total || 0);
                setTotalPages(responseData.total_pages || 1);
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    }, [pageSize, startDate, endDate, searchKeyword, isAdmin, page]);

    useEffect(() => {
        if (startDate && endDate) {
            fetchLogs(1);
        }
    }, [startDate, endDate, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleApplyFilter = () => fetchLogs(1);

    const getImageUrlFull = (url?: string) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `${API_BASE_URL}${url}`;
    };

    return (
        // [FIX LAYOUT]: Sử dụng Wrapper chuẩn như trang Attendance
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* HEADER */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <History className="w-6 h-6 text-primary" />
                        Nhật Ký Truy Cập Hệ Thống
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Lịch sử nhận diện vào ra của nhân viên</p>
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar bg-background gap-4 pb-20 md:pb-0">

                {/* FILTER BAR */}
                <div className="hrm-card p-4 flex flex-wrap lg:flex-nowrap items-end gap-3 bg-card border-border shadow-sm shrink-0">
                    <div className="flex flex-col flex-1 min-w-[120px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Hiển thị</label>
                        <select
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                            className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-bold outline-none cursor-pointer"
                        >
                            <option value={10}>10 dòng / trang</option>
                            <option value={20}>20 dòng / trang</option>
                            <option value={50}>50 dòng / trang</option>
                        </select>
                    </div>

                    <div className="flex flex-col flex-1 min-w-[130px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={12} /> Từ ngày</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none font-mono"
                        />
                    </div>

                    <div className="flex flex-col flex-1 min-w-[130px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={12} /> Đến ngày</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none font-mono"
                        />
                    </div>

                    {isAdmin && (
                        <div className="flex flex-col flex-[2] min-w-[200px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                                <Search size={12} /> Tìm nhân viên
                            </label>
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={e => setSearchKeyword(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
                                placeholder="Nhập tên hoặc mã NV..."
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleApplyFilter}
                        className="h-10 px-6 rounded-lg font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Search size={16} /> Lọc Dữ Liệu
                    </button>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                    <div className="hrm-card bg-card border-border p-4 flex flex-col items-center shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tổng lượt truy cập</span>
                        <span className="text-2xl font-black text-blue-600">{totalItems}</span>
                    </div>
                    <div className="hrm-card bg-card border-border p-4 flex flex-col items-center shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Hôm nay</span>
                        <span className="text-2xl font-black text-slate-600">{logs.filter(l => l.date === new Date().toISOString().split('T')[0]).length}</span>
                    </div>
                </div>

                {/* TABLE CONTAINER */}
                <div className="flex-1 shrink-0 md:shrink flex flex-col min-h-[400px] md:min-h-0 md:hrm-card md:bg-card md:border md:border-border md:shadow-sm md:rounded-xl md:overflow-hidden relative">

                    {/* CARD HEADER - Desktop Only */}
                    <div className="hidden md:flex flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30 items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">
                            Danh Sách Lịch Sử Nhận Diện
                        </h3>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            {logs.length} bản ghi / trang
                        </span>
                    </div>

                    {/* SCROLLABLE AREA */}
                    <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar relative w-full">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <FileWarning className="w-10 h-10 opacity-20 mb-2" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Không có dữ liệu phù hợp</span>
                            </div>
                        ) : (
                            <>
                                {/* 1. MOBILE VIEW */}
                                <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                    {logs.map((item, idx) => {
                                        const [y, m, d] = (item.date || "").split('-');
                                        const dateStr = item.date ? `${d}/${m}/${y}` : "---";

                                        return (
                                            <div key={idx} className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-3 right-3 text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded">
                                                    {dateStr}
                                                </div>
                                                <div className="pr-20 mb-3">
                                                    <h4 className="text-sm font-bold text-foreground mb-1">{item.full_name}</h4>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                        MÃ: {item.username}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between bg-muted/50 p-2.5 rounded-lg border border-border text-[11px]">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase">Giờ Truy Cập</span>
                                                        <span className="font-mono bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded font-bold whitespace-nowrap w-fit text-sm">
                                                            {item.time}
                                                        </span>
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex items-center">
                                                            {item.image_url ? (
                                                                <img
                                                                    src={getImageUrlFull(item.image_url)}
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    className="w-10 h-10 rounded object-cover border border-border cursor-pointer shadow-sm"
                                                                    onClick={() => setImageModal({ isOpen: true, src: getImageUrlFull(item.image_url), title: `Nhận diện: ${item.full_name}` })}
                                                                />
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center text-muted-foreground gap-1 opacity-50 pr-2">
                                                                    <ImageIcon size={16} />
                                                                    <span className="text-[9px] font-bold uppercase tracking-widest">Không ảnh</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
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
                                                {["NGÀY TRUY CẬP", "THỜI GIAN", "NHÂN VIÊN", isAdmin ? "ẢNH NHẬN DIỆN" : ""].map((h, i) => h && (
                                                    <th key={i} className={`py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap border-b border-border ${i === 3 ? 'text-center' : ''}`}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map((item, idx) => {
                                                const [y, m, d] = (item.date || "").split('-');
                                                const dateStr = item.date ? `${d}/${m}/${y}` : "---";

                                                return (
                                                    <tr key={idx} className="hover:bg-accent/30 transition-colors border-b border-border group">
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <strong className="text-[12px] font-black text-foreground">{dateStr}</strong>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <span className="font-mono bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-1 rounded text-[12px] font-bold w-fit whitespace-nowrap">
                                                                {item.time}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <strong className="text-[13px] font-bold text-foreground block">{item.full_name}</strong>
                                                            <span className="text-[10px] text-muted-foreground font-mono">Mã: {item.username}</span>
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="py-3 px-4 whitespace-nowrap text-center align-middle">
                                                                {item.image_url ? (
                                                                    <img
                                                                        src={getImageUrlFull(item.image_url)}
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                        className="w-10 h-10 rounded object-cover border border-border cursor-pointer hover:scale-150 transition-transform mx-auto relative z-10 hover:z-20"
                                                                        onClick={() => setImageModal({ isOpen: true, src: getImageUrlFull(item.image_url), title: `Nhận diện: ${item.full_name}` })}
                                                                    />
                                                                ) : (
                                                                    <span className="text-[10px] italic text-muted-foreground">Không có ảnh</span>
                                                                )}
                                                            </td>
                                                        )}
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
                                <span>Đang hiển thị <strong className="text-primary">{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)}</strong> trong <strong className="text-foreground">{totalItems}</strong> bản ghi</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL ẢNH - Dùng react-dom createPortal để chống lỗi z-index như bản mẫu */}
            {imageModal.isOpen && isMounted && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setImageModal({ ...imageModal, isOpen: false })}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div className="relative max-w-3xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setImageModal({ ...imageModal, isOpen: false })} className="absolute -top-10 right-0 p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform shadow-lg">
                            <X size={20} />
                        </button>
                        <img src={imageModal.src} alt="Phóng to" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border-4 border-background object-contain bg-muted" />
                        <p className="mt-4 text-foreground font-bold text-lg bg-background/50 px-4 py-1 rounded-full backdrop-blur-md">{imageModal.title}</p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}