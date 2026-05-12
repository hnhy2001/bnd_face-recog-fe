"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { API_BASE_URL, getImageUrl } from "@/lib/api-client"
import { Clock, Wifi, Search, Users, CheckCircle2, FileText, PenTool, X, ImageIcon, LayoutDashboard } from "lucide-react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"

export default function DashboardPage() {
    const router = useRouter()

    // --- UI States ---
    const [time, setTime] = useState<Date | null>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [imageModal, setImageModal] = useState<{ isOpen: boolean, src: string, title: string }>({ isOpen: false, src: "", title: "" })

    // --- User States ---
    const [user, setUser] = useState({ fullname: "Đang tải...", username: "...", role: "user" })

    // --- Data States ---
    const [rawData, setRawData] = useState<any[]>([])
    const [stats, setStats] = useState({ employees: 0, today: 0, leaves: 0, explanations: 0 })
    const [refreshInterval, setRefreshInterval] = useState<number>(60000)

    // --- Filter & Pagination States ---
    const [keyword, setKeyword] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 2

    // ==========================================
    // 1. UTILS & HELPERS
    // ==========================================
    const isCheckOutTime = useCallback(() => {
        const now = new Date()
        const hours = now.getHours()
        const minutes = now.getMinutes()
        return (hours === 16 && minutes >= 20 && minutes <= 45)
    }, [])

    const hasCheckedOutToday = useCallback(() => {
        if (typeof window === "undefined") return false
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        const todayStr = `${yyyy}-${mm}-${dd}`
        return localStorage.getItem('checkout_done_date') === todayStr
    }, [])

    // ==========================================
    // 2. FETCH DATA API
    // ==========================================
    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem("hrm_token")
        if (!token) return

        try {
            const statsRes = await fetch(`${API_BASE_URL}/api/stats`, { headers: { "Authorization": `Bearer ${token}`, "ngrok-skip-browser-warning": "true" } })
            let employees = 0, leaves = 0
            if (statsRes.ok) {
                const data = await statsRes.json()
                employees = data.total_employees || 0
                leaves = data.total_leaves || 0
            }

            let explanations = 0
            const expRes = await fetch(`${API_BASE_URL}/api/explanations?status=1&limit=1`, { headers: { "Authorization": `Bearer ${token}`, "ngrok-skip-browser-warning": "true" } })
            if (expRes.ok) {
                const expData = await expRes.json()
                explanations = expData.total || 0
            }

            setStats(prev => ({ ...prev, employees, leaves, explanations }))
        } catch (error) {
            console.error("Lỗi lấy stats:", error)
        }
    }, [])

    const fetchDashboardRecords = useCallback(async () => {
        const token = localStorage.getItem("hrm_token")
        if (!token) return

        const todayObj = new Date()
        const yyyy = todayObj.getFullYear()
        const mm = String(todayObj.getMonth() + 1).padStart(2, '0')
        const dd = String(todayObj.getDate()).padStart(2, '0')
        const todayStr = `${yyyy}-${mm}-${dd}`

        try {
            const res = await fetch(`${API_BASE_URL}/api/monthly-records?startDate=${todayStr}&endDate=${todayStr}`, {
                headers: { "Authorization": `Bearer ${token}`, "ngrok-skip-browser-warning": "true" }
            })
            if (!res.ok) {
                if (res.status === 401) router.push("/login")
                return
            }
            const data = await res.json()
            setRawData(data)
        } catch (error) {
            console.error("Lỗi lấy lịch sử:", error)
        }
    }, [router])

    // ==========================================
    // 3. EFFECTS
    // ==========================================
    useEffect(() => {
        setIsMounted(true)

        const role = localStorage.getItem("hrm_role") || "user"
        const username = (localStorage.getItem("hrm_username") || "").toUpperCase()
        const fullname = localStorage.getItem("hrm_fullname") || username || "Chưa đăng nhập"
        setUser({ fullname, username, role })

        const loadInitialData = async () => {
            setIsLoading(true)
            await Promise.all([
                fetchDashboardData(),
                fetchDashboardRecords()
            ])
            setIsLoading(false)
        }

        loadInitialData()

        setTime(new Date())
        const timer = setInterval(() => {
            setTime(new Date())
            if (isCheckOutTime() && !hasCheckedOutToday() && role === "user") {
                console.log("⏰ Đến giờ điểm danh về! Tự động chuyển hướng...")
                router.push("/verify_personal")
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [fetchDashboardData, fetchDashboardRecords, isCheckOutTime, hasCheckedOutToday, router])

    useEffect(() => {
        if (refreshInterval > 0) {
            const intervalId = setInterval(() => {
                fetchDashboardData()
                fetchDashboardRecords()
            }, refreshInterval)
            return () => clearInterval(intervalId)
        }
    }, [refreshInterval, fetchDashboardData, fetchDashboardRecords])

    // --- HIỆU ỨNG CHẠY NGẦM: GPS FEEDER ---
    useEffect(() => {
        let watchId: number;

        const startGPSFeeder = () => {
            if (!navigator.geolocation) return;

            console.log("🚀 Bắt đầu chạy trạm tiếp tế GPS ngầm...");
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const gpsData = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        timestamp: Date.now()
                    };
                    localStorage.setItem("shared_gps_cache", JSON.stringify(gpsData));
                },
                (error) => console.warn("⚠️ Trạm GPS Dashboard gặp lỗi:", error.message),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
            );
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && navigator.geolocation) {
                console.log("👀 Dashboard mở lại! Ép lấy GPS mới...");
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const freshGpsData = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            timestamp: Date.now()
                        };
                        localStorage.setItem("shared_gps_cache", JSON.stringify(freshGpsData));
                    },
                    () => { },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            }
        };

        startGPSFeeder();
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // ==========================================
    // 4. LỌC & TÍNH TOÁN THỐNG KÊ (MEMO)
    // ==========================================
    const { filteredData, miniStats, todayCount } = useMemo(() => {
        const kw = keyword.toLowerCase().trim()
        const st = statusFilter

        const filtered = rawData.filter(item => {
            const matchKw = !kw || (item.full_name && item.full_name.toLowerCase().includes(kw)) || (item.username && item.username.toLowerCase().includes(kw))
            const matchStatus = st === 'all' || item.status === parseInt(st)
            return matchKw && matchStatus
        })

        const mStats = { hopLe: 0, viPham: 0, nghiCheDo: 0, nghiKL: 0 }
        let late = 0, inProgress = 0

        filtered.forEach(item => {
            const status = item.status;
            // Gộp 4 nhóm
            if ([1, 7, 9, 13, 14, 20].includes(status)) mStats.hopLe++;
            else if ([0, 2, 3, 6, 8, 10, 11].includes(status)) mStats.viPham++;
            else if ([4, 12, 15, 16, 17, 18, 19, 21, 22].includes(status)) mStats.nghiCheDo++;
            else if (status === 5) mStats.nghiKL++;

            // Tính số người đi làm hôm nay (giữ nguyên logic cũ của bạn)
            if (status === 2) late++;
            if (status === 7) inProgress++;
        })

        return { filteredData: filtered, miniStats: mStats, todayCount: late + inProgress }
    }, [rawData, keyword, statusFilter])

    // Cập nhật state stats cho thẻ "ĐI LÀM HÔM NAY"
    useEffect(() => {
        setStats(prev => ({ ...prev, today: todayCount }))
    }, [todayCount])

    // ==========================================
    // 5. PHÂN TRANG & RENDER MAPPING
    // ==========================================
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
    const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages)
    }, [totalPages, currentPage])

    const handleRowDoubleClick = (item: any) => {
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        const startOfMonth = `${yyyy}-${mm}-01`
        const todayStr = `${yyyy}-${mm}-${dd}`

        sessionStorage.setItem('att_goto_username', item.username || "")
        sessionStorage.setItem('att_goto_fullname', item.full_name || "")
        sessionStorage.setItem('att_goto_startDate', startOfMonth)
        sessionStorage.setItem('att_goto_endDate', todayStr)
        router.push('/attendance')
    }

    const getStatusUI = (item: any) => {
        const statusMap: Record<number, string> = {
            0: "🚫 Vắng mặt", 1: "✔️ Đúng giờ", 2: "⚠️ Đi muộn", 3: "⏳ Về sớm",
            4: "📅 Nghỉ phép", 5: "📅 Nghỉ KL", 6: "❌ Muộn & Sớm",
            7: "⚡ Đang có mặt", 8: "➖ Chưa có lịch", 9: "⏱️ Chế độ 7h", 10: "❓ Quên vào",
            11: "❓ Quên ra", 12: "🏖️ Nghỉ chế độ", 13: "📚 Đi học", 14: "💼 Công tác",
            15: "🔄 Nghỉ bù", 16: "👶 Thai sản", 17: "⚫ Ma chay", 18: "💍 Con KH",
            19: "💒 Kết hôn", 20: "⏰ Làm thêm (OT)", 21: "🤒 Nghỉ ốm", 22: "👨‍👩‍👧 Nghỉ con ốm"
        };

        const st = item.status;
        let subText = statusMap[st] || "❓ Không xác định";
        let status = "";
        let statusClass = "";

        if ([1, 7, 9, 13, 14, 20].includes(st)) {
            status = "✅ HỢP LỆ"; statusClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        } else if ([0, 2, 3, 6, 8, 10, 11].includes(st)) {
            status = "🚨 VI PHẠM"; statusClass = "bg-destructive/10 text-destructive border-destructive/20";
        } else if ([4, 12, 15, 16, 17, 18, 19, 21, 22].includes(st)) {
            status = "🏖️ NGHỈ CHẾ ĐỘ"; statusClass = "bg-sky-500/10 text-sky-600 border-sky-500/20";
        } else if (st === 5) {
            status = "⏸️ NGHỈ KL"; statusClass = "bg-orange-500/10 text-orange-600 border-orange-500/20";
        } else {
            status = "❓ KHÁC"; statusClass = "bg-muted text-muted-foreground border-border";
        }

        const expTexts: Record<number, string> = { 0: "—", 1: "⏳ Đã gửi", 2: "✔️ Đã duyệt", 3: "✖ Từ chối" };
        const expClasses: Record<number, string> = {
            0: "text-muted-foreground",
            1: "text-amber-600 dark:text-amber-400 font-bold",
            2: "text-emerald-600 dark:text-emerald-400 font-bold",
            3: "text-destructive font-bold"
        };

        let dateStr = "---";
        if (item.date) {
            const [y, m, d] = item.date.split('-');
            dateStr = `${d}/${m}/${y}`;
        }

        let lateText = "";
        if (st !== 8 && st !== 9) {
            if (item.late_minutes > 0) lateText += `Muộn: ${item.late_minutes}p \n`;
            if (item.early_minutes > 0) lateText += `Sớm: ${item.early_minutes}p`;
        }

        return {
            status, subText, statusClass, dateStr, lateText,
            expText: expTexts[item.explanation_status || 0],
            expClass: expClasses[item.explanation_status || 0]
        };
    }

    return (
        // [FIX MOBILE & DESKTOP]: Thay đổi class để Mobile tự do dãn (flex), Desktop mới bị khóa cứng (md:flex-1 md:h-full md:min-h-0)
        <div className="w-full flex flex-col md:flex-1 md:h-full md:min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* HEADER (Ghim cứng trên Desktop) */}
            <div className="md:flex-shrink-0 flex flex-wrap justify-between items-center mb-1 gap-4">
                <div>
                    <h3 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0">
                        Xin chào, {user.fullname} 👋
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                        Mã NV: <strong className="text-foreground">{user.username}</strong>
                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border 
                            ${user.role === 'admin' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                user.role === 'manager' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                    'bg-secondary text-secondary-foreground border-border'}`}>
                            {user.role === 'admin' ? 'QUẢN TRỊ VIÊN' : user.role === 'manager' ? 'QUẢN LÝ' : 'NHÂN VIÊN'}
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="hrm-input px-3 py-2 rounded-lg border border-border text-[12px] font-bold uppercase tracking-wide text-muted-foreground bg-background shadow-sm cursor-pointer"
                    >
                        <option value="0">Tắt tự động cập nhật</option>
                        <option value="200000">Làm mới: 20 giây</option>
                        <option value="60000">Làm mới: 1 phút</option>
                        <option value="300000">Làm mới: 5 phút</option>
                        <option value="600000">Làm mới: 10 phút</option>
                    </select>
                    <div className="bg-primary text-primary-foreground min-w-[120px] px-4 py-2 rounded-lg border border-primary font-mono font-bold shadow-sm flex items-center gap-2 justify-center">
                        <Clock className="w-4 h-4" />
                        {isMounted && time ? time.toLocaleTimeString('vi-VN', { hour12: false }) : "--:--:--"}
                    </div>
                </div>
            </div>

            {/* THÔNG BÁO WIFI */}
            <div className="md:flex-shrink-0 bg-muted border border-border text-muted-foreground px-5 py-3 rounded-xl mt-3 mb-5 flex items-center gap-3 font-medium text-[12px] shadow-sm">
                <Wifi className="w-5 h-5 flex-shrink-0 text-foreground" />
                <span>
                    Hệ thống chấm công yêu cầu kết nối mạng nội bộ. Wifi Bệnh viện sử dụng mật khẩu:
                    <strong className="bg-background px-2 py-0.5 rounded-md mx-1 border border-border text-foreground">88888888@</strong> hoặc
                    <strong className="bg-background px-2 py-0.5 rounded-md mx-1 border border-border text-foreground">88889999</strong>.
                </span>
            </div>

            {/* TRẠNG THÁI LOADING */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-0">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[11px] font-bold uppercase tracking-widest mt-2">Đang tải dữ liệu tổng quan...</span>
                </div>
            ) : (
                // [FIX MOBILE & DESKTOP] Dùng md:flex-1 thay vì flex-1 để Mobile tự do chiều cao
                <div className="flex flex-col md:flex-1 md:min-h-0 animate-in fade-in duration-500">

                    {/* 4 THẺ THỐNG KÊ LỚN */}
                    <div className="md:flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
                        <div className="hrm-card p-5 flex items-center justify-between hover:bg-accent hover:text-accent-foreground cursor-default group">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">TỔNG NHÂN SỰ</span>
                                <span className="text-3xl font-black tracking-tighter text-foreground leading-none">{stats.employees}</span>
                            </div>
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-muted border border-border/50 text-foreground group-hover:bg-background group-hover:border-border transition-colors">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="hrm-card p-5 flex items-center justify-between hover:bg-accent hover:text-accent-foreground cursor-default group">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">ĐI LÀM HÔM NAY</span>
                                <span className="text-3xl font-black tracking-tighter text-foreground leading-none">{stats.today}</span>
                            </div>
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-muted border border-border/50 text-foreground group-hover:bg-background group-hover:border-border transition-colors">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="hrm-card p-5 flex items-center justify-between hover:bg-accent hover:text-accent-foreground cursor-default group">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">ĐƠN XIN NGHỈ</span>
                                <span className="text-3xl font-black tracking-tighter text-foreground leading-none">{stats.leaves}</span>
                            </div>
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-muted border border-border/50 text-foreground group-hover:bg-background group-hover:border-border transition-colors">
                                <FileText className="w-6 h-6" />
                            </div>
                        </div>

                        <div onClick={() => router.push('/explanation')} className="bg-primary text-primary-foreground p-5 rounded-xl border border-primary shadow-sm flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-2">ĐƠN GIẢI TRÌNH</span>
                                <span className="text-3xl font-black tracking-tighter leading-none">{stats.explanations}</span>
                            </div>
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground">
                                <PenTool className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* 4 THẺ THỐNG KÊ NHỎ THEO NHÓM */}
                    <div className="md:flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        {[
                            { label: "Hợp lệ", value: miniStats.hopLe, color: "text-emerald-500" },
                            { label: "Vi phạm", value: miniStats.viPham, color: "text-destructive" },
                            { label: "Nghỉ chế độ", value: miniStats.nghiCheDo, color: "text-sky-500" },
                            { label: "Nghỉ KL", value: miniStats.nghiKL, color: "text-orange-500" },
                        ].map((stat, i) => (
                            <div key={i} className="hrm-card py-4 px-3 text-center hover:bg-accent hover:text-accent-foreground cursor-default transition-all shadow-sm">
                                <h4 className="m-0 mb-2 text-[10px] text-muted-foreground uppercase font-black tracking-widest">{stat.label}</h4>
                                <p className={`text-3xl font-black m-0 tracking-tighter ${stat.color}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* BỘ LỌC */}
                    <div className="md:flex-shrink-0 hrm-card p-4 flex flex-col md:flex-row gap-4 mb-6">
                        {user.role !== "user" && (
                            <div className="flex-1 flex flex-col gap-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                    <Search className="w-3 h-3" /> Tìm kiếm nhân viên
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nhập tên hoặc mã NV..."
                                    value={keyword}
                                    onChange={(e) => { setKeyword(e.target.value); setCurrentPage(1); }}
                                    className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full"
                                />
                            </div>
                        )}
                        <div className="w-full md:w-64 flex flex-col gap-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Trạng thái</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="hrm-input h-10 px-3 rounded-lg border border-border text-[12px] font-medium w-full bg-background text-foreground cursor-pointer"
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <optgroup label="✅ HỢP LỆ">
                                    <option value="1">✔️ Đi làm đúng giờ</option>
                                    <option value="7">⚡ Đang có mặt</option>
                                    <option value="9">⏱️ Chế độ 7h</option>
                                    <option value="13">📚 Đi học</option>
                                    <option value="14">💼 Công tác</option>
                                    <option value="20">⏰ Làm thêm giờ (OT)</option>
                                </optgroup>
                                <optgroup label="🚨 VI PHẠM">
                                    <option value="0">🚫 Vắng mặt</option>
                                    <option value="2">⚠️ Đi muộn</option>
                                    <option value="3">⏳ Về sớm</option>
                                    <option value="6">❌ Đi muộn & Về sớm</option>
                                    <option value="8">➖ Chưa có lịch</option>
                                    <option value="10">❓ Không chấm vào</option>
                                    <option value="11">❓ Không chấm ra</option>
                                </optgroup>
                                <optgroup label="🏖️ NGHỈ CHẾ ĐỘ">
                                    <option value="4">📅 Nghỉ phép có lương</option>
                                    <option value="12">🏖️ Nghỉ chế độ</option>
                                    <option value="15">🔄 Nghỉ bù</option>
                                    <option value="16">👶 Thai sản</option>
                                    <option value="17">⚫ Nghỉ ma chay</option>
                                    <option value="18">💍 Nghỉ con kết hôn</option>
                                    <option value="19">💒 Nghỉ kết hôn</option>
                                    <option value="21">🤒 Nghỉ ốm</option>
                                    <option value="22">👨‍👩‍👧 Nghỉ con ốm</option>
                                </optgroup>
                                <optgroup label="⏸️ NGHỈ KHÔNG LƯƠNG">
                                    <option value="5">📅 Nghỉ không lương</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    {/* BẢNG DỮ LIỆU (Chỉ khóa chiều cao, sinh scrollbar trên Desktop) */}
                    <div className="hrm-card flex flex-col md:flex-1 md:min-h-0 md:overflow-hidden">
                        <div className="md:flex-shrink-0 px-5 py-4 border-b border-border flex justify-between items-center bg-card">
                            <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">
                                Lịch sử chấm công <span className="text-[10px] text-muted-foreground font-bold ml-1">(Hôm nay)</span>
                            </h3>
                            <button onClick={() => router.push('/attendance')} className="text-foreground text-[11px] font-bold uppercase tracking-widest hover:underline flex items-center gap-1">
                                <LayoutDashboard size={14} /> Nhật ký đầy đủ
                            </button>
                        </div>

                        <div className="md:flex-shrink-0 bg-muted px-5 py-2.5 text-[11px] font-medium text-muted-foreground border-b border-border flex items-center gap-2">
                            <span className="bg-background text-foreground font-bold px-2 py-0.5 rounded border border-border shadow-sm">Double-click</span>
                            vào một dòng/thẻ để mở chi tiết nhân viên.
                        </div>

                        {/* NỘI DUNG BẢNG */}
                        <div className="md:flex-1 md:overflow-y-auto md:min-h-0 custom-scrollbar relative">
                            {currentData.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground font-medium flex flex-col items-center gap-2">
                                    <Search className="w-8 h-8 opacity-20" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">Chưa có dữ liệu phù hợp</span>
                                </div>
                            ) : (
                                <>
                                    {/* --- MOBILE VIEW --- */}
                                    <div className="md:hidden flex flex-col bg-card">
                                        {currentData.map((row, idx) => {
                                            const ui = getStatusUI(row)
                                            const cin = row.checkin_time ? row.checkin_time.split('.')[0] : "---"
                                            const cout = row.checkout_time ? row.checkout_time.split('.')[0] : "---"

                                            return (
                                                <div
                                                    key={idx}
                                                    onDoubleClick={() => handleRowDoubleClick(row)}
                                                    className="p-4 border-b border-border last:border-0 hover:bg-accent hover:text-accent-foreground transition-colors flex flex-col gap-3 cursor-pointer select-none"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <strong className="text-foreground text-[12px] block">{row.full_name || "---"}</strong>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mã: {row.username || "---"}</span>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-foreground bg-secondary px-2 py-1 rounded-md border border-border">{ui.dateStr}</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ca làm việc</p>
                                                            <span className="text-[12px] font-bold text-foreground">{row.shift_display_name || row.shift_code || "---"}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Giờ Vào/Ra</p>
                                                            <span className="text-[12px] font-medium text-muted-foreground font-mono bg-background border border-border px-1.5 py-0.5 rounded">{cin}</span>
                                                            <span className="mx-1 text-muted-foreground">-</span>
                                                            <span className="text-[12px] font-medium text-muted-foreground font-mono bg-background border border-border px-1.5 py-0.5 rounded">{cout}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Trạng thái</p>
                                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide inline-block border ${ui.statusClass}`}>
                                                                {ui.status}
                                                            </span>
                                                            {ui.lateText && <span className="block text-[10px] font-bold text-muted-foreground mt-1">{ui.lateText}</span>}
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Giải trình</p>
                                                            <span className={`text-[12px] ${ui.expClass}`}>{ui.expText}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* --- DESKTOP VIEW (Fix Lỗi Rách Viền - Dùng after:bg-border vẽ line dưới) --- */}
                                    <div className="hidden md:block w-full bg-card">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 z-[30] bg-muted">
                                                <tr>
                                                    {["NGÀY", "NHÂN VIÊN", "CA LÀM VIỆC", "GIỜ VÀO / RA", "TRẠNG THÁI", "GIẢI TRÌNH"].map((h, i) => (
                                                        <th key={i} className="relative py-3 px-5 text-[9px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-border">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentData.map((row, idx) => {
                                                    const ui = getStatusUI(row)
                                                    const cin = row.checkin_time ? row.checkin_time.split('.')[0] : "---"
                                                    const cout = row.checkout_time ? row.checkout_time.split('.')[0] : "---"

                                                    return (
                                                        <tr
                                                            key={idx}
                                                            onDoubleClick={() => handleRowDoubleClick(row)}
                                                            className="hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group select-none border-b border-border"
                                                        >
                                                            <td className="py-3 px-5 whitespace-nowrap text-[12px] font-bold text-foreground">{ui.dateStr}</td>
                                                            <td className="py-3 px-5 whitespace-nowrap">
                                                                <strong className="text-foreground text-[12px] block">{row.full_name || "---"}</strong>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mã: {row.username || "---"}</span>
                                                            </td>
                                                            <td className="py-3 px-5 whitespace-nowrap">
                                                                <span className="text-[11px] font-bold text-foreground">{row.shift_display_name || row.shift_code || "---"}</span>
                                                            </td>
                                                            <td className="py-3 px-5 whitespace-nowrap">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">Vào: {cin}</span>
                                                                        {row.checkin_image_path && (
                                                                            <img
                                                                                src={getImageUrl(row.checkin_image_path)}
                                                                                alt="Vào"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setImageModal({ isOpen: true, src: getImageUrl(row.checkin_image_path), title: `Ảnh vào: ${row.full_name}` });
                                                                                }}
                                                                                className="w-8 h-8 rounded-md object-cover cursor-pointer border border-border hover:scale-150 transition-transform relative hover:z-20 shadow-sm shrink-0 bg-muted"
                                                                            />
                                                                        )}

                                                                        {/* ẢNH CHECK-OUT (Thay tương tự cho phần Ra) */}
                                                                        {row.checkout_image_path && (
                                                                            <img
                                                                                src={getImageUrl(row.checkout_image_path)}
                                                                                alt="Ra"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setImageModal({ isOpen: true, src: getImageUrl(row.checkout_image_path), title: `Ảnh ra: ${row.full_name}` });
                                                                                }}
                                                                                className="w-8 h-8 rounded-md object-cover cursor-pointer border border-border hover:scale-150 transition-transform relative hover:z-20 shadow-sm shrink-0 bg-muted"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">Ra: {cout}</span>
                                                                        {row.checkout_image_path && (
                                                                            <button onClick={(e) => { e.stopPropagation(); setImageModal({ isOpen: true, src: getImageUrl(row.checkout_image_path), title: `Ảnh ra: ${row.full_name}` }) }} className="text-muted-foreground hover:text-primary transition-colors">
                                                                                <ImageIcon className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-5 whitespace-nowrap flex flex-col items-start gap-1">
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide inline-block border ${ui.statusClass}`}>
                                                                    {ui.status}
                                                                </span>
                                                                {ui.lateText && <span className="text-[10px] text-muted-foreground font-bold">{ui.lateText}</span>}
                                                            </td>
                                                            <td className="py-3 px-5 whitespace-nowrap">
                                                                <span className={`text-[12px] ${ui.expClass}`}>{ui.expText}</span>
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

                        {/* PAGINATION */}
                        <div className="md:flex-shrink-0 flex justify-between items-center p-4 bg-card border-t border-border">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-4 py-2 bg-background border border-border rounded-lg text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ❮ Trước
                            </button>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Trang {currentPage} / {totalPages}</span>
                            <button
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-4 py-2 bg-background border border-border rounded-lg text-[11px] font-bold uppercase tracking-widest text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau ❯
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* IMAGE MODAL (SỬ DỤNG PORTAL ĐỂ THOÁT KHỎI Z-INDEX TRAP) */}
            {imageModal.isOpen && isMounted && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-foreground/90 backdrop-blur-sm animate-in fade-in p-4"
                    onClick={() => setImageModal({ isOpen: false, src: "", title: "" })}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div
                        className="relative max-w-3xl w-full flex flex-col items-center animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setImageModal({ isOpen: false, src: "", title: "" })}
                            className="absolute -top-12 right-0 lg:-right-12 bg-destructive hover:bg-destructive/90 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={imageModal.src}
                            alt={imageModal.title}
                            className="w-auto max-h-[85vh] rounded-xl border-4 border-background shadow-2xl object-contain bg-muted"
                        />
                        <p className="mt-4 text-background font-bold text-lg drop-shadow-md">
                            {imageModal.title}
                        </p>
                    </div>
                </div>,
                document.body // <--- Dịch chuyển thẳng ra thẻ body
            )}
        </div>
    )
}