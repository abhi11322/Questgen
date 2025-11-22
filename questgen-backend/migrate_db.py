"""
Database migration script to add module support and question_banks table
Run this script to update your existing database schema
"""
import sqlite3
import os

def migrate_database():
    # Connect to the database
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'app.db')
    if not os.path.exists(db_path):
        db_path = os.path.join(os.path.dirname(__file__), 'app.db')
    
    if not os.path.exists(db_path):
        print("Database file not found!")
        return False
    
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if module column exists in questions table
        cursor.execute("PRAGMA table_info(questions);")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'module' not in columns:
            print("Adding 'module' column to questions table...")
            cursor.execute("ALTER TABLE questions ADD COLUMN module INTEGER")
            print("✓ Module column added successfully")
        else:
            print("✓ Module column already exists")
        
        # Check if question_banks table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='question_banks';")
        if not cursor.fetchone():
            print("Creating 'question_banks' table...")
            cursor.execute('''
                CREATE TABLE question_banks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scheme_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    module INTEGER NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    file_path VARCHAR(512) NOT NULL,
                    question_count INTEGER DEFAULT 0,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (scheme_id) REFERENCES schemes (id),
                    FOREIGN KEY (subject_id) REFERENCES subjects (id)
                )
            ''')
            print("✓ Question banks table created successfully")
        else:
            print("✓ Question banks table already exists")
        
        # Commit the changes
        conn.commit()
        print("\n✓ Database migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n✗ Error during migration: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == '__main__':
    print("=" * 60)
    print("Database Migration Script")
    print("=" * 60)
    migrate_database()
    print("=" * 60)
