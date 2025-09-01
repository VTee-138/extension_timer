// Minimalist Timer Extension - Clean & Simple UI
(function() {
  'use strict';
  
  // Prevent multiple instances
  if (window.timeTrackerInitialized) {
    return;
  }
  window.timeTrackerInitialized = true;
  
  // Global variables - Keep all existing logic
  let timerButton = null;
  let timerPopup = null;
  let isWorking = false;
  let workStartTime = null;
  let timerInterval = null;
  let employeeData = null;
  let popupVisible = false;
  let currentSession = null;
  let isButtonHidden = false;
  
  // Database configuration - Keep existing
  const DB_CONFIG = {
    host: '100.92.102.97',
    database: 'hrmai',
    user: 'n8n_user',
    password: 'n8n_pass',
    port: 5432
  };
  
  // Create minimalist floating button
  function createTimerButton() {
    if (document.getElementById('time-tracker-button')) {
      return;
    }
    
    // Simple round button
    timerButton = document.createElement('div');
    timerButton.id = 'time-tracker-button';
    timerButton.innerHTML = `
      <div class="button-content">
        <span class="timer-icon">⏱️</span>
        <span class="work-indicator"></span>
      </div>
    `;
    
    createTimerPopup();
    addEventListeners();
    loadSavedData();
    injectStyles();
    
    document.body.appendChild(timerButton);
    console.log('✨ Minimalist timer button created');
  }
  
  // Create ultra-convenient popup
  function createTimerPopup() {
    timerPopup = document.createElement('div');
    timerPopup.id = 'time-tracker-popup';
    timerPopup.innerHTML = `
      <div class="popup-overlay"></div>
      <div class="popup-content">
        <!-- Compact Header -->
        <div class="popup-header">
          <div class="header-left">
            <span class="app-icon">⏰</span>
            <span class="app-title">Chấm Công</span>
          </div>
          <div class="header-actions">
            <button class="minimize-btn" id="hide-button-btn" title="Ẩn nút">📖</button>
            <button class="close-btn" title="Đóng">✕</button>
          </div>
        </div>
        
        <!-- Quick Status Bar -->
        <div class="status-bar">
          <div class="current-time" id="current-time">${new Date().toLocaleTimeString('vi-VN')}</div>
          <div class="work-status" id="work-status">Chưa chấm công</div>
        </div>
        
        <!-- Main Timer Display -->
        <div class="timer-main">
          <div class="timer-display" id="timer-display">00:00:00</div>
          <div class="timer-label">Thời gian làm việc</div>
        </div>
        
        <!-- Smart Employee Section -->
        <div class="employee-section">
          <div class="employee-input" id="employee-input-section">
            <div class="input-group">
              <span class="input-icon">👤</span>
              <input 
                type="text" 
                id="employee-code-input" 
                placeholder="Nhập mã nhân viên (VD: AIP001)" 
                maxlength="10"
                autocomplete="off"
                spellcheck="false"
              />
              <button class="quick-verify" id="verify-employee-btn" disabled title="Xác minh">
                <span class="verify-icon">✓</span>
              </button>
            </div>
            <div class="input-hint">💡 Nhấn Enter hoặc click ✓ để xác minh</div>
          </div>
          
          <div class="employee-verified" id="employee-info-section" style="display: none;">
            <div class="employee-card">
              <div class="employee-avatar">
                <span class="avatar-text" id="employee-avatar">👤</span>
              </div>
              <div class="employee-details">
                <div class="employee-name" id="employee-name">Tên nhân viên</div>
                <div class="employee-meta">
                  <span class="employee-code" id="employee-code">Mã NV</span>
                  <span class="separator">•</span>
                  <span class="employee-role" id="employee-role">Vị trí</span>
                </div>
              </div>
              <button class="change-employee" id="change-employee-btn" title="Thay đổi">
                <span>🔄</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- One-Click Action Buttons -->
        <div class="action-zone">
          <button class="action-primary" id="start-work-btn" disabled>
            <div class="btn-icon">▶️</div>
            <div class="btn-text">
              <div class="btn-title">Bắt Đầu</div>
              <div class="btn-subtitle">Chấm công vào ca</div>
            </div>
            <div class="btn-spinner" style="display: none;">⏳</div>
          </button>
          
          <button class="action-secondary" id="end-work-btn" disabled>
            <div class="btn-icon">⏹️</div>
            <div class="btn-text">
              <div class="btn-title">Kết Thúc</div>
              <div class="btn-subtitle">Chấm công ra ca</div>
            </div>
            <div class="btn-spinner" style="display: none;">⏳</div>
          </button>
        </div>
        
        <!-- Smart Notifications -->
        <div class="notification-area" id="notification-area"></div>
        
        <!-- Quick Stats (when working) -->
        <div class="quick-stats" id="quick-stats" style="display: none;">
          <div class="stat-item">
            <span class="stat-label">Bắt đầu lúc</span>
            <span class="stat-value" id="start-time">--:--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Đã làm việc</span>
            <span class="stat-value" id="work-duration">0h 0m</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(timerPopup);
    addPopupEventListeners();
    startClockUpdate();
  }
  
  // Event listeners
  function addEventListeners() {
    timerButton.addEventListener('click', showPopup);
    timerButton.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      toggleButtonVisibility();
    });
    
    document.addEventListener('keydown', handleKeyDown);
  }
  
  function addPopupEventListeners() {
    // Enhanced close controls
    const closeBtn = timerPopup.querySelector('.close-btn');
    const overlay = timerPopup.querySelector('.popup-overlay');
    const minimizeBtn = document.getElementById('hide-button-btn');
    
    closeBtn.addEventListener('click', hidePopup);
    overlay.addEventListener('click', hidePopup);
    minimizeBtn.addEventListener('click', () => {
      hidePopup();
      hideButton();
    });
    
    // Smart employee input with real-time feedback
    const employeeInput = document.getElementById('employee-code-input');
    const verifyBtn = document.getElementById('verify-employee-btn');
    const changeBtn = document.getElementById('change-employee-btn');
    
    employeeInput.addEventListener('input', handleSmartEmployeeInput);
    employeeInput.addEventListener('keypress', handleEmployeeKeyPress);
    employeeInput.addEventListener('paste', handleEmployeePaste);
    verifyBtn.addEventListener('click', verifyEmployee);
    changeBtn.addEventListener('click', showEmployeeInput);
    
    // Enhanced action buttons with better UX
    const startBtn = document.getElementById('start-work-btn');
    const endBtn = document.getElementById('end-work-btn');
    
    startBtn.addEventListener('click', handleStartWork);
    endBtn.addEventListener('click', handleEndWork);
    
    // Prevent accidental closes
    timerPopup.querySelector('.popup-content').addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
  }
  
  // Enhanced employee input handling
  function handleSmartEmployeeInput(e) {
    const value = e.target.value.trim().toUpperCase();
    e.target.value = value;
    
    const verifyBtn = document.getElementById('verify-employee-btn');
    const inputGroup = e.target.closest('.input-group');
    
    if (value.length >= 3) {
      verifyBtn.disabled = false;
      verifyBtn.style.opacity = '1';
      inputGroup.classList.add('ready');
      
      // Auto-verify if looks like complete employee code
      if (value.length >= 6 && /^[A-Z]{2,3}\d{3,4}$/.test(value)) {
        showSmartNotification('🎯 Mã hợp lệ! Nhấn Enter để xác minh', 'info');
      }
    } else {
      verifyBtn.disabled = true;
      verifyBtn.style.opacity = '0.5';
      inputGroup.classList.remove('ready');
      resetEmployeeDisplay();
      clearNotifications();
    }
  }
  
  function handleEmployeePaste(e) {
    // Clean pasted content
    setTimeout(() => {
      const cleaned = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      e.target.value = cleaned;
      handleSmartEmployeeInput(e);
    }, 10);
  }
  
  function handleKeyboardShortcuts(e) {
    if (!popupVisible) return;
    
    switch(e.key) {
      case 'Escape':
        hidePopup();
        break;
      case 'Enter':
        if (e.target.id === 'employee-code-input') {
          e.preventDefault();
          verifyEmployee();
        }
        break;
      case 'F1':
        if (employeeData && !isWorking) {
          e.preventDefault();
          handleStartWork();
        }
        break;
      case 'F2':
        if (employeeData && isWorking) {
          e.preventDefault();
          handleEndWork();
        }
        break;
    }
  }
  
  // Enhanced UI update functions
  function updateEnhancedActionButtons(working) {
    const startBtn = document.getElementById('start-work-btn');
    const endBtn = document.getElementById('end-work-btn');
    
    if (working) {
      startBtn.style.display = 'none';
      endBtn.style.display = 'flex';
    } else {
      startBtn.style.display = 'flex';
      endBtn.style.display = 'none';
    }
  }
  
  function updateWorkStatus(message, type) {
    const statusText = document.getElementById('work-status-text');
    const statusIcon = document.getElementById('work-status-icon');
    
    if (statusText) statusText.textContent = message;
    
    if (statusIcon) {
      statusIcon.className = `status-icon ${type}`;
      statusIcon.textContent = type === 'working' ? '🚀' : 
                              type === 'completed' ? '🏁' : '⭕';
    }
  }
  
  function startClockUpdate() {
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => {
      const clockElement = document.getElementById('real-time-clock');
      if (clockElement) {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    }, 1000);
  }
  
  function showSmartNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.smart-notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `smart-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${
          type === 'success' ? '✅' : 
          type === 'error' ? '❌' : 
          type === 'warning' ? '⚠️' : 'ℹ️'
        }</span>
        <span class="notification-text">${message}</span>
      </div>
    `;
    
    // Enhanced notification styles
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: type === 'success' ? 'linear-gradient(135deg, #4CAF50, #66BB6A)' :
                  type === 'error' ? 'linear-gradient(135deg, #F44336, #EF5350)' :
                  type === 'warning' ? 'linear-gradient(135deg, #FF9800, #FFB74D)' :
                  'linear-gradient(135deg, #2196F3, #42A5F5)',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '12px',
      zIndex: '100000',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      opacity: '0',
      transform: 'translateX(100px)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100px)';
      setTimeout(() => notification.remove(), 300);
    }, 3500);
  }
  
  function showQuickStats() {
    const quickStats = document.getElementById('quick-stats');
    if (quickStats) {
      quickStats.style.display = 'block';
      quickStats.style.opacity = '1';
      quickStats.style.transform = 'translateY(0)';
    }
  }
  
  function hideQuickStats() {
    const quickStats = document.getElementById('quick-stats');
    if (quickStats) {
      quickStats.style.opacity = '0';
      quickStats.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        quickStats.style.display = 'none';
      }, 300);
    }
  }
  
  function clearNotifications() {
    const existing = document.querySelectorAll('.smart-notification');
    existing.forEach(n => n.remove());
  }
  
  // Button visibility toggle
  function toggleButtonVisibility() {
    if (isButtonHidden) {
      showButton();
    } else {
      hideButton();
    }
  }
  
  function hideButton() {
    isButtonHidden = true;
    timerButton.style.transform = 'scale(0)';
    timerButton.style.opacity = '0';
    
    // Save state
    chrome.storage.local.set({ buttonHidden: true });
    
    // Create show button after 2 seconds
    setTimeout(() => {
      if (isButtonHidden) {
        createShowButton();
      }
    }, 2000);
  }
  
  function showButton() {
    isButtonHidden = false;
    timerButton.style.transform = 'scale(1)';
    timerButton.style.opacity = '1';
    
    // Remove show button if exists
    const showBtn = document.getElementById('show-timer-button');
    if (showBtn) {
      showBtn.remove();
    }
    
    // Save state
    chrome.storage.local.set({ buttonHidden: false });
  }
  
  function createShowButton() {
    if (document.getElementById('show-timer-button') || !isButtonHidden) return;
    
    const showBtn = document.createElement('div');
    showBtn.id = 'show-timer-button';
    showBtn.innerHTML = '👁️';
    showBtn.title = 'Hiện nút chấm công';
    
    showBtn.addEventListener('click', showButton);
    document.body.appendChild(showBtn);
  }
  
  // Keep ALL existing business logic functions unchanged
  function handleEmployeeInput(e) {
    const value = e.target.value.trim().toUpperCase();
    e.target.value = value;
    
    const verifyBtn = document.getElementById('verify-employee-btn');
    if (value.length >= 3) {
      verifyBtn.disabled = false;
    } else {
      verifyBtn.disabled = true;
      resetEmployeeDisplay();
    }
  }
  
  function handleEmployeeKeyPress(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      verifyEmployee();
    }
  }
  
  async function verifyEmployee() {
    const employeeCode = document.getElementById('employee-code-input').value.trim();
    if (!employeeCode || employeeCode.length < 3) {
      showSmartNotification('❌ Vui lòng nhập mã nhân viên hợp lệ!', 'error');
      return;
    }
    
    const verifyBtn = document.getElementById('verify-employee-btn');
    const btnText = verifyBtn.querySelector('.btn-text');
    const btnSpinner = verifyBtn.querySelector('.btn-spinner');
    
    try {
      // Enhanced loading state
      btnText.style.opacity = '0.5';
      btnSpinner.style.display = 'block';
      verifyBtn.disabled = true;
      
      showSmartNotification('🔍 Đang xác minh nhân viên...', 'info');
      
      const employee = await queryDatabase(`
        SELECT id, full_name, role, created_at, username, employee_code 
        FROM users 
        WHERE UPPER(employee_code) = $1
      `, [employeeCode.toUpperCase()]);
      
      if (employee && employee.length > 0) {
        const employeeInfo = {
          id: employee[0].id,
          employee_code: employee[0].employee_code,
          fullName: employee[0].full_name || employee[0].username || `Nhân viên ${employeeCode}`,
          role: employee[0].role || 'Nhân viên',
          username: employee[0].username || 'N/A'
        };
        
        employeeData = employeeInfo;
        showEmployeeInfo(employeeInfo);
        enableActionButtons();
        saveEmployeeData(employeeInfo);
        showSmartNotification('✅ Xác minh thành công!', 'success');
        
        console.log('✅ Employee verified:', employeeInfo);
      } else {
        throw new Error('Employee not found');
      }
      
    } catch (error) {
      console.error('❌ Employee verification failed:', error);
      showSmartNotification('❌ Không tìm thấy nhân viên trong hệ thống!', 'error');
      resetEmployeeDisplay();
    } finally {
      btnText.style.opacity = '1';
      btnSpinner.style.display = 'none';
      verifyBtn.disabled = false;
    }
  }
  
  async function queryDatabase(query, params = []) {
    try {
      console.log('📡 Database query:', query, params);
      
      const response = await fetch('https://timer.aipencil.name.vn/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          params,
          config: DB_CONFIG
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Database response:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
  }
  
  // Enhanced work functions with better UX
  async function handleStartWork() {
    if (!employeeData) {
      showSmartNotification('❌ Vui lòng xác minh nhân viên trước!', 'error');
      return;
    }
    
    const startBtn = document.getElementById('start-work-btn');
    const btnText = startBtn.querySelector('.btn-text');
    const btnSpinner = startBtn.querySelector('.btn-spinner');
    
    try {
      // Enhanced loading state
      btnText.style.opacity = '0.5';
      btnSpinner.style.display = 'block';
      startBtn.disabled = true;
      
      const startTime = new Date().toISOString();
      
      currentSession = {
        id: Date.now(),
        user_id: employeeData.id,
        employee_code: employeeData.employee_code,
        start_time: startTime,
        employee_name: employeeData.fullName
      };
      
      try {
        const dbResult = await queryDatabase(`
          INSERT INTO time_logs (user_id, start_time, end_time, duration_seconds)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [employeeData.id, startTime, null, null]);
        
        if (dbResult && dbResult.length > 0) {
          currentSession.db_id = dbResult[0].id;
          console.log('✅ Work session saved:', dbResult[0].id);
        }
      } catch (dbError) {
        console.warn('⚠️ Database save failed:', dbError);
      }
      
      isWorking = true;
      workStartTime = new Date(startTime);
      updateButtonWorkingState(true);
      updateEnhancedActionButtons(true);
      updateWorkStatus('Đang làm việc', 'working');
      
      chrome.storage.local.set({ 
        currentSession: currentSession,
        employeeData: employeeData 
      });
      
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(updateTimer, 1000);
      updateTimer();
      
      // Show quick stats
      showQuickStats();
      showSmartNotification('🚀 Đã bắt đầu ca làm việc!', 'success');
      console.log('🚀 Work started for:', employeeData.fullName);
      
    } catch (error) {
      console.error('❌ Failed to start work:', error);
      showSmartNotification('❌ Lỗi khi bắt đầu ca làm việc!', 'error');
    } finally {
      btnText.style.opacity = '1';
      btnSpinner.style.display = 'none';
      startBtn.disabled = false;
    }
  }
  
  async function handleEndWork() {
    if (!isWorking || !currentSession) {
      showSmartNotification('❌ Không có ca làm việc nào đang hoạt động!', 'error');
      return;
    }
    
    const endBtn = document.getElementById('end-work-btn');
    const btnText = endBtn.querySelector('.btn-text');
    const btnSpinner = endBtn.querySelector('.btn-spinner');
    
    try {
      btnText.style.opacity = '0.5';
      btnSpinner.style.display = 'block';
      endBtn.disabled = true;
      
      const endTime = new Date().toISOString();
      const duration = Math.floor((new Date(endTime) - new Date(currentSession.start_time)) / 1000);
      
      try {
        if (currentSession.db_id) {
          await queryDatabase(`
            UPDATE time_logs 
            SET end_time = $1, duration_seconds = $2
            WHERE id = $3
            RETURNING *
          `, [endTime, duration, currentSession.db_id]);
          
          console.log('✅ Work session updated');
        }
      } catch (dbError) {
        console.warn('⚠️ Database update failed:', dbError);
      }
      
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      
      isWorking = false;
      updateButtonWorkingState(false);
      updateEnhancedActionButtons(false);
      updateWorkStatus('Đã hoàn thành', 'completed');
      
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      chrome.storage.local.remove(['currentSession']);
      currentSession = null;
      workStartTime = null;
      
      hideQuickStats();
      showSmartNotification(`🏁 Hoàn thành! Thời gian làm việc: ${hours}h ${minutes}m`, 'success');
      console.log('🏁 Work ended:', `${hours}h ${minutes}m`);
      
    } catch (error) {
      console.error('❌ Failed to end work:', error);
      showSmartNotification('❌ Lỗi khi kết thúc ca làm việc!', 'error');
    } finally {
      btnText.style.opacity = '1';
      btnSpinner.style.display = 'none';
      endBtn.disabled = false;
    }
  }
  
  function updateTimer() {
    if (!isWorking || !workStartTime) return;
    
    const now = new Date();
    const elapsed = Math.floor((now - workStartTime) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = timeString;
    }
  }
  
  function showEmployeeInfo(employee) {
    document.getElementById('employee-name').textContent = employee.fullName;
    document.getElementById('employee-code').textContent = employee.employee_code;
    
    document.getElementById('employee-input-section').style.display = 'none';
    document.getElementById('employee-info-section').style.display = 'block';
  }
  
  function showEmployeeInput() {
    document.getElementById('employee-input-section').style.display = 'block';
    document.getElementById('employee-info-section').style.display = 'none';
    resetEmployeeDisplay();
    
    setTimeout(() => {
      const input = document.getElementById('employee-code-input');
      if (input) input.focus();
    }, 100);
  }
  
  function resetEmployeeDisplay() {
    employeeData = null;
    disableActionButtons();
    document.getElementById('employee-code-input').value = '';
  }
  
  function enableActionButtons() {
    const startBtn = document.getElementById('start-work-btn');
    startBtn.disabled = false;
  }
  
  function disableActionButtons() {
    const startBtn = document.getElementById('start-work-btn');
    const endBtn = document.getElementById('end-work-btn');
    
    startBtn.disabled = true;
    endBtn.disabled = true;
  }
  
  function updateActionButtons(working) {
    updateEnhancedActionButtons(working);
  }
  
  function updateTimerStatus(text, type) {
    updateWorkStatus(text, type);
  }
  
  function updateButtonWorkingState(working) {
    const indicator = timerButton.querySelector('.work-indicator');
    
    if (working) {
      indicator.style.opacity = '1';
      timerButton.style.background = '#10b981';
    } else {
      indicator.style.opacity = '0';
      timerButton.style.background = '#ef4444';
    }
  }
  
  function showPopup() {
    if (popupVisible) return;
    
    popupVisible = true;
    timerPopup.style.display = 'flex';
    
    requestAnimationFrame(() => {
      timerPopup.style.opacity = '1';
      const content = timerPopup.querySelector('.popup-content');
      content.style.transform = 'scale(1)';
    });
    
    if (!employeeData) {
      setTimeout(() => {
        const input = document.getElementById('employee-code-input');
        if (input) input.focus();
      }, 200);
    }
  }
  
  function hidePopup() {
    if (!popupVisible) return;
    
    const content = timerPopup.querySelector('.popup-content');
    content.style.transform = 'scale(0.9)';
    timerPopup.style.opacity = '0';
    
    setTimeout(() => {
      timerPopup.style.display = 'none';
      popupVisible = false;
    }, 200);
  }
  
  function handleKeyDown(e) {
    if (e.key === 'Escape' && popupVisible) {
      hidePopup();
    }
  }
  
  function loadSavedData() {
    chrome.storage.local.get(['employeeData', 'currentSession', 'buttonHidden'], (result) => {
      if (result.employeeData) {
        employeeData = result.employeeData;
        showEmployeeInfo(result.employeeData);
        enableActionButtons();
        console.log('✅ Employee data restored:', result.employeeData.fullName);
      }
      
      if (result.currentSession) {
        currentSession = result.currentSession;
        isWorking = true;
        workStartTime = new Date(result.currentSession.start_time);
        
        updateButtonWorkingState(true);
        updateActionButtons(true);
        updateTimerStatus('Đang làm việc', 'working');
        
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        
        console.log('✅ Work session restored');
      }
      
      if (result.buttonHidden) {
        hideButton();
      }
    });
  }
  
  function saveEmployeeData(employee) {
    chrome.storage.local.set({ employeeData: employee });
  }
  
  function injectStyles() {
    if (document.getElementById('timer-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'timer-styles';
    style.textContent = `
      /* Minimalist Button */
      #time-tracker-button {
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 50px !important;
        height: 50px !important;
        background: #ef4444 !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        z-index: 999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
        transition: all 0.3s ease !important;
        font-family: system-ui, -apple-system, sans-serif !important;
      }
      
      #time-tracker-button:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
      }
      
      .button-content {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      .timer-icon {
        font-size: 20px !important;
        color: white !important;
      }
      
      .work-indicator {
        position: absolute !important;
        top: -5px !important;
        right: -5px !important;
        width: 12px !important;
        height: 12px !important;
        background: #10b981 !important;
        border-radius: 50% !important;
        border: 2px solid white !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
      }
      
      /* Show Button */
      #show-timer-button {
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 30px !important;
        height: 30px !important;
        background: rgba(0,0,0,0.7) !important;
        color: white !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        z-index: 999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 14px !important;
        transition: all 0.3s ease !important;
      }
      
      #show-timer-button:hover {
        background: rgba(0,0,0,0.9) !important;
        transform: scale(1.1) !important;
      }
      
      /* Clean Popup */
      #time-tracker-popup {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 1000000 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 0 !important;
        transition: opacity 0.2s ease !important;
        font-family: system-ui, -apple-system, sans-serif !important;
      }
      
      .popup-overlay {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0,0,0,0.5) !important;
      }
      
      .popup-content {
        position: relative !important;
        width: 320px !important;
        max-width: 90vw !important;
        background: white !important;
        border-radius: 12px !important;
        padding: 24px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
        transform: scale(0.9) !important;
        transition: transform 0.2s ease !important;
      }
      
      .popup-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 20px !important;
        padding-bottom: 16px !important;
        border-bottom: 1px solid #e5e7eb !important;
      }
      
      .popup-header h2 {
        margin: 0 !important;
        font-size: 18px !important;
        font-weight: 600 !important;
        color: #111827 !important;
      }
      
      .close-btn {
        background: none !important;
        border: none !important;
        font-size: 24px !important;
        cursor: pointer !important;
        color: #6b7280 !important;
        padding: 0 !important;
        width: 30px !important;
        height: 30px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 6px !important;
        transition: all 0.2s ease !important;
      }
      
      .close-btn:hover {
        background: #f3f4f6 !important;
        color: #374151 !important;
      }
      
      /* Timer Display */
      .timer-section {
        text-align: center !important;
        margin-bottom: 24px !important;
        padding: 20px !important;
        background: #f9fafb !important;
        border-radius: 8px !important;
      }
      
      .timer-display {
        font-size: 28px !important;
        font-weight: bold !important;
        color: #111827 !important;
        font-family: monospace !important;
        margin-bottom: 8px !important;
      }
      
      .timer-status {
        font-size: 14px !important;
        color: #6b7280 !important;
        font-weight: 500 !important;
      }
      
      .timer-status.working {
        color: #10b981 !important;
      }
      
      /* Employee Section */
      .employee-section {
        margin-bottom: 20px !important;
      }
      
      #employee-code-input {
        width: 100% !important;
        padding: 12px !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        margin-bottom: 12px !important;
        box-sizing: border-box !important;
        transition: border-color 0.2s ease !important;
        text-transform: uppercase !important;
      }
      
      #employee-code-input:focus {
        outline: none !important;
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
      }
      
      .verify-btn {
        width: 100% !important;
        padding: 12px !important;
        background: #ef4444 !important;
        color: white !important;
        border: none !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: background 0.2s ease !important;
      }
      
      .verify-btn:hover:not(:disabled) {
        background: #dc2626 !important;
      }
      
      .verify-btn:disabled {
        background: #d1d5db !important;
        cursor: not-allowed !important;
      }
      
      /* Employee Info */
      .employee-info {
        background: #f0f9ff !important;
        padding: 16px !important;
        border-radius: 6px !important;
        margin-bottom: 20px !important;
      }
      
      .employee-name {
        font-weight: 600 !important;
        color: #111827 !important;
        margin-bottom: 4px !important;
      }
      
      .employee-code {
        font-size: 12px !important;
        color: #6b7280 !important;
        margin-bottom: 12px !important;
        font-family: monospace !important;
      }
      
      .change-btn {
        padding: 8px 16px !important;
        background: white !important;
        border: 1px solid #d1d5db !important;
        border-radius: 4px !important;
        font-size: 12px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      
      .change-btn:hover {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
      }
      
      /* Action Buttons */
      .action-buttons {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        margin-bottom: 20px !important;
      }
      
      .start-btn, .end-btn {
        padding: 12px 16px !important;
        border: none !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        position: relative !important;
      }
      
      .start-btn {
        background: #10b981 !important;
        color: white !important;
      }
      
      .start-btn:hover:not(:disabled) {
        background: #059669 !important;
      }
      
      .end-btn {
        background: #ef4444 !important;
        color: white !important;
      }
      
      .end-btn:hover:not(:disabled) {
        background: #dc2626 !important;
      }
      
      .start-btn:disabled, .end-btn:disabled {
        background: #d1d5db !important;
        cursor: not-allowed !important;
      }
      
      .btn-loading {
        font-size: 16px !important;
      }
      
      /* Status Message */
      .status-message {
        padding: 12px !important;
        border-radius: 6px !important;
        font-size: 13px !important;
        text-align: center !important;
        margin-bottom: 16px !important;
        display: none !important;
      }
      
      .status-message.success {
        background: #dcfce7 !important;
        color: #166534 !important;
      }
      
      .status-message.error {
        background: #fef2f2 !important;
        color: #dc2626 !important;
      }
      
      .status-message.loading {
        background: #eff6ff !important;
        color: #2563eb !important;
      }
      
      /* Hide Section */
      .hide-section {
        text-align: center !important;
        padding-top: 16px !important;
        border-top: 1px solid #e5e7eb !important;
      }
      
      .hide-btn {
        padding: 8px 16px !important;
        background: none !important;
        border: 1px solid #d1d5db !important;
        border-radius: 4px !important;
        font-size: 12px !important;
        color: #6b7280 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      
      .hide-btn:hover {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
      }
      
      /* Mobile */
      @media (max-width: 480px) {
        .popup-content {
          width: 100% !important;
          height: 100% !important;
          border-radius: 0 !important;
          padding: 20px !important;
        }
        
        #time-tracker-button {
          width: 45px !important;
          height: 45px !important;
        }
        
        .timer-icon {
          font-size: 18px !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Initialize
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createTimerButton);
    } else {
      createTimerButton();
    }
  }
  
  // Handle page navigation
  let currentUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      setTimeout(() => {
        if (!document.getElementById('time-tracker-button')) {
          createTimerButton();
        }
      }, 1000);
    }
  });
  
  urlObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  init();
  
  console.log('✨ Minimalist Timer Extension loaded');
  console.log('📋 Features: Clean UI, Hide/Show, Employee verification, Database sync');
  
})();
