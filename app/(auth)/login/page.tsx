"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.removeItem("hrm_token")
    localStorage.removeItem("hrm_role")
    localStorage.removeItem("hrm_name")
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Trong hàm handleLogin
      const res = await fetch('/api/login', { // Trình duyệt SẼ HIỆN gọi đến 3000 (đúng ý đồ)
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toUpperCase(),
          password: password
        })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("hrm_token", data.access_token)
        localStorage.setItem("hrm_role", data.role)
        localStorage.setItem("hrm_name", data.full_name)
        localStorage.setItem("hrm_username", data.username)
        router.push("/dashboard")
      } else {
        setError(data.detail || "Đăng nhập thất bại!")
      }
    } catch (err) {
      setError("Lỗi kết nối hệ thống!")
    } finally {
      setLoading(false)
    }
  }

  return (
    // Sử dụng items-center và p-4 để đảm bảo trên iPhone không bị dính sát mép màn hình
    <div className="flex min-h-screen w-full items-center justify-center bg-[#fafafa] p-4 sm:p-6 lg:p-8">

      {/* - max-w-[350px] cho iPhone (nhỏ gọn hơn)
          - sm:max-w-[400px] cho iPad Mini và các thiết bị lớn hơn
      */}
      <Card className="w-full max-w-[350px] sm:max-w-[400px] shadow-2xl border-t-4 border-t-primary rounded-2xl overflow-hidden bg-white transition-all duration-300">

        <CardHeader className="space-y-2 text-center pb-6 pt-8 sm:pt-10">
          <div className="mx-auto mb-2 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-black text-white shadow-lg">
            <span className="text-lg sm:text-xl font-black italic">B</span>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-primary">
              Hệ thống HRM
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm font-medium text-slate-500 px-4">
              Đăng nhập để tiếp tục quản trị nhân sự bệnh viện
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-10 pb-10">
          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400">
                Tài khoản (Mã NV)
              </Label>
              <Input
                id="username"
                placeholder="VD: NV2026"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                // h-11 cho Mobile dễ bấm, h-12 cho thiết bị lớn hơn
                className="h-11 sm:h-12 border-slate-200 focus-visible:ring-primary focus-visible:border-primary text-base sm:text-sm transition-all rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400">
                Mật khẩu
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 sm:h-12 border-slate-200 focus-visible:ring-primary focus-visible:border-primary text-base sm:text-sm transition-all rounded-xl"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-zinc-800 text-white font-bold h-11 sm:h-12 rounded-xl shadow-md active:scale-[0.98] transition-all tracking-widest"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">ĐANG XỬ LÝ</span>
                </div>
              ) : (
                "ĐĂNG NHẬP"
              )}
            </Button>

            {error && (
              <div className="mt-2 p-3 rounded-xl bg-red-50 border border-red-100 animate-in fade-in zoom-in duration-300">
                <p className="text-[10px] sm:text-[12px] font-bold text-red-600 text-center uppercase">
                  {error}
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}