document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const realTimeClock = document.getElementById('realTimeClock');
    const employeeIdInput = document.getElementById('employeeIdInput');
    const suggestionBox = document.getElementById('suggestionBox');
    const verifyBtn = document.getElementById('verifyBtn');
    const employeeInputView = document.getElementById('employeeInputView');
    const userDashboardView = document.getElementById('userDashboardView');
    const userNameEl = document.getElementById('userName');
    const employeeIdEl = document.getElementById('employeeId');
    const logoutBtn = document.getElementById('logoutBtn');
    const statusIcon = document.getElementById('statusIcon');
    const statusTitle = document.getElementById('statusTitle');
    const statusTimer = document.getElementById('statusTimer');
    const startBtn = document.getElementById('startBtn');
    const endBtn = document.getElementById('endBtn');
    const quickStats = document.getElementById('quickStats');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const notification = document.getElementById('notification');
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationMessage = document.getElementById('notificationMessage');

    // --- Constants ---
    const API_BASE_URL = 'https://timer.aipencil.name.vn';
    const VALID_EMPLOYEE_CODES = ['AIP001', 'AIP002', 'AIP003', 'AIP004', 'AIP005']; // Example valid codes

    // --- State ---
    let state = {
        currentUser: null,
        currentSession: null,
        isWorking: false,
        sessionInterval: null,
        notificationTimeout: null,
        totalAccumulatedSeconds: 0, // New state variable
    };

    // --- API Handler ---
    const api = {
        _call: async (endpoint, method = 'GET', body = null) => {
            const url = `${API_BASE_URL}${endpoint}`;
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (body) {
                options.body = JSON.stringify(body);
            }
            try {
                const response = await fetch(url, options);
                const responseData = await response.json();
                if (!response.ok) {
                    throw new Error(responseData.error || `API Error: ${response.statusText}`);
                }
                return responseData;
            } catch (error) {
                console.error(`API call to ${endpoint} failed:`, error);
                showNotification(error.message || 'Lỗi kết nối mạng. Vui lòng thử lại.', 'error');
                throw error;
            }
        },
        verifyEmployee: (employeeCode) => api._call(`/api/users/${employeeCode}`),
        checkActiveSession: (employeeCode) => api._call(`/api/users/active-session/${employeeCode}`),
        startShift: (employeeCode) => api._call('/api/time-logs', 'POST', { 
            employee_code: employeeCode,
            start_time: new Date().toISOString() 
        }),
        endShift: (sessionId) => api._call(`/api/time-logs/${sessionId}`, 'PUT', { 
            end_time: new Date().toISOString() 
        }),
    };

    // --- UI Update Functions ---
    const ui = {
        showLoading: (text = 'Đang xử lý...') => {
            loadingText.textContent = text;
            loadingOverlay.classList.add('show');
        },
        hideLoading: () => loadingOverlay.classList.remove('show'),
        showView: (view) => {
            employeeInputView.style.display = 'none';
            userDashboardView.style.display = 'none';
            view.style.display = 'block';
            view.classList.add('fade-in');
        },
        updateClock: () => {
            realTimeClock.textContent = new Date().toLocaleTimeString('vi-VN');
        },
        updateDashboard: () => {
            if (state.currentUser) {
                userNameEl.textContent = state.currentUser.fullName;
                employeeIdEl.textContent = state.currentUser.employeeCode;
                ui.showView(userDashboardView);
            } else {
                ui.showView(employeeInputView);
                employeeIdInput.focus();
            }
            ui.updateStatus();
        },
        updateStatus: () => {
            const isWorking = state.isWorking && state.currentSession;
            statusIcon.className = `status-icon ${isWorking ? 'working' : 'idle'}`;
            statusIcon.innerHTML = `<i class="fa-solid ${isWorking ? 'fa-person-digging' : 'fa-bed'}"></i>`;
            statusTitle.textContent = isWorking ? 'Đang trong ca làm việc' : 'Sẵn sàng làm việc';
            startBtn.disabled = isWorking;
            endBtn.disabled = !isWorking;

            if (isWorking) {
                if (!state.sessionInterval) {
                    state.sessionInterval = setInterval(ui.updateSessionTimer, 1000);
                }
            } else {
                clearInterval(state.sessionInterval);
                state.sessionInterval = null;
                statusTimer.textContent = '00:00:00';
            }
        },
        updateSessionTimer: () => {
            if (!state.currentSession || !state.currentSession.startTime) return;
            const now = new Date();
            const start = new Date(state.currentSession.startTime);
            const sessionSeconds = Math.floor((now - start) / 1000);
            
            const totalSeconds = state.totalAccumulatedSeconds + sessionSeconds;

            const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            
            statusTimer.textContent = `${String(Math.floor(sessionSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((sessionSeconds % 3600) / 60)).padStart(2, '0')}:${String(sessionSeconds % 60).padStart(2, '0')}`;
            quickStats.textContent = `Đã làm`;
        },
        renderSuggestions: (codes) => {
            suggestionBox.innerHTML = codes.map(code => `<div class="suggestion-item">${code}</div>`).join('');
            suggestionBox.style.display = codes.length > 0 ? 'block' : 'none';
        }
    };

    // --- Notification System ---
    const showNotification = (message, type = 'info', duration = 3500) => {
        clearTimeout(state.notificationTimeout);
        notificationMessage.textContent = message;
        notification.className = `notification ${type}`;
        notificationIcon.className = `fa-solid ${
            type === 'success' ? 'fa-check-circle' :
            type === 'error' ? 'fa-times-circle' : 'fa-info-circle'
        }`;
        notification.classList.add('show');
        state.notificationTimeout = setTimeout(() => notification.classList.remove('show'), duration);
    };

    // --- Event Handlers ---
    const handlers = {
        handleVerify: async () => {
            const employeeCode = employeeIdInput.value.trim();
            if (!employeeCode) return;
            ui.showLoading('Đang xác minh...');
            try {
                const result = await api.verifyEmployee(employeeCode);
                const user = {
                    id: result.id,
                    fullName: result.full_name,
                    employeeCode: result.employee_code,
                };
                state.currentUser = user;
                await chrome.storage.local.set({ currentUser: user });
                showNotification(`Chào mừng, ${user.fullName}!`, 'success');
                
                // Check for active session
                const sessionResult = await api.checkActiveSession(user.employeeCode);
                if (sessionResult.has_active_session) {
                    state.currentSession = {
                        id: sessionResult.data.id,
                        startTime: sessionResult.data.start_time,
                    };
                    state.isWorking = true;
                    await chrome.storage.local.set({ currentSession: state.currentSession, isWorking: true });
                    showNotification('Đã khôi phục phiên làm việc đang hoạt động.', 'info');
                }

                ui.updateDashboard();
            } catch (error) {
                // Error is already shown by api._call
            } finally {
                ui.hideLoading();
            }
        },
        handleStartShift: async () => {
            if (!state.currentUser) return;
            ui.showLoading('Bắt đầu ca làm việc...');
            try {
                const result = await api.startShift(state.currentUser.employeeCode);
                if (result.success) {
                    state.currentSession = {
                        id: result.data.id,
                        startTime: result.data.start_time,
                    };
                    state.isWorking = true;
                    await chrome.storage.local.set({ currentSession: state.currentSession, isWorking: true });
                    showNotification('Bắt đầu ca làm việc thành công!', 'success');
                    ui.updateStatus();
                }
            } catch (error) {
                // Error is already shown by api._call
            } finally {
                ui.hideLoading();
            }
        },
        handleEndShift: async () => {
            if (!state.currentSession) return;
            ui.showLoading('Kết thúc ca làm việc...');
            try {
                const result = await api.endShift(state.currentSession.id);
                if (result.success) {
                    const duration = result.data.duration_seconds;
                    const h = Math.floor(duration / 3600);
                    const m = Math.floor((duration % 3600) / 60);
                    showNotification(`Kết thúc ca làm việc!`, 'success');
                }
                state.isWorking = false;
                state.currentSession = null;
                await chrome.storage.local.remove(['currentSession', 'isWorking']);
                quickStats.textContent = '';
                ui.updateStatus();
            } catch (error) {
                // Error is already shown by api._call
            } finally {
                ui.hideLoading();
            }
        },
        handleLogout: async () => {
            if (state.isWorking) {
                showNotification('Vui lòng kết thúc ca làm việc trước khi đăng xuất.', 'warning');
                return;
            }
            state.currentUser = null;
            await chrome.storage.local.remove('currentUser');
            employeeIdInput.value = '';
            showNotification('Đã đăng xuất.', 'info');
            ui.updateDashboard();
        },
        handleInput: (e) => {
            const value = e.target.value.toUpperCase();
            e.target.value = value;
            if (!value) {
                ui.renderSuggestions([]);
                return;
            }
            const filteredCodes = VALID_EMPLOYEE_CODES.filter(code => code.startsWith(value));
            ui.renderSuggestions(filteredCodes);
        },
        handlePaste: (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text').trim().toUpperCase();
            employeeIdInput.value = text;
            handlers.handleInput({ target: employeeIdInput });
        },
        handleSuggestionClick: (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                employeeIdInput.value = e.target.textContent;
                suggestionBox.style.display = 'none';
                handlers.handleVerify();
            }
        },
        handleKeyDown: (e) => {
            switch (e.key) {
                case 'Enter':
                    if (document.activeElement === employeeIdInput) handlers.handleVerify();
                    break;
                case 'Escape':
                    window.close();
                    break;
            }
        }
    };

    // --- Initialization ---
    const init = async () => {
        // Set up event listeners
        verifyBtn.addEventListener('click', handlers.handleVerify);
        startBtn.addEventListener('click', handlers.handleStartShift);
        endBtn.addEventListener('click', handlers.handleEndShift);
        logoutBtn.addEventListener('dblclick', handlers.handleLogout);
        employeeIdInput.addEventListener('input', handlers.handleInput);
        employeeIdInput.addEventListener('paste', handlers.handlePaste);
        suggestionBox.addEventListener('click', handlers.handleSuggestionClick);
        document.addEventListener('keydown', handlers.handleKeyDown);

        // Set up real-time clock
        setInterval(ui.updateClock, 1000);
        ui.updateClock();

        // Load data from storage
        ui.showLoading('Đang tải dữ liệu...');
        try {
            const data = await chrome.storage.local.get(['currentUser', 'currentSession', 'isWorking']);
            state.currentUser = data.currentUser || null;
            
            // If user is logged in, verify active session with server
            if (state.currentUser) {
                const sessionResult = await api.checkActiveSession(state.currentUser.employeeCode);
                if (sessionResult.has_active_session) {
                    state.currentSession = {
                        id: sessionResult.data.id,
                        startTime: sessionResult.data.start_time,
                    };
                    state.isWorking = true;
                } else {
                    state.currentSession = null;
                    state.isWorking = false;
                }
                await chrome.storage.local.set({ currentSession: state.currentSession, isWorking: state.isWorking });

            } else {
                 state.currentSession = null;
                 state.isWorking = false;
            }

        } catch (e) {
            console.error("Failed to load from storage or verify session", e);
            state.currentUser = null;
            state.currentSession = null;
            state.isWorking = false;
        } finally {
            ui.updateDashboard();
            ui.hideLoading();
        }

        // Listen for keyboard shortcuts from background script
        chrome.runtime.onMessage.addListener((message) => {
            if (message.command === 'start-shift' && !startBtn.disabled) {
                handlers.handleStartShift();
            } else if (message.command === 'end-shift' && !endBtn.disabled) {
                handlers.handleEndShift();
            }
        });
    };

    init();
});