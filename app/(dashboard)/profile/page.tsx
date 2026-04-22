"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-client";
import {
    User, Phone, Mail, Calendar, Building, FileText,
    Key, Eye, EyeOff, Save, ShieldCheck,
    CheckCircle2, AlertCircle, Briefcase, Camera
} from "lucide-react";

export default function ProfilePage() {
    // --- States Dữ liệu ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPw, setIsChangingPw] = useState(false);

    const [profile, setProfile] = useState<any>({
        username: "", full_name: "", phone: "", email: "",
        date_of_birth: "", notes: "", ccCaNhan: 0, ccTapTrung: 0,
        ten_don_vi: "", ten_phong_ban: "", role: "user"
    });

    const [passwords, setPasswords] = useState({
        current: "", new: "", confirm: ""
    });
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

    const [profileAlert, setProfileAlert] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [pwAlert, setPwAlert] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // --- Khởi tạo dữ liệu ---
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('hrm_token');
            if (!token) { window.location.href = '/login'; return; }

            const res = await fetch(`${API_BASE_URL}/api/employees/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) { window.location.href = '/login'; return; }
            if (res.ok) {
                const json = await res.json();
                const data = json.data || json;
                setProfile({
                    ...data,
                    date_of_birth: data.date_of_birth || data.dob || ""
                });
            }
        } catch (e) {
            console.error("Lỗi tải profile:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Xử lý Lưu Profile ---
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setProfileAlert(null);

        const payload = {
            full_name: profile.full_name,
            phone: profile.phone,
            email: profile.email,
            dob: profile.date_of_birth || null,
            date_of_birth: profile.date_of_birth || null,
            notes: profile.notes,
            ccCaNhan: profile.ccCaNhan ? 1 : 0,
            ccTapTrung: profile.ccTapTrung ? 1 : 0
        };

        try {
            const token = localStorage.getItem('hrm_token');
            const res = await fetch(`${API_BASE_URL}/api/employees/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setProfileAlert({ type: 'success', msg: 'Cập nhật thông tin thành công!' });
            } else {
                const err = await res.json();
                setProfileAlert({ type: 'error', msg: err.detail || 'Không thể lưu thay đổi.' });
            }
        } catch (err) {
            setProfileAlert({ type: 'error', msg: 'Lỗi kết nối máy chủ!' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setProfileAlert(null), 4000);
        }
    };

    // --- Xử lý Đổi Mật Khẩu ---
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwAlert(null);

        if (passwords.new !== passwords.confirm) {
            setPwAlert({ type: 'error', msg: 'Mật khẩu mới và xác nhận không khớp!' });
            return;
        }

        if (passwords.new.toLowerCase().includes(profile.username.toLowerCase())) {
            setPwAlert({ type: 'error', msg: 'Mật khẩu không được chứa tên đăng nhập!' });
            return;
        }

        setIsChangingPw(true);
        try {
            const token = localStorage.getItem('hrm_token');
            const res = await fetch(`${API_BASE_URL}/api/employees/${profile.username}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ new_password: passwords.new })
            });

            if (res.ok) {
                setPwAlert({ type: 'success', msg: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
                setPasswords({ current: "", new: "", confirm: "" });
            } else {
                const err = await res.json();
                setPwAlert({ type: 'error', msg: err.detail || 'Không thể đổi mật khẩu.' });
            }
        } catch (err) {
            setPwAlert({ type: 'error', msg: 'Lỗi kết nối máy chủ!' });
        } finally {
            setIsChangingPw(false);
            setTimeout(() => setPwAlert(null), 5000);
        }
    };

    // --- Helpers ---
    const getInitials = (name: string) => {
        if (!name) return "?";
        // Theo yêu cầu từ hệ thống (sửa lỗi logic avatar): lấy chữ cái đầu của tên thật
        const words = name.trim().split(" ");
        return words[words.length - 1][0].toUpperCase();
    };

    const roleConfig: any = {
        admin: { label: 'Quản trị viên', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
        manager: { label: 'Quản lý', cls: 'bg-primary/10 text-primary border-primary/20' },
        user: { label: 'Nhân viên', cls: 'bg-secondary text-secondary-foreground border-border' }
    };
    const currentRole = roleConfig[profile.role] || roleConfig.user;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
                <div className="flex flex-col items-center gap-2">
                    <User size={32} className="opacity-20" />
                    <span className="text-sm font-bold uppercase tracking-widest">Đang tải hồ sơ...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 text-foreground pb-10">

            {/* ======================================= */}
            {/* CỘT TRÁI (1/3) - OVERVIEW & SECURITY */}
            {/* ======================================= */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">

                {/* 1. CARD AVATAR HERO (Chuẩn Theme) */}
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
                    {/* Bỏ dải gradient màu mè, thay bằng dải màu nền nhạt của theme */}
                    <div className="h-24 bg-muted/50 absolute top-0 left-0 right-0 border-b border-border"></div>

                    <div className="pt-12 pb-6 px-6 flex flex-col items-center relative z-10">
                        <div className="w-24 h-24 rounded-full bg-card p-1.5 shadow-sm mb-3 relative group cursor-pointer border border-border">
                            {/* Dùng bg-primary chuẩn */}
                            <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-black tracking-tighter">
                                {getInitials(profile.full_name || profile.username)}
                            </div>
                            <div className="absolute inset-1.5 rounded-full bg-foreground/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                <Camera className="text-background w-6 h-6" />
                            </div>
                        </div>

                        <h2 className="text-[16px] font-black text-foreground text-center mb-0.5">{profile.full_name || 'Chưa cập nhật tên'}</h2>
                        <span className="text-[12px] font-bold text-muted-foreground mb-3">@{profile.username}</span>

                        <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${currentRole.cls}`}>
                            {currentRole.label}
                        </span>
                    </div>

                    <div className="border-t border-border bg-muted/20 px-6 py-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-medium">
                            <Briefcase size={14} className="text-primary" />
                            <span className="truncate flex-1" title={profile.ten_don_vi}>{profile.ten_don_vi || 'Chưa cập nhật Đơn vị'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-medium">
                            <Building size={14} className="text-primary" />
                            <span className="truncate flex-1" title={profile.ten_phong_ban}>{profile.ten_phong_ban || 'Chưa cập nhật Phòng ban'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. CARD ĐỔI MẬT KHẨU */}
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center gap-2 bg-muted/30">
                        <ShieldCheck size={18} className="text-primary" />
                        <h3 className="text-[12px] font-black uppercase tracking-widest m-0">Bảo mật tài khoản</h3>
                    </div>

                    <form onSubmit={handleChangePassword} className="p-5 flex flex-col gap-4">
                        {[
                            { id: 'current', label: 'Mật khẩu hiện tại', placeholder: 'Nhập mật khẩu hiện tại' },
                            { id: 'new', label: 'Mật khẩu mới', placeholder: 'Tối thiểu 6 ký tự' },
                            { id: 'confirm', label: 'Xác nhận mật khẩu mới', placeholder: 'Nhập lại mật khẩu mới' }
                        ].map((field) => (
                            <div key={field.id}>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">{field.label}</label>
                                <div className="relative">
                                    <input
                                        type={showPw[field.id as keyof typeof showPw] ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={passwords[field.id as keyof typeof passwords]}
                                        onChange={(e) => setPasswords({ ...passwords, [field.id]: e.target.value })}
                                        placeholder={field.placeholder}
                                        className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] w-full pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw({ ...showPw, [field.id]: !showPw[field.id as keyof typeof showPw] })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPw[field.id as keyof typeof showPw] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div className="bg-muted/30 border border-border text-muted-foreground p-3 rounded-lg text-[11px] leading-relaxed">
                            <strong className="text-foreground">Yêu cầu mật khẩu:</strong>
                            <ul className="list-disc pl-4 mt-1">
                                <li>Tối thiểu 6 ký tự</li>
                                <li>Không chứa tên đăng nhập</li>
                            </ul>
                        </div>

                        {/* Nút lưu chuẩn bg-primary thay vì màu tím */}
                        <button type="submit" disabled={isChangingPw} className="w-full h-10 mt-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {isChangingPw ? "Đang xử lý..." : <><Key size={14} /> Đổi mật khẩu</>}
                        </button>

                        {pwAlert && (
                            <div className={`p-3 mt-2 rounded-lg text-[11px] font-bold flex items-start gap-2 ${pwAlert.type === 'success' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                {pwAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {pwAlert.msg}
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* ======================================= */}
            {/* CỘT PHẢI (2/3) - GENERAL INFO FORM */}
            {/* ======================================= */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">

                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex-1">
                    <div className="px-6 py-5 border-b border-border flex items-center gap-2 bg-muted/30">
                        <User size={18} className="text-primary" />
                        <h3 className="text-[13px] font-black uppercase tracking-widest m-0">Hồ Sơ Của Bạn</h3>
                    </div>

                    <form onSubmit={handleSaveProfile} className="p-6 flex flex-col gap-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Họ và Tên *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input type="text" required value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="hrm-input h-10 pl-9 pr-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-bold w-full" placeholder="Nhập họ và tên..." />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ngày Sinh</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input type="date" value={profile.date_of_birth} onChange={e => setProfile({ ...profile, date_of_birth: e.target.value })} className="hrm-input h-10 pl-9 pr-3 bg-background text-foreground rounded-lg border border-border text-[13px] w-full" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Số Điện Thoại</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="hrm-input h-10 pl-9 pr-3 bg-background text-foreground rounded-lg border border-border text-[13px] w-full" placeholder="09xx xxx xxx" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Địa chỉ Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} className="hrm-input h-10 pl-9 pr-3 bg-background text-foreground rounded-lg border border-border text-[13px] w-full" placeholder="example@email.com" />
                                </div>
                            </div>
                        </div>

                        <hr className="border-border my-1" />

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Tiểu sử / Ghi chú bản thân</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <textarea rows={4} value={profile.notes} onChange={e => setProfile({ ...profile, notes: e.target.value })} className="hrm-input p-3 pl-9 bg-background text-foreground rounded-lg border border-border text-[13px] w-full resize-none" placeholder="Giới thiệu ngắn gọn về bản thân hoặc ghi chú cá nhân..." />
                            </div>
                        </div>

                        {/* Toggle switches đã được chuyển sang dùng bg-muted và bg-primary */}
                        <div className="bg-muted/20 border border-border p-5 rounded-xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                            <div>
                                <h4 className="text-[13px] font-bold text-foreground mb-1 flex items-center gap-2">🔍 Cấu hình chấm công</h4>
                                <p className="text-[11px] text-muted-foreground">Bật tắt các tùy chọn thu thập dữ liệu sinh trắc học cá nhân.</p>
                            </div>

                            <div className="flex flex-col gap-4 min-w-[200px] w-full md:w-auto">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-[12px] font-bold text-foreground group-hover:text-primary transition-colors">Chấm công Cá nhân</span>
                                    <div className="relative inline-flex items-center">
                                        <input type="checkbox" className="sr-only peer" checked={profile.ccCaNhan === 1} onChange={e => setProfile({ ...profile, ccCaNhan: e.target.checked ? 1 : 0 })} />
                                        <div className="w-11 h-6 bg-muted border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:border-primary"></div>
                                    </div>
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-[12px] font-bold text-foreground group-hover:text-primary transition-colors">Chấm công Tập trung</span>
                                    <div className="relative inline-flex items-center">
                                        <input type="checkbox" className="sr-only peer" checked={profile.ccTapTrung === 1} onChange={e => setProfile({ ...profile, ccTapTrung: e.target.checked ? 1 : 0 })} />
                                        <div className="w-11 h-6 bg-muted border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:border-primary"></div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                            <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-8 h-11 bg-primary hover:opacity-90 text-primary-foreground rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
                                {isSaving ? "Đang lưu..." : <><Save size={16} /> Lưu Thay Đổi</>}
                            </button>

                            {profileAlert && (
                                <div className={`flex-1 p-3 rounded-lg text-[11px] font-bold flex items-center gap-2 ${profileAlert.type === 'success' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {profileAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    {profileAlert.msg}
                                </div>
                            )}
                        </div>

                    </form>
                </div>
            </div>

        </div>
    );
}