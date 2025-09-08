// 数据存储
const STORAGE_KEY = 'visa_calculator_data_v4';
let historyRecords = [];
let currentEntry = null;

// 初始化加载
function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            historyRecords = parsed.history || [];
            currentEntry = parsed.current || null;
        } catch (e) {
            console.error('本地存储数据损坏，已重置');
            clearStorage();
        }
    }
    updateDisplay();
    calculateResults();
}

// 保存数据
function saveToStorage() {
    const data = {
        history: historyRecords,
        current: currentEntry,
        timestamp: new Date().getTime()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 清空数据
function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    historyRecords = [];
    currentEntry = null;
    updateDisplay();
    calculateResults();
}

// 添加历史记录
function addHistory() {
    const entry = document.getElementById('historyEntry').value;
    const exit = document.getElementById('historyExit').value;

    if (!entry || !exit) {
        alert("请填写完整历史日期");
        return;
    }

    if (new Date(exit) < new Date(entry)) {
        alert("离境日期不能早于入境日期");
        return;
    }

    historyRecords.push({ entry, exit });
    historyRecords.sort((a, b) => new Date(a.entry) - new Date(b.entry));
    
    updateDisplay();
    calculateResults();
    clearHistoryInput();
    saveToStorage();
}

// 设置本次入境
function setCurrent() {
    const newEntry = document.getElementById('currentEntry').value;
    
    if (!newEntry) {
        alert("请输入本次入境日期");
        return;
    }

    currentEntry = newEntry;
    document.getElementById('currentEntry').value = '';
    updateDisplay();
    calculateResults();
    saveToStorage();
}

// 核心计算逻辑
function calculateResults() {
    let usedDays = 0;
    let currentYear = new Date().getFullYear();

    // 计算年度剩余天数
    if (currentEntry) {
        currentYear = new Date(currentEntry).getFullYear();
        historyRecords.forEach(record => {
            const entry = new Date(record.entry);
            const exit = new Date(record.exit);
            
            if (entry.getFullYear() === currentYear) {
                const yearStart = new Date(currentYear, 0, 1);
                const yearEnd = new Date(currentYear, 11, 31);
                
                const start = entry < yearStart ? yearStart : entry;
                const end = exit > yearEnd ? yearEnd : exit;
                
                if (start <= end) {
                    usedDays += calculateStayDuration(start, end);
                }
            }
        });
    }

    const remainingDays = Math.max(180 - usedDays, 0);
    const totalDays365 = calculate365Days();

    // 更新显示
    document.querySelectorAll('#totalDays, #totalDaysOut').forEach(el => {
        el.textContent = totalDays365;
    });

    if (currentEntry) {
        if (remainingDays <= 0) {
            document.getElementById('inCountryResult').style.display = 'none';
            document.getElementById('outCountryResult').style.display = 'none';
            document.getElementById('importantTips').style.display = 'block';
            document.getElementById('importantTip1').textContent = '总停留超过180天 不能再出境 需要在境内获取RNM后再正常出入境';
        } else {
            document.getElementById('inCountryResult').style.display = 'block';
            document.getElementById('outCountryResult').style.display = 'none';
            document.getElementById('importantTips').style.display = 'block';

            const entryDate = new Date(currentEntry);
            const maxDays = Math.min(90, remainingDays);
            const recDays = Math.min(70, remainingDays);

            const maxExit = new Date(entryDate);
            maxExit.setDate(entryDate.getDate() + maxDays);

            const recExit = new Date(entryDate);
            recExit.setDate(entryDate.getDate() + recDays);

            document.getElementById('currentEntryDisplay').textContent = currentEntry;
            document.getElementById('recommendedDate').textContent = formatDate(recExit);
            document.getElementById('maxDate').textContent = formatDate(maxExit);
            document.getElementById('remainingDays').textContent = remainingDays;
            document.getElementById('importantTip1').textContent = '若境内续签 使得停留超过90天 请尽快开启工签流程 不要出境否则二次入境海关可能拒绝入境';

        }
    } else {
        document.getElementById('inCountryResult').style.display = 'none';
        document.getElementById('outCountryResult').style.display = 'block';
        document.getElementById('importantTips').style.display = 'none';
        document.getElementById('remainingDays').textContent = remainingDays;
    }
}

// 计算过去365天停留天数
function calculate365Days() {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(today.getDate() - 365);

    let total = 0;

    // 计算历史记录
    historyRecords.forEach(record => {
        const entry = new Date(record.entry);
        const exit = new Date(record.exit);
        
        if (exit > oneYearAgo) {
            const start = entry < oneYearAgo ? oneYearAgo : entry;
            const end = exit > today ? today : exit;
            
            if (start <= end) {
                total += calculateStayDuration(start, end);
            }
        }
    });

    // 计算当前行程
    if (currentEntry) {
        const entryDate = new Date(currentEntry);
        if (entryDate > oneYearAgo) {
            const endDate = new Date();
            const start = entryDate < oneYearAgo ? oneYearAgo : entryDate;
            total += calculateStayDuration(start, endDate);
        }
    }

    return total;
}

// 精确计算停留天数
function calculateStayDuration(startDate, endDate) {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / 86400000);
}

function formatDate(date) {
    return date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }).replace(/\//g, '-');
}

// 界面更新
function updateDisplay() {
    const tbody = document.querySelector('#tripTable tbody');
    tbody.innerHTML = historyRecords.map(record => `
        <tr>
            <td>历史记录</td>
            <td>${record.entry}</td>
            <td>${record.exit}</td>
            <td>${calculateStayDuration(new Date(record.entry), new Date(record.exit))}天</td>
        </tr>
    `).join('');

    if (currentEntry) {
        tbody.innerHTML += `
            <tr class="current">
                <td>当前状态</td>
                <td>${currentEntry}</td>
                <td>进行中</td>
                <td>-</td>
            </tr>
        `;
    }
    setTimeout(calculateResults, 0);
}

function clearHistoryInput() {
    document.getElementById('historyEntry').value = '';
    document.getElementById('historyExit').value = '';
}

function clearData() {
    if (confirm('确定要永久删除所有数据吗？')) {
        clearStorage();
    }
}

// 初始化
function init() {
    loadFromStorage();
    document.getElementById('currentEntry').value = '';
    clearHistoryInput();
}
init();
