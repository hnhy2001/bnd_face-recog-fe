"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./verify_personal.css"; // Nhớ import file CSS em vừa tạo
import { API_BASE_URL } from "@/lib/api-client";

// TỌA ĐỘ BỆNH VIỆN
const HOSPITAL_ZONE = [
    { lat: 21.132651, lng: 105.774238 },
    { lat: 21.131013, lng: 105.776601 },
    { lat: 21.130023, lng: 105.773278 },
    { lat: 21.130553, lng: 105.772459 },
];

const FACE_MIN_SIZE = 0.4;
const FACE_MAX_SIZE = 0.75;
const CENTER_X_MIN = 0.3;
const CENTER_X_MAX = 0.7;
const CENTER_Y_MIN = 0.3;
const CENTER_Y_MAX = 0.7;

export default function VerifyPersonalPage() {
    const router = useRouter();

    // --- STATE CHO GIAO DIỆN ---
    const [clock, setClock] = useState("00:00:00");
    const [userId, setUserId] = useState("...");
    const [netBanner, setNetBanner] = useState({ class: "net-checking", text: "🔄 Đang kiểm tra Mạng & Phân quyền...", show: true });
    const [locBanner, setLocBanner] = useState({ class: "net-checking", text: "📍 Đang lấy tọa độ GPS...", show: false });
    const [resultBox, setResultBox] = useState({ class: "status-scanning", html: '<div class="loader"></div> ĐANG KHỞI TẠO CAMERA...' });
    const [isGuideActive, setIsGuideActive] = useState(false);
    const [showScanBar, setShowScanBar] = useState(false);

    // Trạng thái nút force
    const [forceBtn, setForceBtn] = useState({ show: false, active: false, text: "👤 Đưa mặt vào khung để gửi...", disabled: true, loading: false });

    // --- REFS LƯU TRỮ LOGIC NGẦM ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);
    const faceDetectionRef = useRef<any>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);

    // Biến logic
    const refs = useRef({
        userConfig: { checkMang: 1, checkViTri: 1, ccCaNhan: 1 },
        isNetworkValid: false,
        isLocationValid: false,
        currentPublicIp: "",
        currentPoint: { lat: 0, lng: 0 },
        isProcessing: false,
        lastDetection: null as any,
        isFaceDetectionRunning: false,
        lastProcessingTime: 0,
        failCount: 0,
        onScreenStartTime: 0,
        networkCheckDone: false,
        locationCheckDone: false,
        screenInitTime: "",
        animationId: 0,
    });

    // 1. Đồng hồ & Khởi tạo (ĐÃ SỬA ĐỂ TEST LỖI VĂNG LOGIN)
    useEffect(() => {
        // Load User ID và in ra log để debug
        const storedUser = localStorage.getItem("hrm_username");
        console.log("=== DEBUG USER ===", storedUser);

        if (!storedUser) {
            // Tạm thời vô hiệu hóa lệnh đá văng ra ngoài
            // alert("Vui lòng đăng nhập!");
            // router.push("/login");

            // Hiện chữ này lên màn hình để biết là do lỗi localStorage
            setUserId("LỖI: KHÔNG ĐỌC ĐƯỢC LOCALSTORAGE");
        } else {
            setUserId(storedUser.toUpperCase());
        }

        const nowInit = new Date();
        refs.current.screenInitTime = `${nowInit.toLocaleTimeString("vi-VN")} ${nowInit.toLocaleDateString("vi-VN")}`;
        refs.current.onScreenStartTime = Date.now();

        const timer = setInterval(() => {
            setClock(new Date().toLocaleTimeString("vi-VN", { hour12: false }));
        }, 1000);

        return () => {
            clearInterval(timer);
            // Em thêm cái này để đảm bảo giải phóng camera khi unmount
            if (refs.current.animationId) {
                cancelAnimationFrame(refs.current.animationId);
            }
            stopCamera();
        };
    }, [router]);

    // 2. Logic kiểm tra mạng và GPS
    const updateBannersUI = useCallback(() => {
        const r = refs.current;

        if (!r.networkCheckDone) {
            setNetBanner({ class: "net-checking", text: "📍 Đang kiểm tra thông tin...", show: true });
            setLocBanner((prev) => ({ ...prev, show: false }));
            return;
        }

        if (r.networkCheckDone && r.isNetworkValid) {
            setNetBanner({ class: "net-valid", text: "✅ Địa điểm chấm công hợp lệ", show: true });
            setLocBanner((prev) => ({ ...prev, show: false }));
            return;
        }

        if (r.networkCheckDone && !r.isNetworkValid) {
            setNetBanner({ class: "net-invalid", text: "❌ Địa điểm chấm công không hợp lệ!", show: true });

            if (!r.locationCheckDone) {
                setLocBanner({ class: "net-checking", text: "📍 Kiểm tra bước 2... (Vui lòng chờ)", show: true });
            } else {
                if (r.isLocationValid) {
                    setLocBanner({ class: "net-valid", text: "✅ Địa điểm chấm công hợp lệ", show: true });
                    setNetBanner((prev) => ({ ...prev, show: false }));
                } else {
                    setLocBanner({ class: "net-invalid", text: "❌ Bạn đang đứng ngoài khuôn viên!", show: true });
                }
            }
        }
    }, []);

    const verifyNetworkAndLocation = useCallback(async () => {
        const r = refs.current;
        // BƯỚC 1: MẠNG
        try {
            const ipRes = await fetch("https://api.ipify.org?format=json");
            const ipData = await ipRes.json();
            r.currentPublicIp = ipData.ip;

            const res = await fetch(`${API_BASE_URL}/api/check-ip`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                body: JSON.stringify({ user_id: localStorage.getItem("hrm_username"), client_public_ip: r.currentPublicIp }),
            });
            const data = await res.json();

            r.userConfig = { checkMang: data.checkMang, checkViTri: data.checkViTri, ccCaNhan: data.ccCaNhan };

            if (r.userConfig.ccCaNhan === 0) {
                setResultBox({ class: "status-err", html: "❌ TÀI KHOẢN BỊ CẤM CHẤM CÔNG CÁ NHÂN" });
                r.isProcessing = true;
                setNetBanner((prev) => ({ ...prev, show: false }));
                setLocBanner((prev) => ({ ...prev, show: false }));
                stopCamera();
                return;
            }
            r.isNetworkValid = r.userConfig.checkMang === 0 ? true : data.valid;
        } catch (e) {
            r.isNetworkValid = false;
        }

        r.networkCheckDone = true;
        updateBannersUI();

        if (r.isNetworkValid || r.userConfig.checkViTri === 0) {
            r.locationCheckDone = true;
            r.isLocationValid = true;
            return;
        }

        // BƯỚC 2: GPS
        if (!navigator.geolocation) {
            r.isLocationValid = false;
        } else {
            const getGPS = new Promise<boolean>((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        r.currentPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
                        const isInside = isPointInPolygon(r.currentPoint, HOSPITAL_ZONE);
                        resolve(isInside);
                    },
                    () => resolve(false),
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                );
            });
            const timeoutHuy = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 9000));
            r.isLocationValid = await Promise.race([getGPS, timeoutHuy]);
        }
        r.locationCheckDone = true;
        updateBannersUI();
    }, [updateBannersUI]);

    // 3. Logic Utils
    const isPointInPolygon = (point: { lat: number; lng: number }, polygon: any[]) => {
        let x = point.lng, y = point.lat;
        let isInside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            let xi = polygon[i].lng, yi = polygon[i].lat;
            let xj = polygon[j].lng, yj = polygon[j].lat;
            let intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) isInside = !isInside;
        }
        return isInside;
    };

    const stopCamera = () => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsGuideActive(false);
        setShowScanBar(false);
    };

    // 4. Các hàm chụp ảnh
    const captureCroppedFace = () => {
        const r = refs.current;
        const video = videoRef.current;
        const canvas = cropCanvasRef.current;
        if (!r.lastDetection || !video || !canvas) return null;

        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        let { xCenter, yCenter, width, height } = r.lastDetection;
        const padding = 0.3;

        let cropW = width * (1 + padding) * videoW;
        let cropH = height * (1 + padding) * videoH;
        let startX = Math.max(0, xCenter * videoW - cropW / 2);
        let startY = Math.max(0, yCenter * videoH - cropH / 2);
        cropW = Math.min(videoW - startX, cropW);
        cropH = Math.min(videoH - startY, cropH);

        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.translate(224, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, 224, 224);
        return canvas.toDataURL("image/jpeg", 0.85);
    };

    const captureFullFrame = () => {
        const video = videoRef.current;
        if (!video) return null;
        const tempCanvas = document.createElement("canvas");
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        tempCanvas.width = video.videoWidth * scale;
        tempCanvas.height = video.videoHeight * scale;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return null;
        ctx.translate(tempCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        return tempCanvas.toDataURL("image/jpeg", 0.7);
    };

    const captureEvidenceFrame = () => {
        const video = videoRef.current;
        const r = refs.current;
        if (!video) return null;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

        const barH = 52;
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, tempCanvas.height - barH, tempCanvas.width, barH);

        const now = new Date();
        const timestamp = now.toLocaleString("vi-VN", { hour12: false });
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px monospace";
        ctx.fillText(`${userId}`, 14, tempCanvas.height - barH + 22);
        ctx.font = "15px monospace";
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(`${timestamp}`, 14, tempCanvas.height - barH + 42);

        ctx.fillStyle = "#aaaaaa";
        ctx.font = "13px monospace";
        const ipText = `IP: ${r.currentPublicIp || "N/A"}`;
        const ipW = ctx.measureText(ipText).width;
        ctx.fillText(ipText, tempCanvas.width - ipW - 12, tempCanvas.height - barH + 22);

        if (r.currentPoint.lat !== 0) {
            const gpsText = `${r.currentPoint.lat.toFixed(6)}, ${r.currentPoint.lng.toFixed(6)}`;
            const gpsW = ctx.measureText(gpsText).width;
            ctx.fillText(gpsText, tempCanvas.width - gpsW - 12, tempCanvas.height - barH + 42);
        }
        return tempCanvas.toDataURL("image/jpeg", 0.97);
    };

    const sendAccessLog = () => {
        setTimeout(() => {
            try {
                const initialImage = captureFullFrame();
                fetch(`${API_BASE_URL}/api/log-access`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                    body: JSON.stringify({
                        user_id: localStorage.getItem("hrm_username"),
                        ip_address: refs.current.currentPublicIp || "Unknown",
                        latitude: refs.current.currentPoint.lat || null,
                        longitude: refs.current.currentPoint.lng || null,
                        image_base64: initialImage,
                        event_type: "OPEN_ATTENDANCE_SCREEN",
                        note: `Truy cập lúc: ${refs.current.screenInitTime}`,
                    }),
                }).catch((e) => console.warn("Lỗi ghi log truy cập:", e));
            } catch (error) {
                console.warn("Không thể chụp ảnh log:", error);
            }
        }, 1000);
    };

    // 5. Check nút force
    const checkForceButtonCondition = () => {
        const r = refs.current;
        setForceBtn((prev) => {
            if (prev.show) return prev;
            const onScreenSeconds = (Date.now() - r.onScreenStartTime) / 1000;
            if (r.failCount >= 5 && onScreenSeconds >= 60) {
                return { ...prev, show: true };
            }
            return prev;
        });
    };

    // Logic interval cho Nút Force
    useEffect(() => {
        if (!forceBtn.show || forceBtn.loading) return;
        const interval = setInterval(() => {
            if (refs.current.lastDetection) {
                setForceBtn(prev => ({ ...prev, active: true, disabled: false, text: '📋 Gửi báo lỗi & Chấm công thủ công' }));
            } else {
                setForceBtn(prev => ({ ...prev, active: false, disabled: true, text: '👤 Đưa mặt vào khung để gửi...' }));
            }
        }, 300);
        return () => clearInterval(interval);
    }, [forceBtn.show, forceBtn.loading]);


    const handleForceCheckin = async () => {
        if (!refs.current.lastDetection) {
            setResultBox({ class: "status-warning", html: "⚠️ VUI LÒNG ĐƯA MẶT VÀO KHUNG TRƯỚC KHI GỬI" });
            return;
        }

        setForceBtn(prev => ({ ...prev, disabled: true, loading: true, text: '⏳ Đang gửi...' }));
        refs.current.isProcessing = true;
        setResultBox({ class: "status-scanning", html: '<div class="loader"></div> ĐANG GỬI BÁO LỖI...' });

        try {
            const evidenceImage = captureEvidenceFrame();
            const croppedImage = captureCroppedFace();

            const response = await fetch(`${API_BASE_URL}/api/verify-personal`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                body: JSON.stringify({
                    user_id: localStorage.getItem("hrm_username"),
                    image_base64: croppedImage,
                    client_public_ip: refs.current.currentPublicIp,
                    full_image_base64: evidenceImage,
                    latitude: refs.current.currentPoint.lat,
                    longitude: refs.current.currentPoint.lng,
                    attendance_type: "Cá nhân",
                    force_checkin: true,
                    note: `[BÁO LỖI] Thất bại ${refs.current.failCount} lần. Onscreen: ${Math.round((Date.now() - refs.current.onScreenStartTime) / 1000)}s. Khởi tạo: ${refs.current.screenInitTime}`,
                }),
            });

            const data = await response.json();
            setResultBox({ class: "status-ok", html: "✅ ĐÃ GỬI - CHẤM CÔNG THỦ CÔNG THÀNH CÔNG" });
            setForceBtn(prev => ({ ...prev, show: false }));

            const today = new Date();
            localStorage.setItem("checkout_done_date", today.toISOString().split('T')[0]);
            setTimeout(() => { router.push("/attendance"); }, 2500);
        } catch (e) {
            setResultBox({ class: "status-err", html: "⚠️ LỖI GỬI BÁO CÁO" });
            setForceBtn(prev => ({ ...prev, disabled: false, loading: false }));
            refs.current.isProcessing = false;
        }
    };

    const sendToAPI = useCallback(async () => {
        const r = refs.current;
        r.isProcessing = true;
        setResultBox({ class: "status-scanning", html: '<div class="loader"></div> ĐANG XÁC THỰC 1:1...' });

        try {
            const croppedImage = captureCroppedFace();
            const fullImage = captureFullFrame();
            if (!croppedImage) { r.isProcessing = false; return; }

            const response = await fetch(`${API_BASE_URL}/api/verify-personal`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
                body: JSON.stringify({
                    user_id: localStorage.getItem("hrm_username"),
                    image_base64: croppedImage,
                    client_public_ip: r.currentPublicIp,
                    full_image_base64: fullImage,
                    latitude: r.currentPoint.lat,
                    longitude: r.currentPoint.lng,
                    attendance_type: "Cá nhân",
                    note: `Thời gian mở màn hình: ${r.screenInitTime}`,
                }),
            });

            const data = await response.json();

            if (data.recognized) {
                setResultBox({ class: "status-ok", html: "✅ CHẤM CÔNG THÀNH CÔNG" });
                const today = new Date();
                localStorage.setItem("checkout_done_date", today.toISOString().split('T')[0]);
                setTimeout(() => { router.push("/attendance"); }, 2000);
            } else {
                r.failCount++;
                setResultBox({ class: "status-err", html: data.message.toUpperCase() });
                checkForceButtonCondition();
                setTimeout(() => { r.isProcessing = false; }, 2000);
            }
        } catch (e) {
            setResultBox({ class: "status-err", html: "⚠️ LỖI KẾT NỐI SERVER" });
            setTimeout(() => { refs.current.isProcessing = false; }, 2000);
        }
    }, [router]);

    // Khởi chạy sau khi load xong script AI
    const initFaceDetectionAndCamera = useCallback(async () => {
        verifyNetworkAndLocation();

        try {
            // Request camera permission explicitly for Android/iOS via Capacitor
            try {
                const { Camera } = await import('@capacitor/camera');
                await Camera.requestPermissions();
            } catch (e) {
                console.log("Capacitor camera permission request skipped:", e);
            }

            cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 } },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = cameraStreamRef.current;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch((e) => console.warn(e));

                    // Setup Mediapipe
                    // @ts-ignore - Vì FaceDetection đến từ script CDN
                    faceDetectionRef.current = new window.FaceDetection({
                        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
                    });
                    faceDetectionRef.current.setOptions({ model: "short", minDetectionConfidence: 0.7 });

                    faceDetectionRef.current.onResults((results: any) => {
                        const r = refs.current;
                        r.isFaceDetectionRunning = false;
                        const isSystemChecking = !r.networkCheckDone || (!r.locationCheckDone && !r.isNetworkValid);

                        if (results.detections.length > 0) {
                            r.lastDetection = results.detections[0].boundingBox;
                            const { width: faceSize, xCenter: faceX, yCenter: faceY } = r.lastDetection;
                            const isCentered = faceX > CENTER_X_MIN && faceX < CENTER_X_MAX && faceY > CENTER_Y_MIN && faceY < CENTER_Y_MAX;

                            if (isSystemChecking) {
                                setIsGuideActive(false); setShowScanBar(false);
                                if (!r.isProcessing) setResultBox({ class: "status-scanning", html: '<div class="loader"></div> ĐANG XÁC THỰC VỊ TRÍ...' });
                                return;
                            }

                            if (!r.isNetworkValid && !r.isLocationValid) {
                                setIsGuideActive(false); setShowScanBar(false);
                                if (!r.isProcessing) setResultBox({ class: "status-err", html: "⚠️ SAI MẠNG & NGOÀI KHUÔN VIÊN" });
                                return;
                            }

                            if (!isCentered) {
                                setIsGuideActive(false);
                                if (!r.isProcessing) setResultBox({ class: "status-warning", html: "⚠️ ĐƯA MẶT VÀO GIỮA KHUNG" });
                            } else if (faceSize < FACE_MIN_SIZE) {
                                setIsGuideActive(false);
                                if (!r.isProcessing) setResultBox({ class: "status-warning", html: "⚠️ LẠI GẦN HƠN" });
                            } else if (faceSize > FACE_MAX_SIZE) {
                                setIsGuideActive(false);
                                if (!r.isProcessing) setResultBox({ class: "status-warning", html: "⚠️ ĐỨNG XA RA CHÚT" });
                            } else {
                                setIsGuideActive(true); setShowScanBar(true);
                                const now = Date.now();
                                if (!r.isProcessing && now - r.lastProcessingTime > 2000) {
                                    sendToAPI();
                                    r.lastProcessingTime = now;
                                }
                            }
                        } else {
                            r.lastDetection = null; setIsGuideActive(false); setShowScanBar(false);
                            if (isSystemChecking && !r.isProcessing) {
                                setResultBox({ class: "status-scanning", html: "ĐANG XÁC THỰC HỆ THỐNG..." });
                            } else if (!r.isProcessing && (r.isNetworkValid || r.isLocationValid) && r.userConfig.ccCaNhan !== 0) {
                                setResultBox({ class: "status-scanning", html: "SẴN SÀNG QUÉT KHUÔN MẶT" });
                            }
                        }
                    });

                    // Loop capture
                    const processVideoFrame = async () => {
                        const video = videoRef.current;
                        const r = refs.current;
                        if (video && video.readyState >= 2 && !r.isFaceDetectionRunning) {
                            r.isFaceDetectionRunning = true;
                            await faceDetectionRef.current.send({ image: video });
                        }
                        requestAnimationFrame(processVideoFrame);
                    };
                    processVideoFrame();
                    sendAccessLog();
                };
            }
        } catch (err) {
            setResultBox({ class: "status-err", html: "❌ LỖI CAMERA HOẶC TỪ CHỐI QUYỀN" });
        }
    }, [verifyNetworkAndLocation, sendToAPI]);

    return (
        <div className="attendance-wrapper">
            {/* Script AI */}
            <Script
                src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection"
                strategy="afterInteractive"
                onLoad={initFaceDetectionAndCamera}
            />

            <Link href="/dashboard" className="btn-back">⬅ Đóng</Link>

            <header>
                <h2>CHẤM CÔNG CÁ NHÂN</h2>
                <div className="live-clock">{clock}</div>
                <br />
                <div className="user-badge">👤 <strong>{userId}</strong></div>

                {netBanner.show && <div className={`net-banner ${netBanner.class}`}>{netBanner.text}</div>}
                {locBanner.show && <div className={`net-banner ${locBanner.class}`}>{locBanner.text}</div>}

                <div className={`info ${resultBox.class}`} dangerouslySetInnerHTML={{ __html: resultBox.html }} />

                {/* Nút Force checkin */}
                {forceBtn.show && (
                    <button
                        className={`force-btn ${forceBtn.active ? 'active' : ''}`}
                        disabled={forceBtn.disabled}
                        onClick={handleForceCheckin}
                    >
                        {forceBtn.text}
                    </button>
                )}
            </header>

            <div className="main-wrapper">
                <div className={`guide-overlay ${isGuideActive ? "guide-active" : ""}`}></div>
                {showScanBar && <div className="scan-bar"></div>}

                <video ref={videoRef} className="webcam" autoPlay playsInline muted></video>
                <canvas ref={cropCanvasRef} style={{ display: "none" }}></canvas>
            </div>
        </div>
    );
}