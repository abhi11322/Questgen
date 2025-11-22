import os
import sqlite3
from datetime import datetime
from app import app, db

def backup_existing_db():
    """Backup the existing database if it exists"""
    db_path = os.path.join(os.path.dirname(__file__), 'app.db')
    if os.path.exists(db_path):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(os.path.dirname(__file__), f'app_backup_{timestamp}.db')
        try:
            with open(db_path, 'rb') as src, open(backup_path, 'wb') as dst:
                dst.write(src.read())
            print(f"Created backup at: {backup_path}")
            return True
        except Exception as e:
            print(f"Failed to create backup: {e}")
            return False
    return True

def init_database():
    """Initialize the database with the new schema"""
    try:
        # Create all tables
        with app.app_context():
            db.create_all()
            print("Database initialized successfully!")
            
            # Verify the question_banks table was created
            conn = sqlite3.connect('app.db')
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='question_banks';")
            if cursor.fetchone():
                print("Question banks table created successfully.")
            else:
                print("Warning: Question banks table was not created!")
            
            # Check if module column exists in questions table
            cursor.execute("PRAGMA table_info(questions);")
            columns = [col[1] for col in cursor.fetchall()]
            if 'module' in columns:
                print("Module column exists in questions table.")
            else:
                print("Warning: Module column not found in questions table!")
            
            conn.close()
            return True
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        return False

if __name__ == '__main__':
    print("Setting up database...")
    if backup_existing_db():
        if init_database():
            print("Database setup completed successfully!")
        else:
            print("Failed to initialize database.")
    else:
        print("Failed to create backup. Aborting database setup.")
