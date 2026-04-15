"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Building2, Hospital, Stethoscope, Briefcase,
    Users2, Landmark, Plus, Edit2, Trash2, X, Save,
    AlertCircle, RefreshCw
} from "lucide-react";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================
interface Department {
    id: number;
    unit_code: string;
    unit_name: string;
    unit_type: string;
    parent_id: number | null;
    order_num: number;
    level: number;
    location: string;
    status: string;
    notes: string;
}

const UNIT_TYPES = [
    "Bệnh viện", "Viện", "Khối", "Ban",
    "Trung Tâm", "Khoa", "Phòng", "Tổ chức", "Tổ", "Nhóm"
];

// ==========================================
// 2. MAIN COMPONENT
// ==========================================
export default function DepartmentsPage() {
    const router = useRouter();

    // --- States Dữ liệu ---
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- States Trạng thái Form (Drawer) ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const initialFormState = {
        unit_code: "",
        unit_name: "",
        unit_type: "Phòng",
        parent_id: "",
        order_num: 1,
        level: 1,
        location: "",
        status: "active",
        notes: ""
    };
    const [formData, setFormData] = useState<any>(initialFormState);

    // ==========================================
    // 3. FETCH DATA TỪ API
    // ==========================================
    const fetchDepartments = useCallback(async () => {
        const token = localStorage.getItem("hrm_token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            setIsLoading(true);
            const res = await fetch('/api/departments', {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDepartments(data);
            }
        } catch (error) {
            console.error("Lỗi tải cây tổ chức:", error);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    // ==========================================
    // 4. HELPERS
    // ==========================================
    const isDescendant = (checkId: number, ancestorId: number): boolean => {
        if (!ancestorId) return false;
        const dept = departments.find(d => d.id === checkId);
        if (!dept || !dept.parent_id) return false;
        if (dept.parent_id === ancestorId) return true;
        return isDescendant(dept.parent_id, ancestorId);
    };

    const getIconForType = (type: string) => {
        if (['Bệnh viện', 'Viện'].includes(type)) return <Hospital className="w-5 h-5 text-rose-500" />;
        if (['Khối', 'Trung Tâm', 'Ban'].includes(type)) return <Landmark className="w-5 h-5 text-indigo-500" />;
        if (['Khoa'].includes(type)) return <Stethoscope className="w-5 h-5 text-emerald-500" />;
        if (['Phòng', 'Tổ chức'].includes(type)) return <Briefcase className="w-5 h-5 text-amber-500" />;
        return <Users2 className="w-5 h-5 text-sky-500" />;
    };

    // ==========================================
    // 5. HANDLERS ĐIỀU KHIỂN FORM
    // ==========================================
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddNew = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setIsPanelOpen(true);
    };

    const handleEdit = (id: number) => {
        const d = departments.find(x => x.id === id);
        if (!d) return;

        setEditingId(id);
        setFormData({
            unit_code: d.unit_code,
            unit_name: d.unit_name,
            unit_type: d.unit_type,
            parent_id: d.parent_id || "",
            order_num: d.order_num,
            level: d.level,
            location: d.location || "",
            status: d.status,
            notes: d.notes || ""
        });
        setIsPanelOpen(true);
    };

    const handleClosePanel = () => {
        setIsPanelOpen(false);
        setTimeout(() => {
            setEditingId(null);
            setFormData(initialFormState);
        }, 300); // Chờ animation đóng xong mới reset data
    };

    // ==========================================
    // 6. XỬ LÝ API GỬI VÀ XÓA DỮ LIỆU
    // ==========================================
    const handleDelete = async (id: number, code: string) => {
        const hasChildren = departments.some(d => d.parent_id === id);
        if (hasChildren) {
            alert(`⚠️ Không thể xóa đơn vị [${code}] vì vẫn còn đơn vị cấp dưới trực thuộc! Vui lòng xóa cấp dưới trước.`);
            return;
        }

        if (confirm(`⚠️ Bạn có chắc chắn muốn xóa đơn vị [${code}]? Hành động này không thể hoàn tác!`)) {
            const token = localStorage.getItem("hrm_token");
            const res = await fetch(`/api/departments/${id}`, {
                method: 'DELETE',
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                fetchDepartments();
                if (editingId === id) handleClosePanel();
            } else {
                const d = await res.json();
                alert(d.detail || "Có lỗi xảy ra khi xóa.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("hrm_token");

        const payload = {
            ...formData,
            unit_code: formData.unit_code.trim().toUpperCase(),
            parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
            order_num: parseInt(formData.order_num) || 1,
            level: parseInt(formData.level) || 1,
        };

        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `/api/departments/${editingId}` : '/api/departments';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(editingId ? "Cập nhật thành công!" : "Đã thêm đơn vị mới thành công!");
                handleClosePanel();
                fetchDepartments();
            } else {
                const data = await res.json();
                alert("Lỗi: " + data.detail);
            }
        } catch (error) {
            console.error("Lỗi lưu đơn vị:", error);
        }
    };

    // ==========================================
    // 7. COMPONENT CÂY ĐỆ QUY (TREE VIEW) - FIX RESPONSIVE 100%
    // ==========================================
    const DepartmentTree = ({ parentId }: { parentId: number | null }) => {
        const children = departments
            .filter(d => d.parent_id === parentId)
            .sort((a, b) => a.order_num - b.order_num);

        if (children.length === 0) return null;

        return (
            <ul className={`relative w-full ${parentId === null ? "pl-0" : "pl-3 sm:pl-8 mt-2 before:absolute before:top-0 before:bottom-0 before:left-[11px] sm:before:left-[15px] before:border-l-2 before:border-dashed before:border-border/60"}`}>
                {children.map(child => (
                    <li key={child.id} className="relative py-2 first:pt-0 last:pb-0 w-full max-w-full">
                        {/* Đường kẻ ngang nối node con */}
                        {parentId !== null && (
                            <div className="absolute top-[28px] -left-[13px] sm:-left-[17px] w-[20px] sm:w-[32px] border-t-2 border-dashed border-border/60" />
                        )}

                        {/* Card hiển thị 1 đơn vị - Ép max-w-full và overflow-hidden */}
                        <div className={`
              flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-all relative z-10 w-full max-w-full overflow-hidden
              ${editingId === child.id
                                ? "bg-primary/10 border-primary shadow-sm"
                                : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
                            }
            `}>

                            {/* Nửa trên: Icon + Thông tin */}
                            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 w-full min-w-0">
                                <div className="p-1.5 sm:p-2 rounded-lg bg-muted border border-border shrink-0 mt-0.5 sm:mt-0">
                                    {getIconForType(child.unit_type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Tên đơn vị tự động xuống dòng */}
                                    <h4 className="text-[12px] sm:text-sm font-bold text-foreground break-words whitespace-normal leading-tight">
                                        {child.unit_name}
                                    </h4>

                                    <div className="flex flex-wrap gap-1 mt-1 sm:mt-1.5">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-secondary text-secondary-foreground border border-border">
                                            {child.unit_type}
                                        </span>
                                        {child.status === 'inactive' && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-destructive/10 text-destructive border border-destructive/20">
                                                Tạm Ngưng
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1.5 sm:mt-1">
                                        <span className="flex items-center gap-1 shrink-0"><Building2 size={10} /> {child.unit_code}</span>
                                        <span className="shrink-0" title="Cấp độ - STT">C{child.level}-STT{child.order_num}</span>
                                        {child.location && <span className="truncate max-w-full shrink-0">📍 {child.location}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Nửa dưới: 2 Nút Action tự động ép nhỏ lại */}
                            <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-border/50 sm:border-0 shrink-0">
                                <button
                                    onClick={() => handleEdit(child.id)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2 py-2 sm:px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                                >
                                    <Edit2 size={13} /> <span>Sửa</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(child.id, child.unit_code)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2 py-2 sm:px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors border border-destructive/20"
                                >
                                    <Trash2 size={13} /> <span>Xóa</span>
                                </button>
                            </div>
                        </div>

                        {/* Gọi đệ quy vẽ cấp con */}
                        <DepartmentTree parentId={child.id} />
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="w-full pb-6 animate-in fade-in duration-500 relative">

            {/* HEADER & CONTROLS */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0">
                        Sơ Đồ Tổ Chức & Đơn Vị
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Quản lý cơ cấu phòng ban, khoa phòng và chi nhánh
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchDepartments}
                        disabled={isLoading}
                        className="p-2.5 bg-secondary text-foreground border border-border rounded-xl hover:bg-muted transition-colors"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin text-primary" : ""} />
                    </button>
                    <button
                        onClick={handleAddNew}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[12px] rounded-xl hover:opacity-90 transition-all shadow-sm"
                    >
                        <Plus size={16} /> Thêm Đơn Vị Mới
                    </button>
                </div>
            </div>

            {/* ==================================================== */}
            {/* KHU VỰC HIỂN THỊ CÂY THƯ MỤC CHÍNH */}
            {/* ==================================================== */}
            <div className="hrm-card p-3 sm:p-5 xl:p-8 w-full max-w-full overflow-hidden min-h-[500px]">
                {isLoading ? (
                    <div className="h-full py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[11px] font-bold uppercase tracking-widest mt-2">Đang tải dữ liệu phòng ban...</span>
                    </div>
                ) : departments.length === 0 ? (
                    <div className="h-full py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
                        <AlertCircle className="w-12 h-12 opacity-20" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">Chưa có đơn vị nào trong hệ thống.</p>
                        <button onClick={handleAddNew} className="text-primary text-[12px] font-bold hover:underline">
                            Bấm vào đây để tạo đơn vị đầu tiên
                        </button>
                    </div>
                ) : (
                    <div className="w-full max-w-full">
                        <DepartmentTree parentId={null} />
                    </div>
                )}
            </div>

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
                className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-[rgba(0,0,0,0.1)_0px_0px_50px] z-[101] transform transition-transform duration-300 ease-in-out flex flex-col ${isPanelOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-foreground m-0">
                            {editingId ? "Sửa Thông Tin Đơn Vị" : "Thêm Đơn Vị Mới"}
                        </h3>
                    </div>
                    <button
                        onClick={handleClosePanel}
                        className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="drawerForm" onSubmit={handleSubmit} className="flex flex-col gap-5">

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Mã Đơn Vị *</label>
                            <input
                                type="text" name="unit_code" required
                                value={formData.unit_code} onChange={handleInputChange}
                                placeholder="VD: K_NGOAI"
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-bold uppercase w-full"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Tên Đơn Vị *</label>
                            <input
                                type="text" name="unit_name" required
                                value={formData.unit_name} onChange={handleInputChange}
                                placeholder="VD: Khoa Ngoại Tổng Hợp"
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Loại Đơn Vị</label>
                                <select
                                    name="unit_type" value={formData.unit_type} onChange={handleInputChange}
                                    className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-medium w-full cursor-pointer"
                                >
                                    {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Trạng thái</label>
                                <select
                                    name="status" value={formData.status} onChange={handleInputChange}
                                    className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-medium w-full cursor-pointer"
                                >
                                    <option value="active">Hoạt động</option>
                                    <option value="inactive">Tạm ngưng</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Cơ cấu trực thuộc</label>
                            <select
                                name="parent_id" value={formData.parent_id} onChange={handleInputChange}
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-medium w-full cursor-pointer"
                            >
                                <option value="">-- Cấp cao nhất (Không có) --</option>
                                {departments.map(d => {
                                    if (editingId === d.id || isDescendant(d.id, editingId as number)) return null;
                                    return (
                                        <option key={d.id} value={d.id}>{d.unit_name} ({d.unit_code})</option>
                                    );
                                })}
                            </select>
                            <p className="text-[10px] text-muted-foreground mt-2 italic">* Để trống nếu đây là cơ sở/bệnh viện cấp cao nhất.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Sắp xếp (STT)</label>
                                <input
                                    type="number" name="order_num" min="1"
                                    value={formData.order_num} onChange={handleInputChange}
                                    className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-mono w-full"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Cấp độ (Level)</label>
                                <input
                                    type="number" name="level" min="1"
                                    value={formData.level} onChange={handleInputChange}
                                    className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] font-mono w-full"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Vị trí (Tòa/Tầng)</label>
                            <input
                                type="text" name="location"
                                value={formData.location} onChange={handleInputChange}
                                placeholder="VD: Tầng 2 - Tòa A"
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ghi chú thêm</label>
                            <input
                                type="text" name="notes"
                                value={formData.notes} onChange={handleInputChange}
                                placeholder="Nhập ghi chú (nếu có)..."
                                className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[12px] w-full"
                            />
                        </div>

                    </form>
                </div>

                <div className="p-5 border-t border-border bg-card flex gap-3">
                    <button
                        type="button"
                        onClick={handleClosePanel}
                        className="flex-1 h-11 bg-secondary text-foreground font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-muted transition-colors border border-border"
                    >
                        Hủy Bỏ
                    </button>
                    <button
                        type="submit"
                        form="drawerForm"
                        className="flex-1 flex items-center justify-center gap-2 h-11 text-primary-foreground bg-primary hover:opacity-90 font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-md"
                    >
                        <Save size={16} /> {editingId ? "Cập Nhật" : "Lưu Đơn Vị"}
                    </button>
                </div>
            </div>

        </div>
    );
}