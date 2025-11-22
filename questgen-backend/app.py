import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum
from datetime import datetime
import enum
import tempfile
import pdfplumber

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

DB_URL = os.getenv("DATABASE_URL", "sqlite:///app.db")
app.config["SQLALCHEMY_DATABASE_URI"] = DB_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# DB
db = SQLAlchemy(app)

class QuestionStatus(enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"

class PaperStatus(enum.Enum):
    DRAFT = "DRAFT"
    FINAL = "FINAL"

class Scheme(db.Model):
    __tablename__ = 'schemes'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    department = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    scheme_id = db.Column(db.Integer, db.ForeignKey('schemes.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    subject_code = db.Column(db.String(64))
    credits = db.Column(db.Integer)
    semester = db.Column(db.Integer)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    scheme_id = db.Column(db.Integer, db.ForeignKey('schemes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    q_type = db.Column(db.String(32), nullable=False, default='DESCRIPTIVE')
    text = db.Column(db.Text, nullable=False)
    marks = db.Column(db.Integer)
    co_tags = db.Column(db.JSON)
    rbt_level = db.Column(db.String(8))
    subparts = db.Column(db.JSON)
    answer = db.Column(db.Text)
    tags = db.Column(db.JSON)
    module = db.Column(db.Integer, nullable=True)  # Module number (1-5)
    status = db.Column(db.Enum(QuestionStatus), default=QuestionStatus.DRAFT, nullable=False)
    parse_confidence = db.Column(db.Float)
    source_file = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QuestionBank(db.Model):
    __tablename__ = 'question_banks'
    id = db.Column(db.Integer, primary_key=True)
    scheme_id = db.Column(db.Integer, db.ForeignKey('schemes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    module = db.Column(db.Integer, nullable=False)  # 1-5
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    question_count = db.Column(db.Integer, default=0)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

class SubjectSyllabus(db.Model):
    __tablename__ = 'subject_syllabus'
    id = db.Column(db.Integer, primary_key=True)
    scheme_id = db.Column(db.Integer, db.ForeignKey('schemes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

class ModuleNote(db.Model):
    __tablename__ = 'module_notes'
    id = db.Column(db.Integer, primary_key=True)
    scheme_id = db.Column(db.Integer, db.ForeignKey('schemes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    module = db.Column(db.Integer, nullable=False)  # 1-5
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

class PaperDraft(db.Model):
    __tablename__ = 'paper_drafts'
    id = db.Column(db.Integer, primary_key=True)
    scheme_id = db.Column(db.Integer, db.ForeignKey('schemes.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    status = db.Column(db.Enum(PaperStatus), default=PaperStatus.DRAFT, nullable=False)
    title = db.Column(db.String(255))
    header = db.Column(db.JSON)
    co_table = db.Column(db.JSON)
    rbt_table = db.Column(db.JSON)
    rows = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

with app.app_context():
    db.create_all()

# Helpers
import re

def parse_bank_text(text, module=None):
    # Normalize
    lines = text.replace('\r\n', '\n').replace('\r', '\n')
    # Split questions by Q<number>.
    # Instead of split, we'll iterate line by line to avoid regex pitfalls
    blocks = []
    current = []
    for line in lines.split('\n'):
        if re.match(r"(?i)^Q\s*\d+\.", line.strip()):
            if current:
                blocks.append('\n'.join(current).strip())
                current = []
        current.append(line)
    if current:
        blocks.append('\n'.join(current).strip())

    parsed = []
    for b in blocks:
        # Check for module in the format [Module X] or [M X] where X is 1-5
        mod = module
        mod_match = re.search(r'\[\s*(?:Module|M)\s*(\d+)\]', b, re.IGNORECASE)
        if mod_match:
            mod = int(mod_match.group(1))
            if mod < 1 or mod > 5:
                mod = module  # Fall back to provided module if invalid
        
        # Marks [8M]
        # Marks like [10] or [10M]
        m = re.search(r"\[(\d+)(?:\s*[mM])?\]", b)
        marks = int(m.group(1)) if m else None
        # CO tags [CO4]
        cos = re.findall(r"\[CO(\d+)\]", b)
        co_tags = [f"CO{c}" for c in cos] if cos else []
        # RBT [L2]
        rbt = None
        r = re.search(r"\[L([1-6])\]", b)
        if r:
            rbt = f"L{r.group(1)}"
        # Subparts (lettered like a) or roman like i))
        subparts = []
        # 1) Line-start variants
        pat_letter = re.compile(r"(?mi)^\s*\(?([a-d])\)\s+(.*)$")
        pat_roman  = re.compile(r"(?mi)^\s*\(?((?:i{1,3}|iv|v|vi{0,3}|x))\)\s+(.*)$")
        for m1 in pat_letter.finditer(b):
            subparts.append({"label": m1.group(1), "text": m1.group(2).strip()})
        for m2 in pat_roman.finditer(b):
            subparts.append({"label": m2.group(1), "text": m2.group(2).strip()})
        # 2) Inline variants within the same line (e.g., "... i) text ... ii) text ...")
        if not subparts:
            inline = b.replace('\n', ' ')
            # Build a list of (label, start_index) for roman numerals inline
            matches = list(re.finditer(r"(?i)\b\(?((?:i{1,3}|iv|v|vi{0,3}|x))\)\s+", inline))
            if matches:
                for idx, m in enumerate(matches):
                    label = m.group(1)
                    start = m.end()
                    end = matches[idx+1].start() if idx+1 < len(matches) else len(inline)
                    subparts.append({"label": label, "text": inline[start:end].strip()})
            else:
                # Try lettered inline a) b)
                matches = list(re.finditer(r"(?i)\b\(?([a-d])\)\s+", inline))
                if matches:
                    for idx, m in enumerate(matches):
                        label = m.group(1)
                        start = m.end()
                        end = matches[idx+1].start() if idx+1 < len(matches) else len(inline)
                        subparts.append({"label": label, "text": inline[start:end].strip()})
        # Remove leading Qn. prefix from text
        main_text = re.sub(r"(?i)^Q\s*\d+\.?\s*", "", b.strip())
        # Remove module tag from text if it exists
        if mod_match:
            main_text = main_text.replace(mod_match.group(0), '').strip()
        
        parsed.append({
            "text": main_text,
            "marks": marks,
            "co_tags": co_tags,
            "rbt_level": rbt,
            "subparts": subparts or None,
            "q_type": "DESCRIPTIVE",
            "module": mod
        })
    return parsed

def clean_question_text(s: str) -> str:
    if not s:
        return s
    # Remove marks like [10] or [10M]
    s = re.sub(r"\[(\d+)(?:\s*[mM])?\]", "", s)
    # Remove CO tags like [CO4]
    s = re.sub(r"\[CO\d+\]", "", s)
    # Remove RBT tags like [L2]
    s = re.sub(r"\[L[1-6]\]", "", s)
    # Collapse extra spaces
    s = re.sub(r"\s+", " ", s).strip()
    return s

# Routes
@app.route('/api/schemes', methods=['GET'])
def list_schemes():
    items = Scheme.query.all()
    return jsonify([{"id": s.id, "name": s.name, "department": s.department, "description": s.description} for s in items])

@app.route('/api/schemes', methods=['POST'])
def create_scheme():
    data = request.json or {}
    if not data.get('name') or not data.get('department'):
        return jsonify({"error": "name and department are required"}), 400
    s = Scheme(name=data['name'], department=data['department'], description=data.get('description'))
    db.session.add(s)
    db.session.commit()
    return jsonify({"id": s.id}), 201

@app.route('/api/subjects', methods=['GET'])
def list_subjects():
    scheme_id = request.args.get('scheme_id', type=int)
    q = Subject.query
    if scheme_id:
        q = q.filter_by(scheme_id=scheme_id)
    items = q.all()
    return jsonify([{"id": s.id, "scheme_id": s.scheme_id, "name": s.name, "subject_code": s.subject_code, "credits": s.credits, "semester": s.semester, "description": s.description} for s in items])

@app.route('/api/subjects', methods=['POST'])
def create_subject():
    data = request.json or {}
    if not data.get('scheme_id') or not data.get('name'):
        return jsonify({"error": "scheme_id and name are required"}), 400
    subj = Subject(
        scheme_id=data['scheme_id'],
        name=data['name'],
        subject_code=data.get('subject_code'),
        credits=data.get('credits'),
        semester=data.get('semester'),
        description=data.get('description'),
    )
    db.session.add(subj)
    db.session.commit()
    return jsonify({"id": subj.id}), 201

@app.route('/api/upload-question-bank', methods=['POST'])
def upload_question_bank():
    scheme_id = request.form.get('scheme_id', type=int)
    subject_id = request.form.get('subject_id', type=int)
    module = request.form.get('module', type=int)
    f = request.files.get('file')
    
    if not (scheme_id and subject_id and f):
        return jsonify({"errors": ["scheme_id, subject_id, and file are required"]}), 400
    if module is None or (module < 1 or module > 5):
        return jsonify({"errors": ["module must be between 1 and 5"]}), 400
    if not f.filename.lower().endswith('.pdf'):
        return jsonify({"errors": ["Only PDF files are allowed"]}), 400

    # Create uploads directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Save the file with a timestamp prefix
    timestamp = int(datetime.utcnow().timestamp())
    file_name = f"{timestamp}_{f.filename}"
    dest = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    f.save(dest)

    # Parse the PDF
    warnings = []
    parsed_items = []
    try:
        with pdfplumber.open(dest) as pdf:
            all_text = "\n".join([p.extract_text() or '' for p in pdf.pages])
        parsed_items = parse_bank_text(all_text, module=module)
    except Exception as e:
        # Clean up the file if parsing fails
        if os.path.exists(dest):
            os.remove(dest)
        return jsonify({"errors": [f"Failed to parse PDF: {e}"]}), 500

    # Start a transaction
    try:
        # Create a record for the question bank
        qb = QuestionBank(
            scheme_id=scheme_id,
            subject_id=subject_id,
            module=module,
            file_name=f.filename,
            file_path=dest,
            question_count=len(parsed_items)
        )
        db.session.add(qb)
        db.session.flush()  # Get the ID for the question bank

        # Add all questions
        for item in parsed_items:
            q = Question(
                scheme_id=scheme_id,
                subject_id=subject_id,
                q_type=item.get('q_type') or 'DESCRIPTIVE',
                text=item.get('text') or '',
                marks=item.get('marks'),
                co_tags=item.get('co_tags') or [],
                rbt_level=item.get('rbt_level'),
                subparts=item.get('subparts'),
                module=module,  # Use the explicitly provided module
                status=QuestionStatus.DRAFT,
                parse_confidence=0.6 if (item.get('marks') or item.get('co_tags') or item.get('rbt_level')) else 0.3,
                source_file=file_name
            )
            db.session.add(q)
        
        db.session.commit()
        
        return jsonify({
            "id": qb.id,
            "file_name": f.filename,
            "module": module,
            "question_count": len(parsed_items),
            "uploaded_at": qb.uploaded_at.isoformat(),
            "warnings": warnings,
            "errors": []
        }), 201
        
    except Exception as e:
        db.session.rollback()
        if os.path.exists(dest):
            os.remove(dest)
        return jsonify({"errors": [f"Failed to save questions: {str(e)}"]}), 500

@app.route('/api/question-banks', methods=['GET'])
def list_question_banks():
    """List all question banks for a scheme and subject"""
    scheme_id = request.args.get('scheme_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    
    if not (scheme_id and subject_id):
        return jsonify({"errors": ["scheme_id and subject_id are required"]}), 400
    
    q = QuestionBank.query.filter_by(
        scheme_id=scheme_id,
        subject_id=subject_id
    ).order_by(QuestionBank.module, QuestionBank.uploaded_at.desc())
    
    banks = q.all()
    return jsonify([{
        'id': b.id,
        'module': b.module,
        'file_name': b.file_name,
        'question_count': b.question_count,
        'uploaded_at': b.uploaded_at.isoformat() if b.uploaded_at else None
    } for b in banks])

@app.route('/api/question-banks/<int:bank_id>/file', methods=['GET'])
def get_question_bank_file(bank_id: int):
    bank = QuestionBank.query.get_or_404(bank_id)
    if not os.path.exists(bank.file_path):
        return jsonify({"errors": ["File not found on server"]}), 404
    return send_file(bank.file_path, mimetype='application/pdf', as_attachment=False, download_name=bank.file_name)

@app.route('/api/question-banks/<int:bank_id>', methods=['DELETE'])
def delete_question_bank(bank_id):
    """Delete a question bank and all its questions"""
    bank = QuestionBank.query.get_or_404(bank_id)
    
    try:
        # Delete the file if it exists
        if os.path.exists(bank.file_path):
            os.remove(bank.file_path)
        
        # Delete all questions from this bank
        Question.query.filter_by(source_file=os.path.basename(bank.file_path)).delete()
        
        # Delete the bank record
        db.session.delete(bank)
        db.session.commit()
        
        return jsonify({"message": "Question bank deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"errors": [f"Failed to delete question bank: {str(e)}"]}), 500

# -------- Syllabus (per subject) --------
@app.route('/api/subject-syllabus', methods=['GET'])
def list_subject_syllabus():
    scheme_id = request.args.get('scheme_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    if not (scheme_id and subject_id):
        return jsonify({"errors": ["scheme_id and subject_id are required"]}), 400
    q = SubjectSyllabus.query.filter_by(scheme_id=scheme_id, subject_id=subject_id).order_by(SubjectSyllabus.uploaded_at.desc())
    items = q.all()
    return jsonify([
        {
            'id': s.id,
            'file_name': s.file_name,
            'uploaded_at': s.uploaded_at.isoformat() if s.uploaded_at else None
        } for s in items
    ])

@app.route('/api/subject-syllabus', methods=['POST'])
def upload_subject_syllabus():
    scheme_id = request.form.get('scheme_id', type=int)
    subject_id = request.form.get('subject_id', type=int)
    f = request.files.get('file')
    if not (scheme_id and subject_id and f):
        return jsonify({"errors": ["scheme_id, subject_id, and file are required"]}), 400
    if not f.filename.lower().endswith('.pdf'):
        return jsonify({"errors": ["Only PDF files are allowed"]}), 400
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    timestamp = int(datetime.utcnow().timestamp())
    file_name = f"{timestamp}_{f.filename}"
    dest = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    f.save(dest)
    try:
        s = SubjectSyllabus(scheme_id=scheme_id, subject_id=subject_id, file_name=f.filename, file_path=dest)
        db.session.add(s)
        db.session.commit()
        return jsonify({
            'id': s.id,
            'file_name': s.file_name,
            'uploaded_at': s.uploaded_at.isoformat() if s.uploaded_at else None
        }), 201
    except Exception as e:
        db.session.rollback()
        if os.path.exists(dest):
            os.remove(dest)
        return jsonify({"errors": [f"Failed to save syllabus: {str(e)}"]}), 500

@app.route('/api/subject-syllabus/<int:sid>', methods=['DELETE'])
def delete_subject_syllabus(sid: int):
    s = SubjectSyllabus.query.get_or_404(sid)
    try:
        if os.path.exists(s.file_path):
            os.remove(s.file_path)
        db.session.delete(s)
        db.session.commit()
        return jsonify({"message": "Syllabus deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"errors": [f"Failed to delete syllabus: {str(e)}"]}), 500

@app.route('/api/subject-syllabus/<int:sid>/file', methods=['GET'])
def get_subject_syllabus_file(sid: int):
    s = SubjectSyllabus.query.get_or_404(sid)
    if not os.path.exists(s.file_path):
        return jsonify({"errors": ["File not found on server"]}), 404
    return send_file(s.file_path, mimetype='application/pdf', as_attachment=False, download_name=s.file_name)

# -------- Module Notes (per subject and module) --------
@app.route('/api/module-notes', methods=['GET'])
def list_module_notes():
    scheme_id = request.args.get('scheme_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    if not (scheme_id and subject_id):
        return jsonify({"errors": ["scheme_id and subject_id are required"]}), 400
    q = ModuleNote.query.filter_by(scheme_id=scheme_id, subject_id=subject_id).order_by(ModuleNote.module, ModuleNote.uploaded_at.desc())
    items = q.all()
    return jsonify([
        {
            'id': m.id,
            'module': m.module,
            'file_name': m.file_name,
            'uploaded_at': m.uploaded_at.isoformat() if m.uploaded_at else None
        } for m in items
    ])

@app.route('/api/module-notes', methods=['POST'])
def upload_module_note():
    scheme_id = request.form.get('scheme_id', type=int)
    subject_id = request.form.get('subject_id', type=int)
    module = request.form.get('module', type=int)
    f = request.files.get('file')
    if not (scheme_id and subject_id and module and f):
        return jsonify({"errors": ["scheme_id, subject_id, module and file are required"]}), 400
    if module < 1 or module > 5:
        return jsonify({"errors": ["module must be between 1 and 5"]}), 400
    if not f.filename.lower().endswith('.pdf'):
        return jsonify({"errors": ["Only PDF files are allowed"]}), 400
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    timestamp = int(datetime.utcnow().timestamp())
    file_name = f"{timestamp}_{f.filename}"
    dest = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    f.save(dest)
    try:
        m = ModuleNote(scheme_id=scheme_id, subject_id=subject_id, module=module, file_name=f.filename, file_path=dest)
        db.session.add(m)
        db.session.commit()
        return jsonify({
            'id': m.id,
            'module': m.module,
            'file_name': m.file_name,
            'uploaded_at': m.uploaded_at.isoformat() if m.uploaded_at else None
        }), 201
    except Exception as e:
        db.session.rollback()
        if os.path.exists(dest):
            os.remove(dest)
        return jsonify({"errors": [f"Failed to save module note: {str(e)}"]}), 500

@app.route('/api/module-notes/<int:mid>', methods=['DELETE'])
def delete_module_note(mid: int):
    m = ModuleNote.query.get_or_404(mid)
    try:
        if os.path.exists(m.file_path):
            os.remove(m.file_path)
        db.session.delete(m)
        db.session.commit()
        return jsonify({"message": "Module note deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"errors": [f"Failed to delete module note: {str(e)}"]}), 500

@app.route('/api/module-notes/<int:mid>/file', methods=['GET'])
def get_module_note_file(mid: int):
    m = ModuleNote.query.get_or_404(mid)
    if not os.path.exists(m.file_path):
        return jsonify({"errors": ["File not found on server"]}), 404
    return send_file(m.file_path, mimetype='application/pdf', as_attachment=False, download_name=m.file_name)

@app.route('/api/questions', methods=['GET'])
def get_questions():
    scheme_id = request.args.get('scheme_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    status = request.args.get('status')
    rbt = request.args.get('rbt')
    co = request.args.get('co')
    module = request.args.get('module', type=int)
    modules = request.args.getlist('modules[]', type=int)

    q = Question.query
    if scheme_id:
        q = q.filter_by(scheme_id=scheme_id)
    if subject_id:
        q = q.filter_by(subject_id=subject_id)
    if status:
        q = q.filter_by(status=QuestionStatus[status])
    if rbt:
        q = q.filter(Question.rbt_level == rbt)
    if co:
        q = q.filter(Question.co_tags.contains([co]))
    if module:
        q = q.filter_by(module=module)
    elif modules:
        q = q.filter(Question.module.in_(modules))

    questions = q.order_by(Question.id).all()
    return jsonify([{
        'id': q.id,
        'text': q.text,
        'marks': q.marks,
        'co_tags': q.co_tags,
        'rbt_level': q.rbt_level,
        'subparts': q.subparts,
        'module': q.module,
        'status': q.status.value,
        'parse_confidence': q.parse_confidence,
        'created_at': q.created_at.isoformat() if q.created_at else None,
        'updated_at': q.updated_at.isoformat() if q.updated_at else None
    } for q in questions])

@app.route('/api/questions/<int:qid>', methods=['PATCH'])
def update_question(qid):
    data = request.json or {}
    q = Question.query.get_or_404(qid)
    for field in ["q_type","text","marks","co_tags","rbt_level","subparts","answer","tags"]:
        if field in data:
            setattr(q, field, data[field])
    if 'status' in data:
        try:
            q.status = QuestionStatus(data['status'])
        except Exception:
            pass
    db.session.commit()
    return jsonify({"ok": True})

@app.route('/api/paper-drafts/<int:draft_id>/export', methods=['POST'])
def export_paper(draft_id):
    draft = PaperDraft.query.get_or_404(draft_id)
    # Allow client to override header/title at export time to reflect latest edits without forcing a save
    try:
        override = request.get_json(silent=True) or {}
    except Exception:
        override = {}
    # Basic HTML export that mirrors rows and simple header; frontend can print as PDF
    title = override.get('title', draft.title or '')
    header = override.get('header', draft.header or {})
    # Allow overriding CO and RBT tables as well
    rows = draft.rows or []
    co_table_override = override.get('co_table')
    rbt_table_override = override.get('rbt_table')
    def esc(s):
        import html
        return html.escape(str(s))
    # Prepare logo tag with data URL fallback if possible
    def logo_img_tag(url: str) -> str:
        if not url:
            return ""
        try:
            import base64, mimetypes
            from urllib.parse import urlparse
            from urllib.request import urlopen
            # If already data URL, return as-is
            if url.strip().lower().startswith('data:'):
                return f'<img src="{esc(url)}" alt="logo" style="max-width:150px;max-height:150px"/>'
            parsed = urlparse(url)
            content = None
            ctype = None
            if parsed.scheme in ('http','https'):
                resp = urlopen(url, timeout=5)
                content = resp.read()
                ctype = resp.headers.get('Content-Type', None)
            else:
                # Try local file path
                pth = url
                if not os.path.isabs(pth):
                    pth = os.path.join(os.path.dirname(__file__), pth)
                with open(pth, 'rb') as fh:
                    content = fh.read()
                ctype = mimetypes.guess_type(pth)[0] or 'image/png'
            b64 = base64.b64encode(content).decode('ascii')
            return f'<img src="data:{ctype or 'image/png'};base64,{b64}" alt="logo" style="max-width:150px;max-height:150px"/>'
        except Exception:
            # Fallback to direct URL
            return f'<img src="{esc(url)}" alt="logo" style="max-width:150px;max-height:150px"/>'

    # Header rendering (centered banner and clean layout)
    html_parts = [
        '<html><head><meta charset="utf-8"/>'
        '<style>'
        '  body{font-family:Arial, sans-serif; background:#fff; color:#111;}'
        '  .container{max-width:900px;margin:24px auto;padding:0 12px;}'
        '  .center{text-align:center;}'
        '  .banner{display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:12px;}'
        '  .banner .logo{margin-bottom:6px;}'
        '  .banner .college{font-weight:800;font-size:24px;letter-spacing:.3px;}'
        '  .muted{color:#444;font-size:12px;line-height:1.4}'
        '  .rule{height:0;border-top:2px solid #222;margin:6px 0;}'
        '  .title{font-weight:800;text-align:center;margin:10px 0 12px 0;font-size:26px;}'
        '  table{width:100%;border-collapse:collapse;margin:0 auto;}'
        '  th,td{border:1px solid #666;padding:9px;vertical-align:top;font-size:15px;line-height:1.35}'
        '  th{background:#f5f5f5;font-weight:700}'
        '  .hdr td{border:1px solid #aaa}'
        '  .or{ text-align:center; font-weight:bold }'
        '  .signs{display:flex;justify-content:space-between;margin-top:40px}'
        '</style></head><body>',
        '<div class="container">',
        '<div class="banner">',
        f'<div class="logo">{logo_img_tag(header.get("logoUrl","")) if header.get("logoUrl") else ""}</div>',
        f'<div class="college center">{esc(header.get("collegeName",""))}</div>',
        f'<div class="muted center">{esc(header.get("address",""))}</div>',
        f'<div class="muted center">{esc(header.get("phone",""))} &nbsp; {esc(header.get("email",""))}</div>',
        f'<div class="muted center">{esc(header.get("website",""))}</div>',
        '</div>',
        '<div class="rule"></div>',
        f'<h2 class="title">{esc(title)}</h2>',
        '<div class="rule"></div>',
        '<table class="hdr" style="margin-bottom:12px">',
        f'<tr><td><b>Academic Year</b><br/>{esc(header.get("academicYear", ""))}</td><td><b>Program</b><br/>{esc(header.get("program", ""))}</td><td><b>Dept.</b><br/>{esc(header.get("dept", ""))}</td><td><b>Scheme</b><br/>{esc(header.get("schemeName", ""))}</td></tr>',
        f'<tr><td><b>Year/Sem/Section</b><br/>{esc(header.get("yearSemSec", ""))}</td><td><b>Date</b><br/>{esc(header.get("date", ""))}</td><td><b>Duration</b><br/>{esc(header.get("duration", ""))}</td><td><b>Max. marks</b><br/>{esc(header.get("maxMarks", ""))}</td></tr>',
        f'<tr><td colspan="2"><b>Course title</b><br/>{esc(header.get("courseTitle", ""))}</td><td><b>Course code</b><br/>{esc(header.get("courseCode", ""))}</td><td><b>Credits</b><br/>{esc(header.get("credits", ""))}</td></tr>',
        f'<tr><td><b>Session</b><br/>{esc(header.get("session", ""))}</td><td colspan="3"><b>Time</b><br/>{esc(header.get("time", ""))}</td></tr>',
        '</table>',
        '<table>\n<tr><th style="width:70px">Q. No.</th><th>Questions</th><th style="width:90px">Marks</th><th style="width:100px">CO</th><th style="width:100px">RBT</th></tr>'
    ]
    for r in rows:
        if r.get('type') == 'or':
            html_parts.append('<tr><td colspan="5" class="or">OR</td></tr>')
            continue
        qno = r.get('qno')
        # Combine parts display
        q_text = []
        total_marks = 0
        co_cell = []
        rbt_cell = []
        for p in r.get('parts', []):
            label = p.get('label')
            text = p.get('text') or ''
            mk = p.get('marks') or 0
            total_marks += mk
            q_text.append(f"<div><b>{esc(label)})</b> {esc(text)}</div>")
            co_cell.append(','.join(p.get('co') or []))
            rbt_cell.append(p.get('rbt') or '')
        html_parts.append(f"<tr><td>{esc(qno)}</td><td>{''.join(q_text)}</td><td>{esc(total_marks)}</td><td>{esc(' | '.join([c for c in co_cell if c]))}</td><td>{esc(' | '.join([r for r in rbt_cell if r]))}</td></tr>")
    html_parts.append('</table>')

    # CO table
    co_table = co_table_override if co_table_override is not None else (draft.co_table or [])
    if co_table:
        html_parts.append('<h3 style="margin:12px 0 6px 0">Course Outcomes (COs)</h3>')
        html_parts.append('<table>')
        html_parts.append('<tr><th style="width:120px">CO No.</th><th>At the end of the course, students will be able to...</th></tr>')
        for row in co_table:
            html_parts.append(f'<tr><td>{esc(row.get("co",""))}</td><td>{esc(row.get("text",""))}</td></tr>')
        html_parts.append('</table>')

    # RBT table
    rbt = rbt_table_override if rbt_table_override is not None else (draft.rbt_table or {})
    if rbt:
        html_parts.append('<h3 style="margin:12px 0 6px 0">Revised Bloom\'s Taxonomy (RBT) Levels</h3>')
        html_parts.append('<table>')
        html_parts.append('<tr>' + ''.join([f'<th>{esc(k)}</th>' for k in ['L1','L2','L3','L4','L5','L6']]) + '</tr>')
        html_parts.append('<tr>' + ''.join([f'<td>{esc(rbt.get(k,""))}</td>' for k in ['L1','L2','L3','L4','L5','L6']]) + '</tr>')
        html_parts.append('</table>')

    # Signatures
    html_parts.append('<div class="signs">')
    html_parts.append(f'<div style="text-align:center;width:33%"><div class="muted">Prepared by</div><div style="margin-top:40px">{esc(header.get("preparedBy",""))}</div></div>')
    html_parts.append(f'<div style="text-align:center;width:33%"><div class="muted">Approved by</div><div style="margin-top:40px">{esc(header.get("approvedBy","(HOD - dept)"))}</div></div>')
    html_parts.append(f'<div style="text-align:center;width:33%"><div class="muted">{esc(header.get("principal","PRINCIPAL"))}</div></div>')
    html_parts.append('</div>')
    html_parts.append('</div>')
    html_parts.append('</body></html>')
    fd, path = tempfile.mkstemp(suffix=".html")
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write(''.join(html_parts))
    return send_file(path, as_attachment=True, download_name=f"paper_{draft_id}.html")

@app.route('/api/generate-paper', methods=['POST'])
def generate_paper():
    data = request.json or {}
    scheme_id = data.get('scheme_id')
    subject_id = data.get('subject_id')
    config = data
    # Build draft rows and try to auto-fill from bank
    rows = []
    # Load pool from DB: prefer APPROVED, then DRAFT if insufficient, then randomize order to avoid repetition
    all_q = Question.query.filter_by(scheme_id=scheme_id, subject_id=subject_id).order_by(Question.status.desc(), Question.created_at.desc()).all()
    import random
    random.shuffle(all_q)
    # Group by module for percentage-based selection
    module_groups = {}
    for q in all_q:
        m = q.module or 0
        module_groups.setdefault(m, []).append(q)
    # Shuffle each module pool to avoid repetition patterns
    for m in list(module_groups.keys()):
        random.shuffle(module_groups[m])
    # Selection helpers
    used_ids = set()
    used_texts = set()
    def norm_text(s):
        return (clean_question_text(s or '') or '').lower().strip()
    def pick_question(target_marks=None, prefer_rbt=None, prefer_co=None, prefer_module=None):
        # 1) exact marks match and not used
        search_pools = []
        if prefer_module and prefer_module in module_groups:
            search_pools.append(module_groups.get(prefer_module, []))
        # fallback pool (any module)
        search_pools.append(all_q)
        for pool in search_pools:
            for q in pool:
                if q.id in used_ids:
                    continue
                if target_marks is not None and q.marks == target_marks and norm_text(q.text) not in used_texts:
                    return q
        # 2) any not used with preferred rbt/co
        for pool in search_pools:
            for q in pool:
                if q.id in used_ids:
                    continue
                if prefer_rbt and q.rbt_level == prefer_rbt and norm_text(q.text) not in used_texts:
                    return q
                if prefer_co and prefer_co in (q.co_tags or []) and norm_text(q.text) not in used_texts:
                    return q
        # 3) any not used
        for pool in search_pools:
            for q in pool:
                if q.id not in used_ids and norm_text(q.text) not in used_texts:
                    return q
        return None

    # Prepare module distribution plan based on percentages (over total parts)
    module_percents = config.get('module_percentages') or {}
    # Normalize keys to int
    module_percents = {int(k): int(module_percents[k]) for k in module_percents.keys() if str(k).isdigit()}
    total_parts = 0
    for qcfg in config.get('questions', []):
        total_parts += len(qcfg.get('parts', ['a','b']))
    # Build target counts per module
    remaining_counts = {}
    if total_parts > 0 and module_percents:
        assigned = 0
        remainders = []
        for m, pct in module_percents.items():
            exact = pct * total_parts / 100.0
            cnt = int(exact)
            remaining_counts[m] = cnt
            assigned += cnt
            remainders.append((m, exact - cnt))
        # Distribute leftover by highest remainders
        leftover = max(0, total_parts - assigned)
        remainders.sort(key=lambda x: x[1], reverse=True)
        i = 0
        while leftover > 0 and i < len(remainders):
            m = remainders[i][0]
            remaining_counts[m] = remaining_counts.get(m, 0) + 1
            leftover -= 1
            i = (i + 1) % max(1, len(remainders))
    # Helper to check if a module is currently allowed (percent > 0)
    def module_allowed(mod):
        if not module_percents:
            return True
        # If plan exists, only allow modules with remaining > 0
        return remaining_counts.get(mod, 0) > 0
    # Flatten plan to cycle
    module_plan = []
    for m, cnt in remaining_counts.items():
        module_plan.extend([m] * cnt)
    plan_idx = 0

    # Avoid reusing questions from recent drafts of same subject/scheme
    recent = PaperDraft.query.filter_by(scheme_id=scheme_id, subject_id=subject_id).order_by(PaperDraft.created_at.desc()).limit(5).all()
    for d in recent:
        try:
            for r in (d.rows or []):
                if r.get('type') == 'question':
                    for p in r.get('parts', []):
                        sid = p.get('source_qid')
                        if sid:
                            used_ids.add(sid)
        except Exception:
            pass

    for qcfg in config.get('questions', []):
        qno = qcfg.get('qno')
        parts = qcfg.get('parts', ['a','b'])
        marks_map = qcfg.get('marks', {})
        row = {"type":"question", "qno": qno, "parts": []}
        # Try to fill from questions with subparts first
        # If a question has enough subparts, map them to parts
        chosen = None
        for q in all_q:
            if q.id in used_ids:
                continue
            if q.subparts and len(q.subparts) >= len(parts):
                # Enforce module percentages: require remaining capacity for this module to cover all parts
                qm = q.module or 0
                if not module_percents or remaining_counts.get(qm, 0) >= len(parts):
                    chosen = q
                    break
        if chosen is not None:
            used_ids.add(chosen.id)
            used_texts.add(norm_text(chosen.text))
            for idx, p in enumerate(parts):
                sp = chosen.subparts[idx]
                row["parts"].append({
                    "label": p,
                    "text": clean_question_text(sp.get('text') if isinstance(sp, dict) else str(sp)),
                    "marks": marks_map.get(p),
                    "co": chosen.co_tags or [],
                    "rbt": chosen.rbt_level,
                    "source_qid": chosen.id,
                })
            # Decrement remaining count for module for each part consumed
            if module_percents:
                qm = chosen.module or 0
                if qm in remaining_counts:
                    remaining_counts[qm] = max(0, remaining_counts[qm] - len(parts))
            rows.append(row)
            continue
        # Otherwise pick per-part
        for p in parts:
            target_mk = marks_map.get(p)
            # Choose preferred module per plan when available
            prefer_module = None
            if plan_idx < len(module_plan):
                prefer_module = module_plan[plan_idx]
            q = None
            # First, enforce module plan strictly if available
            if module_percents:
                # If we have a preferred module with remaining count, search only within that module
                if prefer_module is not None and module_allowed(prefer_module):
                    q = pick_question(target_mk, prefer_module=prefer_module)
                # If not found, try any module that still has remaining count
                if q is None:
                    for mod in [m for m,cnt in remaining_counts.items() if cnt > 0]:
                        q = pick_question(target_mk, prefer_module=mod)
                        if q is not None:
                            prefer_module = mod
                            break
            # If no module percentages provided, allow any module as fallback
            # If percentages are configured, DO NOT pick from modules with zero remaining
            if q is None and not module_percents:
                q = pick_question(target_mk)
            if q is not None:
                used_ids.add(q.id)
                # decrement remaining for module if applicable
                qm = q.module or prefer_module
                if module_percents and qm is not None and qm in remaining_counts and remaining_counts[qm] > 0:
                    remaining_counts[qm] -= 1
                plan_idx += 1
                used_texts.add(norm_text(q.text))
                row["parts"].append({
                    "label": p,
                    "text": clean_question_text(q.text),
                    "marks": target_mk,
                    "co": q.co_tags or [],
                    "rbt": q.rbt_level,
                    "source_qid": q.id,
                })
            else:
                row["parts"].append({"label": p, "text": "", "marks": target_mk, "co": [], "rbt": None})
        rows.append(row)
    # Insert OR markers after specified question numbers
    or_after = [s.get('after_qno') for s in config.get('or_between', []) if isinstance(s, dict) and 'after_qno' in s]
    or_after_set = set(or_after)
    with_or = []
    for r in rows:
        with_or.append(r)
        if r.get('type') == 'question' and r.get('qno') in or_after_set:
            with_or.append({"type": "or"})
    rows = with_or
    draft = PaperDraft(
        scheme_id=scheme_id,
        subject_id=subject_id,
        title=data.get('title') or 'INTERNAL ASSESSMENT TEST - 1',
        header=data.get('header') or {},
        co_table=data.get('co_table') or {},
        rbt_table=data.get('rbt_table') or {},
        rows=rows,
    )
    db.session.add(draft)
    db.session.commit()
    return jsonify({"draft_id": draft.id, "paper": {"title": draft.title, "header": draft.header, "rows": draft.rows}})

@app.route('/api/paper-drafts/<int:draft_id>', methods=['GET','PUT'])
def paper_draft(draft_id):
    draft = PaperDraft.query.get_or_404(draft_id)
    if request.method == 'GET':
        return jsonify({
            "id": draft.id,
            "scheme_id": draft.scheme_id,
            "subject_id": draft.subject_id,
            "status": draft.status.value,
            "title": draft.title,
            "header": draft.header,
            "co_table": draft.co_table,
            "rbt_table": draft.rbt_table,
            "rows": draft.rows,
        })
    data = request.json or {}
    for field in ["status","title","header","co_table","rbt_table","rows"]:
        if field in data:
            if field == 'status':
                try:
                    draft.status = PaperStatus(data['status'])
                except Exception:
                    pass
            else:
                setattr(draft, field, data[field])
    db.session.commit()
    return jsonify({"ok": True})

if __name__ == '__main__':
    app.run(debug=True)
