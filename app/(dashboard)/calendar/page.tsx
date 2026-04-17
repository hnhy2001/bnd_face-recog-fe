"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    CalendarClock, Plus, Edit2, X, Save, Clock,
    User, CalendarDays, Plane, AlertCircle, Calendar as CalendarIcon, FileText,
    ChevronDown, Search, Check
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface Employee {
    id: string;
    username: string;
    full_name: string;
}

interface ShiftRecord {
    id: string;
    date: string;
    checkin_time?: string;
    checkout_time?: string;
    actual_hours?: number;
    actual_workday?: number;
    status?: number;
    shift_code?: string;
    is_explained?: boolean;
}

interface LeaveRequest {
    name: string;
    session: string;
}

interface CalendarDayInfo {
    dateStr: string; // YYYY-MM-DD
    day: number;
    isToday: boolean;
    isWeekend: boolean;
    isHoliday: string | null;
    leaves: LeaveRequest[];
    records: ShiftRecord[];
}

export default function PersonalCalendarPage() {
    // --- States Dữ liệu cơ bản ---
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedUsername, setSelectedUsername] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>("");

    // --- States cho Dropdown Tìm kiếm Nhân viên ---
    const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
    const [empSearch, setEmpSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // --- States Dữ liệu Lịch ---
    const [calendarDays, setCalendarDays] = useState<CalendarDayInfo[]>([]);
    const [startOffset, setStartOffset] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // --- States User ---
    const [currentUser, setCurrentUser] = useState({ username: "", name: "", role: "user" });

    // --- States Drawers & Modals ---
    const [activeDrawer, setActiveDrawer] = useState<"LEAVE" | "EXPLAIN" | null>(null);
    const [activeMobileSheet, setActiveMobileSheet] = useState<CalendarDayInfo | null>(null);

    // Form Giải trình
    const [explainForm, setExplainForm] = useState({ att_id: "", date: "", shift_code: "", reason: "", file: null as File | null });
    const [explainPreview, setExplainPreview] = useState<string>("");

    // Form Xin nghỉ
    const [leaveTypes, setLeaveTypes] = useState<{ id: string, name: string }[]>([]);
    const [managers, setManagers] = useState<Employee[]>([]);
    const [leaveForm, setLeaveForm] = useState({
        type_id: "", from_date: "", from_session: "Cả ngày", to_date: "", to_session: "Cả ngày", reason: "", approver: "", file: null as File | null
    });

    // ==========================================
    // INITIALIZATION & FETCH CORE DATA
    // ==========================================
    useEffect(() => {
        const uname = localStorage.getItem("hrm_username") || "";
        const role = localStorage.getItem("hrm_role") || "user";
        const name = localStorage.getItem("hrm_name") || uname;
        setCurrentUser({ username: uname, role, name });

        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${today.getFullYear()}-${mm}`);

        fetchMetadata();
    }, []);

    // Handle click outside for Employee Dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsEmpDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem("hrm_token") || "";
            const headers = { 'Authorization': `Bearer ${token}` };

            const resEmp = await fetch(`${API_BASE_URL}/api/employees/accessible`, { headers });
            if (resEmp.ok) {
                const data = await resEmp.json();
                const emps = data.items || [];
                setEmployees(emps);

                const uname = localStorage.getItem("hrm_username") || "";
                if (emps.some((e: any) => e.username.toUpperCase() === uname.toUpperCase())) {
                    setSelectedUsername(uname);
                }
            }

            const [resTypes, resMgrs] = await Promise.all([
                fetch(`${API_BASE_URL}/leave-types/api`, { headers }),
                fetch(`${API_BASE_URL}/api/employees/managers`, { headers })
            ]);
            if (resTypes.ok) setLeaveTypes(await resTypes.json());
            if (resMgrs.ok) {
                const mgrData: Employee[] = await resMgrs.json();

                // Ép kiểu (as Employee[]) để TypeScript hiểu đúng định dạng
                const uniqueManagers = Array.from(
                    new Map(mgrData.map(m => [m.username, m])).values()
                ) as Employee[];

                setManagers(uniqueManagers);
            }

        } catch (e) {
            console.error("Lỗi khởi tạo dữ liệu:", e);
        }
    };

    // ==========================================
    // FETCH CALENDAR DATA
    // ==========================================
    const fetchCalendar = useCallback(async () => {
        if (!selectedUsername || !selectedMonth) return;

        setIsLoading(true);
        try {
            const [year, month] = selectedMonth.split('-');
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const startDate = `${selectedMonth}-01`;
            const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
            const token = localStorage.getItem('hrm_token') || "";
            const headers = { 'Authorization': `Bearer ${token}` };

            const encodedUname = encodeURIComponent(selectedUsername);
            const empId = employees.find(e => e.username === selectedUsername)?.id || "";
            const empQuery = empId ? `&employee_id=${empId}` : "";

            const [attRes, holRes, leaveRes, expRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/monthly-records?startDate=${startDate}&endDate=${endDate}${empQuery}`, { headers }),
                fetch(`${API_BASE_URL}/holidays/api`, { headers }),
                fetch(`${API_BASE_URL}/leave-requests/api?username=${encodedUname}&status=APPROVED&size=10000`, { headers }),
                fetch(`${API_BASE_URL}/api/explanations?username=${encodedUname}&start_date=${startDate}&end_date=${endDate}`, { headers })
            ]);

            const records: ShiftRecord[] = attRes.ok ? await attRes.json() : [];
            const holRaw = holRes.ok ? await holRes.json() : [];
            const holidays = holRaw.items || (Array.isArray(holRaw) ? holRaw : []);
            const leaveRaw = leaveRes.ok ? await leaveRes.json() : [];
            const leaves = leaveRaw.items || (Array.isArray(leaveRaw) ? leaveRaw : []);
            const expData = expRes.ok ? await expRes.json() : { items: [] };

            const expMap: Record<string, boolean> = {};
            if (expData.items) {
                expData.items.forEach((e: any) => {
                    let eDate = (e.date || '').split('T')[0];
                    let eShift = (e.shift_code || '').trim().toUpperCase();
                    expMap[`${eDate}_${eShift}`] = true;
                });
            }

            const dayMap: Record<string, ShiftRecord[]> = {};
            records.forEach(r => {
                if (!r.date) return;
                let rShift = (r.shift_code || '').trim().toUpperCase();
                r.is_explained = !!expMap[`${r.date}_${rShift}`];
                if (!dayMap[r.date]) dayMap[r.date] = [];
                dayMap[r.date].push(r);
            });
            Object.values(dayMap).forEach(arr => arr.sort((a, b) => (a.checkin_time || '99').localeCompare(b.checkin_time || '99')));

            const holMap: Record<string, string> = {};
            holidays.forEach((h: any) => {
                const sDate = h.from_date || h.start_date || h.date;
                const eDate = h.to_date || h.end_date || sDate;
                if (!sDate) return;
                let curr = new Date(sDate);
                let end = new Date(eDate);
                while (curr <= end) {
                    holMap[curr.toISOString().split('T')[0]] = h.name || h.holiday_name || "Nghỉ lễ";
                    curr.setDate(curr.getDate() + 1);
                }
            });

            const leaveMap: Record<string, LeaveRequest[]> = {};
            leaves.forEach((l: any) => {
                if (l.username !== selectedUsername) return;
                let curr = new Date(l.from_date);
                let end = new Date(l.to_date);
                while (curr <= end) {
                    const dStr = curr.toISOString().split('T')[0];
                    if (!leaveMap[dStr]) leaveMap[dStr] = [];
                    const session = l.from_date !== l.to_date ? "Cả ngày" : l.from_session;
                    leaveMap[dStr].push({ name: l.type_name, session });
                    curr.setDate(curr.getDate() + 1);
                }
            });

            const firstDayOfWeek = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
            setStartOffset(firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);

            const daysArr: CalendarDayInfo[] = [];
            const today = new Date();
            for (let day = 1; day <= lastDay; day++) {
                const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);

                daysArr.push({
                    dateStr,
                    day,
                    isToday: day === today.getDate() && parseInt(month) === today.getMonth() + 1 && parseInt(year) === today.getFullYear(),
                    isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
                    isHoliday: holMap[dateStr] || null,
                    leaves: leaveMap[dateStr] || [],
                    records: dayMap[dateStr] || []
                });
            }
            setCalendarDays(daysArr);

        } catch (e) {
            console.error("Lỗi tải lịch:", e);
        } finally {
            setIsLoading(false);
        }
    }, [selectedUsername, selectedMonth, employees]);

    useEffect(() => {
        if (selectedUsername && selectedMonth) fetchCalendar();
    }, [fetchCalendar]);

    // ==========================================
    // HELPERS & UI LOGIC
    // ==========================================
    const isViewingOtherUser = selectedUsername !== currentUser.username;

    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.username.toLowerCase().includes(empSearch.toLowerCase())
    );
    const selectedEmpObj = employees.find(e => e.username === selectedUsername);

    const calcExplainDisabled = (rec: ShiftRecord) => {
        if (isViewingOtherUser || rec.is_explained) return true;
        const status = rec.status ?? null;
        if (status === 1 || status === 7 || status === 4 || status === 5) return true;

        if (!rec.date) return true;
        const thisDate = new Date(rec.date + 'T00:00:00');
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const limitStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const limitEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

        if (thisDate < limitStart || thisDate > limitEnd) return true;
        return false;
    };

    const getStatusInfo = (status: number | undefined, isWeekend: boolean) => {
        if (status === 1) return { label: '✔️ Đúng giờ', colorClass: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20' };
        if (status === 2 || status === 3 || status === 6) return { label: '⚠️ Muộn/Sớm', colorClass: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20' };
        if (status === 0) return { label: '❌ Vắng mặt', colorClass: 'text-destructive bg-destructive/10 border-destructive/20' };
        if (status === 4) return { label: '📅 Nghỉ phép', colorClass: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-900/20' };
        if (status === 5) return { label: '📅 Nghỉ KL', colorClass: 'text-muted-foreground bg-muted border-border' };
        if (status === 7) return { label: '⚡ Đang có mặt', colorClass: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20' };
        if (status === 8) return { label: '➖ Chưa có lịch', colorClass: 'text-muted-foreground bg-muted border-border' };
        if (status === 9) return { label: '⏱️ Chế độ 7h', colorClass: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20' };
        if (isWeekend) return { label: '🌿 Nghỉ cuối tuần', colorClass: 'text-green-700 bg-green-50 border-green-200 italic dark:bg-green-900/20' };
        return { label: '— Chưa có dữ liệu', colorClass: 'text-muted-foreground bg-muted/50 border-border italic' };
    };

    // ==========================================
    // ACTION HANDLERS
    // ==========================================
    const openLeaveDrawer = (dateStr?: string) => {
        if (isViewingOtherUser) {
            alert("Bạn không thể xin nghỉ cho người khác!");
            return;
        }
        setLeaveForm({
            ...leaveForm,
            from_date: dateStr || "", to_date: dateStr || "",
            type_id: "", reason: "", approver: "", file: null
        });
        setActiveMobileSheet(null);
        setActiveDrawer("LEAVE");
    };

    const openExplainDrawer = (rec: ShiftRecord) => {
        setExplainForm({
            att_id: rec.id, date: rec.date, shift_code: rec.shift_code || "", reason: "", file: null
        });
        setExplainPreview("");
        setActiveMobileSheet(null);
        setActiveDrawer("EXPLAIN");
    };

    const submitLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        const selEmp = employees.find(e => e.username === selectedUsername);

        formData.append('username', selectedUsername);
        formData.append('fullname', selEmp?.full_name || selectedUsername);
        formData.append('type_id', leaveForm.type_id);
        formData.append('from_date', leaveForm.from_date);
        formData.append('from_session', leaveForm.from_session);
        formData.append('to_date', leaveForm.to_date);
        formData.append('to_session', leaveForm.to_session);
        formData.append('reason', leaveForm.reason);
        formData.append('approver_username', leaveForm.approver);
        if (leaveForm.file) formData.append('attached_file', leaveForm.file);

        try {
            const res = await fetch(`${API_BASE_URL}/leave-requests/api`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hrm_token')}` },
                body: formData
            });
            if (res.ok) {
                alert("Đăng ký nghỉ thành công!");
                setActiveDrawer(null);
                fetchCalendar();
            } else {
                const err = await res.json();
                alert("Lỗi: " + (err.detail || "Không thể gửi đơn"));
            }
        } catch (err) { alert("Lỗi kết nối máy chủ"); }
    };

    const submitExplain = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('username', currentUser.username);
        formData.append('date', explainForm.date);
        formData.append('shift_code', explainForm.shift_code);
        formData.append('reason', explainForm.reason);
        formData.append('status', '1');
        if (explainForm.file) formData.append('attached_file', explainForm.file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/explanations`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hrm_token')}` },
                body: formData
            });
            if (res.ok) {
                alert('Đã gửi giải trình thành công!');
                setActiveDrawer(null);
                fetchCalendar();
            } else {
                const err = await res.json();
                alert('Lỗi gửi giải trình: ' + (err.detail || ""));
            }
        } catch (err) { alert('Lỗi kết nối máy chủ!'); }
    };

    // ==========================================
    // RENDERERS
    // ==========================================
    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">
            {/* HEADER & FILTER BAR */}
            <div className="flex-shrink-0 flex flex-col mb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-primary" />
                        Lịch Trình Cá Nhân
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Theo dõi chấm công, ngày nghỉ và lịch làm việc</p>
                </div>

                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-card p-3 rounded-xl border border-border shadow-sm">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto flex-1">

                        {/* Custom Dropdown Nhân Viên */}
                        <div className="flex items-center gap-2 flex-1 sm:min-w-[280px] max-w-full" ref={dropdownRef}>
                            <User className="w-4 h-4 text-muted-foreground shrink-0" />
                            {/* Thêm min-w-0 vào đây để khắc phục lỗi tràn Flexbox */}
                            <div className="relative flex-1 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                                    className="hrm-input flex items-center justify-between h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-bold w-full text-left shadow-sm overflow-hidden"
                                >
                                    {/* Thêm block và truncate để chữ dài tự biến thành dấu ... */}
                                    <span className="truncate pr-2 block">
                                        {selectedEmpObj ? `${selectedEmpObj.full_name} (${selectedEmpObj.username})` : "-- Chọn nhân viên --"}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isEmpDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isEmpDropdownOpen && (
                                    /* Sửa lại popup: min-w-full w-max để nó có thể rộng hơn cái nút nếu tên quá dài, thêm ring-1 để viền nổi bật */
                                    <div className="absolute top-[calc(100%+6px)] left-0 min-w-full w-max max-w-[340px] bg-card border border-border rounded-xl shadow-lg z-[100] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-foreground/5">
                                        <div className="p-2 border-b border-border bg-muted/20 flex items-center gap-2 shrink-0">
                                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Tìm tên hoặc mã nhân viên..."
                                                value={empSearch}
                                                onChange={(e) => setEmpSearch(e.target.value)}
                                                className="bg-transparent border-none outline-none text-[12px] font-bold text-foreground w-full placeholder:font-normal placeholder:text-muted-foreground"
                                            />
                                        </div>
                                        <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-1.5 bg-background">
                                            {filteredEmployees.length === 0 ? (
                                                <div className="p-3 text-center text-[11px] text-muted-foreground italic">
                                                    Không tìm thấy nhân viên.
                                                </div>
                                            ) : (
                                                filteredEmployees.map(e => (
                                                    <button
                                                        key={e.username}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedUsername(e.username);
                                                            setIsEmpDropdownOpen(false);
                                                            setEmpSearch("");
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-[12px] rounded-md flex items-center justify-between transition-colors ${selectedUsername === e.username ? 'bg-primary/10 text-primary font-black' : 'text-foreground font-bold hover:bg-muted'}`}
                                                    >
                                                        <span className="truncate pr-3">{e.full_name} ({e.username})</span>
                                                        {selectedUsername === e.username && <Check className="w-4 h-4 shrink-0" />}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chọn Tháng */}
                        <div className="flex items-center gap-2 flex-1 sm:min-w-[200px] sm:max-w-[250px]">
                            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-bold w-full font-mono uppercase shadow-sm"
                            />
                        </div>
                    </div>

                    {!isViewingOtherUser && (
                        <button
                            onClick={() => openLeaveDrawer()}
                            className="flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-lg text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm whitespace-nowrap shrink-0"
                        >
                            <Plane size={16} /> Xin Nghỉ Phép
                        </button>
                    )}
                </div>
            </div>

            {/* MAIN CALENDAR GRID */}
            <div className="hrm-card flex-1 flex flex-col min-h-0 bg-card border border-border rounded-xl shadow-sm overflow-hidden relative">
                <div className="grid grid-cols-7 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/30 border-b border-border py-3 shrink-0">
                    <div>Thứ 2</div><div>Thứ 3</div><div>Thứ 4</div><div>Thứ 5</div>
                    <div>Thứ 6</div><div className="text-primary/70">Thứ 7</div><div className="text-destructive/70">Chủ Nhật</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-muted/10">
                    {!selectedUsername ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                            👆 Vui lòng chọn nhân viên để xem lịch...
                        </div>
                    ) : isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-1.5 auto-rows-[minmax(60px,auto)] md:auto-rows-[minmax(150px,auto)] min-h-[500px]">
                            {/* Empty days offsets */}
                            {Array.from({ length: startOffset }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-transparent rounded-lg border border-transparent"></div>
                            ))}

                            {/* Actual Days */}
                            {calendarDays.map((dayInfo) => {
                                const hasFullDayLeave = dayInfo.leaves.some(lv => lv.session === 'Cả ngày');
                                const bgClass = dayInfo.isToday ? "bg-primary/5 ring-2 ring-primary border-transparent"
                                    : dayInfo.isHoliday ? "bg-destructive/5 border-destructive/20"
                                        : dayInfo.leaves.length > 0 ? "bg-sky-500/5 border-sky-500/20"
                                            : dayInfo.isWeekend ? "bg-muted/30 border-border"
                                                : "bg-card border-border hover:border-primary/40";

                                return (
                                    <div
                                        key={dayInfo.dateStr}
                                        onClick={() => window.innerWidth <= 768 && setActiveMobileSheet(dayInfo)}
                                        className={`p-1.5 md:p-2 border rounded-xl flex flex-col gap-1 transition-colors relative overflow-hidden cursor-pointer md:cursor-default min-h-[60px] md:min-h-[130px] ${bgClass}`}
                                    >
                                        <div className="flex justify-between items-start mb-1 shrink-0">
                                            <span className={`text-[12px] md:text-sm font-black ${dayInfo.isToday ? 'bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center rounded-full' : 'text-foreground'}`}>
                                                {dayInfo.day}
                                            </span>
                                        </div>

                                        {/* Mobile Dots */}
                                        <div className="md:hidden flex gap-1 justify-center mt-1 shrink-0">
                                            {dayInfo.isHoliday && <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>}
                                            {dayInfo.leaves.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>}
                                            {dayInfo.records.map((r, i) => (
                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                            ))}
                                        </div>

                                        {/* Desktop Content */}
                                        <div className="hidden md:flex flex-col gap-1 flex-1 h-full">
                                            {dayInfo.isHoliday && (
                                                <div className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded text-center truncate shadow-sm shrink-0">
                                                    🎉 {dayInfo.isHoliday}
                                                </div>
                                            )}

                                            {dayInfo.leaves.map((lv, idx) => (
                                                <div key={idx} className="text-[9px] font-bold bg-sky-500 text-white px-1.5 py-0.5 rounded truncate shadow-sm shrink-0">
                                                    ✈️ {lv.name} ({lv.session})
                                                </div>
                                            ))}

                                            {!dayInfo.isHoliday && !hasFullDayLeave && dayInfo.records.length === 0 && (
                                                <div className="text-[10px] text-muted-foreground italic text-center mt-2 shrink-0">
                                                    {dayInfo.isWeekend ? '🌿 Nghỉ' : '— Trống'}
                                                </div>
                                            )}

                                            {!dayInfo.isHoliday && !hasFullDayLeave && dayInfo.records.map((rec, idx) => {
                                                const sInfo = getStatusInfo(rec.status, dayInfo.isWeekend);
                                                return (
                                                    <div key={idx} className={`border rounded flex flex-col p-1 gap-0.5 shrink-0 ${sInfo.colorClass}`}>
                                                        <span className="text-[9px] font-bold truncate">{sInfo.label}</span>
                                                        {!dayInfo.isWeekend && (
                                                            <>
                                                                <span className="text-[8.5px] font-mono truncate">🔵 {rec.checkin_time ? rec.checkin_time.substring(0, 5) : '--:--'}</span>
                                                                <span className="text-[8.5px] font-mono truncate">🔴 {rec.checkout_time ? rec.checkout_time.substring(0, 5) : '--:--'}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                            <div className="mt-auto pt-2 border-t border-dashed border-border flex flex-col gap-1 w-full shrink-0">
                                                {!dayInfo.isHoliday && dayInfo.leaves.length === 0 && dayInfo.records.length === 1 && (
                                                    (() => {
                                                        const rec = dayInfo.records[0];
                                                        const explainDis = calcExplainDisabled(rec);
                                                        return (
                                                            <button
                                                                disabled={explainDis}
                                                                onClick={(e) => { e.stopPropagation(); openExplainDrawer(rec); }}
                                                                className={`w-full h-[24px] flex items-center justify-center gap-1 text-[10px] font-bold rounded-md shadow-sm transition-all overflow-hidden border ${rec.is_explained ? 'bg-blue-50/50 text-blue-600 border-blue-200' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white'} disabled:opacity-60 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400`}
                                                                title={rec.is_explained ? '✔️ Đã giải trình' : '✍️ Giải trình'}
                                                            >
                                                                <span className="shrink-0">{rec.is_explained ? '✔️' : '✍️'}</span>
                                                                <span className="truncate whitespace-nowrap">{rec.is_explained ? 'Đã GT' : 'Giải trình'}</span>
                                                            </button>
                                                        )
                                                    })()
                                                )}

                                                {!dayInfo.isHoliday && dayInfo.leaves.length === 0 && dayInfo.records.length > 1 && (
                                                    dayInfo.records.map((rec, idx) => {
                                                        const explainDis = calcExplainDisabled(rec);
                                                        return (
                                                            <button
                                                                key={idx}
                                                                disabled={explainDis}
                                                                onClick={(e) => { e.stopPropagation(); openExplainDrawer(rec); }}
                                                                className={`w-full h-[24px] flex items-center justify-center gap-1 text-[9px] font-bold rounded-md shadow-sm transition-all overflow-hidden border ${rec.is_explained ? 'bg-blue-50/50 text-blue-600 border-blue-200' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white'} disabled:opacity-60 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400`}
                                                                title={rec.is_explained ? `✔️ Đã GT Ca ${idx + 1}` : `✍️ GT Ca ${idx + 1}`}
                                                            >
                                                                <span className="truncate whitespace-nowrap">{rec.is_explained ? `✔️ Ca ${idx + 1}` : `✍️ Ca ${idx + 1}`}</span>
                                                            </button>
                                                        )
                                                    })
                                                )}

                                                {!isViewingOtherUser && !hasFullDayLeave && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openLeaveDrawer(dayInfo.dateStr); }}
                                                        className="w-full h-[24px] flex items-center justify-center gap-1 text-[10px] font-bold rounded-md shadow-sm transition-all overflow-hidden border bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-600 hover:text-white"
                                                    >
                                                        <span className="shrink-0">✈️</span>
                                                        <span className="truncate whitespace-nowrap">Xin nghỉ</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* SLIDE-OUT DRAWER FORMS */}
            {activeDrawer && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] transition-opacity" onClick={() => setActiveDrawer(null)} />}

            <div className={`fixed top-0 right-0 bottom-0 w-full max-w-[450px] bg-card shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col ${activeDrawer ? "translate-x-0" : "translate-x-full"} md:border-l border-border`}>

                {/* HEADER - Bỏ viền dưới */}
                <div className="flex-shrink-0 flex items-center justify-between p-5 pb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                        {activeDrawer === "LEAVE" ? <><Plane className="text-primary w-5 h-5" /> Đăng ký nghỉ</> : <><FileText className="text-primary w-5 h-5" /> Viết Giải Trình</>}
                    </h3>
                    <button onClick={() => setActiveDrawer(null)} className="p-2 bg-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* BODY - Chỉnh lại padding để liền mạch */}
                <div className="flex-1 overflow-y-auto px-5 pt-3 pb-5 custom-scrollbar">
                    {activeDrawer === "LEAVE" && (
                        <form id="leaveForm" onSubmit={submitLeave} className="flex flex-col gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Loại nghỉ phép *</label>
                                <select required value={leaveForm.type_id} onChange={e => setLeaveForm({ ...leaveForm, type_id: e.target.value })} className="hrm-input h-11 px-3 bg-background text-foreground rounded-xl border border-border text-[12px] font-bold w-full shadow-sm">
                                    <option value="">-- Chọn loại --</option>
                                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Từ ngày *</label>
                                    <input type="date" required value={leaveForm.from_date} onChange={e => setLeaveForm({ ...leaveForm, from_date: e.target.value })} className="hrm-input h-11 px-3 bg-background text-foreground rounded-xl border border-border text-[12px] w-full uppercase font-mono shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-transparent mb-1.5 block">.</label>
                                    <select value={leaveForm.from_session} onChange={e => setLeaveForm({ ...leaveForm, from_session: e.target.value })} className="hrm-input h-11 px-2 bg-background text-foreground rounded-xl border border-border text-[12px] w-full font-bold shadow-sm">
                                        <option value="Cả ngày">Cả ngày</option><option value="Sáng">Sáng</option><option value="Chiều">Chiều</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Đến ngày *</label>
                                    <input type="date" required value={leaveForm.to_date} onChange={e => setLeaveForm({ ...leaveForm, to_date: e.target.value })} className="hrm-input h-11 px-3 bg-background text-foreground rounded-xl border border-border text-[12px] w-full uppercase font-mono shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-transparent mb-1.5 block">.</label>
                                    <select value={leaveForm.to_session} onChange={e => setLeaveForm({ ...leaveForm, to_session: e.target.value })} className="hrm-input h-11 px-2 bg-background text-foreground rounded-xl border border-border text-[12px] w-full font-bold shadow-sm">
                                        <option value="Cả ngày">Cả ngày</option><option value="Sáng">Sáng</option><option value="Chiều">Chiều</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Lý do nghỉ *</label>
                                <textarea required rows={3} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Ghi rõ lý do..." className="hrm-input p-3 bg-background text-foreground rounded-xl border border-border text-[12px] w-full resize-none shadow-sm" />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Người duyệt *</label>
                                <select required value={leaveForm.approver} onChange={e => setLeaveForm({ ...leaveForm, approver: e.target.value })} className="hrm-input h-11 px-3 bg-background text-foreground rounded-xl border border-border text-[12px] font-bold w-full shadow-sm">
                                    <option value="">-- Chọn quản lý --</option>
                                    {managers.map(m => <option key={m.username} value={m.username}>{m.full_name} ({m.username})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ảnh đính kèm</label>
                                <div className="border border-dashed border-border rounded-xl p-2 bg-muted/10 hover:bg-muted/30 transition-colors">
                                    <input type="file" accept="image/*" onChange={e => setLeaveForm({ ...leaveForm, file: e.target.files?.[0] || null })} className="text-[12px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full" />
                                </div>
                            </div>
                        </form>
                    )}

                    {activeDrawer === "EXPLAIN" && (
                        <form id="explainForm" onSubmit={submitExplain} className="flex flex-col gap-4">
                            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-[12px] flex flex-col gap-1.5">
                                <span className="text-muted-foreground">Nhân viên: <strong className="text-foreground">{currentUser.name}</strong></span>
                                <span className="text-muted-foreground">Ngày GT: <strong className="text-foreground font-mono">{explainForm.date}</strong></span>
                                <span className="text-muted-foreground">Ca làm việc: <strong className="text-foreground">{explainForm.shift_code || 'N/A'}</strong></span>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Lý do giải trình *</label>
                                <textarea required rows={4} value={explainForm.reason} onChange={e => setExplainForm({ ...explainForm, reason: e.target.value })} placeholder="Nhập lý do chi tiết..." className="hrm-input p-3 bg-background text-foreground rounded-xl border border-border text-[12px] w-full resize-none shadow-sm" />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ảnh đính kèm (Tùy chọn)</label>
                                <div className="border border-dashed border-border rounded-xl p-2 bg-muted/10 hover:bg-muted/30 transition-colors mb-3">
                                    <input type="file" accept="image/*" onChange={e => {
                                        const f = e.target.files?.[0];
                                        setExplainForm({ ...explainForm, file: f || null });
                                        if (f) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => setExplainPreview(ev.target?.result as string);
                                            reader.readAsDataURL(f);
                                        } else setExplainPreview("");
                                    }} className="text-[12px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full" />
                                </div>
                                {explainPreview && <img src={explainPreview} alt="Preview" className="max-h-32 rounded-xl border border-border shadow-sm object-cover" />}
                            </div>
                        </form>
                    )}
                </div>

                {/* FOOTER - Bỏ viền trên, thêm shadow nhẹ ngược lên */}
                <div className="flex-shrink-0 p-5 pt-3 bg-card flex gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                    <button type="button" onClick={() => setActiveDrawer(null)} className="flex-1 h-12 bg-muted/50 text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border">
                        Hủy
                    </button>
                    <button type="submit" form={activeDrawer === "LEAVE" ? "leaveForm" : "explainForm"} className="flex-1 flex items-center justify-center gap-2 h-12 text-primary-foreground bg-primary hover:opacity-90 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md">
                        <Save size={16} /> Gửi Đơn
                    </button>
                </div>
            </div>

            {/* MOBILE BOTTOM SHEET */}
            <div className={`md:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-[90] transition-opacity flex items-end ${activeMobileSheet ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => setActiveMobileSheet(null)}>
                <div
                    className={`bg-card w-full rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out border-t border-border overflow-hidden flex flex-col max-h-[85vh] ${activeMobileSheet ? "translate-y-0" : "translate-y-full"}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-2 shrink-0" />

                    <div className="flex justify-between items-center px-5 py-3 border-b border-border shrink-0">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-widest">
                            📅 Ngày {activeMobileSheet?.dateStr.split('-').reverse().join('/')}
                        </h4>
                        <button onClick={() => setActiveMobileSheet(null)} className="p-1.5 bg-muted rounded-full text-muted-foreground"><X size={16} /></button>
                    </div>

                    <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                        {activeMobileSheet?.isHoliday && (
                            <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl text-sm font-bold flex items-center gap-2">
                                🎉 NGHỈ LỄ: {activeMobileSheet.isHoliday}
                            </div>
                        )}
                        {activeMobileSheet?.leaves.map((lv, i) => (
                            <div key={i} className="bg-sky-500/10 text-sky-600 border border-sky-500/20 p-3 rounded-xl text-sm font-bold flex items-center gap-2">
                                ✈️ {lv.name} ({lv.session})
                            </div>
                        ))}

                        {!activeMobileSheet?.isHoliday && !activeMobileSheet?.leaves.some(l => l.session === 'Cả ngày') && (
                            activeMobileSheet?.records.length === 0 ? (
                                <div className="text-center italic text-muted-foreground py-4 text-sm bg-muted/20 rounded-xl">
                                    {activeMobileSheet.isWeekend ? '🌿 Nghỉ cuối tuần' : '— Chưa có dữ liệu chấm công'}
                                </div>
                            ) : (
                                activeMobileSheet?.records.map((rec, i) => {
                                    const sInfo = getStatusInfo(rec.status, activeMobileSheet.isWeekend);
                                    const explainDis = calcExplainDisabled(rec);

                                    return (
                                        <div key={i} className="border border-border rounded-xl overflow-hidden bg-background">
                                            <div className={`px-3 py-2 border-b border-border text-[11px] font-bold flex justify-between items-center ${sInfo.colorClass.replace('border', 'border-b-0')}`}>
                                                <span>Ca {i + 1}</span>
                                                <span className="uppercase">{sInfo.label}</span>
                                            </div>
                                            <div className="p-3 grid grid-cols-2 gap-3 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">🔵 Giờ vào</span>
                                                    <span className="font-mono font-bold text-foreground">{rec.checkin_time?.substring(0, 5) || '--:--'}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">🔴 Giờ ra</span>
                                                    <span className="font-mono font-bold text-foreground">{rec.checkout_time?.substring(0, 5) || '--:--'}</span>
                                                </div>
                                            </div>
                                            <div className="px-3 pb-3">
                                                <button
                                                    disabled={explainDis}
                                                    onClick={() => openExplainDrawer(rec)}
                                                    className={`w-full py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${rec.is_explained ? 'bg-transparent text-green-600 border border-green-200' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'} disabled:opacity-50 disabled:bg-muted disabled:border-transparent disabled:text-muted-foreground`}
                                                >
                                                    {rec.is_explained ? '✔️ Đã giải trình' : '✍️ Viết giải trình'}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )
                        )}

                        {!isViewingOtherUser && !activeMobileSheet?.leaves.some(l => l.session === 'Cả ngày') && (
                            <button
                                onClick={() => openLeaveDrawer(activeMobileSheet?.dateStr)}
                                className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-secondary text-foreground rounded-xl text-[12px] font-black uppercase tracking-widest border border-border"
                            >
                                <Plane size={16} /> Đăng ký nghỉ
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}