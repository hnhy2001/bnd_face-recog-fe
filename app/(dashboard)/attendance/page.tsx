"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import AttendanceDetailDrawer from "./../../../components/dashboard/attendance-detail-drawer";
import { API_BASE_URL, getImageUrl } from "@/lib/api-client";

import {
    Printer, Search, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    AlertTriangle, PenTool, Image as ImageIcon, X, Save, Eye, FileUp, CheckCircle2,
    Clock, XCircle, FileWarning
} from "lucide-react";

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface AttendanceRecord {
    id: number | string;
    username: string;
    full_name: string;
    date: string;
    shift_code: string;
    shift_display_name?: string;
    status: number;
    checkin_time?: string;
    checkout_time?: string;
    checkin_image_path?: string;
    checkout_image_path?: string;
    late_minutes: number;
    early_minutes: number;
    is_fraud: boolean;
    fraud_note?: string;
    is_explained: boolean;
    department_name?: string;
}

const getStatusText = (status: number) => {
    const map: Record<number, string> = {
        0: "Vắng mặt", 1: "Đúng giờ", 2: "Đi muộn", 3: "Về sớm",
        4: "Nghỉ phép", 5: "Nghỉ KL", 6: "Muộn&Sớm",
        7: "Đang có mặt", 8: "Chưa lịch", 9: "CĐ 7h", 10: "Quên vào",
        11: "Quên ra", 12: "Nghỉ CĐ", 13: "Đi học", 14: "Công tác",
        15: "Nghỉ bù", 16: "Thai sản", 17: "Ma chay", 18: "Con KH",
        19: "Kết hôn", 20: "Làm thêm (OT)", 21: "Nghỉ ốm", 22: "Nghỉ con ốm"
    };
    return map[status] || "Không XĐ";
};

export default function AttendanceLogPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    // --- States User/Auth ---
    const [currentUserRole, setCurrentUserRole] = useState("admin");
    const [currentUsername, setCurrentUsername] = useState("");

    // --- States Dữ liệu ---
    const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- States Bộ lọc ---
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // --- States Modals ---
    const [imageModal, setImageModal] = useState({ isOpen: false, src: "", title: "" });
    const [fraudModal, setFraudModal] = useState({ isOpen: false, id: "", note: "" });
    const [explainModal, setExplainModal] = useState({
        isOpen: false,
        username: "",
        fullName: "",
        date: "",
        shiftCode: "",
        reason: "",
        file: null as File | null,
        previewUrl: ""
    });

    const [isSubmittingFraud, setIsSubmittingFraud] = useState(false);
    const [isSubmittingExplain, setIsSubmittingExplain] = useState(false);
    const [detailDrawer, setDetailDrawer] = useState({ isOpen: false, username: "", date: "", fullName: "" });
    const [isExporting, setIsExporting] = useState(false);

    const handleExportExcelAdvanced = async () => {
        if (!filteredData || filteredData.length === 0) {
            alert("Không có dữ liệu để xuất! Vui lòng chọn khoảng thời gian có dữ liệu.");
            return;
        }

        setIsExporting(true);

        const startDt = new Date(startDate);
        const targetYear = startDt.getFullYear();
        const targetMonth = startDt.getMonth(); // 0-11
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

        try {
            const token = localStorage.getItem("hrm_token");
            let employeeDetails: Record<string, any> = {};
            let holMap: Record<string, boolean> = {};
            let leaveMap: Record<string, Record<string, any>> = {}; // Lưu trữ đơn nghỉ phép theo ngày & buổi
            let shiftsList: any[] = [];

            // 1. FETCH DỮ LIỆU BỔ TRỢ (Nhân viên, Lễ, Ca trực, Đơn nghỉ)
            try {
                const [empRes, holRes, shiftRes, leaveRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/employees?page=1&size=10000`, { headers: { "Authorization": `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/holidays/api`, { headers: { "Authorization": `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/api/shifts`, { headers: { "Authorization": `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/leave-requests/api?status=APPROVED&size=10000`, { headers: { "Authorization": `Bearer ${token}` } })
                ]);

                if (empRes.ok) {
                    const data = await empRes.json();
                    const items = data.items || data;
                    if (Array.isArray(items)) {
                        items.forEach((emp: any) => {
                            employeeDetails[emp.username.toUpperCase()] = {
                                dept: emp.department_name || "Chưa phân phòng",
                                position: emp.position || emp.job_title || emp.title || "",
                                dob: emp.date_of_birth || emp.dob || emp.birthday || ""
                            };
                        });
                    }
                }

                if (holRes.ok) {
                    const holRaw = await holRes.json();
                    const holidays = holRaw.items ? holRaw.items : (Array.isArray(holRaw) ? holRaw : []);
                    holidays.forEach((h: any) => {
                        const startDateStr = h.from_date || h.start_date || h.date;
                        const endDateStr = h.to_date || h.end_date || startDateStr;
                        if (!startDateStr) return;

                        let curr = new Date(startDateStr.includes('-') ? startDateStr : startDateStr.split('/').reverse().join('-'));
                        let endD = new Date(endDateStr.includes('-') ? endDateStr : endDateStr.split('/').reverse().join('-'));

                        if (isNaN(curr.getTime())) return;
                        curr.setHours(0, 0, 0, 0);
                        endD.setHours(0, 0, 0, 0);

                        while (curr <= endD) {
                            const y = curr.getFullYear();
                            const m = String(curr.getMonth() + 1).padStart(2, '0');
                            const d = String(curr.getDate()).padStart(2, '0');
                            holMap[`${y}-${m}-${d}`] = true;
                            curr.setDate(curr.getDate() + 1);
                        }
                    });
                }

                if (shiftRes.ok) {
                    shiftsList = await shiftRes.json();
                }

                if (leaveRes.ok) {
                    const leaveRaw = await leaveRes.json();
                    const leaves = leaveRaw.items ? leaveRaw.items : (Array.isArray(leaveRaw) ? leaveRaw : []);

                    const getCodeFromLeaveName = (name: string) => {
                        if (!name) return "P";
                        const n = name.toLowerCase();
                        if (n.includes("không lương")) return "KL";
                        if (n.includes("học")) return "HT";
                        if (n.includes("công tác")) return "CT";
                        if (n.includes("thai sản")) return "Đ";
                        if (n.includes("ma chay")) return "MC";
                        if (n.includes("kết hôn")) return "KH";
                        if (n.includes("con ốm")) return "CO";
                        if (n.includes("ốm")) return "O";
                        if (n.includes("chế độ")) return "CĐ";
                        if (n.includes("bù")) return "B";
                        return "P";
                    };

                    leaves.forEach((l: any) => {
                        if (l.status !== 'APPROVED') return;
                        let fromDateStr = l.from_date;
                        let toDateStr = l.to_date || l.from_date;

                        let curr = new Date(fromDateStr.includes('/') ? fromDateStr.split('/').reverse().join('-') : fromDateStr);
                        let endD = new Date(toDateStr.includes('/') ? toDateStr.split('/').reverse().join('-') : toDateStr);
                        if (isNaN(curr.getTime())) return;

                        curr.setHours(0, 0, 0, 0);
                        endD.setHours(0, 0, 0, 0);
                        const fromTime = curr.getTime();
                        const toTime = endD.getTime();

                        const leaveCode = getCodeFromLeaveName(l.type_name);
                        const empUsernameUpper = l.username.toUpperCase();

                        while (curr <= endD) {
                            const y = curr.getFullYear();
                            const m = String(curr.getMonth() + 1).padStart(2, '0');
                            const d = String(curr.getDate()).padStart(2, '0');
                            const dStr = `${y}-${m}-${d}`;

                            if (!leaveMap[empUsernameUpper]) leaveMap[empUsernameUpper] = {};

                            let sessionText = "Cả ngày";
                            if (fromTime === toTime) {
                                if (l.from_session === "Sáng" && l.to_session === "Chiều") sessionText = "Cả ngày";
                                else sessionText = l.from_session || "Cả ngày";
                            } else {
                                if (curr.getTime() === fromTime) sessionText = l.from_session || "Cả ngày";
                                else if (curr.getTime() === toTime) sessionText = l.to_session || "Cả ngày";
                                else sessionText = "Cả ngày";
                            }

                            leaveMap[empUsernameUpper][dStr] = { session: sessionText, code: leaveCode };
                            curr.setDate(curr.getDate() + 1);
                        }
                    });
                }
            } catch (err) {
                console.error("Lỗi tải dữ liệu bổ trợ (Lễ, Đơn nghỉ...)", err);
            }

            // 2. NHÓM DỮ LIỆU THEO KHOA/PHÒNG
            const groupedByDept = filteredData.reduce((acc: any, curr: any) => {
                const upperUsername = curr.username.toUpperCase();
                const empInfo = employeeDetails[upperUsername] || { dept: "Chưa phân phòng", position: "", dob: "" };
                const dept = empInfo.dept;

                if (!acc[dept]) acc[dept] = {};
                if (!acc[dept][upperUsername]) {
                    acc[dept][upperUsername] = {
                        fullName: curr.full_name,
                        username: curr.username,
                        position: empInfo.position,
                        dob: empInfo.dob,
                        records: []
                    };
                }
                acc[dept][upperUsername].records.push(curr);
                return acc;
            }, {});

            const dateList: string[] = [];
            for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dateList.push(`${y}-${m}-${day}`);
            }

            /* =========================================================
               FILE 1: BÁO CÁO THỐNG KÊ CHI TIẾT 4 NHÓM
            ========================================================= */
            const wb1 = new ExcelJS.Workbook();
            wb1.creator = 'HRM System';
            const summaryHeaders = ['Tổng số ca', 'Hợp lệ (ca)', 'Vi phạm (ca)', 'Nghỉ chế độ (ca)', 'Nghỉ KL (ca)'];

            Object.keys(groupedByDept).forEach(deptName => {
                const sheet = wb1.addWorksheet(deptName.substring(0, 31));
                const users = groupedByDept[deptName];

                const totalCols = 3 + summaryHeaders.length + dateList.length;
                sheet.mergeCells(1, 1, 1, totalCols);
                const titleCell = sheet.getCell(1, 1);
                titleCell.value = `BÁO CÁO THỐNG KÊ CHẤM CÔNG - TỪ ${startDate.split('-').reverse().join('/')} ĐẾN ${endDate.split('-').reverse().join('/')}`;
                titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF00524C' } };
                titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
                titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
                sheet.getRow(1).height = 30;

                sheet.addRow([]);

                const headerRowData = ['STT', 'Mã NV', 'Họ Tên', ...summaryHeaders, ...dateList.map(d => d.split('-').reverse().slice(0, 2).join('/'))];
                const headerRow = sheet.addRow(headerRowData);

                headerRow.eachCell((cell, colNumber) => {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                    if (colNumber > 3 + summaryHeaders.length) {
                        const dateIndex = colNumber - 4 - summaryHeaders.length;
                        const dateStr = dateList[dateIndex];
                        const dObj = new Date(dateStr);
                        const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
                        if (isWeekend || holMap[dateStr]) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
                        }
                    }
                });

                sheet.getColumn(1).width = 5;
                sheet.getColumn(2).width = 12;
                sheet.getColumn(3).width = 25;
                for (let i = 0; i < summaryHeaders.length; i++) sheet.getColumn(4 + i).width = 16;
                for (let i = 0; i < dateList.length; i++) sheet.getColumn(4 + summaryHeaders.length + i).width = 28;

                let stt = 1;
                Object.keys(users).forEach(upperUsername => {
                    const userData = users[upperUsername];
                    let uStats = { totalShifts: 0, validCount: 0, violationCount: 0, leaveCheDoCount: 0, leaveKLCount: 0 };

                    const dateValues = dateList.map(date => {
                        const dayRecords = userData.records.filter((r: any) => (r.date || "").split('T')[0] === date);

                        if (dayRecords.length > 0) {
                            let richTextArray: any[] = [];
                            dayRecords.forEach((r: any, index: number) => {
                                uStats.totalShifts += 1;
                                const s = r.status;
                                const shift = r.shift_code || '---';

                                let bigStatus = "❓ KHÁC";
                                let fontColor = 'FF475569';

                                if ([1, 7, 9, 13, 14, 20].includes(s)) {
                                    uStats.validCount += 1;
                                    bigStatus = "✅ HỢP LỆ"; fontColor = 'FF059669';
                                } else if ([0, 2, 3, 6, 8, 10, 11].includes(s)) {
                                    uStats.violationCount += 1;
                                    bigStatus = "🚨 VI PHẠM"; fontColor = 'FFDC2626';
                                } else if ([4, 12, 15, 16, 17, 18, 19, 21, 22].includes(s)) {
                                    uStats.leaveCheDoCount += 1;
                                    bigStatus = "🏖️ NGHỈ CHẾ ĐỘ"; fontColor = 'FF0284C7';
                                } else if (s === 5) {
                                    uStats.leaveKLCount += 1;
                                    bigStatus = "⏸️ NGHỈ KL"; fontColor = 'FFEA580C';
                                }

                                let textLine = `[${shift}]: ${bigStatus} - ${getStatusText(s)}`;
                                if (index < dayRecords.length - 1) textLine += '\n';

                                richTextArray.push({
                                    font: { name: 'Arial', size: 11, color: { argb: fontColor } },
                                    text: textLine
                                });
                            });
                            return { richText: richTextArray };
                        }
                        return '-';
                    });

                    const fmtVal = (val: number) => val > 0 ? val : '-';

                    const rowData = [
                        stt++, userData.username, userData.fullName,
                        fmtVal(uStats.totalShifts), fmtVal(uStats.validCount), fmtVal(uStats.violationCount), fmtVal(uStats.leaveCheDoCount), fmtVal(uStats.leaveKLCount),
                        ...dateValues
                    ];

                    const dataRow = sheet.addRow(rowData);

                    dataRow.eachCell((cell, colNum) => {
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        cell.alignment = { vertical: 'middle', horizontal: colNum > 3 ? 'center' : 'left', wrapText: true };

                        if (colNum === 5) cell.font = { color: { argb: 'FF059669' }, bold: true };
                        else if (colNum === 6) cell.font = { color: { argb: 'FFDC2626' }, bold: true };
                        else if (colNum === 7) cell.font = { color: { argb: 'FF0284C7' }, bold: true };
                        else if (colNum === 8) cell.font = { color: { argb: 'FFEA580C' }, bold: true };

                        if (colNum > 3 + summaryHeaders.length) {
                            const dateIndex = colNum - 4 - summaryHeaders.length;
                            const dateStr = dateList[dateIndex];
                            const dObj = new Date(dateStr);
                            if (dObj.getDay() === 0 || dObj.getDay() === 6 || holMap[dateStr]) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                            }
                        }
                    });
                });
            });

            /* =========================================================
               FILE 2: BẢNG CHẤM CÔNG TRUYỀN THỐNG (FORM GIẤY)
            ========================================================= */
            const wb2 = new ExcelJS.Workbook();
            wb2.creator = 'HRM System';

            const getLeaveCode = (status: number, shiftCode: string) => {
                const map: Record<number, string> = {
                    4: "P", 5: "KL", 12: "CĐ", 13: "HT", 14: "CT", 15: "B", 16: "Đ", 17: "MC", 18: "KH", 19: "KH", 21: "O", 22: "CO", 0: "N"
                };
                return map[status] || shiftCode || 'X';
            };

            Object.keys(groupedByDept).forEach(deptName => {
                const sheet2 = wb2.addWorksheet(deptName.substring(0, 31));
                const users = groupedByDept[deptName];

                sheet2.mergeCells('A1:D1');
                const h1 = sheet2.getCell('A1');
                h1.value = 'BỆNH VIỆN BỆNH NHIỆT ĐỚI TW';
                h1.font = { name: 'Times New Roman', size: 11, bold: true };
                h1.alignment = { horizontal: 'center', vertical: 'middle' };

                sheet2.mergeCells('A2:D2');
                const h2 = sheet2.getCell('A2');
                h2.value = `Khoa/phòng: ${deptName}`;
                h2.font = { name: 'Times New Roman', size: 11, bold: true };
                h2.alignment = { horizontal: 'center', vertical: 'middle' };

                const titleColStart = 5;
                const titleColEnd = 4 + daysInMonth + 5;
                sheet2.mergeCells(1, titleColStart, 2, titleColEnd);
                const titleCell2 = sheet2.getCell(1, titleColStart);
                titleCell2.value = `BẢNG CHẤM CÔNG\nTháng ${targetMonth + 1} năm ${targetYear}`;
                titleCell2.font = { name: 'Times New Roman', size: 14, bold: true };
                titleCell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

                sheet2.getRow(1).height = 20;
                sheet2.getRow(2).height = 20;

                const headers = [
                    { col: 1, text: 'TT' }, { col: 2, text: 'Họ và tên' }, { col: 3, text: 'Nghề nghiệp\nchức vụ' }, { col: 4, text: 'Ngày, tháng\nnăm sinh' }
                ];

                headers.forEach(h => {
                    sheet2.mergeCells(4, h.col, 5, h.col);
                    const cell = sheet2.getCell(4, h.col);
                    cell.value = h.text;
                    cell.font = { name: 'Times New Roman', size: 10, bold: true };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                });

                sheet2.mergeCells(4, 5, 4, 4 + daysInMonth);
                const ncCell = sheet2.getCell(4, 5);
                ncCell.value = 'Ngày công';
                ncCell.font = { name: 'Times New Roman', size: 10, bold: true };
                ncCell.alignment = { vertical: 'middle', horizontal: 'center' };

                for (let d = 1; d <= daysInMonth; d++) {
                    const cell = sheet2.getCell(5, 4 + d);
                    cell.value = d;

                    const currentDt = new Date(targetYear, targetMonth, d);
                    const isWeekend = currentDt.getDay() === 0 || currentDt.getDay() === 6;
                    const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isHoliday = holMap[dateStr];

                    if (isWeekend || isHoliday) {
                        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFF0000' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                    } else {
                        cell.font = { name: 'Times New Roman', size: 10, bold: true };
                    }
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    sheet2.getColumn(4 + d).width = 4;
                }

                const extraStart = 4 + daysInMonth + 1;
                sheet2.mergeCells(4, extraStart, 4, extraStart + 4);
                const qrCell = sheet2.getCell(4, extraStart);
                qrCell.value = 'Quy ra công để trả lương';
                qrCell.font = { name: 'Times New Roman', size: 10, bold: true };
                qrCell.alignment = { vertical: 'middle', horizontal: 'center' };

                const extraHeaders = ['Nghỉ\nhưởng\n100% L', 'Nghỉ\nhưởng\nBHXH', 'Học\ntập', 'Ngừng\nviệc\nhưởng L', 'Nghỉ\nkhông\nhưởng\nlương'];
                extraHeaders.forEach((text, i) => {
                    const cell = sheet2.getCell(5, extraStart + i);
                    cell.value = text;
                    cell.font = { name: 'Times New Roman', size: 9 };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    sheet2.getColumn(extraStart + i).width = 8;
                });

                sheet2.getRow(4).height = 20;
                sheet2.getRow(5).height = 60;
                sheet2.getColumn(1).width = 4;
                sheet2.getColumn(2).width = 24;
                sheet2.getColumn(3).width = 12;
                sheet2.getColumn(4).width = 12;

                sheet2.getRow(4).eachCell({ includeEmpty: true }, cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
                sheet2.getRow(5).eachCell({ includeEmpty: true }, cell => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });

                let stt2 = 1;
                let currentRow = 6;
                Object.keys(users).forEach(upperUsername => {
                    const userData = users[upperUsername];

                    let dobStr = userData.dob || '';
                    if (dobStr && dobStr.includes('-')) {
                        const parts = dobStr.split('-');
                        if (parts.length === 3) dobStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }

                    const rowData2: any[] = [stt2++, userData.fullName, userData.position, dobStr];

                    let count100L = 0, countBHXH = 0, countHocTap = 0, countKL = 0;

                    for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const recordsForDay = userData.records.filter((r: any) => (r.date || "").split('T')[0] === dateStr);

                        let leaveData = null;
                        if (leaveMap[upperUsername] && leaveMap[upperUsername][dateStr]) {
                            leaveData = leaveMap[upperUsername][dateStr];
                        }

                        let finalCellCodes: string[] = [];

                        if (leaveData) {
                            const isHalfDay = (leaveData.session === "Sáng" || leaveData.session === "Chiều");
                            const leaveCodeStr = isHalfDay ? `${leaveData.code}/2` : leaveData.code;

                            finalCellCodes.push(leaveCodeStr);

                            const countVal = isHalfDay ? 0.5 : 1;
                            const c = leaveData.code;
                            if (c === "Đ" || c === "O") countBHXH += countVal;
                            else if (c === "HT") countHocTap += countVal;
                            else if (["P", "CĐ", "B", "MC", "KH", "CT"].includes(c)) count100L += countVal;
                            else if (c === "KL" || c === "N") countKL += countVal;

                            if (isHalfDay && recordsForDay.length > 0) {
                                recordsForDay.forEach((r: any) => {
                                    const st = r.status;
                                    if ([1, 2, 3, 6, 7, 9, 20].includes(st)) {
                                        let workCode = (r.shift_code || "X") + "/2";
                                        if (!finalCellCodes.includes(workCode)) finalCellCodes.push(workCode);
                                    }
                                });
                            }
                        } else {
                            if (recordsForDay.length > 0) {
                                recordsForDay.forEach((r: any) => {
                                    const st = r.status;
                                    let codeStr = getLeaveCode(st, r.shift_code);

                                    if (st === 16 || st === 21) countBHXH += 1;
                                    else if (st === 13) countHocTap += 1;
                                    else if ([4, 12, 15, 17, 18, 19].includes(st)) count100L += 1;
                                    else if (st === 5 || st === 0) countKL += 1;

                                    if (!finalCellCodes.includes(codeStr)) finalCellCodes.push(codeStr);
                                });
                            }
                        }

                        rowData2.push(finalCellCodes.join(', '));
                    }

                    rowData2.push(count100L || '', countBHXH || '', countHocTap || '', '', countKL || '');

                    const dataRow2 = sheet2.addRow(rowData2);
                    dataRow2.eachCell((cell, colNum) => {
                        cell.font = { name: 'Times New Roman', size: 11 };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                        if (colNum > 4 && colNum <= 4 + daysInMonth) {
                            const dayIndex = colNum - 4;
                            const currentDt = new Date(targetYear, targetMonth, dayIndex);
                            const isWeekend = currentDt.getDay() === 0 || currentDt.getDay() === 6;

                            const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(dayIndex).padStart(2, '0')}`;
                            const isHoliday = holMap[dateStr];

                            const cellValue = String(cell.value || '').trim();
                            const codesInCell = cellValue.split(',').map(c => c.trim());

                            const leaveCodes = ["P"];
                            const isLeaveDay = codesInCell.some(code => leaveCodes.some(lc => code === lc || code === lc + "/2"));

                            if (isWeekend || isHoliday || isLeaveDay) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };

                                if ((isWeekend || isHoliday) && !isLeaveDay && cellValue === "") {
                                    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFF0000' } };
                                } else {
                                    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF000000' } };
                                }
                            }
                        }

                        cell.alignment = { vertical: 'middle', horizontal: colNum > 4 ? 'center' : (colNum === 2 ? 'left' : 'center'), wrapText: true };
                    });
                    currentRow++;
                });

                const footerStartRow = currentRow + 2;
                sheet2.mergeCells(footerStartRow, extraStart - 5, footerStartRow, extraStart + 4);
                const dateCell = sheet2.getCell(footerStartRow, extraStart - 5);
                dateCell.value = `Hà Nội, ngày ... tháng ${targetMonth + 1} năm ${targetYear}`;
                dateCell.font = { name: 'Times New Roman', size: 11, italic: true };
                dateCell.alignment = { horizontal: 'center' };

                const sigRow = footerStartRow + 1;
                sheet2.mergeCells(sigRow, 2, sigRow, 4);
                const sig1 = sheet2.getCell(sigRow, 2);
                sig1.value = 'Người chấm công';
                sig1.font = { name: 'Times New Roman', size: 11, bold: true };
                sig1.alignment = { horizontal: 'center' };

                const midCol = Math.floor(daysInMonth / 2) + 2;
                sheet2.mergeCells(sigRow, midCol, sigRow, midCol + 4);
                const sig2 = sheet2.getCell(sigRow, midCol);
                sig2.value = 'Phụ trách đơn vị';
                sig2.font = { name: 'Times New Roman', size: 11, bold: true };
                sig2.alignment = { horizontal: 'center' };

                sheet2.mergeCells(sigRow, extraStart - 4, sigRow, extraStart + 4);
                const sig3 = sheet2.getCell(sigRow, extraStart - 4);
                sig3.value = 'Lãnh đạo phòng TCCB';
                sig3.font = { name: 'Times New Roman', size: 11, bold: true };
                sig3.alignment = { horizontal: 'center' };
            });

            // SHEET CHÚ THÍCH (LEGEND) CHO WB2
            const legendSheet = wb2.addWorksheet('Chú thích');
            legendSheet.getColumn(1).width = 25;
            legendSheet.getColumn(2).width = 60;

            legendSheet.mergeCells('A1:B1');
            const titleLegend = legendSheet.getCell('A1');
            titleLegend.value = 'BẢNG CHÚ THÍCH KÝ HIỆU CHẤM CÔNG';
            titleLegend.font = { name: 'Times New Roman', size: 14, bold: true };
            titleLegend.alignment = { horizontal: 'center', vertical: 'middle' };
            legendSheet.getRow(1).height = 30;

            const headerRowLegend = legendSheet.addRow(['Ký hiệu', 'Ý nghĩa (Ghi chú)']);
            headerRowLegend.eachCell(c => {
                c.font = { name: 'Times New Roman', size: 12, bold: true };
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
                c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            const legends = [
                { k: "P", v: "Nghỉ phép" }, { k: "KL", v: "Nghỉ không lương" }, { k: "CĐ", v: "Nghỉ chế độ chung" },
                { k: "HT", v: "Đi học" }, { k: "CT", v: "Công tác" }, { k: "B", v: "Nghỉ bù" }, { k: "Đ", v: "Thai sản" },
                { k: "MC", v: "Ma chay" }, { k: "KH", v: "Kết hôn / Con kết hôn" }, { k: "O", v: "Ốm" },
                { k: "CO", v: "Con ốm" }, { k: "N", v: "Vắng mặt" }
            ];

            legends.forEach(item => {
                const row = legendSheet.addRow([item.k, item.v]);
                row.eachCell((c, colNumber) => {
                    c.font = { name: 'Times New Roman', size: 12 };
                    c.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
                    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            if (shiftsList && shiftsList.length > 0) {
                shiftsList.forEach(shift => {
                    if (shift.shift_code && shift.start_time && shift.end_time) {
                        const row = legendSheet.addRow([shift.shift_code, `${shift.shift_name || 'Ca làm việc'} (Từ ${shift.start_time.substring(0, 5)} đến ${shift.end_time.substring(0, 5)})`]);
                        row.eachCell((c, colNumber) => {
                            c.font = { name: 'Times New Roman', size: 12 };
                            c.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
                            c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        });
                    }
                });
            }

            const colorRow = legendSheet.addRow(['(Ô được tô màu xám / đen)', 'Ngày nghỉ (Thứ 7, Chủ Nhật, Nghỉ lễ, Nghỉ phép)']);
            const colorCell1 = colorRow.getCell(1);
            colorCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };
            colorCell1.font = { name: 'Times New Roman', size: 12, bold: true };
            colorCell1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            colorCell1.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            const colorCell2 = colorRow.getCell(2);
            colorCell2.font = { name: 'Times New Roman', size: 12, italic: true };
            colorCell2.alignment = { vertical: 'middle', horizontal: 'left' };
            colorCell2.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            // 3. XUẤT 2 FILE EXCEL LIÊN TIẾP
            const buffer1 = await wb1.xlsx.writeBuffer();
            saveAs(new Blob([buffer1]), `Bao_Cao_Thong_Ke_Thang_${targetMonth + 1}_${targetYear}.xlsx`);

            setTimeout(async () => {
                const buffer2 = await wb2.xlsx.writeBuffer();
                saveAs(new Blob([buffer2]), `Bang_Cham_Cong_Truyen_Thong_${targetMonth + 1}_${targetYear}.xlsx`);
                setIsExporting(false);
            }, 800);

        } catch (error) {
            console.error("Lỗi xuất Excel:", error);
            alert("Có lỗi xảy ra khi tạo báo cáo Excel. Vui lòng thử lại!");
            setIsExporting(false);
        }
    };

    // ==========================================
    // INIT & FETCH DATA
    // ==========================================
    useEffect(() => {
        // Init localStorage data only on client
        setCurrentUserRole(localStorage.getItem("hrm_role") || "admin");
        setCurrentUsername(localStorage.getItem("hrm_username") || "");

        const gotoUsername = sessionStorage.getItem("att_goto_username") || "";
        const gotoFullname = sessionStorage.getItem("att_goto_fullname") || "";
        const gotoStartDate = sessionStorage.getItem("att_goto_startDate") || "";
        const gotoEndDate = sessionStorage.getItem("att_goto_endDate") || "";

        sessionStorage.removeItem("att_goto_username");
        sessionStorage.removeItem("att_goto_fullname");
        sessionStorage.removeItem("att_goto_startDate");
        sessionStorage.removeItem("att_goto_endDate");

        const formatDate = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
        };

        if (gotoStartDate && gotoEndDate) {
            setStartDate(gotoStartDate);
            setEndDate(gotoEndDate);
            if (gotoFullname) setSearchKeyword(gotoFullname);
        } else {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            setStartDate(formatDate(yesterday));
            setEndDate(formatDate(today));
        }
    }, []);

    const fetchAttendance = useCallback(async () => {
        if (!startDate || !endDate) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem("hrm_token");
            const res = await fetch(`${API_BASE_URL}/api/monthly-records?startDate=${startDate}&endDate=${endDate}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    alert("Phiên đăng nhập không hợp lệ!");
                    router.push("/login");
                    return;
                }
                const errorText = await res.text();
                console.error("API Error:", res.status, errorText);
                throw new Error(`Lỗi Server (${res.status}): ${errorText}`);
            }

            const data = await res.json();
            setAllAttendance(data.map((item: any) => ({
                ...item,
                is_fraud: item.is_fraud || false,
                fraud_note: item.fraud_note || "",
                is_explained: item.is_explained || false
            })));
        } catch (error) {
            console.error("Lỗi tải dữ liệu chấm công:", error);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, router]);

    useEffect(() => {
        if (startDate && endDate) {
            fetchAttendance();
        }
    }, [fetchAttendance]);

    // ==========================================
    // LỌC & PHÂN TRANG (Client Side)
    // ==========================================
    const filteredData = useMemo(() => {
        const keyword = searchKeyword.toLowerCase();
        let result = allAttendance.filter(item => {
            const matchKeyword = (item.full_name?.toLowerCase().includes(keyword)) ||
                (item.username?.toLowerCase().includes(keyword));
            const matchStatus = statusFilter === "all" || item.status === parseInt(statusFilter);
            return matchKeyword && matchStatus;
        });

        // Sort theo ngày giảm dần
        result.sort((a, b) => {
            if ((b.date || "") > (a.date || "")) return 1;
            if ((b.date || "") < (a.date || "")) return -1;
            return 0;
        });
        return result;
    }, [allAttendance, searchKeyword, statusFilter]);

    // Reset trang về 1 khi đổi bộ lọc
    useEffect(() => { setPage(1); }, [searchKeyword, statusFilter, limit]);

    const totalPages = Math.ceil(filteredData.length / limit) || 1;
    const paginatedData = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredData.slice(start, start + limit);
    }, [filteredData, page, limit]);

    const stats = useMemo(() => {
        let s = { total: 0, hopLe: 0, viPham: 0, nghiCheDo: 0, nghiKL: 0 };
        filteredData.forEach(item => {
            const st = item.status;
            s.total++;
            if ([1, 7, 9, 13, 14, 20].includes(st)) s.hopLe++;
            else if ([0, 2, 3, 6, 8, 10, 11].includes(st)) s.viPham++;
            else if ([4, 12, 15, 16, 17, 18, 19, 21, 22].includes(st)) s.nghiCheDo++;
            else if (st === 5) s.nghiKL++;
        });
        return s;
    }, [filteredData]);

    // ==========================================
    // HELPERS & HANDLERS
    // ==========================================
    const fmtTime = (t?: string) => (!t || t === "---") ? "--:--" : t.split('.')[0];

    const handlePrint = () => window.print();

    const goToDetail = (username: string, date: string, fullname: string) => {
        setDetailDrawer({ isOpen: true, username, date, fullName: fullname || username });
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 1: return <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 border border-green-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> Đúng giờ</span>;
            case 2: return <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><AlertTriangle size={12} /> Đi muộn</span>;
            case 3: return <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><AlertTriangle size={12} /> Về sớm</span>;
            case 6: return <span className="px-2 py-1 rounded bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><XCircle size={12} /> Muộn & Sớm</span>;
            case 4: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Calendar size={12} /> Nghỉ phép</span>;
            case 5: return <span className="px-2 py-1 rounded bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Calendar size={12} /> Nghỉ KL</span>;
            case 7: return <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Clock size={12} /> Đang có mặt</span>;
            case 8: return <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">➖ Chưa có lịch</span>;
            case 9: return <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><Clock size={12} /> Chế độ 7h</span>;
            case 10: return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">❓ Quên vào</span>;
            case 11: return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">❓ Quên ra</span>;
            case 12: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">🏖️ Nghỉ chế độ</span>;
            case 13: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">📚 Đi học</span>;
            case 14: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">💼 Công tác</span>;
            case 15: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">🔄 Nghỉ bù</span>;
            case 16: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">👶 Thai sản</span>;
            case 17: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">⚫ Ma chay</span>;
            case 18: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">💍 Con kết hôn</span>;
            case 19: return <span className="px-2 py-1 rounded bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">💒 Kết hôn</span>;
            default: return <span className="px-2 py-1 rounded bg-red-100 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit"><XCircle size={12} /> Vắng mặt</span>;
        }
    };

    const isExplainDisabled = (item: AttendanceRecord) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Giới hạn giải trình từ đầu tháng trước
        const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        if (item.username !== currentUsername) return true;
        if (item.is_explained) return true;

        // Chỉ cho phép giải trình nếu thuộc nhóm VI PHẠM (không tính 8 - Chưa có lịch)
        const isViolation = [0, 2, 3, 6, 10, 11].includes(item.status);
        if (!isViolation) return true;

        if (item.date) {
            const recordDate = new Date(item.date + 'T00:00:00');
            if (recordDate < firstOfLastMonth || recordDate > yesterday) return true;
        }
        return false;
    };

    // --- Fraud Handlers ---
    const handleFraudSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm("Đánh dấu vi phạm gian lận cho bản ghi này?")) return;
        setIsSubmittingFraud(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/mark_fraud`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem("hrm_token")}` },
                body: JSON.stringify({ id: parseInt(fraudModal.id), is_fraud: true, fraud_note: fraudModal.note, role: currentUserRole })
            });
            if (res.ok) {
                alert("Đã lưu cảnh báo gian lận!");
                setFraudModal({ ...fraudModal, isOpen: false });
                fetchAttendance();
            } else {
                const err = await res.json();
                alert("Lỗi: " + (err.detail || "Không thể lưu"));
            }
        } catch (error) { alert("Lỗi kết nối máy chủ!"); }
        finally { setIsSubmittingFraud(false); }
    };

    // --- Explain Handlers ---
    const handleExplainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setExplainModal(prev => ({ ...prev, file, previewUrl: url }));
        } else {
            setExplainModal(prev => ({ ...prev, file: null, previewUrl: "" }));
        }
    };

    const handleExplainSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // --- BỔ SUNG LOGIC BẮT BUỘC CÓ ẢNH ---
        if (!explainModal.file) {
            alert("⚠️ Vui lòng đính kèm ảnh minh chứng trước khi gửi giải trình!");
            return;
        }
        // --------------------------------------

        setIsSubmittingExplain(true);
        const formData = new FormData();
        formData.append("username", explainModal.username);
        formData.append("date", explainModal.date);
        formData.append("shift_code", explainModal.shiftCode);
        formData.append("reason", explainModal.reason);
        formData.append("status", "1");

        // Đã qua được check ở trên thì chắc chắn có file
        formData.append("attached_file", explainModal.file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/explanations`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem("hrm_token")}` },
                body: formData
            });
            if (res.ok) {
                alert('Đã gửi giải trình thành công! Vui lòng chờ quản lý duyệt.');
                setExplainModal({ ...explainModal, isOpen: false });
                fetchAttendance();
            } else {
                const err = await res.json();
                alert('Lỗi: ' + (err.detail || 'Không thể gửi giải trình'));
            }
        } catch (err) { alert('Lỗi kết nối máy chủ!'); }
        finally { setIsSubmittingExplain(false); }
    };

    return (
        <div className="w-full flex-1 flex flex-col h-full min-h-0 animate-in fade-in duration-500 relative text-foreground">

            {/* HEADER */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground m-0 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        Nhật Ký Quét Khuôn Mặt & Thống Kê
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Theo dõi chấm công và xử lý vi phạm</p>
                </div>
            </div>

            {/* MAIN CONTENT CARD */}
            {/* SỬA LỖI SCROLL: Thêm overflow-y-auto trên Mobile (mặc định), giữ overflow-hidden trên md */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar bg-background gap-4 pb-20 md:pb-0">

                {/* FILTER BAR */}
                <div className="hrm-card p-4 flex flex-wrap lg:flex-nowrap items-end gap-3 bg-card border-border shadow-sm shrink-0">
                    <div className="flex flex-col flex-1 min-w-[120px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Hiển thị</label>
                        <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-bold outline-none cursor-pointer">
                            <option value={10}>10 dòng / trang</option>
                            <option value={20}>20 dòng / trang</option>
                            <option value={50}>50 dòng / trang</option>
                            <option value={100}>100 dòng / trang</option>
                        </select>
                    </div>

                    <div className="flex flex-col flex-1 min-w-[150px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Trạng thái</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] font-bold outline-none cursor-pointer">
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

                    {currentUserRole !== "user" && (
                        <div className="flex flex-col flex-[2] min-w-[200px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                                <Search size={12} /> Tìm nhân viên
                            </label>
                            <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} placeholder="Nhập tên hoặc mã NV..." className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none" />
                        </div>
                    )}

                    <div className="flex flex-col flex-1 min-w-[130px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Từ ngày</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none font-mono" />
                    </div>

                    <div className="flex flex-col flex-1 min-w-[130px]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Đến ngày</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="hrm-input h-10 px-3 bg-background text-foreground rounded-lg border border-border text-[13px] outline-none font-mono" />
                    </div>

                    <button onClick={handleExportExcelAdvanced} disabled={isExporting} className={`h-10 px-4 rounded-lg font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all shrink-0 ${isExporting ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                        {isExporting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Printer size={16} />}
                        {isExporting ? "Đang xử lý..." : "Xuất B/C"}
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
                    {[
                        { label: "Tổng số ca", value: stats.total, color: "text-slate-600" },
                        { label: "Hợp lệ", value: stats.hopLe, color: "text-green-600" },
                        { label: "Vi phạm", value: stats.viPham, color: "text-red-600" },
                        { label: "Nghỉ chế độ", value: stats.nghiCheDo, color: "text-sky-600" },
                        { label: "Nghỉ KL", value: stats.nghiKL, color: "text-orange-600" },
                    ].map((stat, idx) => (
                        <div key={idx} className="hrm-card bg-card border-border p-4 flex flex-col items-center shadow-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</span>
                            <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>

                {/* TABLE CONTAINER */}
                {/* SỬA LỖI: shrink-0 trên mobile để đảm bảo nội dung có thể giãn dài xuống dưới */}
                <div className="flex-1 shrink-0 md:shrink flex flex-col min-h-[400px] md:min-h-0 md:hrm-card md:bg-card md:border md:border-border md:shadow-sm md:rounded-xl md:overflow-hidden relative">

                    {/* CARD HEADER - chỉ hiện trên desktop */}
                    <div className="hidden md:flex flex-shrink-0 px-5 py-4 border-b border-border bg-muted/30 items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground m-0">
                            Nhật Ký Chấm Công
                        </h3>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            {filteredData.length} bản ghi
                        </span>
                    </div>

                    {/* KHU VỰC CUỘN NỘI DUNG CHÍNH */}
                    {/* SỬA LỖI: overflow-visible trên mobile, overflow-y-auto trên Desktop */}
                    <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar relative w-full">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[11px] font-bold uppercase tracking-widest">Đang tải dữ liệu...</span>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <FileWarning className="w-10 h-10 opacity-20 mb-2" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Không có dữ liệu phù hợp</span>
                            </div>
                        ) : (
                            <>
                                {/* 1. MOBILE VIEW */}
                                <div className="md:hidden flex flex-col p-3 gap-3 bg-muted/10 pb-4">
                                    {paginatedData.map((item, index) => {
                                        const uniqueKey = item.id || `${item.username}-${item.date}-${item.shift_code}-${index}`;
                                        const [y, m, d] = (item.date || "").split('-');
                                        const dateStr = item.date ? `${d}/${m}/${y}` : "---";

                                        const hasCheckinImg = item.checkin_image_path && item.checkin_image_path !== "null" && item.checkin_image_path.trim() !== "";
                                        const hasCheckoutImg = item.checkout_image_path && item.checkout_image_path !== "null" && item.checkout_image_path.trim() !== "";

                                        return (
                                            /* FIX 1: Thêm overflow-hidden để cắt phần nền bị tràn */
                                            <div key={uniqueKey} className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-3 right-3 text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded">{dateStr}</div>
                                                <div className="pr-20 mb-3">
                                                    <h4 className="text-sm font-bold text-foreground mb-1">{item.full_name}</h4>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">MÃ: {item.username} | CA: <span className="text-primary">{item.shift_display_name || item.shift_code || '---'}</span></p>
                                                </div>
                                                <div className="mb-3 flex flex-wrap gap-2 items-center">
                                                    {getStatusBadge(item.status)}
                                                    {item.status !== 8 && item.status !== 9 && (
                                                        <>
                                                            {item.late_minutes > 0 && <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Muộn: {item.late_minutes}m</span>}
                                                            {item.early_minutes > 0 && <span className="text-[10px] text-orange-600 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">Sớm: {item.early_minutes}m</span>}
                                                        </>
                                                    )}
                                                </div>

                                                {/* FIX 2: Loại bỏ w-full để tránh lỗi tính toán box-sizing gây tràn viền */}
                                                <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2.5 rounded-lg border border-border text-[11px] mb-3">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase">Giờ Vào</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono bg-green-500/10 text-green-600 border border-green-500/20 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">{fmtTime(item.checkin_time)}</span>
                                                            {hasCheckinImg && (
                                                                <img
                                                                    src={getImageUrl(item.checkin_image_path)}
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    className="w-6 h-6 rounded object-cover border border-border cursor-pointer"
                                                                    onClick={() => setImageModal({ isOpen: true, src: getImageUrl(item.checkin_image_path), title: `Ảnh vào: ${item.full_name}` })}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase">Giờ Ra</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono bg-red-500/10 text-red-600 border border-red-500/20 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">{fmtTime(item.checkout_time)}</span>
                                                            {hasCheckoutImg && (
                                                                <img
                                                                    src={getImageUrl(item.checkout_image_path)}
                                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    className="w-6 h-6 rounded object-cover border border-border cursor-pointer"
                                                                    onClick={() => setImageModal({ isOpen: true, src: getImageUrl(item.checkout_image_path), title: `Ảnh ra: ${item.full_name}` })}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        disabled={isExplainDisabled(item)}
                                                        onClick={() => setExplainModal({ isOpen: true, username: currentUsername, fullName: item.full_name, date: item.date, shiftCode: item.shift_code, reason: "", file: null, previewUrl: "" })}
                                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors ${item.is_explained ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800' : isExplainDisabled(item) ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-60' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground'}`}
                                                    >
                                                        {item.is_explained ? '✔️ Đã giải trình' : '✍️ Giải trình'}
                                                    </button>
                                                    <button onClick={() => goToDetail(item.username, item.date, item.full_name)} className="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors flex justify-center items-center gap-1">
                                                        <Eye size={12} /> Chi tiết
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>


                                {/* 2. DESKTOP VIEW */}
                                <div className="hidden md:block w-full">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-[30] bg-muted">
                                            <tr>
                                                {["NGÀY", "NHÂN VIÊN", "CA LÀM VIỆC", "GIỜ VÀO / RA", "VI PHẠM", "GIẢI TRÌNH", "CHI TIẾT"].map((h, i) => (
                                                    <th key={i} className={`py-3 px-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap border-b border-border ${i >= 5 ? 'text-center' : ''}`}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedData.map((item, index) => {
                                                const uniqueKey = item.id || `${item.username}-${item.date}-${item.shift_code}-${index}`;
                                                const [y, m, d] = (item.date || "").split('-');
                                                const dateStr = item.date ? `${d}/${m}/${y}` : "---";

                                                const hasCheckinImg = item.checkin_image_path && item.checkin_image_path !== "null" && item.checkin_image_path.trim() !== "";
                                                const hasCheckoutImg = item.checkout_image_path && item.checkout_image_path !== "null" && item.checkout_image_path.trim() !== "";

                                                return (
                                                    <tr key={uniqueKey} className="hover:bg-accent/30 transition-colors border-b border-border group">
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <strong className="text-[12px] font-black text-foreground">{dateStr}</strong>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <strong className="text-[13px] font-bold text-foreground block">{item.full_name}</strong>
                                                            <span className="text-[10px] text-muted-foreground font-mono">Mã: {item.username}</span>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <span className="text-[12px] font-bold text-primary block">{item.shift_display_name || item.shift_code || '---'}</span>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded text-[11px] font-bold w-fit whitespace-nowrap">Vào: {fmtTime(item.checkin_time)}</span>
                                                                    {hasCheckinImg && (
                                                                        <img
                                                                            src={getImageUrl(item.checkin_image_path)}
                                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                            className="w-7 h-7 rounded object-cover border border-border cursor-pointer hover:scale-150 transition-transform relative z-10 hover:z-20"
                                                                            onClick={() => setImageModal({ isOpen: true, src: getImageUrl(item.checkin_image_path), title: `Ảnh vào: ${item.full_name}` })}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5 rounded text-[11px] font-bold w-fit whitespace-nowrap">Ra: {fmtTime(item.checkout_time)}</span>
                                                                    {hasCheckoutImg && (
                                                                        <img
                                                                            src={getImageUrl(item.checkout_image_path)}
                                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                            className="w-7 h-7 rounded object-cover border border-border cursor-pointer hover:scale-150 transition-transform relative z-10 hover:z-20"
                                                                            onClick={() => setImageModal({ isOpen: true, src: getImageUrl(item.checkout_image_path), title: `Ảnh ra: ${item.full_name}` })}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1.5 items-start">
                                                                {getStatusBadge(item.status)}
                                                                {item.status !== 8 && item.status !== 9 && (item.late_minutes > 0 || item.early_minutes > 0) && (
                                                                    <div className="flex items-center gap-1">
                                                                        {item.late_minutes > 0 && <span className="text-[10px] text-amber-600 font-bold">Muộn: {item.late_minutes}m</span>}
                                                                        {item.early_minutes > 0 && <span className="text-[10px] text-orange-600 font-bold">Sớm: {item.early_minutes}m</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap text-center align-middle">
                                                            <button
                                                                disabled={isExplainDisabled(item)}
                                                                onClick={() => setExplainModal({ isOpen: true, username: currentUsername, fullName: item.full_name, date: item.date, shiftCode: item.shift_code, reason: "", file: null, previewUrl: "" })}
                                                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-colors ${item.is_explained ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800' : isExplainDisabled(item) ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-60' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground'}`}
                                                            >
                                                                {item.is_explained ? '✔️ Đã giải trình' : '✍️ Giải trình'}
                                                            </button>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap text-center align-middle">
                                                            <button onClick={() => goToDetail(item.username, item.date, item.full_name)} className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-colors inline-flex items-center gap-1">
                                                                <Eye size={12} /> Chi tiết
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* PAGINATION */}
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
                                <span>Đang hiển thị <strong className="text-primary">{(page - 1) * limit + 1} - {Math.min(page * limit, filteredData.length)}</strong> trong <strong className="text-foreground">{filteredData.length}</strong> bản ghi</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================================================== */}
            {/* MODALS */}
            {/* ==================================================== */}

            {/* 1. Modal Xem Ảnh */}
            {imageModal.isOpen && isMounted && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setImageModal({ ...imageModal, isOpen: false })}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div className="relative max-w-3xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setImageModal({ ...imageModal, isOpen: false })} className="absolute -top-10 right-0 p-2 bg-destructive text-destructive-foreground rounded-full hover:scale-110 transition-transform shadow-lg">
                            <X size={20} />
                        </button>
                        <img src={imageModal.src} alt="Phóng to" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border-4 border-background object-contain bg-muted" />
                        <p className="mt-4 text-foreground font-bold text-lg bg-background/50 px-4 py-1 rounded-full backdrop-blur-md">{imageModal.title}</p>
                    </div>
                </div>,
                document.body
            )}

            {/* 2. Modal Gian Lận */}
            {fraudModal.isOpen && isMounted && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setFraudModal({ ...fraudModal, isOpen: false })}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border-t-4 border-t-destructive animate-in slide-in-from-bottom-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 text-destructive mb-2">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-black uppercase tracking-widest m-0">Báo cáo Gian Lận</h3>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mb-4">Bạn đang đánh dấu bản ghi này có dấu hiệu gian lận. Vui lòng ghi chú lý do chi tiết.</p>

                        <form onSubmit={handleFraudSubmit} className="flex flex-col gap-4">
                            <textarea
                                required rows={3}
                                value={fraudModal.note} onChange={e => setFraudModal({ ...fraudModal, note: e.target.value })}
                                className="hrm-input w-full p-3 bg-background text-foreground rounded-lg border border-border text-[13px] resize-y"
                                placeholder="VD: Khuôn mặt không khớp, nghi ngờ dùng điện thoại chụp lại..."
                            />
                            <div className="flex gap-3 mt-2">
                                <button type="button" onClick={() => setFraudModal({ ...fraudModal, isOpen: false })} className="flex-1 py-2.5 rounded-lg bg-secondary text-foreground text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-colors border border-border">Hủy Bỏ</button>
                                <button type="submit" disabled={isSubmittingFraud} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-colors shadow-md">
                                    {isSubmittingFraud ? "Đang xử lý..." : "Xác nhận Gian Lận"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* 3. Modal Giải Trình */}
            {explainModal.isOpen && isMounted && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setExplainModal({ ...explainModal, isOpen: false })}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border-t-4 border-t-primary animate-in slide-in-from-bottom-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-4 border-b border-border pb-3 shrink-0">
                            <div className="flex items-center gap-2 text-primary">
                                <PenTool size={20} />
                                <h3 className="text-[14px] font-black uppercase tracking-widest m-0">Viết Giải Trình</h3>
                            </div>
                            <button onClick={() => setExplainModal({ ...explainModal, isOpen: false })} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors"><X size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                            <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4 text-[12px] text-foreground">
                                <p><strong>Nhân viên:</strong> {explainModal.fullName}</p>
                                <p className="mt-1"><strong>Ngày:</strong> {explainModal.date.split('-').reverse().join('/')}</p>
                            </div>

                            <form id="explainForm" onSubmit={handleExplainSubmit} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ca làm việc</label>
                                    <input type="text" disabled value={explainModal.shiftCode || "Không xác định"} className="hrm-input h-10 px-3 bg-muted text-foreground rounded-lg border border-border text-[13px] font-bold w-full opacity-70" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Lý do giải trình <span className="text-destructive">*</span></label>
                                    <textarea
                                        required rows={4}
                                        value={explainModal.reason} onChange={e => setExplainModal({ ...explainModal, reason: e.target.value })}
                                        className="hrm-input w-full p-3 bg-background text-foreground rounded-lg border border-border text-[13px] resize-y"
                                        placeholder="Nhập lý do chi tiết (VD: Quên chấm công lúc về, Máy chấm công lỗi...)"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">
                                        Ảnh đính kèm minh chứng <span className="text-destructive">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="fileUpload"
                                            accept="image/*"
                                            onChange={handleExplainFileChange}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="fileUpload"
                                            className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-[12px] font-bold ${!explainModal.file ? 'border-destructive/50 text-destructive bg-destructive/5 hover:bg-destructive/10' : 'border-border text-muted-foreground hover:border-primary hover:bg-primary/5'}`}
                                        >
                                            <FileUp size={16} /> {explainModal.file ? 'Đã chọn ảnh (Bấm để đổi)' : 'Chọn ảnh minh chứng (Bắt buộc)'}
                                        </label>
                                    </div>
                                    {explainModal.previewUrl && (
                                        <div className="mt-3 relative w-fit mx-auto">
                                            <img src={explainModal.previewUrl} alt="Preview" className="max-h-32 rounded-lg border border-border shadow-sm" />
                                            <button type="button" onClick={() => setExplainModal({ ...explainModal, file: null, previewUrl: "" })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110"><X size={12} /></button>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="flex gap-3 mt-4 pt-4 border-t border-border shrink-0">
                            <button type="button" onClick={() => setExplainModal({ ...explainModal, isOpen: false })} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-colors border border-border">Hủy Bỏ</button>
                            <button type="submit" form="explainForm" disabled={isSubmittingExplain} className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-colors shadow-md flex justify-center items-center gap-2">
                                {isSubmittingExplain ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang gửi...</> : <><Save size={16} /> Gửi Giải Trình</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <AttendanceDetailDrawer
                isOpen={detailDrawer.isOpen}
                onClose={() => setDetailDrawer({ ...detailDrawer, isOpen: false })}
                username={detailDrawer.username}
                date={detailDrawer.date}
                fullName={detailDrawer.fullName}
                currentUserRole={currentUserRole}
                currentUsername={currentUsername}
            />

        </div>
    );
}