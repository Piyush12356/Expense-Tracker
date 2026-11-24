const STORAGE_KEY = 'expense_tracker_data';
const THEME_KEY = 'expense_tracker_theme';

const CATEGORIES = {
    food: { label: 'Food', labelHi: 'खाना', color: '#ef4444', icon: '🍔' },
    travel: { label: 'Travel', labelHi: 'यात्रा', color: '#f97316', icon: '🚌' },
    bills: { label: 'Bills', labelHi: 'बिल्स', color: '#eab308', icon: '📄' },
    shopping: { label: 'Shopping', labelHi: 'शॉपिंग', color: '#22c55e', icon: '🛍️' }
};

const THEMES = [
    { id: 'indigo', name: 'Indigo', nameHi: 'इंडिगो' },
    { id: 'emerald', name: 'Emerald', nameHi: 'एमरल्ड' },
    { id: 'rose', name: 'Rose', nameHi: 'रोज़' },
    { id: 'amber', name: 'Amber', nameHi: 'एम्बर' },
    { id: 'violet', name: 'Violet', nameHi: 'वायलेट' },
    { id: 'cyan', name: 'Cyan', nameHi: 'सायन' },
    { id: 'orange', name: 'Orange', nameHi: 'ऑरेंज' },
    { id: 'slate', name: 'Slate', nameHi: 'स्लेट' }
];

let expenses = [];
let currentTheme = 'indigo';

const expenseForm = document.getElementById('expenseForm');
const expenseName = document.getElementById('expenseName');
const expenseAmount = document.getElementById('expenseAmount');
const expenseCategory = document.getElementById('expenseCategory');
const expenseList = document.getElementById('expenseList');
const emptyState = document.getElementById('emptyState');
const monthlyTotalEl = document.getElementById('monthlyTotal');
const categoryTotalsEl = document.getElementById('categoryTotals');
const monthDisplayEl = document.getElementById('monthDisplay');
const pieChart = document.getElementById('pieChart');
const chartLegend = document.getElementById('chartLegend');
const themeSelector = document.getElementById('themeSelector');
const ctx = pieChart.getContext('2d');

function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthName() {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && THEMES.some(t => t.id === saved)) {
        currentTheme = saved;
    } else {
        currentTheme = 'indigo';
    }
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeButtons();
}

function saveTheme(theme) {
    currentTheme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButtons();
    redrawChart();
}

function updateThemeButtons() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
}

function loadExpenses() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const data = JSON.parse(stored);
            const monthKey = getCurrentMonthKey();
            expenses = data[monthKey] || [];
        } catch {
            expenses = [];
        }
    } else {
        expenses = [];
    }
}

function saveExpenses() {
    const stored = localStorage.getItem(STORAGE_KEY);
    let data = {};
    if (stored) {
        try {
            data = JSON.parse(stored);
        } catch {
            data = {};
        }
    }
    data[getCurrentMonthKey()] = expenses;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function renderExpenses() {
    expenseList.innerHTML = '';
    
    if (expenses.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    const sortedExpenses = [...expenses].sort((a, b) => b.date - a.date);
    
    sortedExpenses.forEach(expense => {
        const li = document.createElement('li');
        li.className = 'expense-item';
        
        const cat = CATEGORIES[expense.category];
        const date = new Date(expense.date);
        const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        
        li.innerHTML = `
            <div class="expense-info">
                <div class="expense-name">${escapeHtml(expense.name)}</div>
                <div class="expense-category">${cat.icon} ${cat.label} <span class="hi">(${cat.labelHi})</span> • ${dateStr}</div>
            </div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
            <button class="expense-delete" data-id="${expense.id}" aria-label="Delete / हटाएं">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        `;
        
        expenseList.appendChild(li);
    });
    
    document.querySelectorAll('.expense-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteExpense(id);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function deleteExpense(id) {
    expenses = expenses.filter(exp => exp.id !== id);
    saveExpenses();
    renderAll();
}

function calculateTotals() {
    const totals = {};
    let grandTotal = 0;
    
    Object.keys(CATEGORIES).forEach(cat => {
        totals[cat] = 0;
    });
    
    expenses.forEach(expense => {
        totals[expense.category] += expense.amount;
        grandTotal += expense.amount;
    });
    
    return { totals, grandTotal };
}

function renderSummary() {
    const { totals, grandTotal } = calculateTotals();
    
    monthlyTotalEl.textContent = formatCurrency(grandTotal);
    
    categoryTotalsEl.innerHTML = '';
    Object.entries(totals).forEach(([cat, amount]) => {
        const catInfo = CATEGORIES[cat];
        const div = document.createElement('div');
        div.className = 'category-total';
        div.style.setProperty('--cat-color', catInfo.color);
        div.innerHTML = `
            <div class="cat-name">${catInfo.icon} ${catInfo.label} <span class="hi">(${catInfo.labelHi})</span></div>
            <div class="cat-amount">${formatCurrency(amount)}</div>
        `;
        categoryTotalsEl.appendChild(div);
    });
    
    drawPieChart(totals, grandTotal);
}

function getComputedColors() {
    const style = getComputedStyle(document.documentElement);
    return {
        primary: style.getPropertyValue('--primary').trim(),
        primaryDark: style.getPropertyValue('--primary-dark').trim(),
        text: style.getPropertyValue('--text').trim(),
        textMuted: style.getPropertyValue('--text-muted').trim(),
        bg: style.getPropertyValue('--bg').trim(),
        cardBg: style.getPropertyValue('--card-bg').trim()
    };
}

function drawPieChart(totals, grandTotal) {
    const size = Math.min(pieChart.width, pieChart.height);
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;
    
    const colors = getComputedColors();
    
    ctx.clearRect(0, 0, pieChart.width, pieChart.height);
    
    if (grandTotal === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.border || '#e2e8f0';
        ctx.fill();
        ctx.font = '14px system-ui';
        ctx.fillStyle = colors.textMuted || '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data / कोई डेटा नहीं', centerX, centerY);
        chartLegend.innerHTML = '';
        return;
    }
    
    let startAngle = -Math.PI / 2;
    const categoryOrder = ['food', 'travel', 'bills', 'shopping'];
    
    categoryOrder.forEach(cat => {
        const amount = totals[cat];
        if (amount === 0) return;
        
        const sliceAngle = (amount / grandTotal) * Math.PI * 2;
        const catInfo = CATEGORIES[cat];
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = catInfo.color;
        ctx.fill();
        
        if (sliceAngle > 0.3) {
            const midAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(midAngle) * (radius * 0.6);
            const labelY = centerY + Math.sin(midAngle) * (radius * 0.6);
            const percent = Math.round((amount / grandTotal) * 100);
            
            ctx.font = 'bold 12px system-ui';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${percent}%`, labelX, labelY);
        }
        
        startAngle += sliceAngle;
    });
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = colors.cardBg || '#ffffff';
    ctx.fill();
    
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = colors.text || '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatCurrency(grandTotal), centerX, centerY - 4);
    
    ctx.font = '11px system-ui';
    ctx.fillStyle = colors.textMuted || '#64748b';
    ctx.fillText('Total / कुल', centerX, centerY + 16);
    
    renderLegend(totals, grandTotal);
}

function redrawChart() {
    const { totals, grandTotal } = calculateTotals();
    drawPieChart(totals, grandTotal);
}

function renderLegend(totals, grandTotal) {
    chartLegend.innerHTML = '';
    
    const categoryOrder = ['food', 'travel', 'bills', 'shopping'];
    
    categoryOrder.forEach(cat => {
        const amount = totals[cat];
        if (amount === 0) return;
        
        const catInfo = CATEGORIES[cat];
        const percent = Math.round((amount / grandTotal) * 100);
        
        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = `
            <span class="legend-color" style="background: ${catInfo.color}"></span>
            <span>${catInfo.icon} ${catInfo.label} <span class="hi">(${catInfo.labelHi})</span>: ${formatCurrency(amount)} (${percent}%)</span>
        `;
        chartLegend.appendChild(div);
    });
}

function renderAll() {
    renderExpenses();
    renderSummary();
    monthDisplayEl.textContent = getMonthName();
}

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = expenseName.value.trim();
    const amount = parseFloat(expenseAmount.value);
    const category = expenseCategory.value;
    
    if (!name || isNaN(amount) || !category) return;
    
    const expense = {
        id: generateId(),
        name,
        amount,
        category,
        date: Date.now()
    };
    
    expenses.unshift(expense);
    saveExpenses();
    renderAll();
    
    expenseForm.reset();
    expenseName.focus();
});

themeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-btn');
    if (btn && btn.dataset.theme) {
        saveTheme(btn.dataset.theme);
    }
});

function init() {
    loadTheme();
    loadExpenses();
    renderAll();
}

document.addEventListener('DOMContentLoaded', init);