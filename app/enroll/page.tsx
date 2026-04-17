"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
    ArrowLeft, Loader2, RefreshCcw, ScanFace, CheckCircle, MonitorSmartphone, Server
} from "lucide-react";
import { toast } from "sonner";

const HOLD_DURATION = 5000;
const FACE_MIN_SIZE = 0.35;
const FACE_MAX_SIZE = 0.60;

export default function FaceEnrollPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const faceDetectionRef = useRef<any>(null);
    const holdStartTimeRef = useRef<number>(0);
    const lastDetectionRef = useRef<any>(null);

    const [userId, setUserId] = useState(searchParams.get("id") || "");
    const [deviceType, setDeviceType] = useState("MAIN");
    const [status, setStatus] = useState("ĐANG KHỞI TẠO CAMERA...");
    const [statusColor, setStatusColor] = useState("text-slate-400");
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLibLoaded, setIsLibLoaded] = useState(false);

    const initCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 1280, height: 720 },
            });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            toast.error("Không thể truy cập Camera.");
        }
    };

    const onScriptLoad = () => {
        if (!(window as any).FaceDetection) return;

        const faceDetection = new (window as any).FaceDetection({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
        });

        faceDetection.setOptions({ model: "short", minDetectionConfidence: 0.7 });
        faceDetection.onResults(handleResults);
        faceDetectionRef.current = faceDetection;
        setIsLibLoaded(true);
        setStatus("VUI LÒNG ĐƯA MẶT VÀO KHUNG");
        setStatusColor("text-white");

        const processFrame = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                await faceDetection.send({ image: videoRef.current });
            }
            requestAnimationFrame(processFrame);
        };
        requestAnimationFrame(processFrame);
    };

    useEffect(() => {
        initCamera();
    }, []);

    const handleResults = (results: any) => {
        if (isProcessing) return;

        if (results.detections && results.detections.length === 1) {
            const detection = results.detections[0].boundingBox;
            const landmarks = results.detections[0].landmarks;
            lastDetectionRef.current = detection;

            const { xCenter, yCenter, width: faceWidth } = detection;
            const isCentered = xCenter > 0.35 && xCenter < 0.65 && yCenter > 0.35 && yCenter < 0.65;

            let straight = true;
            if (landmarks && landmarks.length >= 3) {
                const eyeDistX = Math.abs(landmarks[1].x - landmarks[0].x);
                const eyeDistY = Math.abs(landmarks[1].y - landmarks[0].y);
                const noseDistL = Math.abs(landmarks[2].x - landmarks[1].x);
                const noseDistR = Math.abs(landmarks[2].x - landmarks[0].x);
                if (eyeDistY / eyeDistX > 0.35 || Math.abs(noseDistL - noseDistR) / eyeDistX > 0.35) straight = false;
            }

            if (!userId) {
                updateStatus("YÊU CẦU NHẬP MÃ NHÂN VIÊN", "text-cyan-400");
            } else if (!isCentered) {
                updateStatus("ĐƯA KHUÔN MẶT VÀO TÂM", "text-amber-400");
            } else if (!straight) {
                updateStatus("NHÌN THẲNG VÀO CAMERA", "text-amber-400");
            } else if (faceWidth < FACE_MIN_SIZE) {
                updateStatus("TIẾN LẠI GẦN HƠN", "text-cyan-400");
            } else if (faceWidth > FACE_MAX_SIZE) {
                updateStatus("LÙI RA XA CHÚT", "text-cyan-400");
            } else {
                if (holdStartTimeRef.current === 0) holdStartTimeRef.current = Date.now();
                const elapsed = Date.now() - holdStartTimeRef.current;
                const remaining = Math.ceil((HOLD_DURATION - elapsed) / 1000);

                setProgress((elapsed / HOLD_DURATION) * 100);
                updateStatus(`ĐANG LẤY MẪU... GIỮ YÊN ${remaining}S`, "text-emerald-400");

                if (elapsed >= HOLD_DURATION) handleAutoRegister();
                return;
            }
        } else if (results.detections && results.detections.length > 1) {
            updateStatus("CẢNH BÁO: NHIỀU NGƯỜI TRONG KHUNG HÌNH", "text-rose-500");
        } else {
            updateStatus("TÌM KIẾM KHUÔN MẶT...", "text-slate-500");
        }

        holdStartTimeRef.current = 0;
        setProgress(0);
    };

    const updateStatus = (msg: string, color: string) => {
        setStatus(msg);
        setStatusColor(color);
    };

    const handleAutoRegister = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        updateStatus("ĐANG MÃ HÓA DỮ LIỆU...", "text-emerald-400");

        const faceBase64 = captureFace();
        if (!faceBase64) {
            setIsProcessing(false);
            holdStartTimeRef.current = 0;
            return;
        }

        try {
            const res = await fetch(`/api/${deviceType === "IPAD" ? "register_ipad" : "register"}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId.toUpperCase(), image_base64: faceBase64 }),
            });

            if (res.ok) {
                toast.success("Lấy mẫu AI thành công!");
                updateStatus("HOÀN TẤT ĐĂNG KÝ!", "text-emerald-500");
                setTimeout(() => router.push("/employees"), 2000);
            } else {
                const errData = await res.json();
                toast.error(errData.detail || "Lỗi hệ thống");
                setIsProcessing(false);
                holdStartTimeRef.current = 0;
            }
        } catch (err) {
            toast.error("Mất kết nối máy chủ");
            setIsProcessing(false);
            holdStartTimeRef.current = 0;
        }
    };

    const captureFace = () => {
        if (!videoRef.current || !lastDetectionRef.current || !canvasRef.current) return null;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const det = lastDetectionRef.current;

        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        const cropW = det.width * 1.5 * videoW;
        const cropH = det.height * 1.5 * videoH;
        const startX = (det.xCenter * videoW) - (cropW / 2);
        const startY = (det.yCenter * videoH) - (cropH / 2);

        ctx.translate(224, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, 224, 224);

        return canvas.toDataURL("image/jpeg", 0.9);
    };

    return (
        // SỬA SCROLL: Cố định height, overflow-hidden để ko cuộn
        <div className="h-[100dvh] w-full bg-[#09090b] text-slate-200 font-sans relative flex flex-col items-center py-4 md:py-6 selection:bg-cyan-500/30 overflow-hidden">
            <Script
                src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js"
                strategy="lazyOnload"
                onLoad={onScriptLoad}
            />

            {/* HIỆU ỨNG NỀN ĐỘNG: Bừng sáng màu Medical Blue khi quét */}
            <div className={`
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full blur-[120px] pointer-events-none 
                transition-all duration-1000 ease-in-out
                ${progress > 0 ? 'bg-cyan-600/20 scale-110' : 'bg-cyan-900/5 scale-100'}
            `} />

            {/* Nút Quay lại - Góc trái (fixed) */}
            <button
                onClick={() => router.back()}
                className="absolute top-4 md:top-6 left-4 md:left-6 flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-slate-300 z-50 shrink-0"
            >
                <ArrowLeft size={16} /> <span className="hidden sm:inline">Quay lại</span>
            </button>

            {/* Container Chính - Symmetrical Layout dùng Flex để fit 100% */}
            <main className="w-full max-w-[500px] flex-1 min-h-0 flex flex-col relative z-10 px-4">

                {/* 1. Header Tiêu đề (shrink-0) */}
                <div className="text-center shrink-0 mb-4 mt-10 md:mt-0">
                    <h1 className="text-lg md:text-xl font-black tracking-[0.25em] text-white uppercase drop-shadow-md">
                        Đăng Ký Khuôn Mặt
                    </h1>
                </div>

                {/* 2. Thanh Trạng Thái (shrink-0) */}
                <div className="w-full bg-[#18181b]/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-4 shadow-lg relative overflow-hidden flex flex-col items-center justify-center shrink-0 mb-4 z-20">
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-900">
                        <div
                            className="h-full bg-cyan-500 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className={`text-xs md:text-sm font-bold tracking-[0.15em] uppercase transition-colors duration-300 ${statusColor}`}>
                        {status}
                    </span>
                </div>

                {/* 3. Camera Viewfinder (TỰ ĐỘNG CO GIÃN THEO MÀN HÌNH - KHÔNG SCROLL) */}
                <div className="w-full flex-1 min-h-0 relative bg-black rounded-[2rem] overflow-hidden border-2 border-zinc-800/80 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] group mb-4">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                    />

                    {/* Khung Oval Center */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={`
                            w-[60%] h-[70%] max-w-[260px] max-h-[340px] rounded-[50%/45%] border-[2px]
                            transition-all duration-500
                            ${progress > 0
                                ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] scale-105"
                                : "border-zinc-500/60 border-dashed shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"}
                        `} />
                    </div>

                    {/* Lưới tọa độ ngầm (Grid) & Scanning Line */}
                    {isLibLoaded && !isProcessing && (
                        <>
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] pointer-events-none opacity-40" />
                            <div className="absolute inset-x-0 h-[2px] bg-cyan-500 shadow-[0_0_20px_2px_rgba(6,182,212,0.8)] animate-scanner opacity-60" />
                        </>
                    )}

                    {/* Loading State Overlay */}
                    {(!isLibLoaded || isProcessing) && (
                        <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                            <Loader2 className="animate-spin text-cyan-500" size={36} />
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-300">
                                {isProcessing ? "Đang xử lý mẫu AI..." : "Khởi động Module..."}
                            </span>
                        </div>
                    )}
                </div>

                {/* 4. Data Form (shrink-0) */}
                <div className="w-full flex flex-col gap-3 shrink-0 mb-3">
                    <input
                        type="text"
                        placeholder="MÃ NHÂN VIÊN (VD: NV001)"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value.toUpperCase())}
                        className="w-full h-12 md:h-14 bg-[#18181b]/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 text-center text-white text-xs md:text-sm font-bold tracking-widest uppercase focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600"
                    />

                    <div className="relative">
                        <select
                            value={deviceType}
                            onChange={(e) => setDeviceType(e.target.value)}
                            className="w-full h-12 md:h-14 bg-[#18181b]/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 text-center text-zinc-300 text-[10px] md:text-xs font-bold tracking-[0.1em] md:tracking-[0.15em] uppercase appearance-none focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
                        >
                            <option value="MAIN">THIẾT BỊ: MÁY CHỦ TRUNG TÂM</option>
                            <option value="IPAD">THIẾT BỊ: MÁY TÍNH BẢNG (TABLET)</option>
                        </select>
                        <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            {deviceType === 'MAIN' ? <Server size={16} /> : <MonitorSmartphone size={16} />}
                        </div>
                    </div>
                </div>

                {/* 5. Actions Group (shrink-0) */}
                <div className="w-full flex gap-3 shrink-0 pb-2">
                    <button
                        className="flex-1 h-12 md:h-14 flex items-center justify-center gap-2 bg-[#18181b]/80 backdrop-blur-sm border border-zinc-800 hover:bg-zinc-800 rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
                        onClick={() => { setUserId(""); setProgress(0); }}
                    >
                        <RefreshCcw size={14} /> Làm lại
                    </button>
                    <button
                        disabled={progress < 100 || isProcessing || !userId}
                        className="flex-[1.5] h-12 md:h-14 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-30 disabled:shadow-none disabled:bg-zinc-800 disabled:text-zinc-500 transition-all"
                        onClick={handleAutoRegister}
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <ScanFace size={16} />}
                        {isProcessing ? "Đang lưu" : "Xác nhận mẫu"}
                    </button>
                </div>

            </main>

            <canvas ref={canvasRef} className="hidden" />

            <style jsx global>{`
                @keyframes scanner {
                    0% { top: 15%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 85%; opacity: 0; }
                }
                .animate-scanner {
                    position: absolute;
                    animation: scanner 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
}