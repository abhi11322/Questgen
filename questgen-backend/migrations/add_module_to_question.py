from flask import current_app
from flask_sqlalchemy import SQLAlchemy

def upgrade():
    db = SQLAlchemy(current_app)
    with db.engine.connect() as conn:
        # Add module column to questions table
        conn.execute('ALTER TABLE questions ADD COLUMN module INTEGER')

def downgrade():
    db = SQLAlchemy(current_app)
    with db.engine.connect() as conn:
        # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        conn.execute('''
            CREATE TABLE questions_backup AS 
            SELECT id, scheme_id, subject_id, q_type, text, marks, co_tags, rbt_level, 
                   subparts, answer, tags, status, parse_confidence, source_file, 
                   created_at, updated_at 
            FROM questions
        ''')
        conn.execute('DROP TABLE questions')
        conn.execute('ALTER TABLE questions_backup RENAME TO questions')
        conn.execute('''
            CREATE UNIQUE INDEX ix_questions_id ON questions (id);
            CREATE INDEX ix_questions_scheme_id ON questions (scheme_id);
            CREATE INDEX ix_questions_subject_id ON questions (subject_id);
        ''')
        conn.execute('''
            CREATE TRIGGER questions_updated_at_trigger
            AFTER UPDATE ON questions
            FOR EACH ROW
            BEGIN
                UPDATE questions SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
            END;
        ''')
        conn.execute('COMMIT')
