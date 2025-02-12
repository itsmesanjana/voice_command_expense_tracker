let transactions = [];
let chartType='pie';
let pieChart = null;


const incomeCategories = ["Salary", "Business", "Investment", "Freelance"];
const expenseCategories = ["Groceries", "Rent", "Utilities", "Entertainment", "Transportation", "Health"];

async function loadTransactions() {
    const response = await fetch('/get_transactions');
    const data = await response.json();
    transactions = data.transactions;
    displayTransactions();
    updateRemainingBalance(data.remaining_balance);
    loadPieChart();
    loadAdvice();
}

function displayTransactions() {
    const transactionList = document.getElementById('transactionTableBody');
    transactionList.innerHTML = '';
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.type}</td>
            <td>${transaction.category}</td>
            <td>$${transaction.amount.toFixed(2)}</td>
            <td>${transaction.date}</td>
            
        `;
        transactionList.appendChild(row);
    });
}


function populateCategories() {
    const transactionType = document.getElementById("transactionType").value;
    const categorySelect = document.getElementById("category");
    categorySelect.innerHTML = '';

    const categories = transactionType === 'income' ? incomeCategories : expenseCategories;
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

document.getElementById('createTransactionButton').addEventListener('click', async function () {
    const transaction = {
        type: document.getElementById('transactionType').value,
        category: document.getElementById('category').value,
        amount: parseFloat(document.getElementById('amount').value),
        date: document.getElementById('date').value
    };
    const amount = parseFloat(document.getElementById('amount').value);

// Ensure only positive values are allowed
if (amount <= 0) {
    alert('Please enter a positive amount.');
    return;
}
    const response = await fetch('/add_transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
    });
    const result = await response.json();
    alert(result.message);
    loadTransactions();
});


document.getElementById('voiceCommand').addEventListener('click', () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';

    recognition.onresult = async (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        const response = await fetch('/process_command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        const result = await response.json();
        alert(result.message);
        loadTransactions();
    };
    recognition.start();
});

function updateRemainingBalance(balance) {
    const remainingBalanceElement = document.getElementById('remainingBalance');
    remainingBalanceElement.innerText = `Remaining Balance: $${balance.toFixed(2)}`;
}

// let chartType = 'pie';  // Default chart type
// let pieChart = null;    // Global chart instance
let expenseChart;
let incomeChart;

async function loadChart() {
    const response = await fetch('/get_chart_data');
    const data = await response.json();

    // Destroy the previous chart instance if it exists
    if (pieChart) pieChart.destroy();

    const ctx = document.getElementById('expenseChart').getContext('2d');

    // Create the line chart
    pieChart = new Chart(ctx, {
        type: 'line',  // Fixed to line chart type
        data: {
            labels: data.labels, // Categories like expense types
            datasets: [{
                label: 'Expenses Over Time',
                data: data.values, // Corresponding values for each label
                backgroundColor: 'rgba(255, 205, 86, 0.6)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 7,
                fill: false,
                tension: 0.4 // For smooth lines
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value}`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            },
            onClick: (e, chartElements) => {
                if (chartElements.length) {
                    const index = chartElements[0].index;
                    const label = data.labels[index];
                    const value = data.values[index];
                    alert(`You clicked on ${label} with a value of ${value}`);
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Categories'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Values'
                    }
                }
            }
        }
    });
}

// Initial chart load
loadChart();
async function loadIncomeChart() {
    const response = await fetch('/get_income_data');
    const data = await response.json();

    // Destroy the previous chart instance if it exists
    if (incomeChart) incomeChart.destroy();

    const ctx = document.getElementById('incomeChart').getContext('2d');

    // Create the line chart for income
    incomeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels, // Income categories or time periods
            datasets: [{
                label: 'Income Over Time',
                data: data.values, // Corresponding income values
                backgroundColor: 'rgba(105, 200, 192, 1)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 7,
                fill: false,
                tension: 0.4 // Smooth line
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Categories'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Values'
                    }
                }
            }
        }
    });
}
loadIncomeChart();
async function fetchAdvice() {
    const response = await fetch('/get_advice');
    if (response.ok) {
        const data = await response.json();
        document.getElementById('adviceBox').innerText = data.advice;
    } else {
        console.error('Failed to fetch advice:', response.status);
    }
}

// Call fetchAdvice when the page loads or after transactions are added/removed
fetchAdvice();


async function deleteAllTransactions() {
    const response = await fetch('/delete_all_transactions', { method: 'DELETE' });
    const result = await response.json();
    alert(result.message);
    loadTransactions();
}

document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
    populateCategories();
    document.getElementById("transactionType").addEventListener("change", populateCategories);
});
