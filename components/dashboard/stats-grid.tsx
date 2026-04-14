// components/dashboard/stats-grid.tsx
import { Users, CheckCircle2, FileText, PenTool } from "lucide-react"

export function DashboardStats({ stats }: { stats: any }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">

            {/* Card 1: Tổng nhân sự */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-between hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.08)] transition-all cursor-default">
                <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-2">TỔNG NHÂN SỰ</span>
                    <span className="text-3xl font-extrabold text-slate-800 leading-none">{stats?.total_employees || 0}</span>
                </div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500">
                    <Users className="w-7 h-7" />
                </div>
            </div>

            {/* Card 2: Đi làm hôm nay */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-between hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.08)] transition-all cursor-default">
                <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-2">ĐI LÀM HÔM NAY</span>
                    <span className="text-3xl font-extrabold text-slate-800 leading-none">{stats?.unique_checkins_today || 0}</span>
                </div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-green-50 text-green-500">
                    <CheckCircle2 className="w-7 h-7" />
                </div>
            </div>

            {/* Card 3: Đơn xin nghỉ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-between hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.08)] transition-all cursor-default">
                <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-2">ĐƠN XIN NGHỈ</span>
                    <span className="text-3xl font-extrabold text-slate-800 leading-none">{stats?.total_leaves || 0}</span>
                </div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-orange-50 text-orange-500">
                    <FileText className="w-7 h-7" />
                </div>
            </div>

            {/* Card 4: Đơn giải trình */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex items-center justify-between hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.08)] transition-all cursor-pointer">
                <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-2">ĐƠN GIẢI TRÌNH</span>
                    <span className="text-3xl font-extrabold text-slate-800 leading-none">{stats?.total_explanations || 0}</span>
                </div>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-purple-50 text-purple-500">
                    <PenTool className="w-7 h-7" />
                </div>
            </div>

        </div>
    )
}