"use client";

import React, { useEffect, useRef } from "react";
import Script from "next/script";
import Head from "next/head";
import "./employee-profile.css"; // Nhúng file CSS vừa tạo
import { API_BASE_URL } from "@/lib/api-client";

export default function EmployeeProfileForm() {
    // Dùng useRef thay vì biến global để tránh mất state giữa các lần re-render (dù ít khi re-render vì ta dùng DOM trực tiếp)
    const currentEmployeeId = useRef<number | null>(null);
    const currentUsername = useRef<string | null>(null);

    // --- HÀM TIỆN ÍCH LẤY HEADER XÁC THỰC ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('hrm_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const removeAccents = (str: string) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    };

    // --- KHỞI TẠO DỮ LIỆU & JQUERY ---
    const initData = async () => {
        await loadEmployeeDropdown();

        const urlParams = new URLSearchParams(window.location.search);
        const idFromUrl = urlParams.get('id');
        if (idFromUrl) {
            (document.getElementById('server-id') as HTMLInputElement).value = idFromUrl;
            loadData(idFromUrl);
        }
    };

    const loadEmployeeDropdown = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees/dropdown`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const employees = await res.json();
                const select = document.getElementById('employee_select') as HTMLSelectElement;

                // Clear cũ
                while (select.options.length > 1) { select.remove(1); }

                employees.forEach((emp: any) => {
                    const option = document.createElement('option');
                    option.value = emp.username;
                    option.dataset.id = emp.id;
                    option.dataset.fullname = emp.full_name;
                    option.textContent = `${emp.full_name} (${emp.username})`;
                    select.appendChild(option);
                });

                const w = window as any;
                if (w.$ && w.$.fn.select2) {
                    w.$('#employee_select').select2({
                        placeholder: "-- Gõ tên hoặc mã NV để tìm kiếm --",
                        allowClear: true,
                        matcher: function matchCustom(params: any, data: any) {
                            if (w.$.trim(params.term) === '') return data;
                            if (typeof data.text === 'undefined') return null;
                            var term = removeAccents(params.term.toLowerCase());
                            var text = removeAccents(data.text.toLowerCase());
                            if (text.indexOf(term) > -1) return data;
                            return null;
                        }
                    });

                    // Lắng nghe sự kiện của Select2
                    w.$('#employee_select').on('change', function () {
                        handleEmployeeSelect();
                    });
                }
            } else if (res.status === 401) {
                alert("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
            }
        } catch (e) {
            console.error("Lỗi tải dropdown nhân viên:", e);
        }
    };

    const handleEmployeeSelect = async () => {
        const select = document.getElementById('employee_select') as HTMLSelectElement;
        const selectedOption = select.options[select.selectedIndex];

        if (!selectedOption.value) {
            resetForm();
            currentEmployeeId.current = null;
            currentUsername.current = null;
            return;
        }

        currentUsername.current = selectedOption.value;
        currentEmployeeId.current = parseInt(selectedOption.dataset.id || "0");
        const fullName = selectedOption.dataset.fullname || "";

        try {
            const res = await fetch(`/api/employee_profiles/by-username/${currentUsername.current}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const profile = await res.json();
                (document.getElementById('server-id') as HTMLInputElement).value = profile.id;
                await loadData(profile.id);
            } else {
                resetForm();
                (document.getElementById('full_name') as HTMLInputElement).value = fullName.toUpperCase();
                const nameSlug = removeAccents(fullName).replace(/\s+/g, '').toUpperCase();
                (document.getElementById('server-id') as HTMLInputElement).value = `${nameSlug}_`;
                alert("Nhân sự này chưa có hồ sơ lý lịch. Hãy nhập thông tin để tạo mới.");
            }
        } catch (e) {
            console.error("Lỗi kiểm tra hồ sơ:", e);
        }
    };

    const saveData = async () => {
        const id = (document.getElementById('server-id') as HTMLInputElement).value.trim();
        if (!id) return alert("Vui lòng nhập hoặc chọn ID hồ sơ!");

        const getFloat = (val: string) => val ? parseFloat(val) : null;
        const getDate = (val: string) => val ? val : null;
        const getVal = (idStr: string) => (document.getElementById(idStr) as HTMLInputElement | HTMLTextAreaElement)?.value || "";

        const data: any = {
            id: id,
            employee_id: currentEmployeeId.current,
            username: currentUsername.current,
            profile_image: getVal('profile_image_path'),
            full_name: getVal('full_name'),
            other_name: getVal('other_name'),
            birth_date: getDate(getVal('birth_date')),
            gender: getVal('gender'),
            birth_place: getVal('birth_place'),
            home_town: getVal('home_town'),
            ethnicity: getVal('ethnicity'),
            religion: getVal('religion'),
            permanent_address: getVal('permanent_address'),
            current_address: getVal('current_address'),
            recruitment_occupation: getVal('recruitment_occupation'),
            recruitment_date: getDate(getVal('recruitment_date')),
            recruitment_agency: getVal('recruitment_agency'),
            current_position: getVal('current_position'),
            concurrent_position: getVal('concurrent_position'),
            main_tasks: getVal('main_tasks'),
            professional_title: getVal('professional_title'),
            title_code: getVal('title_code'),
            salary_level: getVal('salary_level'),
            salary_coefficient: getFloat(getVal('salary_coefficient')),
            salary_start_date: getDate(getVal('salary_start_date')),
            allowance: getVal('allowance'),
            edu_general: getVal('edu_general'),
            edu_highest: getVal('edu_highest'),
            political_theory: getVal('political_theory'),
            state_management: getVal('state_management'),
            professional_skill: getVal('professional_skill'),
            foreign_language: getVal('foreign_language'),
            it_skill: getVal('it_skill'),
            party_join_date: getDate(getVal('party_join_date')),
            party_official_date: getDate(getVal('party_official_date')),
            union_join_date: getDate(getVal('union_join_date')),
            military_join_date: getDate(getVal('military_join_date')),
            military_exit_date: getDate(getVal('military_exit_date')),
            military_rank: getVal('military_rank'),
            highest_title: getVal('highest_title'),
            academic_rank: getVal('academic_rank'),
            strengths: getVal('strengths'),
            health_status: getVal('health_status'),
            height: getFloat(getVal('height')),
            weight: getFloat(getVal('weight')),
            blood_type: getVal('blood_type'),
            veteran_class: getVal('veteran_class'),
            policy_family: getVal('policy_family'),
            id_card_no: getVal('id_card_no'),
            id_card_issue_date: getDate(getVal('id_card_issue_date')),
            social_insurance_no: getVal('social_insurance_no'),
            self_evaluation: getVal('self_evaluation'),
            review_comment: getVal('review_comment'),
            reviewer_name: getVal('reviewer_name'),
            review_date: getDate(getVal('review_date')),
            educations: [], histories: [], rewards: [], disciplines: [], families: []
        };

        document.getElementsByName('review_status').forEach((r: any) => { if (r.checked) data.review_status = r.value; });

        for (let i = 1; i <= 6; i++) {
            const school = getVal(`edu_school_${i}`);
            if (school) data.educations.push({ school_name: school, major: getVal(`edu_major_${i}`), duration: getVal(`edu_duration_${i}`), study_mode: getVal(`edu_mode_${i}`), degree: getVal(`edu_degree_${i}`) });
        }
        for (let i = 1; i <= 15; i++) {
            const period = getVal(`his_period_${i}`);
            if (period) data.histories.push({ period: period, description: getVal(`his_desc_${i}`) });
        }
        for (let i = 1; i <= 4; i++) {
            const dateVal = getVal(`rew_date_${i}`);
            if (dateVal) data.rewards.push({ record_date: dateVal, content: getVal(`rew_content_${i}`), decision_agency: getVal(`rew_agency_${i}`) });
        }
        for (let i = 1; i <= 4; i++) {
            const dateVal = getVal(`dis_date_${i}`);
            if (dateVal) data.disciplines.push({ record_date: dateVal, content: getVal(`dis_content_${i}`), decision_agency: getVal(`dis_agency_${i}`) });
        }
        for (let i = 1; i <= 18; i++) {
            const rel = getVal(`fam_self_rel_${i}`);
            if (rel) data.families.push({ relation_side: 'SELF', relationship_name: rel, information: getVal(`fam_self_info_${i}`) });
        }
        for (let i = 1; i <= 16; i++) {
            const rel = getVal(`fam_sp_rel_${i}`);
            if (rel) data.families.push({ relation_side: 'SPOUSE', relationship_name: rel, information: getVal(`fam_sp_info_${i}`) });
        }

        try {
            const res = await fetch('/api/employee_profiles', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) alert("Đã lưu hồ sơ lý lịch thành công!");
            else alert("Lỗi: " + (result.detail || "Không thể lưu"));
        } catch (e) { alert("Lỗi kết nối Server!"); }
    };

    const loadData = async (autoId: string | null = null) => {
        const id = autoId || (document.getElementById('server-id') as HTMLInputElement).value.trim();
        if (!id) return alert("Vui lòng nhập ID!");

        try {
            const res = await fetch(`/api/employee_profiles/${id}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();

                currentEmployeeId.current = data.employee_id;
                currentUsername.current = data.username;

                const basicFields = [
                    'full_name', 'other_name', 'birth_date', 'gender', 'birth_place', 'home_town',
                    'ethnicity', 'religion', 'permanent_address', 'current_address', 'recruitment_occupation',
                    'recruitment_date', 'recruitment_agency', 'current_position', 'concurrent_position',
                    'main_tasks', 'professional_title', 'title_code', 'salary_level', 'salary_coefficient',
                    'salary_start_date', 'allowance', 'edu_general', 'edu_highest', 'political_theory',
                    'state_management', 'professional_skill', 'foreign_language', 'it_skill', 'party_join_date',
                    'party_official_date', 'union_join_date', 'military_join_date', 'military_exit_date',
                    'military_rank', 'highest_title', 'academic_rank', 'strengths', 'health_status', 'height',
                    'weight', 'blood_type', 'veteran_class', 'policy_family', 'id_card_no', 'id_card_issue_date',
                    'social_insurance_no', 'self_evaluation', 'review_comment', 'reviewer_name', 'review_date'
                ];

                basicFields.forEach(key => {
                    const el = document.getElementById(key) as HTMLInputElement | HTMLTextAreaElement;
                    if (el) el.value = data[key] || '';
                });

                if (data.review_status) {
                    document.getElementsByName('review_status').forEach((r: any) => { if (r.value === data.review_status) r.checked = true; });
                }

                const previewImg = document.getElementById('profile_image_preview') as HTMLImageElement;
                const placeholder = document.getElementById('photo_placeholder');
                const hiddenPath = document.getElementById('profile_image_path') as HTMLInputElement;
                const statusText = document.getElementById('upload_status');

                if (data.profile_image) {
                    hiddenPath.value = data.profile_image;
                    previewImg.src = data.profile_image.startsWith('/') ? data.profile_image : '/' + data.profile_image;
                    previewImg.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                    if (statusText) statusText.innerHTML = "";
                } else {
                    hiddenPath.value = "";
                    previewImg.src = "";
                    previewImg.style.display = 'none';
                    if (placeholder) placeholder.style.display = 'inline';
                    if (statusText) statusText.innerHTML = "";
                }

                resetTableData();

                if (data.educations) data.educations.forEach((item: any, idx: number) => {
                    let i = idx + 1; if (i > 6) return;
                    (document.getElementById(`edu_school_${i}`) as HTMLInputElement).value = item.school_name || '';
                    (document.getElementById(`edu_major_${i}`) as HTMLInputElement).value = item.major || '';
                    (document.getElementById(`edu_duration_${i}`) as HTMLInputElement).value = item.duration || '';
                    (document.getElementById(`edu_mode_${i}`) as HTMLInputElement).value = item.study_mode || '';
                    (document.getElementById(`edu_degree_${i}`) as HTMLInputElement).value = item.degree || '';
                });

                if (data.histories) data.histories.forEach((item: any, idx: number) => {
                    let i = idx + 1; if (i > 15) return;
                    (document.getElementById(`his_period_${i}`) as HTMLInputElement).value = item.period || '';
                    (document.getElementById(`his_desc_${i}`) as HTMLInputElement).value = item.description || '';
                });

                if (data.rewards) data.rewards.forEach((item: any, idx: number) => {
                    let i = idx + 1; if (i > 4) return;
                    (document.getElementById(`rew_date_${i}`) as HTMLInputElement).value = item.record_date || '';
                    (document.getElementById(`rew_content_${i}`) as HTMLInputElement).value = item.content || '';
                    (document.getElementById(`rew_agency_${i}`) as HTMLInputElement).value = item.decision_agency || '';
                });

                if (data.disciplines) data.disciplines.forEach((item: any, idx: number) => {
                    let i = idx + 1; if (i > 4) return;
                    (document.getElementById(`dis_date_${i}`) as HTMLInputElement).value = item.record_date || '';
                    (document.getElementById(`dis_content_${i}`) as HTMLInputElement).value = item.content || '';
                    (document.getElementById(`dis_agency_${i}`) as HTMLInputElement).value = item.decision_agency || '';
                });

                if (data.families) {
                    let selfIdx = 1, spIdx = 1;
                    data.families.forEach((item: any) => {
                        if (item.relation_side === 'SELF' && selfIdx <= 18) {
                            (document.getElementById(`fam_self_rel_${selfIdx}`) as HTMLInputElement).value = item.relationship_name || '';
                            (document.getElementById(`fam_self_info_${selfIdx}`) as HTMLInputElement).value = item.information || '';
                            selfIdx++;
                        } else if (item.relation_side === 'SPOUSE' && spIdx <= 16) {
                            (document.getElementById(`fam_sp_rel_${spIdx}`) as HTMLInputElement).value = item.relationship_name || '';
                            (document.getElementById(`fam_sp_info_${spIdx}`) as HTMLInputElement).value = item.information || '';
                            spIdx++;
                        }
                    });
                }
            }
        } catch (e) { console.error("Lỗi tải hồ sơ:", e); }
    };

    const resetForm = () => {
        document.querySelectorAll('input.input-fill, input.table-input, textarea').forEach((el: any) => el.value = '');
        (document.getElementById('rv_status_pend') as HTMLInputElement).checked = true;

        (document.getElementById('profile_image_path') as HTMLInputElement).value = '';
        const previewImg = document.getElementById('profile_image_preview') as HTMLImageElement;
        previewImg.src = '';
        previewImg.style.display = 'none';
        const placeholder = document.getElementById('photo_placeholder');
        if (placeholder) placeholder.style.display = 'inline';
        const uploadStatus = document.getElementById('upload_status');
        if (uploadStatus) uploadStatus.innerHTML = '';
    };

    const resetTableData = () => {
        document.querySelectorAll('input.table-input, td textarea').forEach((el: any) => el.value = '');
    };

    const exportPDF = () => {
        const id = (document.getElementById('server-id') as HTMLInputElement).value || 'HoSo';
        const element = document.getElementById('content-to-export');

        // Cập nhật DOM trước khi in
        document.querySelectorAll('input, textarea').forEach((el: any) => el.setAttribute('value', el.value));
        document.querySelectorAll('textarea').forEach((el: any) => el.innerHTML = el.value);

        const w = window as any;
        if (w.html2pdf) {
            w.html2pdf().set({
                margin: 5, filename: id + '.pdf', image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(element).save();
        } else {
            alert("Thư viện PDF chưa được tải xong, vui lòng thử lại.");
        }
    };

    const handleProfileImageSelect = async (event: any) => {
        const file = event.target.files[0];
        if (!file) return;

        const previewImg = document.getElementById('profile_image_preview') as HTMLImageElement;
        const placeholder = document.getElementById('photo_placeholder');
        const statusText = document.getElementById('upload_status');

        const reader = new FileReader();
        reader.onload = function (e: any) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);

        if (statusText) {
            statusText.innerHTML = "⏳ Đang tải ảnh lên...";
            statusText.style.color = "#d35400";
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch('/api/employee_profiles/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hrm_token')}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                (document.getElementById('profile_image_path') as HTMLInputElement).value = data.image_path;
                if (statusText) {
                    statusText.innerHTML = "✔️ Ảnh đã tải xong";
                    statusText.style.color = "#27ae60";
                }
            } else {
                if (statusText) {
                    statusText.innerHTML = "❌ Lỗi tải ảnh";
                    statusText.style.color = "#c0392b";
                }
                alert("Lỗi khi tải ảnh lên máy chủ!");
            }
        } catch (e) {
            console.error(e);
            if (statusText) {
                statusText.innerHTML = "❌ Lỗi mạng";
                statusText.style.color = "#c0392b";
            }
        }
    };

    return (
        <div className="body-profile">
            {/* Chèn scripts đảm bảo thứ tự */}
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="lazyOnload" />
            {/* Sửa beforeInteractive thành afterInteractive */}
            <Script src="https://code.jquery.com/jquery-3.6.0.min.js" strategy="afterInteractive" />
            <Script
                src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"
                strategy="afterInteractive"
                onLoad={() => initData()}
            />

            <div className="toolbar">
                <select id="employee_select" className="input-id-box" style={{ width: '300px' }}>
                    <option value="">-- Chọn nhân viên từ hệ thống --</option>
                </select>

                <input type="hidden" id="server-id" />

                <button className="btn btn-save" onClick={saveData}>LƯU LÊN SERVER</button>
                <button className="btn btn-pdf" onClick={exportPDF}>XUẤT PDF</button>
            </div>

            <div className="page" id="content-to-export">
                <div className="custom-tag">Made by NguyenDongHung CNTT, NguyenHoaiNam CNTT - BVBNDTW (Database Mapped Form)</div>

                <div className="contact-info">
                    <strong>Hỗ trợ kỹ thuật:</strong> Anh Tiến - Phòng TCCB - 0973.053.160 <br />
                    <em style={{ color: '#c0392b' }}>* Quy tắc đặt ID hồ sơ: <strong>HỌ TÊN (VIẾT LIỀN KHÔNG DẤU) + NGÀY SINH + SỐ ĐIỆN THOẠI</strong></em>
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br />
                    Độc lập - Tự do - Hạnh phúc<br />
                    <span style={{ fontWeight: 'normal' }}>---------------</span>
                </div>

                <div className="photo-container" style={{ float: 'left', marginRight: '25px', textAlign: 'center' }}>
                    <div className="photo-frame" id="photo_preview_container"
                        style={{ marginRight: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        onClick={() => document.getElementById('profile_image_input')?.click()} title="Click để chọn ảnh">
                        <span id="photo_placeholder">Ảnh màu<br />(4 x 6 cm)<br /><br /><i style={{ fontSize: '9pt', color: 'var(--accent-color)' }}>Click chọn ảnh</i></span>
                        <img
                            id="profile_image_preview"
                            /* Dùng 1 pixel trong suốt dạng base64 thay vì chuỗi rỗng "" */
                            src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                            alt="preview"
                            style={{ display: 'none', width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                        />
                    </div>

                    <input type="file" id="profile_image_input" accept="image/*" style={{ display: 'none' }} onChange={handleProfileImageSelect} />
                    <input type="hidden" id="profile_image_path" defaultValue="" />

                    <div style={{ fontSize: '9pt', marginTop: '5px', color: '#7f8c8d' }} className="no-print">
                        <span id="upload_status"></span>
                    </div>
                </div>

                <div style={{ overflow: 'hidden' }}>
                    <h2>LÝ LỊCH VIÊN CHỨC</h2>
                    <div className="form-row"><span className="label">1) Họ và tên khai sinh (in hoa):</span><input type="text" className="input-fill" id="full_name" style={{ textTransform: 'uppercase', fontWeight: 'bold' }} /></div>
                    <div className="form-row"><span className="label">2) Tên gọi khác:</span><input type="text" className="input-fill" id="other_name" /></div>
                    <div className="form-row">
                        <span className="label">3) Sinh ngày:</span> <input type="date" id="birth_date" style={{ width: '150px' }} className="input-fill" />
                        <span className="label" style={{ marginLeft: '20px' }}>Giới tính:</span> <input type="text" id="gender" style={{ width: '80px' }} className="input-fill" />
                    </div>
                </div>
                <div className="clear"></div>

                <div className="form-row"><span className="label">4) Nơi sinh:</span> <input type="text" className="input-fill" id="birth_place" placeholder="Xã/Phường, Huyện/Quận, Tỉnh/TP" /></div>
                <div className="form-row"><span className="label">5) Quê quán:</span> <input type="text" className="input-fill" id="home_town" /></div>
                <div className="form-row"><span className="label">6) Dân tộc:</span> <input type="text" id="ethnicity" style={{ width: '150px' }} className="input-fill" /><span className="label" style={{ marginLeft: '20px' }}>7) Tôn giáo:</span> <input type="text" id="religion" className="input-fill" /></div>
                <div className="form-row"><span className="label">8) Nơi đăng ký hộ khẩu thường trú:</span> <input type="text" className="input-fill" id="permanent_address" /></div>
                <div className="form-row"><span className="label">9) Nơi ở hiện nay:</span> <input type="text" className="input-fill" id="current_address" /></div>
                <div className="form-row"><span className="label">10) Nghề nghiệp khi được tuyển dụng:</span> <input type="text" className="input-fill" id="recruitment_occupation" /></div>

                <div className="form-row"><span className="label">11) Ngày tuyển dụng:</span> <input type="date" id="recruitment_date" style={{ width: '130px' }} className="input-fill" /><span className="label">, Cơ quan tuyển dụng:</span> <input type="text" id="recruitment_agency" className="input-fill" /></div>
                <div className="form-row"><span className="label">12.1- Chức danh (chức vụ) hiện tại:</span> <input type="text" className="input-fill" id="current_position" /></div>
                <div className="form-row"><span className="label">12.2- Chức danh (chức vụ) kiêm nhiệm:</span> <input type="text" className="input-fill" id="concurrent_position" /></div>
                <div className="form-row"><span className="label">13) Công việc chính được giao:</span> <input type="text" className="input-fill" id="main_tasks" /></div>

                <div className="form-row"><span className="label">14) Chức danh nghề nghiệp:</span> <input type="text" className="input-fill" id="professional_title" /><span className="label">Mã số:</span> <input type="text" id="title_code" style={{ width: '100px' }} className="input-fill" /></div>
                <div className="form-row"><span className="label">Bậc lương:</span> <input type="text" id="salary_level" style={{ width: '50px' }} className="input-fill" /><span className="label">, Hệ số:</span> <input type="number" step="0.01" id="salary_coefficient" style={{ width: '70px' }} className="input-fill" /><span className="label">, Ngày hưởng:</span> <input type="date" id="salary_start_date" style={{ width: '130px' }} className="input-fill" /><span className="label">, Phụ cấp:</span> <input type="text" id="allowance" style={{ width: '100px' }} className="input-fill" /></div>

                <div className="form-row"><span className="label">15.1- Trình độ giáo dục phổ thông:</span> <input type="text" className="input-fill" id="edu_general" /></div>
                <div className="form-row"><span className="label">15.2- Trình độ chuyên môn cao nhất:</span> <input type="text" className="input-fill" id="edu_highest" /></div>
                <div className="form-row">
                    <span className="label">15.3- Lý luận chính trị:</span> <input type="text" className="input-fill" id="political_theory" />
                    <span className="label" style={{ marginLeft: '10px' }}>15.4- Quản lý nhà nước:</span> <input type="text" className="input-fill" id="state_management" />
                </div>
                <div className="form-row"><span className="label">15.5- Trình độ nghiệp vụ chuyên ngành:</span> <input type="text" className="input-fill" id="professional_skill" /></div>
                <div className="form-row">
                    <span className="label">15.6- Ngoại ngữ:</span> <input type="text" className="input-fill" id="foreign_language" />
                    <span className="label" style={{ marginLeft: '10px' }}>15.7- Tin học:</span> <input type="text" className="input-fill" id="it_skill" />
                </div>

                <div className="form-row"><span className="label">16) Ngày vào Đảng CSVN:</span> <input type="date" id="party_join_date" style={{ width: '130px' }} className="input-fill" /><span className="label">, Chính thức:</span> <input type="date" id="party_official_date" style={{ width: '130px' }} className="input-fill" /></div>
                <div className="form-row"><span className="label">17) Ngày tham gia tổ chức CT-XH:</span> <input type="date" className="input-fill" id="union_join_date" /></div>
                <div className="form-row"><span className="label">18) Ngày nhập ngũ:</span> <input type="date" id="military_join_date" style={{ width: '130px' }} className="input-fill" /><span className="label">, Xuất ngũ:</span> <input type="date" id="military_exit_date" style={{ width: '130px' }} className="input-fill" /><span className="label">, Quân hàm:</span> <input type="text" id="military_rank" className="input-fill" /></div>

                <div className="form-row"><span className="label">19.1- Danh hiệu cao nhất:</span> <input type="text" className="input-fill" id="highest_title" /></div>
                <div className="form-row"><span className="label">19.2- Học hàm được phong:</span> <input type="text" className="input-fill" id="academic_rank" /></div>
                <div className="form-row"><span className="label">20) Sở trường công tác:</span> <input type="text" className="input-fill" id="strengths" /></div>

                <div className="form-row"><span className="label">21) Tình trạng sức khỏe:</span> <input type="text" id="health_status" style={{ width: '150px' }} className="input-fill" /><span className="label">Cao:</span> <input type="number" step="0.01" id="height" style={{ width: '60px' }} className="input-fill" /><span className="label">Nặng:</span> <input type="number" step="0.01" id="weight" style={{ width: '60px' }} className="input-fill" /><span className="label">Máu:</span> <input type="text" id="blood_type" style={{ width: '40px' }} className="input-fill" /></div>
                <div className="form-row"><span className="label">22) Thương binh hạng:</span> <input type="text" id="veteran_class" style={{ width: '100px' }} className="input-fill" /><span className="label">, Gia đình chính sách:</span> <input type="text" id="policy_family" className="input-fill" /></div>

                <div className="form-row"><span className="label">23) Số CMND/CCCD:</span> <input type="text" id="id_card_no" style={{ width: '200px' }} className="input-fill" /><span className="label">Ngày cấp:</span> <input type="date" id="id_card_issue_date" className="input-fill" style={{ width: '150px' }} /></div>
                <div className="form-row"><span className="label">24) Sổ BHXH:</span> <input type="text" className="input-fill" id="social_insurance_no" /></div>

                {/* --- BẢNG ĐƯỢC CHUYỂN TỪ document.write SANG .map() CỦA REACT --- */}
                <span className="section-title">II. QUÁ TRÌNH ĐÀO TẠO, BỒI DƯỠNG</span>
                <table>
                    <thead>
                        <tr>
                            <th>Tên trường</th>
                            <th>Chuyên ngành</th>
                            <th>Thời gian</th>
                            <th>Hình thức</th>
                            <th>Văn bằng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }, (_, i) => i + 1).map(i => (
                            <tr key={`edu_${i}`}>
                                <td><textarea id={`edu_school_${i}`}></textarea></td>
                                <td><textarea id={`edu_major_${i}`}></textarea></td>
                                <td><input type="text" className="table-input" id={`edu_duration_${i}`} /></td>
                                <td><input type="text" className="table-input" id={`edu_mode_${i}`} /></td>
                                <td><input type="text" className="table-input" id={`edu_degree_${i}`} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <span className="section-title">III. ĐẶC ĐIỂM LỊCH SỬ BẢN THÂN</span>
                <span className="sub-guide">(Khai rõ: Quá trình công tác; Bị bắt, bị tù; Làm việc trong chế độ cũ...)</span>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '25%' }}>Từ tháng năm - đến tháng năm</th>
                            <th>Đặc điểm lịch sử</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 15 }, (_, i) => i + 1).map(i => (
                            <tr key={`his_${i}`}>
                                <td><input type="text" className="table-input" id={`his_period_${i}`} /></td>
                                <td><textarea id={`his_desc_${i}`} rows={2}></textarea></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <span className="section-title">IV. KHEN THƯỞNG</span>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '20%' }}>Ngày tháng</th>
                            <th>Nội dung hình thức</th>
                            <th style={{ width: '30%' }}>Cấp quyết định</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 4 }, (_, i) => i + 1).map(i => (
                            <tr key={`rew_${i}`}>
                                <td><input type="text" className="table-input" id={`rew_date_${i}`} /></td>
                                <td><textarea id={`rew_content_${i}`}></textarea></td>
                                <td><input type="text" className="table-input" id={`rew_agency_${i}`} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <span className="section-title">V. KỶ LUẬT</span>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '20%' }}>Ngày tháng</th>
                            <th>Lý do hình thức</th>
                            <th style={{ width: '30%' }}>Cấp quyết định</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 4 }, (_, i) => i + 1).map(i => (
                            <tr key={`dis_${i}`}>
                                <td><input type="text" className="table-input" id={`dis_date_${i}`} /></td>
                                <td><textarea id={`dis_content_${i}`}></textarea></td>
                                <td><input type="text" className="table-input" id={`dis_agency_${i}`} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <span className="section-title">VI. QUAN HỆ GIA ĐÌNH</span>
                <div style={{ fontWeight: 'bold', marginTop: '10px' }}>1. Về bản thân (Cha, Mẹ, Vợ/Chồng, con, anh chị em ruột):</div>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '15%' }}>Mối quan hệ</th>
                            <th>Họ tên, năm sinh, quê quán, nghề nghiệp, nơi cư trú...</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 18 }, (_, i) => i + 1).map(i => (
                            <tr key={`fam_self_${i}`}>
                                <td><input type="text" className="table-input" id={`fam_self_rel_${i}`} /></td>
                                <td><textarea id={`fam_self_info_${i}`}></textarea></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ fontWeight: 'bold', marginTop: '10px' }}>2. Về bên Vợ hoặc Chồng (Cha, Mẹ, anh chị em ruột):</div>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '15%' }}>Mối quan hệ</th>
                            <th>Họ tên, năm sinh, quê quán, nghề nghiệp, nơi cư trú...</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 16 }, (_, i) => i + 1).map(i => (
                            <tr key={`fam_sp_${i}`}>
                                <td><input type="text" className="table-input" id={`fam_sp_rel_${i}`} /></td>
                                <td><textarea id={`fam_sp_info_${i}`}></textarea></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <span className="section-title">VII. TỰ NHẬN XÉT, ĐÁNH GIÁ</span>
                <textarea rows={10} id="self_evaluation" style={{ border: '1px dotted #000', padding: '10px' }}></textarea>

                <div style={{ marginTop: '20px', fontStyle: 'italic' }}>
                    Tôi xin cam đoan về những lời khai trong quyển lý lịch này là đúng sự thật và chịu trách nhiệm trước pháp luật về những lời khai đó.
                </div>

                <div className="footer-sig">
                    <div className="footer-col">
                        <strong>Xác nhận của đơn vị</strong><br />
                        <span style={{ fontSize: '11pt', fontStyle: 'italic' }}>(Thủ trưởng đơn vị ký tên, đóng dấu)</span>
                        <div style={{ marginTop: '80px' }}>.......................................................</div>
                    </div>
                    <div className="footer-col">
                        <i>........, ngày .... tháng .... năm 20....</i><br />
                        <strong>Người khai</strong><br />
                        <span style={{ fontSize: '11pt', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span>
                        <div style={{ marginTop: '80px' }}>.......................................................</div>
                    </div>
                </div>

                <div className="reviewer-section">
                    <div className="reviewer-title">VIII. NHẬN XÉT, ĐÁNH GIÁ CỦA CÁN BỘ RÀ SOÁT</div>
                    <div className="form-row" style={{ justifyContent: 'center', marginBottom: '20px' }}>
                        <label className="status-label"><input type="radio" name="review_status" id="rv_status_ok" value="APPROVED" /> ĐẠT YÊU CẦU</label>
                        <label className="status-label"><input type="radio" name="review_status" id="rv_status_fix" value="REJECTED" /> CẦN CHỈNH SỬA</label>
                        <label className="status-label"><input type="radio" name="review_status" id="rv_status_pend" value="PENDING" defaultChecked /> CHƯA KIỂM TRA</label>
                    </div>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Nội dung nhận xét:</div>
                    <textarea rows={5} id="review_comment" style={{ width: '100%', border: '1px solid #ccc', padding: '10px', background: 'white', boxSizing: 'border-box' }}></textarea>
                    <div className="form-row" style={{ marginTop: '15px' }}>
                        <span className="label">Người kiểm tra:</span> <input type="text" id="reviewer_name" defaultValue="Anh Tiến (TCCB)" style={{ border: 'none', borderBottom: '1px solid #000', fontWeight: 'bold' }} />
                        <span className="label" style={{ marginLeft: '30px' }}>Ngày:</span> <input type="date" id="review_date" style={{ border: 'none', borderBottom: '1px solid #000' }} />
                    </div>
                </div>

                <div className="custom-tag" style={{ marginTop: '30px' }}>Made by NguyenDongHung CNTT, NguyenHoaiNam CNTT - BVBNDTW</div>
            </div>
        </div>
    );
}