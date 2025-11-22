from flask import current_app
from flask_sqlalchemy import SQLAlchemy

def upgrade():
    db = SQLAlchemy(current_app)
    with db.engine.connect() as conn:
        # Create question_banks table
        conn.execute('''
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
        # Add module column to questions table if it doesn't exist
        try:
            conn.execute('ALTER TABLE questions ADD COLUMN module INTEGER')
        except:
            pass  # Column might already exist

def downgrade():
    db = SQLAlchemy(current_app)
    with db.engine.connect() as conn:
        conn.execute('DROP TABLE question_banks')
