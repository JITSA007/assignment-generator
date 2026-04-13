import React, { useState, useEffect } from 'react';
import { 
  Upload, Plus, RefreshCw, Send, FileSpreadsheet, 
  Trash2, CheckCircle, Settings, Users, BookOpen, Download, 
  Sparkles, Server, ClipboardCheck, FileImage, FileText, X, 
  Printer, Book, BrainCircuit, Shield, GraduationCap, Building2, 
  UserPlus, Inbox, Eye, Edit3, Copy, ChevronLeft, ChevronRight, 
  Cpu, LayoutDashboard, TrendingUp
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// YOUR GOOGLE CLOUD CLIENT ID
const GOOGLE_CLIENT_ID = "949565343336-8etq9qoi1h1o7bskdm7ke497lf9kslf1.apps.googleusercontent.com";

export default function App() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [googleAuthStatus, setGoogleAuthStatus] = useState('disconnected');
  const [accessToken, setAccessToken] = useState('');
  const [classroomCourses, setClassroomCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gradingHistory, setGradingHistory] = useState([]);

  // Question Bank
  const [questions, setQuestions] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('Intermediate');
  
  // Manual Entry Form
  const [newQuestionType, setNewQuestionType] = useState('MCQ');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

  // Configuration & Branding
  const [numStudents, setNumStudents] = useState(10);
  const [assignmentConfig, setAssignmentConfig] = useState({ MCQ: 4, Short: 4, Long: 2 });
  const [assignments, setAssignments] = useState([]);
  const [universityName, setUniversityName] = useState('Global Tech University');
  const [departmentName, setDepartmentName] = useState('Department of Computer Science');
  const [teacherName, setTeacherName] = useState('Jitendra Prajapat');
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);

  // Classroom Roster
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [rosterCourseId, setRosterCourseId] = useState('');

  // AI Grader
  const [graderCourseId, setGraderCourseId] = useState('');
  const [graderAssignmentsList, setGraderAssignmentsList] = useState([]);
  const [graderSelectedAssignmentId, setGraderSelectedAssignmentId] = useState('');
  const [graderSubmissionsList, setGraderSubmissionsList] = useState([]);
  const [isFetchingSubmissions, setIsFetchingSubmissions] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [activeStudentName, setActiveStudentName] = useState('');
  const [gradingQuestion, setGradingQuestion] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [studentFileUrls, setStudentFileUrls] = useState([]); 
  const [studentFilesData, setStudentFilesData] = useState([]); 
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [gradingResult, setGradingResult] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [isSyncingGrade, setIsSyncingGrade] = useState(false);

  // Export & UI
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [printingAssignmentId, setPrintingAssignmentId] = useState(null);

  // ==========================================
  // EXTERNAL SCRIPT LOADING
  // ==========================================
  useEffect(() => {
    const scripts = [
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
      "https://accounts.google.com/gsi/client"
    ];
    
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src; 
      script.async = true;
      if (src.includes('pdf.min.js')) {
        script.onload = () => { 
          if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; 
        };
      }
      document.body.appendChild(script);
    });
  }, []);

  // ==========================================
  // CORE HELPER FUNCTIONS
  // ==========================================
  const generateWithRetry = async (model, contents) => {
    const delays = [1500, 3000, 6000, 12000]; 
    let lastError;
    for (let i = 0; i <= delays.length; i++) {
      try { return await model.generateContent(contents); } 
      catch (error) {
        lastError = error;
        if (i < delays.length) await new Promise(r => setTimeout(r, delays[i]));
      }
    }
    throw new Error(`AI Gateway Timeout. Servers are too busy. Please switch the model dropdown or try again. (Error: ${lastError?.message})`);
  };

  const extractJsonFromText = (text, isArray = false) => {
    const startChar = isArray ? '[' : '{';
    const endChar = isArray ? ']' : '}';
    const start = text.indexOf(startChar);
    const end = text.lastIndexOf(endChar);
    if (start === -1 || end === -1) throw new Error("AI failed to output valid data format. Please try again.");
    return JSON.parse(text.substring(start, end + 1));
  };

  // THE FIX: Securely create file names with part of their ID so it's always unique
  const getSafeFileName = (name, id) => {
    const safeId = id ? String(id).substring(0, 4) : Math.floor(Math.random() * 1000);
    if (!name || name.includes("____")) return `Assignment_${safeId}`;
    return `${name.replace(/[^a-zA-Z0-9 ]/g, "").trim()}_${safeId}`;
  };

  // ==========================================
  // AUTHENTICATION LOGIC
  // ==========================================
  const handleAppLogin = () => {
    if (!window.google) return alert("Google security layer is still loading, please wait a moment...");
    setGoogleAuthStatus('connecting');
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/classroom.rosters.readonly https://www.googleapis.com/auth/drive.readonly',
      callback: (token) => {
        if (token.access_token) {
          setAccessToken(token.access_token);
          setGoogleAuthStatus('connected'); 
          setIsAuthenticated(true);
          fetchClassroomCourses(token.access_token);
        } else { 
          setGoogleAuthStatus('disconnected'); 
          alert("Authentication failed or was cancelled.");
        }
      },
    });
    client.requestAccessToken();
  };

  const fetchClassroomCourses = async (token) => {
    try {
      const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.courses && data.courses.length > 0) {
        setClassroomCourses(data.courses);
        setSelectedCourseId(data.courses[0].id);
        setRosterCourseId(data.courses[0].id);
        setGraderCourseId(data.courses[0].id);
      }
    } catch (e) { console.error("Error fetching courses:", e); }
  };

  // ==========================================
  // QUESTION BANK LOGIC
  // ==========================================
  const handleFetchModels = async () => {
    if (!apiKey.trim()) return alert("Enter your Gemini API Key first.");
    setIsLoadingModels(true);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await res.json();
      const filtered = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
      setAvailableModels(filtered);
      if (filtered.length > 0) setSelectedModel(filtered[0].name.replace('models/',''));
    } catch (e) { alert("Failed to fetch AI models. Check your API key."); }
    setIsLoadingModels(false);
  };

  const handleGenerateAIQuestions = async (e) => {
    e.preventDefault();
    if (!apiKey || !selectedModel || !sourceText) return alert("Complete the setup first (API Key, Model, and Text).");
    setIsGeneratingAI(true);
    try {
      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: selectedModel });
      const prompt = `You are a university professor. Generate ${aiQuestionCount} questions for ${aiDifficulty} students based on this text: "${sourceText}". Balance using Bloom's Taxonomy. Return ONLY a raw JSON array of objects with {type: "MCQ"|"Short"|"Long", text: "..."}. For MCQs, format the text string strictly like this with real newlines:\nQuestion Text\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\nCorrect: X. Do not use markdown blocks.`;
      
      const res = await generateWithRetry(model, prompt);
      const parsed = extractJsonFromText(res.response.text(), true).map((q, i) => ({ ...q, id: `ai-${Date.now()}-${i}` }));
      
      setQuestions([...questions, ...parsed]);
      setSourceText('');
      alert(`Successfully generated ${parsed.length} questions!`);
    } catch (err) { alert(err.message); }
    setIsGeneratingAI(false);
  };

  const handleAddQuestionManually = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    
    let text = newQuestionText;
    if (newQuestionType === 'MCQ') {
      text += `\nA) ${mcqOptions[0]}\nB) ${mcqOptions[1]}\nC) ${mcqOptions[2]}\nD) ${mcqOptions[3]}\n(Correct: ${['A','B','C','D'][correctOptionIndex]})`;
    }
    
    setQuestions([...questions, { id: Date.now().toString(), type: newQuestionType, text }]);
    setNewQuestionText(''); 
    setMcqOptions(['','','','']);
    setCorrectOptionIndex(0);
  };

  const handleDeleteQuestion = (id) => setQuestions(questions.filter(q => q.id !== id));

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = window.XLSX.read(evt.target.result, { type: 'binary' });
        const json = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const imported = json.map((row, i) => {
          let text = row.Question || row.Text || "Missing Text";
          if (row.Type === 'MCQ' && row.Option1) {
            text = `${text}\nA) ${row.Option1}\nB) ${row.Option2}\nC) ${row.Option3}\nD) ${row.Option4}\n(Correct: ${row.CorrectOption})`;
          }
          return { id: `imp-${Date.now()}-${i}`, type: row.Type || 'Short', text };
        });
        setQuestions([...questions, ...imported]);
        alert(`Imported ${imported.length} questions!`);
      } catch (error) { alert("Error reading Excel file."); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const downloadSampleExcel = () => {
    if (!window.XLSX) return alert("Excel library is still loading, please wait a moment.");
    const sampleData = [
      { Type: "MCQ", Question: "What is the capital of France?", Option1: "London", Option2: "Berlin", Option3: "Paris", Option4: "Madrid", CorrectOption: "C" },
      { Type: "Short", Question: "Explain photosynthesis." },
      { Type: "Long", Question: "Analyze the industrial revolution's impact." }
    ];
    const ws = window.XLSX.utils.json_to_sheet(sampleData);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Questions");
    window.XLSX.writeFile(wb, "Syllabus_Template.xlsx");
  };

  // ==========================================
  // SETUP & GENERATION LOGIC
  // ==========================================
  const handleFetchStudents = async () => {
    if (!rosterCourseId) return;
    setIsFetchingStudents(true);
    try {
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${rosterCourseId}/students`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (data.students && data.students.length > 0) {
        // THE FIX: We are extracting the s.userId, NOT the email, to ensure uniqueness.
        const list = data.students.map(s => ({ 
          id: s.userId, 
          name: s.profile?.name?.fullName || 'Unknown' 
        }));
        setClassroomStudents(list); 
        setNumStudents(list.length);
        alert(`Fetched ${list.length} students from Google Classroom!`);
      } else {
        alert("No students found in this course."); setClassroomStudents([]);
      }
    } catch (e) { alert("Failed to fetch roster."); }
    setIsFetchingStudents(false);
  };

  const generateAssignments = () => {
    const mcq = questions.filter(q => q.type === 'MCQ');
    const shrt = questions.filter(q => q.type === 'Short');
    const lng = questions.filter(q => q.type === 'Long');
    if (mcq.length < assignmentConfig.MCQ || shrt.length < assignmentConfig.Short || lng.length < assignmentConfig.Long) {
      return alert("You do not have enough questions in the bank to meet your required configuration!");
    }

    const result = [];
    const count = classroomStudents.length > 0 ? classroomStudents.length : numStudents;
    for (let i = 0; i < count; i++) {
      const shuffle = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
      // THE FIX: Assigning the guaranteed unique student.id instead of an email
      const student = classroomStudents[i] || { name: "______________________", id: `Guest_${i+1}` };
      result.push({
        studentName: student.name,
        studentId: student.id,
        questions: [...shuffle(mcq, assignmentConfig.MCQ), ...shuffle(shrt, assignmentConfig.Short), ...shuffle(lng, assignmentConfig.Long)]
      });
    }
    setAssignments(result); setActiveTab('assignments');
  };

  const downloadSingleAssignmentPDF = async (studentId) => {
    const assign = assignments.find(a => a.studentId === studentId);
    if (!assign) return;
    if (!window.html2pdf) return alert("PDF tool is still loading.");
    
    // Apply our new Safe File Name logic
    const safeFileName = getSafeFileName(assign.studentName, assign.studentId);
    alert(`Generating PDF for ${safeFileName}...`);

    const el = document.createElement('div');
    const formattedQuestions = assign.questions.map((q, idx) => {
      const formattedText = q.text.replace(/\n/g, '<br/>');
      return `
        <div style="margin-bottom:24px; font-size:14px; page-break-inside: avoid;">
          <div style="display:flex;">
            <span style="font-weight:bold; margin-right:8px;">${idx+1}.</span>
            <span style="line-height:1.5">${formattedText}</span>
          </div>
          ${q.type==='Short'?'<div style="margin-top:8px; height:64px; border-bottom:1px dashed #d1d5db;"></div>':''}
          ${q.type==='Long'?'<div style="margin-top:8px; height:128px; border-bottom:1px dashed #d1d5db;"></div>':''}
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div style="padding:40px; font-family:sans-serif; color:#1f2937;">
        <div style="text-align:center; margin-bottom:24px; border-bottom:2px solid #1f2937; padding-bottom:16px;">
          <h1 style="font-size:26px; font-weight:900; text-transform:uppercase; margin-bottom:4px;">${universityName}</h1>
          <h2 style="font-size:18px; font-weight:600; color:#4b5563; margin-bottom:16px;">${departmentName}</h2>
          <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:8px;">
            <span style="font-weight:bold;">Instructor: ${teacherName}</span>
            <span style="font-weight:bold;">Date: ${assignmentDate}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; margin-top:16px; padding-top:16px; border-top:1px dashed #d1d5db;">
            <span>Student Name: ${assign.studentName}</span>
            <span>Roll No / ID: ${String(assign.studentId).substring(0,6).toUpperCase()}</span>
          </div>
        </div>
        <div>${formattedQuestions}</div>
      </div>
    `;
    
    await window.html2pdf().set({ 
      margin:0.5, 
      filename: `${safeFileName}.pdf`, 
      jsPDF: { unit:'in', format:'letter'} 
    }).from(el).save();
  };

  // ==========================================
  // GOOGLE CLASSROOM EXPORT 
  // ==========================================
  const handleExportToClassroom = async () => {
    if (assignments.length === 0 || !selectedCourseId) return alert("Generate papers and select a course first.");
    if (!window.html2pdf) return alert("PDF tool is still loading.");
    
    setExportStatus('exporting');
    try {
      const materialsList = [];
      
      for (const assign of assignments) {
        const safeFileName = getSafeFileName(assign.studentName, assign.studentId);
        setUploadProgress(`Drafting PDF for ${safeFileName}...`);
        
        const el = document.createElement('div');
        const formattedQuestions = assign.questions.map((q, idx) => {
          const formattedText = q.text.replace(/\n/g, '<br/>');
          return `
            <div style="margin-bottom:24px; font-size:14px; page-break-inside: avoid;">
              <div style="display:flex;">
                <span style="font-weight:bold; margin-right:8px;">${idx+1}.</span>
                <span style="line-height:1.5">${formattedText}</span>
              </div>
              ${q.type==='Short'?'<div style="margin-top:8px; height:64px; border-bottom:1px dashed #d1d5db;"></div>':''}
              ${q.type==='Long'?'<div style="margin-top:8px; height:128px; border-bottom:1px dashed #d1d5db;"></div>':''}
            </div>
          `;
        }).join('');

        el.innerHTML = `
          <div style="padding:40px; font-family:sans-serif; color:#1f2937;">
            <div style="text-align:center; margin-bottom:24px; border-bottom:2px solid #1f2937; padding-bottom:16px;">
              <h1 style="font-size:26px; font-weight:900; text-transform:uppercase; margin-bottom:4px;">${universityName}</h1>
              <h2 style="font-size:18px; font-weight:600; color:#4b5563; margin-bottom:16px;">${departmentName}</h2>
              <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:8px;">
                <span style="font-weight:bold;">Instructor: ${teacherName}</span>
                <span style="font-weight:bold;">Date: ${assignmentDate}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; margin-top:16px; padding-top:16px; border-top:1px dashed #d1d5db;">
                <span>Student Name: ${assign.studentName}</span>
                <span>Roll No / ID: ${String(assign.studentId).substring(0,6).toUpperCase()}</span>
              </div>
            </div>
            <div>${formattedQuestions}</div>
          </div>
        `;
        
        const blob = await window.html2pdf().set({ margin:0.5, filename: `${safeFileName}.pdf`, jsPDF: { unit:'in', format:'letter'} }).from(el).output('blob');
        const upRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', { 
          method:'POST', headers:{ Authorization:`Bearer ${accessToken}`, 'Content-Type':'application/pdf' }, body:blob 
        });
        const fileId = (await upRes.json()).id;
        
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, { 
          method:'PATCH', headers:{ Authorization:`Bearer ${accessToken}`, 'Content-Type':'application/json' }, 
          body: JSON.stringify({ name: `${safeFileName}.pdf` }) 
        });
        
        materialsList.push({ driveFile: { driveFile: { id: fileId }, shareMode: "VIEW" } });
      }

      setUploadProgress("Drafting to Classroom (Bypassing limits)...");
      
      const CHUNK_SIZE = 15;
      for (let i = 0; i < materialsList.length; i += CHUNK_SIZE) {
        const chunk = materialsList.slice(i, i + CHUNK_SIZE);
        const partSuffix = materialsList.length > CHUNK_SIZE ? ` (Part ${Math.floor(i/CHUNK_SIZE) + 1})` : '';
        
        const createRes = await fetch(`https://classroom.googleapis.com/v1/courses/${selectedCourseId}/courseWork`, {
          method: 'POST', 
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: `OmniGrade AI Assignment${partSuffix}`, 
            description: "Randomized exams attached as PDFs. Open your specific PDF.", 
            state: "DRAFT", workType: "ASSIGNMENT", materials: chunk 
          })
        });

        if (!createRes.ok) {
           const errorData = await createRes.json();
           throw new Error(errorData.error?.message || "Classroom rejected the draft.");
        }
      }
      
      setExportStatus('success'); setTimeout(() => setExportStatus(''), 5000);
    } catch (e) { 
      alert("Export failed: " + e.message); setExportStatus(''); 
    }
    setUploadProgress('');
  };

  // ==========================================
  // SMART GRADER LOGIC
  // ==========================================
  const fetchClassroomAssignmentsForGrader = async () => {
    if (!graderCourseId) return;
    try {
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${graderCourseId}/courseWork`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (data.courseWork) {
        setGraderAssignmentsList(data.courseWork);
        setGraderSelectedAssignmentId(data.courseWork[0].id);
        setGradingQuestion(data.courseWork[0].title + "\n\n" + (data.courseWork[0].description || ''));
      }
    } catch (e) { alert("Failed to fetch coursework."); }
  };

  const fetchSubmissionsForGrader = async () => {
    if (!graderSelectedAssignmentId) return;
    setIsFetchingSubmissions(true);
    try {
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${graderCourseId}/courseWork/${graderSelectedAssignmentId}/studentSubmissions`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      setGraderSubmissionsList(data.studentSubmissions || []);
    } catch (e) { alert("Failed to fetch submissions."); }
    setIsFetchingSubmissions(false);
  };

  const loadStudentSubmissionFile = async (submission) => {
    const attachments = submission.assignmentSubmission?.attachments?.filter(a => a.driveFile) || [];
    if (attachments.length === 0) return alert("No files attached to this submission.");
    
    clearGraderFile();
    setActiveSubmission(submission);
    const rosterMatch = classroomStudents.find(s => s.id === submission.userId);
    setActiveStudentName(rosterMatch ? rosterMatch.name : `ID: ${submission.userId}`);

    const urls = []; const dat = [];
    for (const att of attachments) {
      try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${att.driveFile.id}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
        const blob = await res.blob();
        urls.push({ url: URL.createObjectURL(blob), type: blob.type.includes('pdf') ? 'pdf' : 'image', name: att.driveFile.title });
        
        if (blob.type.includes('pdf')) {
          const pdf = await window.pdfjsLib.getDocument(new Uint8Array(await blob.arrayBuffer())).promise;
          let t = ""; for (let i=1; i<=pdf.numPages; i++) t += (await (await pdf.getPage(i)).getTextContent()).items.map(it => it.str).join(' ') + "\n";
          dat.push({ type: 'text', data: t });
        } else {
          const b64 = await new Promise(resolve => { const r = new FileReader(); r.onload = (e) => resolve(e.target.result.split(',')[1]); r.readAsDataURL(blob); });
          dat.push({ type: 'image', inlineData: { data: b64, mimeType: blob.type } });
        }
      } catch (err) { console.error("Could not load file:", att.driveFile.title); }
    }
    setStudentFileUrls(urls); setStudentFilesData(dat); setCurrentFileIndex(0);
  };

  const handleGraderFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    clearGraderFile(); setActiveStudentName('Manual Upload');
    const urls = []; const dat = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      urls.push({ url: URL.createObjectURL(file), type: file.type.includes('pdf') ? 'pdf' : 'image', name: file.name });
      if (file.type.startsWith('image/')) {
        const b64 = await new Promise(resolve => { const r = new FileReader(); r.onload = (evt) => resolve(evt.target.result.split(',')[1]); r.readAsDataURL(file); });
        dat.push({ type: 'image', inlineData: { data: b64, mimeType: file.type } });
      } else if (file.type === 'application/pdf') {
        if (!window.pdfjsLib) continue;
        const text = await new Promise(resolve => {
          const r = new FileReader();
          r.onload = async (evt) => {
            try {
              const pdf = await window.pdfjsLib.getDocument(new Uint8Array(evt.target.result)).promise;
              let t = ""; for (let p=1; p<=pdf.numPages; p++) t += (await (await pdf.getPage(p)).getTextContent()).items.map(it => it.str).join(' ') + "\n";
              resolve(t);
            } catch (err) { resolve(""); }
          };
          r.readAsArrayBuffer(file);
        });
        dat.push({ type: 'text', data: text });
      }
    }
    setStudentFileUrls(urls); setStudentFilesData(dat); setCurrentFileIndex(0);
  };

  const handleGradeAnswer = async (e) => {
    e.preventDefault();
    if (!apiKey || !selectedModel || !gradingQuestion) return alert("API/Model not configured properly.");
    setIsGrading(true); setGradingResult(null);
    try {
      const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: selectedModel });
      let prompt = `Professor Grader:\nQuestion: "${gradingQuestion}"\nAnswer text: "${studentAnswer}"\n`;
      const images = [];
      studentFilesData.forEach(d => { if(d.type === 'text') prompt += `PDF Content: ${d.data}\n`; else images.push({ inlineData: d.inlineData }); });
      prompt += `Evaluate out of 10 points. Provide professional university-level feedback. RETURN ONLY A JSON OBJECT: {"score": "8.5", "appreciation": "...", "correction": "...", "encouragement": "..."}. Do not use markdown formatting.`;
      
      const res = await generateWithRetry(model, [prompt, ...images]);
      setGradingResult(extractJsonFromText(res.response.text(), false));
    } catch (err) { alert(err.message); }
    setIsGrading(false);
  };

  const handleSyncGradeToClassroom = async () => {
    if (!activeSubmission) return alert("No classroom submission active.");
    setIsSyncingGrade(true);
    try {
      const numericGrade = parseFloat(gradingResult.score);
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${graderCourseId}/courseWork/${graderSelectedAssignmentId}/studentSubmissions/${activeSubmission.id}?updateMask=draftGrade`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftGrade: numericGrade })
      });
      
      if (!res.ok) throw new Error((await res.json()).error?.message);
      
      alert("Grade synced as DRAFT in Classroom!");
      setGradingHistory(prev => {
        const filtered = prev.filter(h => h.id !== activeSubmission.userId);
        return [...filtered, { id: activeSubmission.userId, name: activeStudentName, score: numericGrade, date: new Date().toLocaleDateString() }];
      });
    } catch (e) { 
      alert(`SYNC FAILED: ${e.message}\n\nNote: Google Classroom only allows this app to push grades to assignments that were originally created via the "Export" tab in this app. You cannot push grades to manually created assignments.`); 
    }
    setIsSyncingGrade(false);
  };

  const clearGraderFile = () => { studentFileUrls.forEach(f => URL.revokeObjectURL(f.url)); setStudentFileUrls([]); setStudentFilesData([]); setGradingResult(null); setActiveSubmission(null); };

  const copyFeedbackToClipboard = () => {
    if(!gradingResult) return;
    const text = `Score: ${gradingResult.score}/10\n\nAppreciation: ${gradingResult.appreciation}\n\nCorrection: ${gradingResult.correction}\n\nEncouragement: ${gradingResult.encouragement}`;
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    alert("Copied to clipboard!");
  };

  // ==========================================
  // UI RENDER: LANDING PAGE
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white font-sans flex flex-col selection:bg-blue-500">
        <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center space-x-2 font-black text-xl tracking-wider"><BrainCircuit className="w-8 h-8 text-blue-400" /><span>OmniGrade<span className="text-blue-400"> AI</span></span></div>
          <button onClick={handleAppLogin} className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-2 rounded-full transition-all flex items-center shadow-lg"><img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" className="w-4 h-4 mr-3" />Teacher Login</button>
        </nav>
        <main className="flex-grow flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto px-6 py-12 gap-16 w-full">
          <div className="lg:w-1/2 space-y-8">
            <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"><Shield className="w-4 h-4" /><span>Secured by Google Identity</span></div>
            <h1 className="text-5xl md:text-6xl font-black leading-tight">AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">University Exam</span> Engine</h1>
            <p className="text-xl text-slate-300 leading-relaxed">Turn your syllabus into personalized, randomized examinations. Seamlessly sync with Google Classroom and auto-grade submissions with professor-level AI logic.</p>
            <button onClick={handleAppLogin} className="bg-blue-600 hover:bg-blue-500 text-lg font-bold py-4 px-8 rounded-full transition-all shadow-xl shadow-blue-600/30 flex items-center group">
              {googleAuthStatus === 'connecting' ? <RefreshCw className="animate-spin mr-3" /> : "Access Faculty Workspace"} <Send className="ml-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="lg:w-5/12 w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 p-1"><div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center"><GraduationCap className="w-12 h-12 text-blue-400" /></div></div>
            <h3 className="text-2xl font-black mb-1">Jitendra Prajapat</h3>
            <p className="text-blue-400 font-semibold mb-4 italic">"Professor who Refuses to be Boring"</p>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">AI Researcher & Farmer at heart. Bridging Academia, Industry, and the Soil.</p>
            <div className="flex justify-center gap-3">
              <a href="https://linkedin.com/in/jitsa00" className="bg-slate-700 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm transition-colors font-bold">LinkedIn</a>
              <a href="mailto:jitsahere@gmail.com" className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm transition-colors font-bold">Contact</a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // UI RENDER: MAIN APPLICATION
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="print:hidden">
          <header className="mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-center md:text-left mb-6 md:mb-0">
              <h1 className="text-2xl font-black text-blue-900 uppercase tracking-wide">OmniGrade AI</h1>
              <p className="text-gray-500 text-sm font-bold mt-1">Engineered by Jitendra Prajapat</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 bg-gray-100 p-2 rounded-2xl w-full md:w-auto">
              {['dashboard', 'bank', 'generate', 'assignments', 'grader', 'export'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:bg-gray-200'}`}>
                  {tab === 'dashboard' && <LayoutDashboard className="w-4 h-4 mr-2" />}
                  {tab === 'bank' && <BookOpen className="w-4 h-4 mr-2" />}
                  {tab === 'generate' && <Settings className="w-4 h-4 mr-2" />}
                  {tab === 'assignments' && <FileText className="w-4 h-4 mr-2" />}
                  {tab === 'grader' && <ClipboardCheck className="w-4 h-4 mr-2" />}
                  {tab === 'export' && <Send className="w-4 h-4 mr-2" />}
                  {tab === 'assignments' ? 'Papers' : tab}
                </button>
              ))}
              <button onClick={() => setIsAuthenticated(false)} className="flex items-center px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider text-red-500 hover:bg-red-50 transition-colors ml-auto">Logout</button>
            </div>
          </header>
        </div>

        <main className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          
          {/* TAB 1: ANALYTICS DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b pb-4"><h2 className="text-3xl font-black text-gray-800 flex items-center"><LayoutDashboard className="w-8 h-8 mr-3 text-blue-600"/> Class Overview</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col justify-center items-center text-center shadow-sm transition-transform hover:-translate-y-1"><Users className="w-10 h-10 text-blue-500 mb-3"/><span className="text-4xl font-black text-blue-900">{classroomStudents.length || 0}</span><span className="text-xs font-bold uppercase text-blue-600 mt-2 tracking-wider">Students Synced</span></div>
                <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex flex-col justify-center items-center text-center shadow-sm transition-transform hover:-translate-y-1"><BrainCircuit className="w-10 h-10 text-purple-500 mb-3"/><span className="text-4xl font-black text-purple-900">{questions.length}</span><span className="text-xs font-bold uppercase text-purple-600 mt-2 tracking-wider">Bank Questions</span></div>
                <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex flex-col justify-center items-center text-center shadow-sm transition-transform hover:-translate-y-1"><ClipboardCheck className="w-10 h-10 text-green-500 mb-3"/><span className="text-4xl font-black text-green-900">{gradingHistory.length}</span><span className="text-xs font-bold uppercase text-green-600 mt-2 tracking-wider">Papers Graded</span></div>
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col justify-center items-center text-center shadow-sm transition-transform hover:-translate-y-1"><TrendingUp className="w-10 h-10 text-orange-500 mb-3"/><span className="text-4xl font-black text-orange-900">{gradingHistory.length > 0 ? (gradingHistory.reduce((acc, curr) => acc + curr.score, 0) / gradingHistory.length).toFixed(1) : '-'}</span><span className="text-xs font-bold uppercase text-orange-600 mt-2 tracking-wider">Class Average /10</span></div>
              </div>
              <div className="bg-white border rounded-3xl p-8 shadow-sm">
                <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm mb-6 flex items-center"><ClipboardCheck className="w-5 h-5 mr-2 text-gray-500"/> Grading History Log</h3>
                {gradingHistory.length === 0 ? <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed"><Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300"/><p className="text-gray-400 font-bold uppercase tracking-wider text-sm">No grades synced yet.</p><p className="text-gray-400 text-xs mt-2">Use the AI Grader to evaluate submissions.</p></div> : (
                  <div className="overflow-hidden rounded-2xl border"><table className="w-full text-sm text-left"><thead className="bg-gray-100 text-gray-600 font-black uppercase text-xs tracking-wider"><tr><th className="px-6 py-4">Student Name</th><th className="px-6 py-4">Date Graded</th><th className="px-6 py-4">Final Score</th></tr></thead><tbody className="divide-y divide-gray-100">{gradingHistory.map((h, i) => (<tr key={i} className="hover:bg-blue-50 transition-colors"><td className="px-6 py-4 font-bold text-gray-800">{h.name}</td><td className="px-6 py-4 text-gray-500">{h.date}</td><td className="px-6 py-4 font-black text-blue-600 text-lg">{h.score} <span className="text-sm text-gray-400">/ 10</span></td></tr>))}</tbody></table></div>
                )}
              </div>
            </div>
          )}
          
          {/* TAB 2: QUESTION BANK */}
          {activeTab === 'bank' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-purple-50 p-8 rounded-3xl border border-purple-200 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-sm">
                <div className="space-y-5">
                  <h3 className="text-xl font-black text-purple-900 flex items-center uppercase tracking-wide"><BrainCircuit className="w-6 h-6 mr-3" /> AI Syllabus Engine</h3>
                  <div><label className="block text-xs font-black text-purple-800 uppercase mb-2">1. Connect Google Gemini API</label><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API Key here..." className="w-full p-4 border border-purple-200 rounded-xl outline-none focus:ring-2 ring-purple-500 shadow-inner" /></div>
                  <div><label className="block text-xs font-black text-purple-800 uppercase mb-2">2. Select Processing Model</label><div className="flex gap-3"><button onClick={handleFetchModels} className="bg-purple-200 text-purple-800 p-3 rounded-xl text-sm font-black hover:bg-purple-300 flex-1 transition-colors shadow-sm">Load Models</button><select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="bg-white border border-purple-200 rounded-xl text-sm font-bold flex-[2] p-3 outline-none shadow-sm text-purple-900">{availableModels.length === 0 ? <option>Waiting for API Key...</option> : availableModels.map(m => <option key={m.name} value={m.name.replace('models/','')}>{m.displayName}</option>)}</select></div></div>
                </div>
                <div className="space-y-5 border-t md:border-t-0 md:border-l border-purple-200 pt-6 md:pt-0 md:pl-8">
                   <label className="block text-xs font-black text-purple-800 uppercase mb-1">3. Generate Questions</label>
                   <div className="flex gap-3"><input type="number" value={aiQuestionCount} onChange={e=>setAiQuestionCount(e.target.value)} className="w-20 p-3 border rounded-xl text-sm font-bold text-center outline-none shadow-inner"/><select value={aiDifficulty} onChange={e=>setAiDifficulty(e.target.value)} className="flex-1 p-3 border rounded-xl text-sm font-bold outline-none shadow-sm"><option>Beginner (1st Year)</option><option>Intermediate (2nd/3rd Year)</option><option>Advanced (Masters)</option></select></div>
                   <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder="Paste your topic, syllabus content, or lecture notes here..." className="w-full h-28 p-4 border rounded-xl text-sm outline-none resize-none focus:ring-2 ring-purple-500 shadow-inner leading-relaxed" />
                   <button onClick={handleGenerateAIQuestions} disabled={isGeneratingAI} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl hover:bg-purple-700 flex justify-center items-center active:scale-95 transition-all shadow-lg shadow-purple-200 disabled:opacity-50">{isGeneratingAI ? <><RefreshCw className="animate-spin mr-3" /> ANALYZING DATA...</> : <><Sparkles className="w-5 h-5 mr-3"/> GENERATE UNIVERSITY BANK</>}</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 shadow-sm">
                    <h3 className="font-black text-blue-900 mb-6 flex items-center text-xl uppercase tracking-wide"><Plus className="w-6 h-6 mr-3"/> Manual Entry</h3>
                    <select value={newQuestionType} onChange={e => setNewQuestionType(e.target.value)} className="w-full p-4 mb-4 border rounded-xl bg-white outline-none font-bold text-gray-700 shadow-sm"><option value="MCQ">Multiple Choice Question</option><option value="Short">Short Answer (2-3 lines)</option><option value="Long">Long Essay / Case Study</option></select>
                    <textarea value={newQuestionText} onChange={e => setNewQuestionText(e.target.value)} placeholder="Type your question here..." className="w-full p-4 mb-4 border rounded-xl text-sm outline-none resize-none h-24 focus:ring-2 ring-blue-500 shadow-inner leading-relaxed" />
                    {newQuestionType === 'MCQ' && (
                      <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3 mb-4 shadow-sm">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Configure Options</label>
                        {['A', 'B', 'C', 'D'].map((label, index) => (
                          <div key={index} className="flex items-center space-x-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <input type="radio" name="correctOption" checked={correctOptionIndex === index} onChange={() => setCorrectOptionIndex(index)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                            <span className="font-black text-gray-700">{label})</span>
                            <input type="text" required value={mcqOptions[index]} onChange={(e) => { const newOpts=[...mcqOptions]; newOpts[index]=e.target.value; setMcqOptions(newOpts); }} placeholder={`Type option ${label}...`} className="w-full p-2 bg-transparent outline-none text-sm font-medium" />
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={handleAddQuestionManually} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 uppercase">Add to Bank</button>
                 </div>
                 <div className="bg-green-50 p-8 rounded-3xl border border-green-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-6"><FileSpreadsheet className="w-12 h-12 text-green-500" /></div>
                    <h3 className="font-black text-green-900 mb-2 text-xl uppercase tracking-wide">Bulk Excel Import</h3>
                    <p className="text-sm text-green-700 mb-8 max-w-xs">Upload your existing spreadsheet to instantly populate the question bank.</p>
                    <label className="cursor-pointer w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 px-6 rounded-xl transition-colors flex items-center justify-center shadow-lg shadow-green-200 mb-4 hover:scale-105"><Upload className="w-5 h-5 mr-3" /> UPLOAD SPREADSHEET<input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" /></label>
                    <button onClick={downloadSampleExcel} className="text-green-700 font-bold text-sm hover:underline flex items-center bg-white px-4 py-2 rounded-lg border border-green-200"><Download className="w-4 h-4 mr-2" /> Download Format Template</button>
                 </div>
              </div>
              <div className="border-t pt-8">
                <div className="flex justify-between items-center mb-6"><h3 className="font-black text-2xl text-gray-800 uppercase tracking-wide">Active Question Bank</h3><span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full font-black text-sm">{questions.length} ITEMS</span></div>
                {questions.length === 0 && <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200"><Book className="w-12 h-12 text-gray-300 mx-auto mb-4"/><p className="text-gray-400 font-bold uppercase tracking-wider">Your bank is empty.</p><p className="text-gray-400 text-sm mt-2">Generate questions using AI or upload an Excel file.</p></div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-4">
                   {questions.map(q => (
                     <div key={q.id} className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm relative group hover:border-blue-400 hover:shadow-md transition-all">
                       <span className={`text-[10px] font-black uppercase text-white px-3 py-1 rounded-full mb-3 inline-block tracking-wider ${q.type === 'MCQ' ? 'bg-purple-500' : q.type === 'Short' ? 'bg-orange-500' : 'bg-blue-500'}`}>{q.type}</span>
                       <p className="text-sm pr-8 leading-relaxed text-gray-700 font-medium whitespace-pre-wrap">{q.text}</p>
                       <button onClick={()=>setQuestions(questions.filter(it=>it.id!==q.id))} className="absolute right-4 top-4 text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5"/></button>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONFIG & SETUP LOGIC */}
          {activeTab === 'generate' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
               <div className="text-center mb-10"><h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight mb-2">Exam Setup</h2><p className="text-gray-500 font-medium">Link your roster and set your paper layout rules.</p></div>
               <div className="bg-blue-50 border border-blue-200 p-8 rounded-3xl space-y-6 shadow-sm">
                 <h3 className="font-black text-xl flex items-center text-blue-900 uppercase tracking-wide"><UserPlus className="w-6 h-6 mr-3"/> Roster Synchronization</h3>
                 <p className="text-sm text-blue-800 leading-relaxed">Pull live student names directly from Google Classroom so every exam paper is personalized automatically.</p>
                 <div className="flex flex-col md:flex-row gap-3">
                   <select value={rosterCourseId} onChange={e=>setRosterCourseId(e.target.value)} className="flex-[2] p-4 rounded-xl border border-blue-200 outline-none font-bold text-gray-700 shadow-sm">{classroomCourses.length === 0 ? <option>No courses available</option> : classroomCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                   <button onClick={handleFetchStudents} disabled={isFetchingStudents || classroomCourses.length === 0} className="flex-1 bg-blue-600 text-white font-black rounded-xl text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-md py-4 md:py-0 disabled:opacity-50">{isFetchingStudents ? <RefreshCw className="animate-spin mx-auto w-5 h-5"/> : "SYNC STUDENTS"}</button>
                 </div>
                 {classroomStudents.length > 0 && <div className="mt-4 text-sm text-green-800 font-black bg-green-100 p-4 rounded-xl border border-green-200 shadow-sm flex items-center justify-center"><CheckCircle className="w-5 h-5 mr-2"/> SUCCESSFULLY SYNCED {classroomStudents.length} STUDENTS</div>}
               </div>
               <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl space-y-6 shadow-sm">
                 <h3 className="font-black text-xl flex items-center text-gray-800 uppercase tracking-wide"><Building2 className="w-6 h-6 mr-3 text-gray-600"/> University Branding</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                    <div><label className="font-black uppercase text-gray-400 block mb-2 tracking-wider text-xs">University Name</label><input value={universityName} onChange={e=>setUniversityName(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-inner font-bold text-gray-700" /></div>
                    <div><label className="font-black uppercase text-gray-400 block mb-2 tracking-wider text-xs">Department</label><input value={departmentName} onChange={e=>setDepartmentName(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-inner font-bold text-gray-700" /></div>
                    <div><label className="font-black uppercase text-gray-400 block mb-2 tracking-wider text-xs">Lead Instructor</label><input value={teacherName} onChange={e=>setTeacherName(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-inner font-bold text-gray-700" /></div>
                    <div><label className="font-black uppercase text-gray-400 block mb-2 tracking-wider text-xs">Exam Date</label><input type="date" value={assignmentDate} onChange={e=>setAssignmentDate(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500 shadow-inner font-bold text-gray-700" /></div>
                 </div>
               </div>
               <div className="bg-slate-800 text-white p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
                 <div className="absolute -right-10 -top-10 bg-blue-500/20 w-40 h-40 rounded-full blur-3xl pointer-events-none"></div>
                 <h3 className="font-black text-xl flex items-center uppercase tracking-wide relative z-10"><Settings className="w-6 h-6 mr-3 text-blue-400"/> AI Assembly Rules</h3>
                 <div className="space-y-4 text-base relative z-10">
                    <div className="flex justify-between items-center bg-slate-700/50 p-4 rounded-2xl border border-slate-600"><span className="font-bold">MCQs per Paper</span><input type="number" min="0" value={assignmentConfig.MCQ} onChange={e=>setAssignmentConfig({...assignmentConfig, MCQ: parseInt(e.target.value) || 0})} className="w-20 p-2 bg-slate-900 border border-slate-500 rounded-xl text-center text-white outline-none focus:border-blue-400 font-black"/></div>
                    <div className="flex justify-between items-center bg-slate-700/50 p-4 rounded-2xl border border-slate-600"><span className="font-bold">Short Answers</span><input type="number" min="0" value={assignmentConfig.Short} onChange={e=>setAssignmentConfig({...assignmentConfig, Short: parseInt(e.target.value) || 0})} className="w-20 p-2 bg-slate-900 border border-slate-500 rounded-xl text-center text-white outline-none focus:border-blue-400 font-black"/></div>
                    <div className="flex justify-between items-center bg-slate-700/50 p-4 rounded-2xl border border-slate-600"><span className="font-bold">Long / Case Studies</span><input type="number" min="0" value={assignmentConfig.Long} onChange={e=>setAssignmentConfig({...assignmentConfig, Long: parseInt(e.target.value) || 0})} className="w-20 p-2 bg-slate-900 border border-slate-500 rounded-xl text-center text-white outline-none focus:border-blue-400 font-black"/></div>
                 </div>
                 <button onClick={generateAssignments} className="w-full bg-blue-500 text-white font-black py-5 rounded-2xl hover:bg-blue-400 transition-all mt-6 shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95 text-lg relative z-10 uppercase tracking-widest">Compile Unique Exams</button>
               </div>
            </div>
          )}

          {/* TAB 4: VIEW ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="animate-in fade-in duration-500">
               {assignments.length === 0 ? (
                 <div className="text-center py-32 text-gray-400"><div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><FileText className="w-10 h-10 text-gray-300" /></div><p className="font-black text-xl uppercase tracking-widest text-gray-300">No exams generated yet.</p><p className="text-sm mt-2">Go to the Setup tab to compile your exams.</p></div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {assignments.map((as,idx) => (
                       <div key={idx} className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all bg-white flex flex-col h-[500px]">
                          <div className="bg-slate-800 p-4 flex justify-between items-center">
                             <span className="text-xs font-black text-white uppercase tracking-widest bg-slate-700 px-3 py-1 rounded-full">{String(as.studentId).substring(0,8).toUpperCase()}</span>
                             <button onClick={() => downloadSingleAssignmentPDF(as.studentId)} className="p-2 px-4 bg-blue-600 text-white border-none rounded-xl text-xs font-black hover:bg-blue-500 transition-colors shadow-sm flex items-center"><Download className="w-4 h-4 mr-2"/> DOWNLOAD PDF</button>
                          </div>
                          <div className="p-8 text-xs text-gray-800 flex-1 overflow-y-auto">
                             <div className="border-b-2 border-gray-200 pb-4 mb-6 text-center">
                               <h4 className="font-black text-lg uppercase text-gray-900">{universityName}</h4>
                               <h5 className="font-bold text-sm text-gray-500 mb-4">{departmentName}</h5>
                               <div className="flex justify-between font-bold text-gray-800 bg-gray-50 p-3 rounded-xl border">
                                 <span>{as.studentName}</span>
                                 <span>ID: {String(as.studentId).substring(0,6).toUpperCase()}</span>
                               </div>
                             </div>
                             <div className="space-y-6">
                               {as.questions.map((q, qidx) => (
                                 <div key={qidx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                   <p className="font-black text-blue-900 mb-1">Question {qidx+1}</p>
                                   <span className="whitespace-pre-wrap leading-relaxed font-medium">{q.text}</span>
                                 </div>
                               ))}
                             </div>
                          </div>
                       </div>
                    ))}
                  </div>
               )}
            </div>
          )}

          {/* TAB 5: THE ULTIMATE SMART GRADER */}
          {activeTab === 'grader' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-slate-900 p-8 rounded-3xl text-white flex flex-col md:flex-row items-end gap-6 shadow-2xl relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                 <div className="flex-1 w-full relative z-10">
                    <label className="text-xs font-black text-blue-300 uppercase mb-2 block tracking-wider">1. Link Course</label>
                    <select value={graderCourseId} onChange={e=>setGraderCourseId(e.target.value)} className="w-full p-3 bg-slate-800 rounded-xl text-sm border border-slate-700 outline-none focus:border-blue-400 font-bold">
                      {classroomCourses.length === 0 ? <option>No courses found</option> : classroomCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={fetchClassroomAssignmentsForGrader} className="mt-3 w-full bg-blue-600 text-white font-black py-2 rounded-xl text-xs hover:bg-blue-500 active:scale-95 transition-all shadow-lg uppercase tracking-wider">Load Coursework</button>
                 </div>
                 <div className="flex-1 w-full relative z-10">
                    <label className="text-xs font-black text-blue-300 uppercase mb-2 block tracking-wider">2. Pick Assignment</label>
                    <select value={graderSelectedAssignmentId} onChange={e=>setGraderSelectedAssignmentId(e.target.value)} className="w-full p-3 bg-slate-800 rounded-xl text-sm border border-slate-700 outline-none focus:border-blue-400 font-bold">
                      {graderAssignmentsList.length === 0 ? <option>Awaiting load...</option> : graderAssignmentsList.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
                    </select>
                    <button onClick={fetchSubmissionsForGrader} disabled={!graderSelectedAssignmentId} className="mt-3 w-full bg-blue-600 text-white font-black py-2 rounded-xl text-xs hover:bg-blue-500 active:scale-95 transition-all shadow-lg uppercase tracking-wider disabled:opacity-50">Fetch Submissions</button>
                 </div>
                 <div className="flex-1 w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl h-48 overflow-y-auto shadow-inner relative z-10">
                    <label className="text-xs font-black text-blue-300 uppercase mb-3 block tracking-wider sticky top-0 bg-slate-800 pt-1 pb-2 border-b border-slate-700">3. Grading Queue ({graderSubmissionsList.length})</label>
                    <div className="space-y-2 mt-2">
                      {graderSubmissionsList.length === 0 && <p className="text-xs text-slate-500 italic">Queue is empty.</p>}
                      {graderSubmissionsList.map(s => (
                        <div key={s.id} onClick={()=>loadStudentSubmissionFile(s)} className="text-xs font-bold p-2.5 hover:bg-blue-600 bg-slate-700/50 rounded-xl cursor-pointer flex justify-between items-center transition-colors border border-slate-600 hover:border-blue-500">
                          <span className="truncate pr-2">{classroomStudents.find(it=>it.id===s.userId)?.name || `Student ID: ${s.userId}`}</span>
                          <Eye className="w-4 h-4 flex-shrink-0 text-blue-300"/>
                        </div>
                      ))}
                    </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[750px]">
                 <div className="lg:col-span-3 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col">
                    <h3 className="font-black uppercase tracking-widest text-sm mb-4 border-b pb-3 text-gray-800"><Cpu className="w-4 h-4 inline mr-2 text-purple-500"/> AI Engine</h3>
                    <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                      <div>
                        <label className="text-[10px] font-black uppercase text-purple-600 block mb-2 tracking-wider">Active Model Redundancy</label>
                        <select value={selectedModel} onChange={e=>setSelectedModel(e.target.value)} className="w-full p-3 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-purple-500">
                          {availableModels.length === 0 ? <option>Go to Bank tab to setup API.</option> : availableModels.map(m=><option key={m.name} value={m.name.replace('models/','')}>{m.displayName}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 block mb-2 tracking-wider">Base Question / Rubric</label>
                        <textarea value={gradingQuestion} onChange={e=>setGradingQuestion(e.target.value)} placeholder="What question are you grading?" className="w-full h-32 p-4 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 ring-blue-500 resize-none shadow-inner leading-relaxed font-medium text-gray-700" />
                      </div>
                      <div className="p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center shadow-sm">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest">Offline Sandbox</p>
                        <label className="cursor-pointer font-black text-xs text-gray-600 bg-white border border-gray-200 py-3 px-4 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"><Upload className="w-4 h-4 mr-2"/> Upload Local File<input type="file" multiple onChange={handleGraderFileUpload} className="hidden"/></label>
                        {studentFileUrls.length > 0 && !activeSubmission && <p className="text-[10px] text-green-600 font-bold mt-2">Local files loaded.</p>}
                      </div>
                    </div>
                    <button onClick={handleGradeAnswer} disabled={isGrading || !selectedModel} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all mt-4 disabled:opacity-50 flex justify-center items-center tracking-widest uppercase">
                      {isGrading ? <><RefreshCw className="animate-spin mr-3"/> PROCESSING...</> : <><Sparkles className="w-5 h-5 mr-3"/> DRAFT AI SCORE</>}
                    </button>
                 </div>

                 <div className="lg:col-span-5 bg-slate-100 rounded-3xl border border-slate-200 relative overflow-hidden flex flex-col shadow-inner">
                    <div className="bg-white p-4 border-b flex justify-between items-center px-6 shadow-sm z-10">
                       <span className="text-sm font-black flex items-center text-slate-800 uppercase tracking-widest"><Eye className="w-5 h-5 mr-2 text-blue-500"/> Gallery Viewer</span>
                       <span className="bg-blue-100 border border-blue-200 text-blue-800 px-4 py-1.5 rounded-full text-xs font-black uppercase truncate max-w-[200px]">{activeStudentName || "GUEST ACCOUNT"}</span>
                    </div>
                    {studentFileUrls.length > 1 && (
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-slate-900 shadow-2xl rounded-full p-2 px-6 space-x-6 border border-slate-700 z-20 transition-all hover:scale-105">
                        <button onClick={()=>setCurrentFileIndex(Math.max(0, currentFileIndex-1))} disabled={currentFileIndex===0} className="text-white hover:text-blue-400 disabled:opacity-20"><ChevronLeft className="w-6 h-6"/></button>
                        <span className="text-[10px] font-black uppercase text-blue-300 tracking-widest">FILE {currentFileIndex+1} OF {studentFileUrls.length}</span>
                        <button onClick={()=>setCurrentFileIndex(Math.min(studentFileUrls.length-1, currentFileIndex+1))} disabled={currentFileIndex===studentFileUrls.length-1} className="text-white hover:text-blue-400 disabled:opacity-20"><ChevronRight className="w-6 h-6"/></button>
                      </div>
                    )}
                    <div className="flex-1 flex items-center justify-center p-2 bg-slate-200 m-3 rounded-2xl overflow-hidden border border-slate-300 shadow-inner">
                       {studentFileUrls.length > 0 ? (
                         studentFileUrls[currentFileIndex].type === 'pdf' ? <iframe src={studentFileUrls[currentFileIndex].url} className="w-full h-full border-none bg-white rounded-xl shadow-md" /> : <img src={studentFileUrls[currentFileIndex].url} className="max-w-full max-h-full object-contain rounded-xl shadow-md bg-white" alt="Work"/>
                       ) : <div className="text-center text-slate-400 flex flex-col items-center"><div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm"><FileText className="w-10 h-10 text-slate-300"/></div><p className="text-xs font-black uppercase tracking-widest">Awaiting Document Load...</p></div>}
                    </div>
                 </div>

                 <div className="lg:col-span-4 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col">
                    <h3 className="font-black uppercase tracking-widest text-sm mb-4 border-b pb-3 text-gray-800 flex items-center"><Edit3 className="w-4 h-4 mr-2 text-blue-500"/> Professor Remarks</h3>
                    {gradingResult && !isGrading ? (
                      <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-3xl border border-blue-200 text-center shadow-sm">
                           <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-2">Final Score Adjustment</p>
                           <div className="flex justify-center items-baseline"><input type="number" value={gradingResult.score} onChange={e=>setGradingResult({...gradingResult, score: e.target.value})} className="bg-transparent text-7xl font-black text-blue-700 w-32 text-center border-b-4 border-blue-300 outline-none focus:border-blue-600 transition-colors" /> <span className="text-3xl font-black text-blue-300 ml-2">/10</span></div>
                        </div>
                        <div className="space-y-4">
                          <div className="p-5 bg-green-50 border border-green-200 rounded-2xl shadow-sm focus-within:ring-2 ring-green-400 transition-all"><p className="text-[10px] font-black uppercase mb-2 text-green-800 tracking-widest flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Appreciation</p><textarea value={gradingResult.appreciation} onChange={e=>setGradingResult({...gradingResult, appreciation: e.target.value})} className="w-full bg-transparent border-none p-0 focus:ring-0 resize-none font-medium text-green-900 text-sm leading-relaxed" rows="3"/></div>
                          <div className="p-5 bg-orange-50 border border-orange-200 rounded-2xl shadow-sm focus-within:ring-2 ring-orange-400 transition-all"><p className="text-[10px] font-black uppercase mb-2 text-orange-800 tracking-widest flex items-center"><Edit3 className="w-3 h-3 mr-1"/> Corrections</p><textarea value={gradingResult.correction} onChange={e=>setGradingResult({...gradingResult, correction: e.target.value})} className="w-full bg-transparent border-none p-0 focus:ring-0 resize-none font-medium text-orange-900 text-sm leading-relaxed" rows="3"/></div>
                          <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm focus-within:ring-2 ring-blue-400 transition-all"><p className="text-[10px] font-black uppercase mb-2 text-blue-800 tracking-widest flex items-center"><Sparkles className="w-3 h-3 mr-1"/> Encouragement</p><textarea value={gradingResult.encouragement} onChange={e=>setGradingResult({...gradingResult, encouragement: e.target.value})} className="w-full bg-transparent border-none p-0 focus:ring-0 resize-none font-medium text-blue-900 text-sm leading-relaxed" rows="2"/></div>
                        </div>
                        <div className="pt-5 border-t border-gray-100 grid gap-3 mt-auto">
                           <button onClick={handleSyncGradeToClassroom} className="w-full bg-green-600 text-white font-black py-4 rounded-2xl hover:bg-green-700 shadow-lg shadow-green-200 active:scale-95 transition-all flex justify-center items-center disabled:opacity-50 uppercase tracking-widest">{isSyncingGrade ? <RefreshCw className="animate-spin mr-3"/> : <Send className="w-5 h-5 mr-3"/>} SYNC SCORE TO GRADEBOOK</button>
                           <button onClick={copyFeedbackToClipboard} className="w-full bg-gray-100 text-gray-700 font-black py-3 rounded-2xl border border-gray-200 hover:bg-gray-200 active:scale-95 transition-all flex justify-center items-center uppercase tracking-widest"><Copy className="w-4 h-4 mr-2"/> COPY FULL REMARKS</button>
                        </div>
                      </div>
                    ) : <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-50 bg-gray-50 rounded-2xl border border-dashed border-gray-200 m-2"><Inbox className="w-16 h-16 mb-4 text-gray-300"/><p className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">Select a student from the queue<br/>to begin grading sequence</p></div>}
                 </div>
               </div>
            </div>
          )}

          {/* TAB 6: PUSH TO CLASSROOM EXPORT */}
          {activeTab === 'export' && (
             <div className="max-w-xl mx-auto text-center py-16 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="bg-white p-4 rounded-full shadow-xl inline-block"><img src="https://upload.wikimedia.org/wikipedia/commons/5/59/Google_Classroom_Logo.png" className="w-20 h-20 opacity-90" alt="Classroom" /></div>
                <h2 className="text-4xl font-black uppercase text-blue-900 tracking-tight">Push to Classroom</h2>
                <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-2xl space-y-6">
                   <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                     <label className="block text-center text-xs font-black uppercase text-blue-800 mb-3 tracking-widest">Select Target Classroom</label>
                     <select value={selectedCourseId} onChange={e=>setSelectedCourseId(e.target.value)} className="w-full p-4 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-gray-700 shadow-sm text-center">
                       {classroomCourses.length === 0 ? <option>Wait for courses to load...</option> : classroomCourses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                   </div>
                   
                   {exportStatus === 'exporting' ? (
                     <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 text-blue-600 font-black tracking-widest uppercase animate-pulse text-sm shadow-inner flex justify-center items-center"><RefreshCw className="animate-spin w-5 h-5 mr-3"/> {uploadProgress}</div>
                   ) : exportStatus === 'success' ? (
                     <div className="bg-green-600 text-white font-black uppercase tracking-widest p-6 rounded-2xl flex justify-center items-center shadow-lg"><CheckCircle className="w-6 h-6 mr-3"/> SUCCESS! DRAFTS CREATED.</div>
                   ) : (
                     <button onClick={handleExportToClassroom} className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-lg">UPLOAD & COMPILE DRAFTS</button>
                   )}
                   <p className="text-xs text-gray-400 font-medium bg-gray-50 p-4 rounded-xl border border-gray-100">
                     This command generates a personalized PDF for every student, pushes them to a secure folder in your Google Drive, and drafts Assignment posts in Classroom with all files attached.
                   </p>
                </div>
             </div>
          )}

        </main>
      </div>
    </div>
  );
}