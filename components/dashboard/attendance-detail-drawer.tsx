"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL, getImageUrl } from "@/lib/api-client";
import {
    X, AlertTriangle, CheckCircle2, XCircle, Camera, MapPin,
    Monitor, Clock, ChevronLeft, ChevronRight, Shield, ShieldOff,
    ShieldAlert, User, CalendarDays, Loader2, ScanFace, ImageOff
} from "lucide-react";

// ==========================================
// TYPES
// ==========================================
interface AttendanceScan {
    id: number;
    username: string;
    full_name: string;
    date: string;
    scan_time: string;
    image_path?: string;
    confidence?: number | string;
    attendance_type: string;
    client_ip?: string;
    latitude?: number;
    longitude?: number;
    is_fraud: boolean;
    fraud_note?: string;
    late_minutes?: number;
    explanation_status?: string;
    explanation_reason?: string;
}

interface DetailStats {
    total: number;
    valid: number;
    fraud: number;
    avgConf: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    date: string;
    fullName: string;
    currentUserRole: string;
    currentUsername: string;
}

// ==========================================
// COMPONENT
// ==========================================
export default function AttendanceDetailDrawer({
    isOpen, onClose, username, date, fullName, currentUserRole, currentUsername
}: Props) {

    const [data, setData] = useState<AttendanceScan[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState<DetailStats>({ total: 0, valid: 0, fraud: 0, avgConf: "--" });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit] = useState(10);

    const [imgPreview, setImgPreview] = useState({ isOpen: false, src: "", title: "" });
    const [fraudModal, setFraudModal] = useState({ isOpen: false, id: 0, note: "" });
    const [isSubmittingFraud, setIsSubmittingFraud] = useState(false);

    // ==========================================
    // FETCH
    // ==========================================
    const fetchDetail = useCallback(async (p = 1) => {
        if (!username || !date) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem("hrm_token");
            const params = new URLSearchParams({
                page: String(p),
                limit: String(limit),
                emp_keyword: username,
                start_date: date,
                end_date: date,
                status: "all"
            });

            const res = await fetch(`${API_BASE_URL}/api/attendance?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Lỗi tải dữ liệu");

            const json = await res.json();
            const items: AttendanceScan[] = json.data || json || [];

            setData(items);
            setTotalPages(json.total_pages || 1);
            setTotalItems(json.total || items.length);
            setPage(p);

            let valid = 0, fraud = 0, confSum = 0, confCount = 0;
            items.forEach(i => {
                if (i.is_fraud) fraud++; else valid++;
                const c = parseFloat(String(i.confidence || 0));
                if (c > 0) { confSum += c; confCount++; }
            });
            setStats({
                total: json.total || items.length,
                valid,
                fraud,
                avgConf: confCount > 0 ? confSum.toFixed(1) + "%" : "--"
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [username, date, limit]);

    useEffect(() => {
        if (isOpen && username && date) {
            setPage(1);
            fetchDetail(1);
        }
    }, [isOpen, username, date, fetchDetail]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // ==========================================
    // FRAUD HANDLER
    // ==========================================
    const handleFraudSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm("Xác nhận đánh dấu gian lận?")) return;
        setIsSubmittingFraud(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/mark_fraud`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("hrm_token")}`
                },
                body: JSON.stringify({
                    id: fraudModal.id,
                    is_fraud: true,
                    fraud_note: fraudModal.note,
                    role: currentUserRole
                })
            });
            if (res.ok) {
                setFraudModal({ isOpen: false, id: 0, note: "" });
                fetchDetail(page);
            } else {
                const err = await res.json();
                alert("Lỗi: " + (err.detail || "Không thể lưu"));
            }
        } catch { alert("Lỗi kết nối!"); }
        finally { setIsSubmittingFraud(false); }
    };

    const handleRemoveFraud = async (id: number) => {
        if (!confirm("Gỡ bỏ cờ gian lận?")) return;
        try {
            await fetch(`${API_BASE_URL}/api/attendance/mark_fraud`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("hrm_token")}`
                },
                body: JSON.stringify({ id, is_fraud: false, fraud_note: "", role: currentUserRole })
            });
            fetchDetail(page);
        } catch { alert("Lỗi kết nối!"); }
    };

    const fmtDate = (d: string) => d ? d.split("-").reverse().join("/") : "---";

    const getConfClass = (conf: number) => {
        if (conf >= 80) return "text-green-600 bg-green-500/10 border-green-500/20";
        if (conf >= 60) return "text-amber-600 bg-amber-500/10 border-amber-500/20";
        return "text-red-600 bg-red-500/10 border-red-500/20";
    };

    const getTypeColor = (type: string) => {
        if (type?.toLowerCase().includes("in") || type?.toLowerCase().includes("vào"))
            return "text-green-600 bg-green-500/10 border-green-500/20";
        return "text-red-600 bg-red-500/10 border-red-500/20";
    };

    return (
        <>
            {/* === OVERLAY === */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998] transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* === DRAWER === */}
            <div className={`fixed top-0 right-0 bottom-0 w-full max-w-[800px] bg-card md:border-l border-border shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col pt-[80px] ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

                {/* ── HEADER ── */}
                <div className="flex-shrink-0 flex items-center justify-between px-5 pb-5 bg-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <ScanFace className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-black uppercase tracking-widest text-foreground m-0">Chi Tiết Lịch Sử Quét</h3>
                            <p className="text-[11px] text-muted-foreground font-bold mt-0.5">{fullName} ({username})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm">
                        <X size={16} />
                    </button>
                </div>

                {/* ── NỘI DUNG CUỘN ── */}
                <div className="flex-1 overflow-y-auto px-5 custom-scrollbar flex flex-col gap-4">
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 border border-border p-4 rounded-2xl shadow-sm">
                        {[
                            { label: "Tổng quét", value: stats.total, color: "text-blue-500" },
                            { label: "Hợp lệ", value: stats.valid, color: "text-green-500" },
                            { label: "Gian lận", value: stats.fraud, color: "text-red-500" },
                            { label: "Chính xác TB", value: stats.avgConf, color: "text-indigo-500" },
                        ].map((s, i) => (
                            <div key={i} className="flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 leading-tight">{s.label}</span>
                                <span className={`text-xl font-black leading-none ${s.color}`}>{s.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Bảng Dữ liệu */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                            <ScanFace className="w-12 h-12 opacity-10" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Không có dữ liệu quét</span>
                        </div>
                    ) : (
                        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm mb-2">
                            {/* MOBILE VIEW */}
                            <div className="md:hidden flex flex-col gap-3 p-3 bg-muted/10">
                                {data.map((item) => {
                                    const conf = parseFloat(String(item.confidence || 0));
                                    return (
                                        <div key={item.id} className={`bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden ${item.is_fraud ? "border-red-300 dark:border-red-800" : "border-border"}`}>
                                            {item.is_fraud && <div className="absolute top-0 left-0 right-0 h-0.5 bg-destructive" />}

                                            <div className="flex items-start gap-3 mb-3">
                                                <div
                                                    className="w-14 h-14 rounded-lg border border-border overflow-hidden bg-muted shrink-0 cursor-pointer hover:ring-2 ring-primary transition-all"
                                                    onClick={() => item.image_path && setImgPreview({ isOpen: true, src: getImageUrl(item.image_path), title: item.full_name })}
                                                >
                                                    {item.image_path ? (
                                                        <img src={getImageUrl(item.image_path)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground/40" /></div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${getTypeColor(item.attendance_type)}`}>
                                                            {item.attendance_type}
                                                        </span>
                                                        {item.is_fraud
                                                            ? <span className="px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-600 border-red-500/20">🚨 Gian lận</span>
                                                            : <span className="px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 border-green-500/20">✔ Hợp lệ</span>
                                                        }
                                                    </div>
                                                    <p className="font-mono text-base font-black text-foreground">{item.scan_time}</p>
                                                    {conf > 0 && (
                                                        <span className={`inline-block mt-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${getConfClass(conf)}`}>
                                                            🎯 {conf.toFixed(1)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mb-3">
                                                {item.client_ip && <span className="flex items-center gap-1"><Monitor size={10} /> {item.client_ip}</span>}
                                                {item.latitude && item.longitude && (
                                                    <a href={`http://maps.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer"
                                                        className="flex items-center gap-1 text-primary hover:underline">
                                                        <MapPin size={10} /> Bản đồ
                                                    </a>
                                                )}
                                            </div>

                                            {(currentUserRole === "admin" || currentUserRole === "manager") && (
                                                <div className="flex gap-2">
                                                    {!item.is_fraud ? (
                                                        <button
                                                            onClick={() => setFraudModal({ isOpen: true, id: item.id, note: "" })}
                                                            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-red-300 dark:border-red-800 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <ShieldAlert size={11} /> Cảnh báo
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRemoveFraud(item.id)}
                                                            className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-green-300 dark:border-green-800 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <ShieldOff size={11} /> Gỡ cờ
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* DESKTOP VIEW */}
                            <div className="hidden md:block w-full overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-muted">
                                        <tr>
                                            {["ẢNH", "GIỜ QUÉT", "LOẠI", "ĐỘ CHÍNH XÁC", "THIẾT BỊ / VỊ TRÍ", "TRẠNG THÁI", "HÀNH ĐỘNG"].map((h, i) => (
                                                <th key={i} className="py-3 px-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item) => {
                                            const conf = parseFloat(String(item.confidence || 0));
                                            return (
                                                <tr key={item.id} className={`border-b border-border transition-colors ${item.is_fraud ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-accent/30"}`}>
                                                    <td className="py-3 px-3">
                                                        <div
                                                            className="w-10 h-10 rounded-lg border border-border overflow-hidden bg-muted cursor-pointer hover:ring-2 ring-primary transition-all shrink-0"
                                                            onClick={() => item.image_path && setImgPreview({ isOpen: true, src: getImageUrl(item.image_path), title: item.full_name })}
                                                        >
                                                            {item.image_path ? (
                                                                <img src={getImageUrl(item.image_path)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-4 h-4 text-muted-foreground/40" /></div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 whitespace-nowrap">
                                                        <span className="font-mono text-[13px] font-black text-foreground">{item.scan_time}</span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${getTypeColor(item.attendance_type)}`}>
                                                            {item.attendance_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 whitespace-nowrap">
                                                        {conf > 0 ? (
                                                            <span className={`px-2 py-1 rounded border font-mono text-[11px] font-black ${getConfClass(conf)}`}>
                                                                🎯 {conf.toFixed(1)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[11px]">---</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 min-w-[130px]">
                                                        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                                                            {item.client_ip && (
                                                                <span className="flex items-center gap-1.5"><Monitor size={11} className="shrink-0" /> {item.client_ip}</span>
                                                            )}
                                                            {item.latitude && item.longitude ? (
                                                                <a href={`http://maps.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer"
                                                                    className="flex items-center gap-1.5 text-primary hover:underline font-semibold">
                                                                    <MapPin size={11} className="shrink-0" /> Xem bản đồ
                                                                </a>
                                                            ) : (
                                                                <span className="flex items-center gap-1.5 opacity-40"><MapPin size={11} className="shrink-0" /> No GPS</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {item.is_fraud ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="px-2 py-1 rounded border text-[10px] font-black uppercase tracking-widest whitespace-nowrap bg-red-500/10 text-red-600 border-red-500/20 flex items-center gap-1 w-fit">
                                                                    <ShieldAlert size={11} /> Gian lận
                                                                </span>
                                                                {item.fraud_note && (
                                                                    <span className="text-[10px] text-red-500 italic max-w-[140px] truncate block">{item.fraud_note}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded border text-[10px] font-black uppercase tracking-widest whitespace-nowrap bg-green-500/10 text-green-600 border-green-500/20 flex items-center gap-1 w-fit">
                                                                <Shield size={11} /> Hợp lệ
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {(currentUserRole === "admin" || currentUserRole === "manager") && (
                                                            !item.is_fraud ? (
                                                                <button
                                                                    onClick={() => setFraudModal({ isOpen: true, id: item.id, note: "" })}
                                                                    className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border border-red-300 dark:border-red-800 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1"
                                                                >
                                                                    <ShieldAlert size={11} /> Cảnh báo
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleRemoveFraud(item.id)}
                                                                    className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border border-green-300 dark:border-green-800 bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-colors flex items-center gap-1"
                                                                >
                                                                    <ShieldOff size={11} /> Gỡ cờ
                                                                </button>
                                                            )
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── FOOTER TRONG SUỐT (Thêm padding bottom cho mobile) ── */}
                {/* Thay pb-[100px] thành pb-[75px] hoặc pb-20 */}
<div className="flex-shrink-0 px-5 pb-[75px] md:pb-6 bg-transparent flex flex-col gap-4 border-border pt-4 relative z-10">
                    {!isLoading && totalPages > 1 && (
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-1">
                                <button disabled={page === 1} onClick={() => fetchDetail(page - 1)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-40 transition-colors shadow-sm">
                                    <ChevronLeft size={15} />
                                </button>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mx-3">
                                    Trang {page} / {totalPages}
                                </span>
                                <button disabled={page === totalPages} onClick={() => fetchDetail(page + 1)} className="p-2 border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-40 transition-colors shadow-sm">
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                Tổng: <strong className="text-foreground">{totalItems}</strong>
                            </span>
                        </div>
                    )}
                    
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border shadow-sm">
                            ĐÓNG CỬA SỔ
                        </button>
                    </div>
                </div>

            </div>

            {/* ================================================ */}
            {/* MODALS */}
            {/* ================================================ */}
            {imgPreview.isOpen && (
                <div
                    className="fixed inset-0 bg-background/90 backdrop-blur-md z-[10000] flex items-center justify-center p-4"
                    onClick={() => setImgPreview({ isOpen: false, src: "", title: "" })}
                >
                    <div className="relative max-w-xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setImgPreview({ isOpen: false, src: "", title: "" })}
                            className="absolute -top-10 right-0 p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform shadow-lg"
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={imgPreview.src}
                            alt="Phóng to"
                            className="max-w-full max-h-[75vh] rounded-xl shadow-2xl border-4 border-background object-contain"
                        />
                        <p className="mt-3 text-foreground font-bold text-sm bg-background/60 px-4 py-1.5 rounded-full backdrop-blur-sm">
                            {imgPreview.title}
                        </p>
                    </div>
                </div>
            )}

            {fraudModal.isOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                    onClick={() => setFraudModal({ isOpen: false, id: 0, note: "" })}
                >
                    <div
                        className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border-t-4 border-t-destructive animate-in slide-in-from-bottom-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 text-destructive mb-2">
                            <AlertTriangle size={22} />
                            <h3 className="text-[14px] font-black uppercase tracking-widest m-0">Báo cáo Gian Lận</h3>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mb-4">
                            Đánh dấu lần quét này có dấu hiệu gian lận. Vui lòng ghi chú lý do.
                        </p>
                        <form onSubmit={handleFraudSubmit} className="flex flex-col gap-4">
                            <textarea
                                required rows={3}
                                value={fraudModal.note}
                                onChange={e => setFraudModal({ ...fraudModal, note: e.target.value })}
                                className="w-full p-3 bg-background text-foreground rounded-lg border border-border text-[13px] resize-y focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                placeholder="VD: Khuôn mặt không khớp, ảnh chụp lại..."
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFraudModal({ isOpen: false, id: 0, note: "" })}
                                    className="flex-1 py-2.5 rounded-lg bg-secondary text-foreground text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-colors border border-border"
                                >
                                    Hủy Bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingFraud}
                                    className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-colors shadow-md disabled:opacity-60"
                                >
                                    {isSubmittingFraud ? "Đang xử lý..." : "Xác nhận"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}