"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api-client";
import {
    Users, Search, Plus, FileDown, FileUp, FileSpreadsheet,
    MoreVertical, Edit2, Trash2, Key, Lock, Unlock, Camera,
    X, Save, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================
interface Department {
    id: number;
    unit_code: string;
    unit_name: string;
}

interface EmployeeDept {
    id: string;
    department_id: string;
    role: string;
    is_primary: number;
}

// ==========================================
// 2. MAIN COMPONENT
// ==========================================
export default function EmployeesPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const faceInputRef = useRef<HTMLInputElement>(null);

    // --- States Dữ liệu ---
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- States Phân trang & Lọc ---
    const [keyword, setKeyword] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // --- States UI (Menu Thông Minh) ---
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
    const [uploadFaceUserId, setUploadFaceUserId] = useState("");

    // --- States Drawer (Form) ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const initialFormState = {
        username: "", full_name: "", date_of_birth: "", phone: "",
        status: "active", is_locked: 0, password: "123456",
        ccCaNhan: 1, ccTapTrung: 0, checkViTri: 1, checkMang: 1,
        departments: [{ id: Date.now().toString(), department_id: "", role: "user", is_primary: 1 }] as EmployeeDept[]
    };
    const [formData, setFormData] = useState<typeof initialFormState>(initialFormState);

    // ==========================================
    // 3. FETCH DATA API
    // ==========================================
    const fetchDepartments = useCallback(async () => {
        const token = localStorage.getItem("hrm_token");
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/departments`, { headers: { "Authorization": `Bearer ${token}` } });
            if (res.ok) setDepartments(await res.json());
        } catch (e) { console.error(e); }
    }, []);

    const fetchEmployees = useCallback(async () => {
        const token = localStorage.getItem("hrm_token");
        if (!token) { router.push("/login"); return; }

        setIsLoading(true);
        let url = `${API_BASE_URL}/api/employees?page=${page}&size=${pageSize}`;
        if (keyword) url += `&search=${encodeURIComponent(keyword)}`;
        if (deptFilter) url += `&department_id=${deptFilter}`;

        try {
            const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.items || data);
                if (data.items) {
                    setTotalPages(data.total_pages);
                    setTotalItems(data.total);
                }
            }
        } catch (error) {
            console.error("Lỗi tải nhân viên:", error);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, keyword, deptFilter, router]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => { fetchEmployees(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [fetchEmployees]);

    // ==========================================
    // 4. FORM HANDLERS (DRAWER)
    // ==========================================
    const handleAddNew = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setIsPanelOpen(true);
    };

    const handleEdit = (emp: any) => {
        setEditingId(emp.username);
        let parsedDepts: EmployeeDept[] = [];
        if (emp.department_id) {
            const deptIds = String(emp.department_id).split(',');
            const roles = emp.role ? String(emp.role).split(',') : [];
            parsedDepts = deptIds.map((id, index) => ({
                id: Date.now().toString() + index,
                department_id: id.trim(),
                role: roles[index] ? roles[index].trim() : (roles[0] || "user"),
                is_primary: index === 0 ? 1 : 0
            }));
        } else {
            parsedDepts = [{ id: Date.now().toString(), department_id: "", role: "user", is_primary: 1 }];
        }

        setFormData({
            username: emp.username,
            full_name: emp.full_name || "",
            date_of_birth: emp.date_of_birth || "",
            phone: emp.phone || "",
            status: emp.status || "active",
            is_locked: emp.is_locked || 0,
            password: "",
            ccCaNhan: emp.ccCaNhan ?? 1,
            ccTapTrung: emp.ccTapTrung ?? 0,
            checkViTri: emp.checkViTri ?? 1,
            checkMang: emp.checkMang ?? 1,
            departments: parsedDepts
        });
        setIsPanelOpen(true);
    };

    const handleClosePanel = () => {
        setIsPanelOpen(false);
        setTimeout(() => {
            setEditingId(null);
            setFormData(initialFormState);
        }, 300);
    };

    const addDeptRow = () => {
        setFormData(prev => ({
            ...prev,
            departments: [...prev.departments, { id: Date.now().toString(), department_id: "", role: "user", is_primary: prev.departments.length === 0 ? 1 : 0 }]
        }));
    };

    const removeDeptRow = (id: string) => {
        setFormData(prev => ({
            ...prev,
            departments: prev.departments.filter(d => d.id !== id)
        }));
    };

    const updateDeptRow = (id: string, field: keyof EmployeeDept, value: any) => {
        setFormData(prev => {
            let newDepts = [...prev.departments];
            if (field === 'is_primary' && value === 1) {
                newDepts = newDepts.map(d => ({ ...d, is_primary: 0 }));
            }
            return {
                ...prev,
                departments: newDepts.map(d => d.id === id ? { ...d, [field]: value } : d)
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("hrm_token");

        let finalDepts = [...formData.departments].filter(d => d.department_id);
        if (finalDepts.length > 0 && !finalDepts.some(d => d.is_primary === 1)) {
            finalDepts[0].is_primary = 1;
        }

        const payload = {
            username: formData.username.trim().toUpperCase(),
            full_name: formData.full_name.trim(),
            date_of_birth: formData.date_of_birth || null,
            phone: formData.phone.trim(),
            status: formData.status,
            is_locked: formData.is_locked,
            password: formData.password || "123456",
            ccCaNhan: formData.ccCaNhan,
            ccTapTrung: formData.ccTapTrung,
            checkViTri: formData.checkViTri,
            checkMang: formData.checkMang,
            departments: finalDepts.map(d => ({ department_id: parseInt(d.department_id), role: d.role, is_primary: d.is_primary }))
        };

        const url = editingId ? `${API_BASE_URL}/api/employees/${editingId}` : `${API_BASE_URL}/api/employees`;
        try {
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert(editingId ? "Cập nhật thành công!" : "Lưu thành công!");
                handleClosePanel();
                fetchEmployees();
            } else {
                const d = await res.json(); alert("Lỗi: " + d.detail);
            }
        } catch (err) { alert("Lỗi kết nối Server."); }
    };

    // ==========================================
    // 5. LỌT MENU THÔNG MINH (SMART PORTAL)
    // ==========================================
    const toggleAction = (e: React.MouseEvent, username: string) => {
        e.stopPropagation();
        if (activeDropdown === username) {
            setActiveDropdown(null);
        } else {
            const buttonRect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const menuHeight = 220; // Chiều cao ước tính của hộp Menu (5 nút)

            // Khởi tạo style chuẩn
            const styles: React.CSSProperties = {
                position: 'fixed',
                zIndex: 9999,
                left: buttonRect.left - 130, // Đẩy sang trái một chút để menu mọc gọn gàng
            };

            // Nếu không đủ chỗ ở dưới -> Mọc ngược lên trên
            if (spaceBelow < menuHeight) {
                styles.bottom = window.innerHeight - buttonRect.top + 8;
            } else {
                styles.top = buttonRect.bottom + 8;
            }

            setDropdownStyles(styles);
            setActiveDropdown(username);
        }
    };

    const handleAction = async (action: string, emp: any) => {
        setActiveDropdown(null); // Đóng menu ngay khi chọn
        const token = localStorage.getItem("hrm_token");
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        if (action === 'delete') {
            if (confirm(`⚠️ XÓA VĨNH VIỄN nhân viên [${emp.username}]?`)) {
                const res = await fetch(`${API_BASE_URL}/api/employees/${emp.username}`, { method: 'DELETE', headers });
                if (res.ok) {
                    await fetch(`${API_BASE_URL}/unregister`, { method: 'POST', headers, body: JSON.stringify({ user_id: emp.username }) });
                    fetchEmployees();
                } else alert("Lỗi khi xóa!");
            }
        }
        else if (action === 'password') {
            const newPwd = prompt(`Nhập mật khẩu mới cho [${emp.username}]:`);
            if (newPwd && newPwd.trim()) {
                const res = await fetch(`${API_BASE_URL}/api/employees/${emp.username}/password`, { method: 'PUT', headers, body: JSON.stringify({ new_password: newPwd.trim() }) });
                if (res.ok) alert(`Đổi mật khẩu thành công!`);
            }
        }
        else if (action === 'lock') {
            if (confirm(`Thay đổi trạng thái khóa của [${emp.username}]?`)) {
                const res = await fetch(`${API_BASE_URL}/api/employees/${emp.username}/toggle_lock`, { method: 'PUT', headers });
                if (res.ok) fetchEmployees();
            }
        }
    };

    const handleScrollTable = () => {
        if (activeDropdown) setActiveDropdown(null);
    };

    // --- Face AI ---
    const triggerFaceUpload = (username: string) => {
        setUploadFaceUserId(username);
        if (faceInputRef.current) faceInputRef.current.click();
    };

    const onFaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("hrm_token")}` },
                    body: JSON.stringify({ user_id: uploadFaceUserId, image_base64: reader.result, full_image_base64: reader.result })
                });
                const data = await res.json();
                if (data.status === 'success') { alert('Tải lên thành công!'); fetchEmployees(); }
                else alert('Lỗi nhận diện: ' + data.message);
            } catch (err) { alert('Lỗi kết nối AI'); }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const deleteFace = async (username: string) => {
        if (confirm(`Xóa ảnh AI của ${username}? Nhân viên sẽ phải chụp lại.`)) {
            await fetch(`${API_BASE_URL}/unregister`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("hrm_token")}` },
                body: JSON.stringify({ user_id: username })
            });
            fetchEmployees();
        }
    };

    // ==========================================
    // 6. EXCEL FUNCTIONS
    // ==========================================
    const handleExcelAction = async (action: 'export' | 'template') => {
        const url = action === 'export' ? `${API_BASE_URL}/api/employees/export` : `${API_BASE_URL}/api/employees/export_template`;
        const filename = action === 'export' ? 'DanhSachNhanSu.xlsx' : 'Mau_Nhap_Nhan_Su.xlsx';
        try {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem("hrm_token")}` } });
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl; a.download = filename;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(blobUrl);
        } catch (e) { alert(`Lỗi tải file ${filename}!`); }
    };

    const onImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const formData = new FormData();
        formData.append("file", e.target.files[0]);
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees/import`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem("hrm_token")}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) { alert(data.message); fetchEmployees(); }
            else alert("Lỗi: " + data.detail);
        } catch (err) { alert("Lỗi kết nối!"); }
        e.target.value = '';
    };

    const CustomToggle = ({ checked, readOnly = false, onChange }: { checked: boolean, readOnly?: boolean, onChange?: (v: boolean) => void }) => (
        <label className={`relative inline-flex items-center ${readOnly ? 'cursor-default opacity-80' : 'cursor-pointer'} ${readOnly ? 'scale-75 origin-left' : ''}`}>
            <input type="checkbox" className="sr-only peer" checked={checked} readOnly={readOnly} onChange={(e) => !readOnly && onChange && onChange(e.target.checked)} />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
        </label>
    );

    const getRoleBadge = (roleStr: string) => {
        if (!roleStr) return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-secondary text-secondary-foreground">Nhân viên</span>;
        if (roleStr.includes('admin')) return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Admin</span>;
        if (roleStr.includes('manager')) return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">Quản lý</span>;
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-secondary text-secondary-foreground border border-border">Nhân viên</span>;
    };

    const activeEmpData = activeDropdown ? employees.find(e => e.username === activeDropdown) : null;

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground pb-4">
            <input type="file" ref={faceInputRef} accept="image/jpeg, image/png" className="hidden" onChange={onFaceFileChange} />
            <input type="file" ref={fileInputRef} accept=".xlsx, .xls" className="hidden" onChange={onImportFileChange} />

            {/* HEADER TỔNG QUAN */}
            <div className="flex-none mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0">Quản Lý Nhân Sự</h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Danh sách & thông tin cán bộ nhân viên toàn viện</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button onClick={() => handleExcelAction('template')} className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground border border-border rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-all">
                        <FileDown size={14} /> Mẫu
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground border border-border rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-all">
                        <FileUp size={14} /> Nhập
                    </button>
                    <button onClick={() => handleExcelAction('export')} className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground border border-border rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-all">
                        <FileSpreadsheet size={14} /> Xuất
                    </button>
                    <button onClick={handleAddNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm">
                        <Plus size={16} /> Thêm NV
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT CONTAINER - Khoảng pb-[90px] giúp cuộn qua khỏi menu dưới của điện thoại */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar bg-background gap-4 pb-[90px] md:pb-0">
                {/* THANH TÌM KIẾM */}
                <div className="hrm-card p-4 border border-border bg-card shadow-sm shrink-0 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text" placeholder="Tìm tên hoặc mã nhân viên..."
                            value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }}
                            className="hrm-input w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-[12px] font-bold"
                        />
                    </div>
                    <select
                        value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                        className="hrm-input w-full sm:w-64 px-4 py-2.5 bg-background border border-border rounded-xl text-[12px] font-bold cursor-pointer"
                    >
                        <option value="">🏢 Tất cả phòng ban</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.unit_name}</option>)}
                    </select>
                </div>

                {/* TABLE CONTAINER */}
                <div className="flex-1 shrink-0 md:shrink flex flex-col min-h-[400px] md:min-h-0 md:hrm-card md:bg-card md:border md:border-border md:shadow-sm md:rounded-xl md:overflow-hidden relative">

                    {/* VÙNG DỮ LIỆU CUỘN */}
                    <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar relative w-full" onScroll={handleScrollTable}>
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground">
                                <Users className="w-10 h-10 mx-auto opacity-20 mb-3" />
                                <p className="text-[11px] font-bold uppercase tracking-widest">Không tìm thấy nhân viên nào.</p>
                            </div>
                        ) : (
                            <>
                                {/* MOBILE VIEW */}
                                <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                    {employees.map((emp) => (
                                        <div key={emp.username} className="bg-card border border-border rounded-xl p-4 shadow-sm relative">
                                            <div className="absolute top-3 right-3">
                                                <button onClick={(e) => toggleAction(e, emp.username)} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg border border-transparent hover:border-border transition-all">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>

                                            <div className="w-full flex flex-col">
                                                <div className="pr-10">
                                                    <h4 className="text-sm font-bold text-foreground mb-1">{emp.full_name}</h4>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">MÃ: {emp.username}</p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    {getRoleBadge(emp.role)}
                                                    {emp.is_locked === 1
                                                        ? <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-destructive/10 text-destructive border border-destructive/20">Đã khóa</span>
                                                        : <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">H.Động</span>}
                                                </div>
                                                <p className="text-[11px] text-muted-foreground font-medium mb-3">🏢 {emp.department_name || 'Chưa xếp phòng'}</p>

                                                <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2.5 rounded-lg border border-border w-full">
                                                    <div className="flex justify-between items-center"><span className="text-[9px] font-black text-muted-foreground uppercase">C.C Cá nhân</span><CustomToggle checked={emp.ccCaNhan === 1} readOnly /></div>
                                                    <div className="flex justify-between items-center"><span className="text-[9px] font-black text-muted-foreground uppercase">C.C T.Trung</span><CustomToggle checked={emp.ccTapTrung === 1} readOnly /></div>
                                                    <div className="flex justify-between items-center"><span className="text-[9px] font-black text-muted-foreground uppercase">KT Vị trí</span><CustomToggle checked={emp.checkViTri === 1} readOnly /></div>
                                                    <div className="flex justify-between items-center"><span className="text-[9px] font-black text-muted-foreground uppercase">KT Mạng</span><CustomToggle checked={emp.checkMang === 1} readOnly /></div>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-2 bg-muted/50 p-2.5 rounded-lg border border-border w-full">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase">Khuôn mặt AI:</span>
                                                    {emp.has_face ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Đã có</span>
                                                            <button onClick={() => deleteFace(emp.username)} className="p-1.5 text-destructive bg-destructive/10 rounded border border-destructive/20 hover:bg-destructive/20"><Trash2 size={12} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">🔴 Chưa có</span>
                                                            <button onClick={() => triggerFaceUpload(emp.username)} className="px-2 py-1.5 text-primary bg-primary/10 rounded border border-primary/20 hover:bg-primary/20 font-bold text-[10px] flex items-center gap-1"><Camera size={12} /> Thêm</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* DESKTOP VIEW */}
                                <div className="hidden md:block w-full">
                                    <table className="w-full text-left border-separate" style={{ borderSpacing: 0 }}>
                                        <thead className="sticky top-0 z-[30] shadow-sm">
                                            <tr>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest w-[50px] text-center">⚙️</th>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nhân viên</th>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Phòng ban</th>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Vai trò</th>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">CC CN</th>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">CC TT</th>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">KT VT</th>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">KT MG</th>
                                                <th className="bg-muted border-y border-border py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Face AI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-card">
                                            {employees.map(emp => (
                                                <tr key={emp.username} className={`transition-colors ${activeDropdown === emp.username ? 'bg-muted/50' : 'hover:bg-muted/30'}`}>
                                                    <td className="py-2.5 px-4 text-center border-b border-border">
                                                        <button onClick={(e) => toggleAction(e, emp.username)} className={`p-1.5 rounded-lg border transition-all ${activeDropdown === emp.username ? 'bg-secondary border-border text-foreground' : 'text-muted-foreground border-transparent hover:bg-secondary hover:border-border'}`}>
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </td>
                                                    <td className="py-2.5 px-4 border-b border-border">
                                                        <strong className="text-[13px] text-foreground block">{emp.full_name}</strong>
                                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{emp.username}</span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-[11px] font-medium text-muted-foreground border-b border-border">
                                                        {emp.department_name || '---'}
                                                    </td>
                                                    <td className="py-2.5 px-4 border-b border-border">
                                                        <div className="flex flex-col items-start gap-1">
                                                            {getRoleBadge(emp.role)}
                                                            {emp.is_locked === 1 && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-destructive/10 text-destructive border border-destructive/20 mt-1">Đã khóa</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center border-b border-border"><CustomToggle checked={emp.ccCaNhan === 1} readOnly /></td>
                                                    <td className="py-2.5 px-4 text-center border-b border-border"><CustomToggle checked={emp.ccTapTrung === 1} readOnly /></td>
                                                    <td className="py-2.5 px-4 text-center border-b border-border"><CustomToggle checked={emp.checkViTri === 1} readOnly /></td>
                                                    <td className="py-2.5 px-4 text-center border-b border-border"><CustomToggle checked={emp.checkMang === 1} readOnly /></td>
                                                    <td className="py-2.5 px-4 text-center border-b border-border">
                                                        {emp.has_face ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="text-[10px] font-bold text-emerald-600"><CheckCircle2 size={16} /></span>
                                                                <button onClick={() => deleteFace(emp.username)} className="p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => triggerFaceUpload(emp.username)} className="p-1.5 text-primary bg-primary/10 rounded border border-primary/20 hover:bg-primary/20 font-bold text-[10px] uppercase mx-auto flex items-center gap-1"><Camera size={12} /> Tải</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
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
            {/* MENU THÔNG MINH - HIỂN THỊ TỰ ĐỘNG BẬT LÊN/XUỐNG */}
            {/* ==================================================== */}
            {activeEmpData && (
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setActiveDropdown(null)} onScroll={() => setActiveDropdown(null)} />
                    <div
                        className="w-48 bg-card border border-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100"
                        style={dropdownStyles}
                    >
                        <button onClick={() => { router.push(`/enroll?id=${activeEmpData.username}`); setActiveDropdown(null); }} className="w-full px-4 py-3 text-[11px] font-bold uppercase text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border"><Camera size={14} /> Camera</button>
                        <button onClick={() => { handleEdit(activeEmpData); setActiveDropdown(null); }} className="w-full px-4 py-3 text-[11px] font-bold uppercase text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border"><Edit2 size={14} /> Sửa TT</button>
                        <button onClick={() => { handleAction('password', activeEmpData); setActiveDropdown(null); }} className="w-full px-4 py-3 text-[11px] font-bold uppercase text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border"><Key size={14} /> Đổi MK</button>
                        <button onClick={() => { handleAction('lock', activeEmpData); setActiveDropdown(null); }} className="w-full px-4 py-3 text-[11px] font-bold uppercase text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border">{activeEmpData.is_locked ? <><Unlock size={14} /> Mở khóa</> : <><Lock size={14} /> Khóa TK</>}</button>
                        <button onClick={() => { handleAction('delete', activeEmpData); setActiveDropdown(null); }} className="w-full px-4 py-3 text-[11px] font-bold uppercase text-destructive hover:bg-destructive/10 flex items-center gap-2"><Trash2 size={14} /> Xóa NV</button>
                    </div>
                </>
            )}

            {/* ==================================================== */}
            {/* SLIDE-OUT DRAWER (FORM THÊM/SỬA) */}
            {/* ==================================================== */}
            {isPanelOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] transition-opacity"
                    onClick={handleClosePanel}
                />
            )}

            <div
                className={`fixed top-0 right-0 bottom-0 w-full max-w-[500px] bg-card md:border-l border-border shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col pb-20 md:pb-0 ${isPanelOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* HEADER */}
                <div className="flex-shrink-0 flex items-center justify-between p-5 bg-transparent">
                    <div className="flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">
                            {editingId ? "Sửa Nhân Sự" : "Thêm Nhân Sự Mới"}
                        </h3>
                    </div>
                    <button
                        onClick={handleClosePanel}
                        className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="drawerForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Mã NV *</label>
                                <input type="text" required disabled={!!editingId} value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="VD: NV001" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold uppercase w-full disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ngày Sinh</label>
                                <input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] uppercase w-full" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Họ và Tên *</label>
                            <input type="text" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Nhập họ tên" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold w-full" />
                        </div>

                        <div className="p-4 bg-muted/30 border border-border border-dashed rounded-xl flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary m-0">🏢 Phòng Ban & Phân Quyền</label>
                                <button type="button" onClick={addDeptRow} className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-bold uppercase hover:bg-primary/20 transition-colors">+ Thêm dòng</button>
                            </div>

                            {formData.departments.map((dept, index) => (
                                <div key={dept.id} className="flex flex-col sm:flex-row gap-2 p-2 bg-background border border-border rounded-lg shadow-sm">
                                    <select
                                        required
                                        value={dept.department_id}
                                        onChange={e => updateDeptRow(dept.id, 'department_id', e.target.value)}
                                        className="w-full sm:flex-1 h-9 px-2 text-[11px] border border-border rounded bg-background text-foreground outline-none focus:border-primary"
                                    >
                                        <option value="">-- Chọn đơn vị --</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.unit_name}</option>)}
                                    </select>

                                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
                                        <select
                                            value={dept.role}
                                            onChange={e => updateDeptRow(dept.id, 'role', e.target.value)}
                                            className="flex-1 sm:w-[90px] h-9 px-2 text-[11px] border border-border rounded bg-background text-foreground outline-none focus:border-primary"
                                        >
                                            <option value="user">Nhân viên</option>
                                            <option value="manager">Quản lý</option>
                                            <option value="admin">Admin</option>
                                        </select>

                                        <label className="flex shrink-0 items-center gap-1.5 cursor-pointer text-[10px] font-bold text-muted-foreground ml-1">
                                            <input
                                                type="radio"
                                                name="primary_dept"
                                                checked={dept.is_primary === 1}
                                                onChange={() => updateDeptRow(dept.id, 'is_primary', 1)}
                                                className="w-3.5 h-3.5 accent-primary"
                                            />
                                            Chính
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() => removeDeptRow(dept.id)}
                                            className="w-9 h-9 shrink-0 flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive hover:text-white transition-colors ml-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Số điện thoại</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="VD: 0987654321" className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-mono w-full" />
                            </div>
                            {!editingId ? (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Mật khẩu mới</label>
                                    <input type="text" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-mono w-full" />
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Trạng thái làm việc</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-medium w-full">
                                        <option value="active">Đang làm việc</option>
                                        <option value="inactive">Đã nghỉ việc</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                            <div className="flex items-center justify-between bg-background px-3 py-2 border border-border rounded-lg shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CC Cá Nhân</span>
                                <CustomToggle checked={formData.ccCaNhan === 1} onChange={v => setFormData({ ...formData, ccCaNhan: v ? 1 : 0 })} />
                            </div>
                            <div className="flex items-center justify-between bg-background px-3 py-2 border border-border rounded-lg shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CC Tập Trung</span>
                                <CustomToggle checked={formData.ccTapTrung === 1} onChange={v => setFormData({ ...formData, ccTapTrung: v ? 1 : 0 })} />
                            </div>
                            <div className="flex items-center justify-between bg-background px-3 py-2 border border-border rounded-lg shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">KT Vị Trí</span>
                                <CustomToggle checked={formData.checkViTri === 1} onChange={v => setFormData({ ...formData, checkViTri: v ? 1 : 0 })} />
                            </div>
                            <div className="flex items-center justify-between bg-background px-3 py-2 border border-border rounded-lg shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">KT Mạng Wifi</span>
                                <CustomToggle checked={formData.checkMang === 1} onChange={v => setFormData({ ...formData, checkMang: v ? 1 : 0 })} />
                            </div>
                        </div>

                    </form>
                </div>

                {/* FOOTER */}
                <div className="flex-shrink-0 p-5 bg-transparent flex gap-3">
                    <button type="button" onClick={handleClosePanel} className="flex-1 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border">
                        Hủy Bỏ
                    </button>
                    <button type="submit" form="drawerForm" className="flex-1 flex items-center justify-center gap-2 h-11 text-primary-foreground bg-primary hover:opacity-90 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md">
                        <Save size={16} /> {editingId ? "Cập Nhật" : "Lưu Nhân Sự"}
                    </button>
                </div>
            </div>

        </div>
    );
}