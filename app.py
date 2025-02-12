# app.py
from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime
import re

app = Flask(__name__)

# Database setup
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def create_db():
    with get_db_connection() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            category TEXT,
            amount REAL,
            date TEXT)''')

# Route: Homepage
@app.route('/')
def index():
    return render_template('index.html')

# Route: Add Transaction
@app.route('/add_transaction', methods=['POST'])
def add_transaction():
    data = request.json
    conn = get_db_connection()
    conn.execute('INSERT INTO transactions (type, category, amount, date) VALUES (?, ?, ?, ?)', 
                 (data['type'], data['category'], data['amount'], data.get('date', datetime.now().strftime('%Y-%m-%d'))))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Transaction added successfully!'})

# Route: Process Voice Command
@app.route('/process_command', methods=['POST'])
def process_command():
    command = request.json.get('command', '').lower()
    match = re.match(r'add\s+(income|expense)\s+of\s+\$?(\d+)\s+for\s+(.+)', command)
    if match:
        transaction_type, amount, category = match.groups()
        amount = float(amount)
        conn = get_db_connection()
        conn.execute('INSERT INTO transactions (type, category, amount, date) VALUES (?, ?, ?, ?)',
                     (transaction_type, category, amount, datetime.now().strftime('%Y-%m-%d')))
        conn.commit()
        conn.close()
        return jsonify({'message': f'{transaction_type.capitalize()} of ${amount} added for {category.capitalize()}'}), 200
    return jsonify({'message': 'Invalid command format. Use "add income of $500 for salary" format.'}), 400

# Route: Get Transactions and Remaining Balance
@app.route('/get_transactions', methods=['GET'])
def get_transactions():
    conn = get_db_connection()
    transactions = conn.execute('SELECT * FROM transactions ORDER BY date DESC').fetchall()
    conn.close()

    income = sum([float(row['amount']) for row in transactions if row['type'] == 'income' and row['amount'] is not None])
    expense = sum([float(row['amount']) for row in transactions if row['type'] == 'expense' and row['amount'] is not None])
    remaining_balance = income - expense

    return jsonify({
        'transactions': [dict(row) for row in transactions],
        'remaining_balance': remaining_balance
    })

# Route: Transaction History Page
@app.route('/history')
def history():
    conn = get_db_connection()
    transactions = conn.execute('SELECT * FROM transactions ORDER BY date DESC').fetchall()
    conn.close()
    return render_template('history.html', transactions=transactions)

# Route: Expense Pie Chart Data
@app.route('/get_chart_data')
def get_chart_data():
    """Fetch data for the expense chart."""
    conn = get_db_connection()
    expenses = conn.execute('SELECT category, SUM(amount) as total FROM transactions WHERE type="expense" GROUP BY category').fetchall()
    conn.close()

    labels = [row['category'] for row in expenses]
    values = [row['total'] for row in expenses]
    return jsonify({'labels': labels, 'values': values})

@app.route('/get_income_data')
def get_income_data():
    """Fetch data for the income chart."""
    conn = get_db_connection()
    income = conn.execute('SELECT category, SUM(amount) as total FROM transactions WHERE type="income" GROUP BY category').fetchall()
    conn.close()

    labels = [row['category'] for row in income]
    values = [row['total'] for row in income]
    return jsonify({'labels': labels, 'values': values})
@app.route('/get_advice', methods=['GET'])
def get_advice():
    conn = get_db_connection()
    total_income = conn.execute('SELECT SUM(amount) FROM transactions WHERE type="income"').fetchone()[0] or 0
    total_expense = conn.execute('SELECT SUM(amount) FROM transactions WHERE type="expense"').fetchone()[0] or 0
    conn.close()

    advice = "Good job! You are saving well." if total_income > total_expense else "You are spending more than your income. Try to cut down on unnecessary expenses."
    
    # Add motivational messages based on transactions
    if total_income == 0 and total_expense == 0:
        advice = "Welcome! You have no transactions yet. Start saving and keep track of your finances!"
    elif total_income == 0 and total_expense > 0:
        advice = "You have expenses but no income recorded. Let's start adding your income to balance it out!"

    return jsonify({'advice': advice})

# Route: Delete Transaction
@app.route('/delete_transaction/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM transactions WHERE id = ?', (transaction_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Transaction deleted successfully."})

# Route: Delete All Transactions
@app.route('/delete_all_transactions', methods=['DELETE'])
def delete_all_transactions():
    conn = get_db_connection()
    
    try:
        # Delete all transactions
        conn.execute('DELETE FROM transactions')
        conn.commit()  # Commit the deletion

        # Reset the auto-increment in sqlite_sequence for the 'transactions' table
        conn.execute('DELETE FROM sqlite_sequence WHERE name = "transactions"')
        conn.commit()  # Commit the reset
        
    except sqlite3.Error as e:
        conn.rollback()  # Rollback in case of any error
        return jsonify({"error": str(e)})
    
    finally:
        conn.close()
    
    return jsonify({"message": "All transactions deleted successfully, and transaction ID reset."})

if __name__ == '__main__':
    create_db()
    app.run(debug=True)