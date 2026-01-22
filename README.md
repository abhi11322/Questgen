
# QuestGen - Question Paper Generation System
=======
# QuestGen - Automate, Generate , Educate


A web-based system for generating and managing question papers for educational institutions. Allows teachers to create papers and manage study materials, while providing students access to resources.

## 🚀 Features

### For Teachers
- Create custom question papers with configurable headers and tables
- Upload and manage question banks by subject and module
- Manage syllabi and module notes
- Create class schedules and assign student tasks

### For Students
- Access question banks, syllabi, and study materials
- View class schedules and track assigned tasks

## 🏗️ Architecture

**Backend**: Flask with SQLAlchemy, Firebase auth, PDF processing via pdfplumber
**Frontend**: React 19 with Material-UI, Firebase Auth, React Router

## 📁 Project Structure

```
questgenn/
├── questgen-backend/          # Flask backend
│   ├── app.py                 # Main application
│   ├── requirements.txt       # Dependencies
│   └── uploads/              # File storage
└── questgen-frontend/         # React frontend
    ├── src/                   # Source code
    └── package.json          # Dependencies
```

## 🛠️ Installation

### Backend
```bash
cd questgen-backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python setup_database.py
python app.py
```

### Frontend
```bash
cd questgen-frontend
npm install
npm start
```

## 📊 Database Schema

Core entities: Users (Teacher/Student), Schemes, Subjects, Questions, Question Banks, Paper Drafts, Schedule Events, Student Tasks.

## 🔧 Key API Endpoints

- `GET/POST /api/schemes` - Manage educational schemes
- `GET/POST /api/subjects` - Manage subjects
- `POST /api/upload-question-bank` - Upload question banks
- `GET /api/questions` - Retrieve questions
- `POST /api/schedule` - Create events
- `GET/POST /api/student-tasks` - Manage tasks

## 🔐 Security

- Firebase Authentication for secure user management
- Role-based access control (Teacher/Student)
- CORS configuration for cross-origin requests
- Validated file uploads

## 📝 File Processing

- PDF parsing with pdfplumber
- Intelligent question extraction
- Organized storage by scheme, subject, and module
- Parse confidence tracking

## 🚀 Deployment

**Backend**: Set production DATABASE_URL, use WSGI server
**Frontend**: Build with `npm run build`, deploy to static hosting

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Test changes
4. Submit pull request


