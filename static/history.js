// we need to make chnages in history.html and history.js also let allTransactions = []; // Store all transactions globally

const incomeCategories = ['Salary', 'Business', 'Investment', 'Freelance'];
const expenseCategories = ['Groceries', 'Rent', 'Utilities', 'Entertainment', 'Transportation', 'Health'];

// Function to delete a transaction
function deleteTransaction(transactionId) {
    fetch(`/delete_transaction/${transactionId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Transaction deleted successfully.") {
            // Remove the row from the table
            document.getElementById(`transaction-${transactionId}`).remove();
            alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

// Function to delete all transactions
function deleteAllTransactions() {
    if (confirm("Are you sure you want to delete all transactions?")) {
        fetch('/delete_all_transactions', {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "All transactions deleted successfully.") {
                // Remove all transaction rows from the table
                const rows = document.querySelectorAll('tr[id^="transaction-"]');
                rows.forEach(row => row.remove());
                alert(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }
}
// Populate category filter options based on selected type
function updateCategoryOptions() {
    const transactionTypeFilter = document.getElementById('transactionTypeFilter').value;
    const categoryFilter = document.getElementById('categoryFilter');
    
    // Clear existing options
    categoryFilter.innerHTML = '<option value="">All</option>';
    
    // Determine the categories based on the selected transaction type
    let categories = [];
    if (transactionTypeFilter === 'income') {
        categories = incomeCategories;
    } else if (transactionTypeFilter === 'expense') {
        categories = expenseCategories;
    } else {
        // Include all categories if no specific type is selected
        categories = [...incomeCategories, ...expenseCategories];
    }

    // Convert categories to title case and remove duplicates
    const uniqueCategories = [...new Set(
        categories.map(category => category.charAt(0).toUpperCase() + category.slice(1).toLowerCase())
    )];

    // Populate the dropdown with unique, title-cased categories
    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}



// Update remaining balance display
function updateRemainingBalance(balance) {
    const remainingBalanceElement = document.getElementById('remainingBalance');
    remainingBalanceElement.innerText = `Remaining Balance: $${balance.toFixed(2)}`;
}

// Update total amount display
function updateTotalAmount(transactions, type, category) {
    let total = 0;

    transactions.forEach(transaction => {
        if (transaction.type === type && (category === '' || transaction.category === category)) {
            total += transaction.amount;
        }
    });

    const totalAmountElement = document.getElementById('totalAmount');
    if (type === 'income') {
        totalAmountElement.innerText = category ? 
            `Your total income for the category "${category}" is $${total.toFixed(2)}` :
            `Your total income is $${total.toFixed(2)}`;
    } else if (type === 'expense') {
        totalAmountElement.innerText = category ? 
            `Your total expense for the category "${category}" is $${total.toFixed(2)}` :
            `Your total expense is $${total.toFixed(2)}`;
    } else {
        totalAmountElement.innerText = ''; // Clear if all transactions are selected
    }
}

// Load transactions on the history page and update the remaining balance
async function loadTransactionsHistory() {
    try {
        const response = await fetch('/get_transactions');
        const data = await response.json();
        allTransactions = data.transactions; // Store transactions for filtering
        updateRemainingBalance(data.remaining_balance); // Update remaining balance
        displayFilteredTransactions(); // Display initially all transactions
    } catch (error) {
        console.error('Error loading transaction history:', error);
    }
}

// Function to display filtered transactions based on selected filters
function displayFilteredTransactions() {
    const transactionTypeFilter = document.getElementById('transactionTypeFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;

    const filteredTransactions = allTransactions.filter(transaction => {
        const matchesType = !transactionTypeFilter || transaction.type === transactionTypeFilter;
        const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
        return matchesType && matchesCategory;
    });

    const transactionList = document.querySelector('tbody');
    if (transactionList) {
        transactionList.innerHTML = '';
        filteredTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.id = `transaction-${transaction.id}`;
            row.innerHTML = `
                <td>${transaction.id}</td>
                <td>${transaction.type}</td>
                <td>${transaction.category}</td>
                <td>$${transaction.amount.toFixed(2)}</td>
                <td>${transaction.date}</td>
                <td>
                    <button onclick="deleteTransaction(${transaction.id})">Delete</button>
                </td>
            `;
            transactionList.appendChild(row);
        });
    }

    // Update total amount display
    if (transactionTypeFilter) {
        updateTotalAmount(allTransactions, transactionTypeFilter, categoryFilter);
    } else {
        document.getElementById('totalAmount').innerText = ''; // Clear total amount if no type filter is applied
    }
}

// Event listener to filter transactions when filter options are changed
document.getElementById('transactionTypeFilter').addEventListener('change', () => {
    updateCategoryOptions();
    displayFilteredTransactions();
});

document.getElementById('categoryFilter').addEventListener('change', displayFilteredTransactions);

// Event listener to reset filters
document.getElementById('resetFilters').addEventListener('click', () => {
    document.getElementById('transactionTypeFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    updateCategoryOptions();
    displayFilteredTransactions();
});

// Load transaction history when the page is loaded
window.addEventListener('DOMContentLoaded', loadTransactionsHistory); 
  