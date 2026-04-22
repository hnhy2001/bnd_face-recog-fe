"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    Download, Upload, FolderOpen, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, Search, Lock, Check, Loader2, CalendarRange, Save, X
} from "lucide-react";

/**
 * TYPES & INTERFACES
 */
interface Employee {
    id: number;
    full_name: string;
    dob?: string;
    ten_don_vi?: string;
    ten_phong_ban?: string;
}

interface ShiftCategory {
    shift_code: string;
    shift_name: string;
    is_on_call: number | string;
}

interface Assignment {
    id?: number;
    employee_id: number;
    shift_code: string;
    shift_date: string;
}

interface PageResponse {
    items: Employee[];
    total: number;
    page: number;
    total_pages: number;
}

const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrm_token") : "";
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
};

export default function AssignmentPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [search, setSearch] = useState("");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shiftCategories, setShiftCategories] = useState<ShiftCategory[]>([]);
    const [shiftMap, setShiftMap] = useState<Record<number, Record<string, Assignment>>>({});
    const [userRole, setUserRole] = useState<"admin" | "manager" | "user">("user");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [fileName, setFileName] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ empId: number; name: string; date: string } | null>(null);
    const [selectedShiftCodes, setSelectedShiftCodes] = useState<string[]>([]);

    useEffect(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        setStartDate(monday.toISOString().split("T")[0]);
        setEndDate(sunday.toISOString().split("T")[0]);

        fetchUserRole();
        loadShiftCategories();
    }, []);

    const fetchUserRole = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees/me`, { headers: getAuthHeaders() });
            if (res.ok) {
                const payload = await res.json();
                const roleStr = payload.data.role?.toLowerCase() || "";
                if (roleStr.includes("admin")) setUserRole("admin");
                else if (roleStr.includes("manager")) setUserRole("manager");
            }
        } catch (e) { console.error("Lỗi lấy quyền:", e); }
    };

    const loadShiftCategories = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/shifts`, { headers: getAuthHeaders() });
            if (res.ok) setShiftCategories(await res.json());
        } catch (e) { console.error("Lỗi tải danh mục ca:", e); }
    };

    const fetchAssignments = useCallback(async () => {
        if (!startDate || !endDate) return;
        setIsLoading(true);
        try {
            const [empRes, assignRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/employees?page=${page}&size=${pageSize}&search=${encodeURIComponent(search)}`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/assignments/details?start_date=${startDate}&end_date=${endDate}`, { headers: getAuthHeaders() })
            ]);

            if (empRes.ok && assignRes.ok) {
                const empData: PageResponse = await empRes.json();
                const assignData: Assignment[] = await assignRes.json();
                setEmployees(empData.items || []);
                setTotalPages(empData.total_pages || 1);
                setTotalItems(empData.total || 0);

                const map: Record<number, Record<string, Assignment>> = {};
                assignData.forEach(item => {
                    if (!map[item.employee_id]) map[item.employee_id] = {};
                    map[item.employee_id][item.shift_date] = item;
                });
                setShiftMap(map);
            }
        } catch (e) { console.error("Lỗi tải dữ liệu bảng:", e); }
        finally { setIsLoading(false); }
    }, [startDate, endDate, search, page, pageSize]);

    useEffect(() => {
        const timer = setTimeout(fetchAssignments, 300);
        return () => clearTimeout(timer);
    }, [fetchAssignments]);

    const dateList = useMemo(() => {
        const dates = [];
        if (!startDate || !endDate) return [];
        let curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
            dates.push(curr.toISOString().split("T")[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    }, [startDate, endDate]);

    const monthGroups = useMemo(() => {
        const groups: { name: string; span: number }[] = [];
        dateList.forEach(dStr => {
            const d = new Date(dStr);
            const label = `THÁNG ${d.getMonth() + 1}, ${d.getFullYear()}`;
            if (groups.length > 0 && groups[groups.length - 1].name === label) {
                groups[groups.length - 1].span++;
            } else {
                groups.push({ name: label, span: 1 });
            }
        });
        return groups;
    }, [dateList]);

    const openModal = (empId: number, name: string, date: string, canEdit: boolean) => {
        if (!canEdit) return;
        setModalData({ empId, name, date });
        const existing = shiftMap[empId]?.[date];
        setSelectedShiftCodes(existing?.shift_code ? existing.shift_code.split(",").map(s => s.trim()) : []);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!modalData) return;
        try {
            const shiftCodeStr = selectedShiftCodes.join(", ");
            const res = await fetch(`${API_BASE_URL}/api/assignments`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    employee_id: modalData.empId,
                    shift_date: modalData.date,
                    shift_code: shiftCodeStr
                })
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchAssignments();
            } else {
                alert("Có lỗi xảy ra khi lưu!");
            }
        } catch (e) { console.error(e); }
    };

    const handleDownloadTemplate = async () => {
        const searchKeyword = search.trim();
        let url = `${API_BASE_URL}/api/assignments/export_template?start_date=${startDate}&end_date=${endDate}`;
        if (searchKeyword) url += `&search=${encodeURIComponent(searchKeyword)}`;

        try {
            const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) alert("Bạn không có quyền tải file này!");
                else throw new Error("Lỗi phản hồi từ server");
                return;
            }
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = `MauPhanCong_${startDate}_den_${endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Lỗi tải template:", err);
            alert("Không thể tải file mẫu. Vui lòng kiểm tra lại kết nối hoặc quyền hạn!");
        }
    };

    const handleUpload = async () => {
        const fileInput = document.getElementById("excelFile") as HTMLInputElement;
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert("Vui lòng chọn file Excel trước khi upload!");
            return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/assignments/import`, {
                method: "POST",
                headers: { "Authorization": getAuthHeaders().Authorization },
                body: formData,
            });
            const result = await res.json();
            if (res.ok && result.status === "success") {
                alert(result.message || "Upload file thành công!");
                setFileName("");
                fileInput.value = "";
                fetchAssignments();
            } else {
                alert("Lỗi: " + (result.detail || "Không thể xử lý file"));
            }
        } catch (e) {
            console.error("Lỗi upload:", e);
            alert("Lỗi kết nối Server khi upload file!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground font-sans">

            {/* HEADER */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <CalendarRange className="w-6 h-6 text-primary" />
                        Phân Công Lịch Trực
                    </h2>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex-1 md:flex-none h-10 bg-primary text-primary-foreground px-4 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 shadow-sm transition-all"
                    >
                        <Download size={16} /> Mẫu
                    </button>

                    <label
                        htmlFor="excelFile"
                        className="flex-1 md:flex-none h-10 bg-secondary text-secondary-foreground px-4 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer border border-border hover:bg-muted transition-all"
                    >
                        <FolderOpen size={16} />
                        <span className="uppercase truncate max-w-[80px]">{fileName || "Chọn File"}</span>
                        <input
                            type="file"
                            id="excelFile"
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={e => setFileName(e.target.files?.[0]?.name || "")}
                        />
                    </label>

                    <button
                        onClick={handleUpload}
                        disabled={isLoading || !fileName}
                        className="flex-1 md:flex-none h-10 border-2 border-primary text-primary px-4 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload size={16} />}
                        Upload
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar bg-background gap-4 pb-20 md:pb-0">
                {/* FILTER BAR */}
                <div className="hrm-card p-4 grid grid-cols-2 md:grid-cols-3 gap-4 bg-card border-border shadow-sm shrink-0">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Từ ngày</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="hrm-input h-10 border border-border bg-background px-3 rounded-lg text-sm font-bold outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Đến ngày</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="hrm-input h-10 border border-border bg-background px-3 rounded-lg text-sm font-bold outline-none" />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tìm kiếm</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input type="text" placeholder="Tên nhân viên..." value={search} onChange={e => setSearch(e.target.value)} className="hrm-input h-10 border border-border bg-background pl-9 px-3 rounded-lg text-sm font-bold w-full outline-none" />
                        </div>
                    </div>
                </div>

                {/* TABLE CONTAINER */}
                <div className="flex-1 shrink-0 md:shrink flex flex-col min-h-[400px] md:min-h-0 md:hrm-card md:bg-card md:border md:border-border md:shadow-sm md:rounded-xl md:overflow-hidden relative">
                    {/* CARD HEADER - chỉ hiện trên desktop */}
                    <div className="hidden md:flex flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30 items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">Lịch trình trực chi tiết</h3>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            {totalItems} bản ghi
                        </span>
                    </div>

                    <div className="flex-1 overflow-visible md:overflow-auto custom-scrollbar relative w-full">
                        {/* ========================================================== */}
                        {/* 1. GIAO DIỆN DESKTOP (TABLE) */}
                        {/* ========================================================== */}
                        <div className="hidden md:block w-full">
                            <table className="w-max min-w-full border-separate border-spacing-0 text-left">
                                <thead className="sticky top-0 z-30 bg-muted">
                                    <tr>
                                        <th className="sticky left-0 z-40 bg-muted border-b border-r border-border py-3 px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">STT</th>
                                        <th className="sticky left-[65px] z-40 bg-muted border-b border-r border-border py-3 px-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nhân viên</th>
                                        <th className="sticky left-[245px] z-40 bg-muted border-b border-r border-border py-3 px-5 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ngày sinh</th>
                                        <th className="sticky left-[345px] z-40 bg-muted border-b border-r-[2px] border-border py-3 px-5 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Phòng ban</th>
                                        {monthGroups.map((m, i) => (
                                            <th key={i} colSpan={m.span} className="relative bg-muted border-b border-r border-border py-3 px-5 text-[10px] font-black uppercase tracking-widest text-primary italic whitespace-nowrap">
                                                {m.name}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="bg-muted/50">
                                        <th className="sticky left-0 z-40 bg-muted border-b border-r border-border h-10"></th>
                                        <th className="sticky left-[65px] z-40 bg-muted border-b border-r border-border"></th>
                                        <th className="sticky left-[245px] z-40 bg-muted border-b border-r border-border"></th>
                                        <th className="sticky left-[345px] z-40 bg-muted border-b border-r-[2px] border-border"></th>
                                        {dateList.map(dStr => {
                                            const d = new Date(dStr);
                                            const isWE = d.getDay() === 0 || d.getDay() === 6;
                                            const isToday = dStr === new Date().toISOString().split("T")[0];
                                            return (
                                                <th key={dStr} className={`border-b border-r border-border p-1 text-center min-w-[50px] ${isWE ? "bg-destructive/5 text-destructive" : ""} ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                                                    <div className="font-black text-[12px]">{d.getDate()}</div>
                                                    <div className="text-[8px] font-black uppercase opacity-70">{["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()]}</div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="bg-background">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={dateList.length + 5} className="py-20 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-30" />
                                            </td>
                                        </tr>
                                    ) : employees.map((emp, idx) => (
                                        <tr key={emp.id} className="hover:bg-accent/30 transition-colors group">
                                            <td className="sticky left-0 z-20 bg-background group-hover:bg-muted/50 border-b border-r border-border p-3 text-center text-[11px] font-bold text-muted-foreground">{(page - 1) * pageSize + idx + 1}</td>
                                            <td className="sticky left-[65px] z-20 bg-background group-hover:bg-muted/50 border-b border-r border-border p-3 font-bold text-foreground text-[12px] uppercase whitespace-nowrap">
                                                {emp.full_name}
                                            </td>
                                            <td className="sticky left-[245px] z-20 bg-background group-hover:bg-muted/50 border-b border-r border-border p-3 text-center text-[11px] font-mono">{emp.dob}</td>
                                            <td className="sticky left-[345px] z-20 bg-background group-hover:bg-muted/50 border-b border-r-[2px] border-border p-3 text-[11px] font-bold uppercase text-muted-foreground italic truncate">{emp.ten_phong_ban}</td>
                                            {dateList.map(dStr => {
                                                const assign = shiftMap[emp.id]?.[dStr];
                                                const dObj = new Date(dStr);
                                                const isWE = dObj.getDay() === 0 || dObj.getDay() === 6;
                                                let hasOnCall = false;
                                                if (assign?.shift_code) {
                                                    hasOnCall = assign.shift_code.split(",").some(code => {
                                                        const def = shiftCategories.find(s => s.shift_code === code.trim());
                                                        return def && Number(def.is_on_call) === 1;
                                                    });
                                                }
                                                const canEdit = userRole === "admin" || (userRole === "manager" && !hasOnCall);

                                                return (
                                                    <td
                                                        key={dStr}
                                                        onClick={() => openModal(emp.id, emp.full_name, dStr, canEdit)}
                                                        className={`border-b border-r border-border p-0 text-center transition-all ${isWE ? "bg-destructive/[0.02]" : ""} ${canEdit ? "cursor-pointer hover:bg-primary/5" : "cursor-not-allowed opacity-60"}`}
                                                    >
                                                        {assign?.shift_code && (
                                                            <div className={`text-[10px] font-black py-2.5 px-1 ${hasOnCall ? "text-destructive" : "text-primary"}`}>
                                                                {assign.shift_code}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ========================================================== */}
                        {/* 2. GIAO DIỆN MOBILE (CARD + CALENDAR GRID) */}
                        {/* ========================================================== */}
                        <div className="md:hidden flex flex-col gap-4 bg-muted/10 p-3 pb-4">
                            {isLoading ? (
                                <div className="py-20 flex justify-center items-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
                                </div>
                            ) : employees.map((emp) => (
                                <div key={emp.id} className="bg-background border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                                    {/* Thẻ Thông tin Nhân viên */}
                                    <div className="flex justify-between items-start border-b border-dashed border-border pb-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-black text-[13px] uppercase text-foreground leading-tight">{emp.full_name}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[200px]">{emp.ten_phong_ban || 'Chưa có phòng ban'}</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0">
                                            {emp.dob || '--/--/----'}
                                        </span>
                                    </div>

                                    {/* Lưới Lịch 7 Cột (Giống giao diện Lịch Cá Nhân) */}
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {dateList.map(dStr => {
                                            const assign = shiftMap[emp.id]?.[dStr];
                                            const dObj = new Date(dStr);
                                            const isWE = dObj.getDay() === 0 || dObj.getDay() === 6;
                                            const isToday = dStr === new Date().toISOString().split("T")[0];
                                            const dayOfWeekStr = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][dObj.getDay()];
                                            const dayNum = dObj.getDate();

                                            let hasOnCall = false;
                                            if (assign?.shift_code) {
                                                hasOnCall = assign.shift_code.split(",").some(code => {
                                                    const def = shiftCategories.find(s => s.shift_code === code.trim());
                                                    return def && Number(def.is_on_call) === 1;
                                                });
                                            }
                                            const canEdit = userRole === "admin" || (userRole === "manager" && !hasOnCall);

                                            return (
                                                <div
                                                    key={dStr}
                                                    onClick={() => openModal(emp.id, emp.full_name, dStr, canEdit)}
                                                    className={`flex flex-col items-center justify-center p-1 border rounded-xl aspect-square transition-all relative overflow-hidden
                                                    ${isWE ? "bg-destructive/[0.03] border-destructive/20" : "bg-card border-border"}
                                                    ${canEdit ? "cursor-pointer hover:border-primary/50 hover:bg-primary/5 active:scale-95" : "cursor-not-allowed opacity-60"}
                                                    ${isToday ? "ring-1 ring-primary border-transparent" : ""}
                                                `}
                                                >
                                                    <span className={`text-[8px] font-black uppercase mb-0.5 ${isWE ? 'text-destructive/70' : 'text-muted-foreground/70'}`}>
                                                        {dayOfWeekStr}
                                                    </span>
                                                    <span className={`text-[12px] font-black w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                                                        {dayNum}
                                                    </span>
                                                    <div className="mt-auto w-full h-4 flex items-center justify-center">
                                                        {assign?.shift_code ? (
                                                            <span className={`text-[9px] font-black truncate max-w-full px-0.5 ${hasOnCall ? 'text-destructive' : 'text-primary'}`}>
                                                                {assign.shift_code}
                                                            </span>
                                                        ) : (
                                                            <span className="w-1 h-1 rounded-full bg-border"></span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                    <option value="100">100 dòng</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL (GIỮ NGUYÊN) */}
            {isModalOpen && modalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">Phân công trực</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground bg-muted hover:bg-destructive/10 hover:text-destructive p-1.5 rounded-full transition-colors"><X size={16} /></button>
                        </div>
                        <div className="p-5 overflow-y-auto max-h-[50vh] custom-scrollbar">
                            <div className="mb-4 bg-primary/5 p-3 rounded-xl border border-primary/10">
                                <p className="text-[10px] font-black uppercase text-muted-foreground mb-0.5">Nhân viên & Ngày</p>
                                <p className="text-[13px] font-bold text-primary uppercase">{modalData.name}</p>
                                <p className="text-[12px] font-mono text-foreground mt-1">📅 {modalData.date.split('-').reverse().join('/')}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {shiftCategories.map(s => {
                                    const isSelected = selectedShiftCodes.includes(s.shift_code);
                                    const isOnCall = Number(s.is_on_call) === 1;
                                    const isLocked = isOnCall && userRole !== "admin";
                                    return (
                                        <div
                                            key={s.shift_code}
                                            onClick={() => !isLocked && setSelectedShiftCodes(prev => prev.includes(s.shift_code) ? prev.filter(c => c !== s.shift_code) : [...prev, s.shift_code])}
                                            className={`relative p-3 border-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[70px]
                                            ${isSelected ? "border-primary bg-primary/5 scale-[0.98]" : "border-border hover:border-primary/40"} 
                                            ${isLocked ? "opacity-40 cursor-not-allowed bg-muted" : ""}`}
                                        >
                                            {isSelected && <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5"><Check className="w-3 h-3 text-white" /></div>}
                                            <div className={`font-black text-[15px] leading-none mb-1 ${isSelected ? "text-primary" : ""}`}>{s.shift_code}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase font-black truncate w-full">{s.shift_name}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-5 border-t border-border flex gap-3 bg-muted/20">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 h-11 bg-background text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl border border-border hover:bg-muted transition-colors">Hủy bỏ</button>
                            <button onClick={handleSave} className="flex-1 h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] rounded-xl shadow-md hover:opacity-90 transition-opacity">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}