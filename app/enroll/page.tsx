"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';

const HOLD_DURATION = 5000;
const SHARPNESS_THRESHOLD = 50;
const FACE_MIN_SIZE = 0.35;
const FACE_MAX_SIZE = 0.60;
const CENTER_X_MIN = 0.35;
const CENTER_X_MAX = 0.65;
const CENTER_Y_MIN = 0.35;
const CENTER_Y_MAX = 0.65;

export default function FaceRegistration() {
    const router = useRouter();

    const [userId, setUserId] = useState("");
    const [deviceType, setDeviceType] = useState("MAIN");
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [isReady, setIsReady] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const distanceFillRef = useRef<HTMLDivElement>(null);
    const guideCircleRef = useRef<HTMLDivElement>(null);
    const regBtnRef = useRef<HTMLButtonElement>(null);

    const faceDetectionRef = useRef<any>(null);
    const isFaceDetectionRunning = useRef(false);
    const isProcessing = useRef(false);
    const holdStartTime = useRef(0);
    const lastDetection = useRef<any>(null);
    const animationFrameId = useRef<number>(0);

    // LOGIC LẤY ID ĐÃ ĐƯỢC ĐỒNG BỘ VỚI ENROLL.HTML
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // 1. Ưu tiên lấy từ URL Params (id hoặc userid)
            const urlParams = new URLSearchParams(window.location.search);
            const paramId = urlParams.get('id') || urlParams.get('userid');

            // 2. Lấy từ localStorage với key mới hrm_user_id
            const storedUserId = localStorage.getItem('hrm_user_id');

            if (paramId) {
                setUserId(paramId.toUpperCase());
            } else if (storedUserId) {
                setUserId(storedUserId.toUpperCase());
            }
        }
    }, []);

    const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const isImageSharp = (canvas: HTMLCanvasElement, threshold = SHARPNESS_THRESHOLD) => {
        try {
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;
            const { width, height } = canvas;
            const imageData = ctx.getImageData(0, 0, width, height);
            const d = imageData.data;
            const gray = new Float32Array(width * height);
            for (let i = 0, j = 0; i < d.length; i += 4, j++) {
                gray[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            }
            let sum = 0, sumSq = 0, count = 0;
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    const lap = -gray[idx - 1] - gray[idx + 1] - gray[idx - width] - gray[idx + width] + 4 * gray[idx];
                    sum += lap;
                    sumSq += lap * lap;
                    count++;
                }
            }
            const mean = sum / count;
            const variance = (sumSq / count) - (mean * mean);
            return variance > threshold;
        } catch (e) {
            return true;
        }
    };

    const isLightingGood = (canvas: HTMLCanvasElement, minBrightness = 40, maxBrightness = 210) => {
        try {
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;
            const { width, height } = canvas;
            const imageData = ctx.getImageData(0, 0, width, height);
            const d = imageData.data;
            let sum = 0;
            for (let i = 0; i < d.length; i += 4) {
                sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            }
            const avgBrightness = sum / (width * height);
            return avgBrightness >= minBrightness && avgBrightness <= maxBrightness;
        } catch (e) {
            return true;
        }
    };

    const captureCroppedFace = useCallback(() => {
        if (!lastDetection.current || !videoRef.current || !canvasRef.current) return null;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        const { xCenter, yCenter, width, height } = lastDetection.current;

        const padding = 0.25;
        let cropW = width * (1 + padding) * videoW;
        let cropH = height * (1 + padding) * videoH;
        let startX = (xCenter * videoW) - (cropW / 2);
        let startY = (yCenter * videoH) - (cropH / 2);

        startX = Math.max(0, startX);
        startY = Math.max(0, startY);
        cropW = Math.min(videoW - startX, cropW);
        cropH = Math.min(videoH - startY, cropH);

        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.translate(224, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, 224, 224);

        return canvas.toDataURL('image/jpeg', 0.9);
    }, []);

    const resetProcessingState = () => {
        isProcessing.current = false;
        holdStartTime.current = 0;
    };

    const handleErrorState = (msg = "❌ LỖI ĐĂNG KÝ") => {
        if (statusRef.current) {
            statusRef.current.innerText = msg;
            statusRef.current.className = "w-full max-w-[700px] mt-4 p-4 bg-[#1e293b] rounded-2xl border border-white/10 text-center text-sm font-semibold tracking-wide text-[#ff4757] shadow-sm transition-all";
        }
        setTimeout(resetProcessingState, 3000);
    };

    const handleAction = async (action: 'register' | 'unregister', base64Image: string | null = null) => {
        if (isProcessing.current) return;

        const idToProcess = userId.trim().toUpperCase();
        if (!idToProcess) {
            notify("Vui lòng nhập ID nhân viên!", "error");
            return;
        }

        if (action === 'unregister' && !window.confirm(`Xác nhận xóa dữ liệu của ${idToProcess}?`)) return;

        isProcessing.current = true;
        if (regBtnRef.current) regBtnRef.current.disabled = true;

        if (statusRef.current) {
            statusRef.current.innerText = action === 'register' ? "ĐANG ĐẨY DỮ LIỆU LÊN SERVER..." : "ĐANG XÓA...";
            statusRef.current.className = "w-full max-w-[700px] mt-4 p-4 bg-[#1e293b] rounded-2xl border border-white/10 text-center text-sm font-semibold tracking-wide text-[#007bff] shadow-sm transition-all";
        }

        try {
            let response;
            if (action === 'register') {
                const faceBase64 = base64Image || captureCroppedFace();
                if (!faceBase64) {
                    notify("Lỗi xén ảnh, hãy thử lại!", "error");
                    resetProcessingState();
                    return;
                }

                const apiEndpoint = deviceType === 'IPAD' ? '/register_ipad' : '/register';
                response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ user_id: idToProcess, image_base64: faceBase64 })
                });
            } else {
                response = await fetch(`/unregister`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({ user_id: idToProcess })
                });
            }

            const data = await response.json();

            if (response.ok) {
                notify(`${action === 'register' ? 'Đã đăng ký' : 'Đã xóa'} mẫu khuôn mặt của: ${idToProcess}`, "success");
                if (action === 'unregister') {
                    setUserId("");
                    setTimeout(resetProcessingState, 2000);
                } else {
                    if (statusRef.current) {
                        statusRef.current.innerText = "✅ ĐĂNG KÝ HOÀN TẤT! ĐANG CHUYỂN TRANG...";
                        statusRef.current.className = "w-full max-w-[700px] mt-4 p-4 bg-[#1e293b] rounded-2xl border border-white/10 text-center text-sm font-semibold tracking-wide text-[#2ed573] shadow-sm transition-all";
                    }
                    setTimeout(() => {
                        if (idToProcess === "HUNGND") {
                            router.push("/employees");
                        } else {
                            router.push("/dashboard");
                        }
                    }, 3000);
                }
            } else {
                notify(data.detail || data.message || "Thất bại", "error");
                handleErrorState();
            }
        } catch (err) {
            notify("Lỗi kết nối Server!", "error");
            handleErrorState("❌ LỖI MẠNG");
        }
    };

    const initFaceDetection = () => {
        // @ts-ignore
        const fd = new window.FaceDetection({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        });

        fd.setOptions({ model: 'short', minDetectionConfidence: 0.7 });
        fd.onResults(onResults);
        faceDetectionRef.current = fd;
        setIsReady(true);
    };

    const processVideoFrame = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2 && !isFaceDetectionRunning.current && faceDetectionRef.current) {
            isFaceDetectionRunning.current = true;
            await faceDetectionRef.current.send({ image: videoRef.current });
        }
        animationFrameId.current = requestAnimationFrame(processVideoFrame);
    };

    // GIỮ NGUYÊN LOGIC XIN QUYỀN CAMERA (CAPACITOR + NAVIGATOR)
    useEffect(() => {
        const startCamera = async () => {
            try {
                // Request camera permission explicitly for Android/iOS via Capacitor
                try {
                    const { Camera } = await import('@capacitor/camera');
                    await Camera.requestPermissions();
                } catch (e) {
                    console.log("Capacitor camera permission request skipped:", e);
                }

                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err: any) {
                notify("Lỗi truy cập camera: " + err.message, "error");
            }
        };
        startCamera();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            if (videoRef.current?.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(t => t.stop());
            }
        };
    }, [notify]);

    useEffect(() => {
        if (isReady && videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
                processVideoFrame();
            };
        }
    }, [isReady]);

    const onResults = (results: any) => {
        isFaceDetectionRunning.current = false;

        if (results.detections.length > 0) {
            if (results.detections.length > 1) {
                holdStartTime.current = 0;
                if (!isProcessing.current) updateUI("⚠️ CÓ NHIỀU NGƯỜI TRONG KHUNG HÌNH!", "text-[#ff4757]", "default");
                return;
            }

            lastDetection.current = results.detections[0].boundingBox;
            const landmarks = results.detections[0].landmarks;
            const faceSize = lastDetection.current.width;
            const faceX = lastDetection.current.xCenter;
            const faceY = lastDetection.current.yCenter;

            if (distanceFillRef.current) {
                distanceFillRef.current.style.width = `${faceSize * 100}%`;
            }

            let isCentered = (faceX > CENTER_X_MIN && faceX < CENTER_X_MAX) && (faceY > CENTER_Y_MIN && faceY < CENTER_Y_MAX);
            let isStraight = true;
            let poseWarning = "";

            if (landmarks && landmarks.length >= 3) {
                const eyeR = landmarks[0], eyeL = landmarks[1], nose = landmarks[2];
                const eyeDistX = Math.abs(eyeL.x - eyeR.x);
                const eyeDistY = Math.abs(eyeL.y - eyeR.y);

                if (eyeDistY / eyeDistX > 0.35) {
                    isStraight = false;
                    poseWarning = `⚠️ VUI LÒNG GIỮ THẲNG ĐẦU`;
                } else {
                    const noseDistL = Math.abs(nose.x - eyeL.x);
                    const noseDistR = Math.abs(nose.x - eyeR.x);
                    if (Math.abs(noseDistL - noseDistR) / eyeDistX > 0.35) {
                        isStraight = false;
                        poseWarning = `⚠️ VUI LÒNG NHÌN THẲNG CAMERA`;
                    }
                }
            }

            let isValid = true;
            let currentWarning = "";

            // Kiểm tra ID trực tiếp từ state thay vì lấy từ input element
            if (!userId.trim()) {
                isValid = false;
                currentWarning = "VUI LÒNG NHẬP MÃ NHÂN VIÊN ĐỂ BẮT ĐẦU";
            } else if (!isCentered) {
                isValid = false;
                currentWarning = "HÃY ĐƯA MẶT VÀO GIỮA KHUNG";
            } else if (!isStraight) {
                isValid = false;
                currentWarning = poseWarning;
            } else if (faceSize < FACE_MIN_SIZE) {
                isValid = false;
                currentWarning = "HÃY LẠI GẦN HƠN";
            } else if (faceSize > FACE_MAX_SIZE) {
                isValid = false;
                currentWarning = "HÃY ĐỨNG XA RA CHÚT";
            }

            if (!isProcessing.current) {
                if (!isValid) {
                    holdStartTime.current = 0;
                    const warningColor = currentWarning.includes("MÃ NHÂN VIÊN") ? "text-[#007bff]" : "text-[#ffb800]";
                    updateUI(currentWarning, warningColor, "default");
                } else {
                    if (regBtnRef.current) regBtnRef.current.disabled = false;

                    if (holdStartTime.current === 0) holdStartTime.current = Date.now();
                    let elapsed = Date.now() - holdStartTime.current;
                    let remaining = Math.ceil((HOLD_DURATION - elapsed) / 1000);

                    if (elapsed < HOLD_DURATION) {
                        updateUI(`GIỮ NGUYÊN TƯ THẾ TRONG ${remaining}s...`, "text-[#ffb800]", "active");
                    } else {
                        updateUI("KIỂM TRA CHẤT LƯỢNG ẢNH...", "text-[#2ed573]", "success");
                        const faceBase64 = captureCroppedFace();
                        if (canvasRef.current && faceBase64) {
                            const isSharp = isImageSharp(canvasRef.current);
                            const isGoodLight = isLightingGood(canvasRef.current);

                            if (!isSharp || !isGoodLight) {
                                const errorMsg = !isSharp ? "⚠️ ẢNH ĐANG MỜ, HÃY GIỮ YÊN ĐẦU..." : "⚠️ ÁNH SÁNG KHÔNG ĐẢM BẢO...";
                                updateUI(errorMsg, "text-[#ff4757]", "default");
                                holdStartTime.current = 0;
                            } else {
                                updateUI("✅ ẢNH ĐẠT CHUẨN, ĐANG ĐĂNG KÝ...", "text-[#2ed573]", "success");
                                handleAction('register', faceBase64);
                            }
                        }
                    }
                }
            }
        } else {
            lastDetection.current = null;
            if (distanceFillRef.current) distanceFillRef.current.style.width = "0%";
            holdStartTime.current = 0;
            if (!isProcessing.current) updateUI("KHÔNG TÌM THẤY KHUÔN MẶT", "text-slate-400", "default");
        }
    };

    const updateUI = (text: string, textColor: string, guideState: 'default' | 'active' | 'success') => {
        if (statusRef.current) {
            statusRef.current.innerText = text;
            statusRef.current.className = `w-full max-w-[700px] mt-4 p-4 bg-[#1e293b] rounded-2xl border border-white/10 text-center text-sm font-semibold tracking-wide shadow-sm transition-colors ${textColor}`;
        }
        if (guideCircleRef.current) {
            const baseClass = "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%/45%] w-[260px] h-[340px] z-10 transition-all duration-300 pointer-events-none ";
            if (guideState === 'default') {
                guideCircleRef.current.className = baseClass + "border-2 border-dashed border-white/30";
            } else if (guideState === 'active') {
                guideCircleRef.current.className = baseClass + "border-[3px] border-solid border-[#ffb800] shadow-[0_0_20px_rgba(255,184,0,0.2)] bg-[#ffb800]/5";
            } else {
                guideCircleRef.current.className = baseClass + "border-[3px] border-solid border-[#2ed573] shadow-[0_0_20px_rgba(46,213,115,0.2)] bg-[#2ed573]/5";
            }
        }
        if (regBtnRef.current && guideState === 'default') {
            regBtnRef.current.disabled = true;
        }
    };

    return (
        <div className="flex flex-col items-center h-[100dvh] bg-[#0f172a] p-4 overflow-hidden box-border font-sans relative">
            <Script
                src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection"
                strategy="lazyOnload"
                onLoad={initFaceDetection}
            />

            <div
                className={`fixed top-5 right-5 px-6 py-4 rounded-xl text-white font-bold z-[1000] shadow-xl transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${toast ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'
                    } ${toast?.type === 'error' ? 'bg-[#ff4757]' : 'bg-[#2ed573]'}`}
            >
                {toast?.msg}
            </div>

            <div className="w-full max-w-[700px] flex justify-start z-50 absolute top-4 left-4 md:static md:top-auto md:left-auto md:mb-2">
                <Link
                    href="/employees"
                    className="bg-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-white/10 shadow-sm transition-all hover:bg-white/20 backdrop-blur-sm"
                >
                    ⬅ Quay lại
                </Link>
            </div>

            <header className="w-full max-w-[700px] text-center mt-14 md:mt-2 shrink-0">
                <h2 className="text-[#007bff] text-xl font-bold uppercase tracking-wide">ĐĂNG KÝ NHÂN VIÊN MỚI</h2>

                <div
                    ref={statusRef}
                    className="w-full max-w-[700px] mt-4 p-4 bg-[#1e293b] rounded-2xl border border-white/10 text-center text-sm font-semibold tracking-wide text-slate-400 shadow-sm transition-colors"
                >
                    VUI LÒNG ĐƯA MẶT VÀO KHUNG
                </div>
            </header>

            <hr className="w-full max-w-[700px] border-slate-700/50 mt-6 mb-2" />

            <div className="relative w-full max-w-[700px] flex-1 bg-black rounded-[2rem] overflow-hidden my-2 shadow-md border border-slate-700/50">
                <div ref={guideCircleRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%/45%] w-[260px] h-[340px] z-10 transition-all duration-300 pointer-events-none border-2 border-dashed border-white/30"></div>
                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>

            <hr className="w-full max-w-[700px] border-slate-700/50 mb-6 mt-2" />

            <div className="w-full max-w-[700px] flex flex-col gap-3 shrink-0 mb-4">
                <input
                    id="userIdInput"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Mã nhân viên (VD: NV01)..."
                    autoComplete="off"
                    className="w-full p-4 rounded-2xl border border-white/10 bg-[#1e293b] text-white font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#007bff] transition-all shadow-sm"
                />

                <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-white/10 bg-[#1e293b] text-white font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#007bff] transition-all appearance-none cursor-pointer shadow-sm"
                >
                    <option value="MAIN">Thiết bị: Máy chủ (MAIN)</option>
                    <option value="IPAD">Thiết bị: Máy tính bảng (IPAD)</option>
                </select>

                <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                        ref={regBtnRef}
                        onClick={() => handleAction('register')}
                        disabled
                        className="p-4 rounded-2xl font-bold transition-all bg-[#007bff] text-white disabled:bg-slate-600 disabled:text-slate-400 disabled:opacity-70 shadow-sm active:scale-95 flex justify-center items-center gap-2"
                    >
                        <span className="text-xl leading-none">+</span> ĐĂNG KÝ
                    </button>

                    <button
                        onClick={() => handleAction('unregister')}
                        className="p-4 rounded-2xl font-bold transition-all bg-[#ff4757] text-white hover:bg-red-600 shadow-sm active:scale-95 flex justify-center items-center gap-2"
                    >
                        <span>🗑️</span> XÓA ID
                    </button>
                </div>
            </div>
        </div>
    );
}