# Module-Based Question Bank Feature Setup

## Overview
This document explains the new module-based question bank feature and how to set it up.

## What's New

### Backend Changes

1. **New Database Model: `QuestionBank`**
   - Tracks uploaded question bank files
   - Links each upload to a specific module (1-5)
   - Stores file metadata and question count

2. **Updated `Question` Model**
   - Added `module` field (INTEGER, 1-5)
   - Questions are now tagged with their module number

3. **New API Endpoints**
   - `GET /api/question-banks?scheme_id=X&subject_id=Y` - List all uploaded question banks
   - `DELETE /api/question-banks/<bank_id>` - Delete a question bank and its questions

4. **Updated Endpoints**
   - `POST /api/upload-question-bank` - Now requires `module` parameter (1-5)
   - `GET /api/questions` - Now supports filtering by `module` or `modules[]`

## Database Migration Steps

### Option 1: Run the Migration Script (Recommended)
```bash
cd questgen-backend
python migrate_db.py
```

### Option 2: Manual SQL Migration
If the script doesn't work, run these SQL commands directly:

```sql
-- Add module column to questions table
ALTER TABLE questions ADD COLUMN module INTEGER;

-- Create question_banks table
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
);
```

You can run these using SQLite command line:
```bash
cd questgen-backend/instance
sqlite3 app.db < migration.sql
```

## API Usage Examples

### 1. Upload Question Bank with Module
```bash
curl -X POST http://localhost:5000/api/upload-question-bank \
  -F "scheme_id=1" \
  -F "subject_id=1" \
  -F "module=1" \
  -F "file=@question_bank_module1.pdf"
```

Response:
```json
{
  "id": 1,
  "file_name": "question_bank_module1.pdf",
  "module": 1,
  "question_count": 25,
  "uploaded_at": "2025-10-28T15:30:00",
  "warnings": [],
  "errors": []
}
```

### 2. List Question Banks for a Subject
```bash
curl "http://localhost:5000/api/question-banks?scheme_id=1&subject_id=1"
```

Response:
```json
[
  {
    "id": 1,
    "module": 1,
    "file_name": "question_bank_module1.pdf",
    "question_count": 25,
    "uploaded_at": "2025-10-28T15:30:00"
  },
  {
    "id": 2,
    "module": 2,
    "file_name": "question_bank_module2.pdf",
    "question_count": 30,
    "uploaded_at": "2025-10-28T15:35:00"
  }
]
```

### 3. Delete a Question Bank
```bash
curl -X DELETE http://localhost:5000/api/question-banks/1
```

Response:
```json
{
  "message": "Question bank deleted successfully"
}
```

### 4. Get Questions by Module
```bash
# Single module
curl "http://localhost:5000/api/questions?scheme_id=1&subject_id=1&module=1"

# Multiple modules
curl "http://localhost:5000/api/questions?scheme_id=1&subject_id=1&modules[]=1&modules[]=2"
```

## Frontend Integration (To Be Implemented)

### Question Bank Upload Page
- Add a dropdown to select module (1-5) before uploading
- Display uploaded question banks grouped by module
- Show delete button next to each uploaded file

### Question Bank List View
- Display module badge/tag next to each question
- Add module filter dropdown (with multi-select)
- Color-code modules for better visibility

### Paper Generation Page
- Add module selection with percentage weights
- Example: "50% from Module 1, 30% from Module 2, 20% from Module 3"
- Allow selecting specific modules for question generation

## Module Format in Question Banks

The parser automatically detects module tags in the PDF:
- `[Module 1]` or `[M1]` - Assigns question to Module 1
- `[Module 2]` or `[M2]` - Assigns question to Module 2
- etc.

If no module tag is found in the question text, it uses the module specified during upload.

## Testing the Feature

1. Start the backend server:
```bash
cd questgen-backend
python app.py
```

2. Test uploading a question bank:
```bash
# Using curl or Postman
POST http://localhost:5000/api/upload-question-bank
Form Data:
  - scheme_id: 1
  - subject_id: 1
  - module: 1
  - file: [your PDF file]
```

3. Verify the upload:
```bash
GET http://localhost:5000/api/question-banks?scheme_id=1&subject_id=1
```

4. Check questions with module filter:
```bash
GET http://localhost:5000/api/questions?scheme_id=1&subject_id=1&module=1
```

## Next Steps

1. Run the database migration script
2. Test the backend endpoints
3. Update the frontend to support module selection
4. Implement module-based paper generation logic

## Troubleshooting

### Database Migration Issues
If you encounter errors during migration:
1. Backup your database: `copy instance\app.db instance\app_backup.db`
2. Check if the columns already exist using SQLite browser
3. Run the migration script again

### Module Not Showing in Questions
- Ensure the migration added the `module` column
- Check that the upload endpoint is receiving the `module` parameter
- Verify questions are being saved with the module value

## Support
For issues or questions, check the backend logs or contact the development team.
