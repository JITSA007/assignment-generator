import React, { useState, useEffect } from 'react';
import { 
  Upload, Plus, RefreshCw, Send, FileSpreadsheet, 
  Trash2, CheckCircle, Settings, Users, BookOpen, Download, Sparkles, Server, ClipboardCheck, FileImage, FileText, X, Printer, Book, BrainCircuit, Shield, GraduationCap, Building2, UserPlus, Inbox, Eye, Edit3, Copy, ChevronLeft, ChevronRight, Cpu
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// YOUR GOOGLE CLOUD CLIENT ID
const GOOGLE_CLIENT_ID = "949565343336-8etq9qoi1h1o7bskdm7ke497lf9kslf1.apps.googleusercontent.com";

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [googleAuthStatus, setGoogleAuthStatus] = useState('disconnected');
  const [accessToken, setAccessToken] = useState('');
  const [classroomCourses, setClassroomCourses] = useState([]);

  // App Navigation State
  const [activeTab, setActiveTab] = useState('bank');
  
  // App State - Bank & Assignments
  const [questions, setQuestions] = useState([]);
  const [numStudents, setNumStudents] = useState(10);
  const [assignmentConfig, setAssignmentConfig] = useState({ MCQ: 4, Short: 4, Long: 2 });
  const [assignments, setAssignments] = useState([]);
  
  // Roster State
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [rosterCourseId, setRosterCourseId] = useState('');

  // University Branding State
  const [universityName, setUniversityName] = useState('Jaipur National University');
  const [departmentName, setDepartmentName] = useState('Department of Computer Applications');
  const [teacherName, setTeacherName] = useState('Asst. Prof. Jitendra Prajapat');
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State - Manual Add
  const [newQuestionType, setNewQuestionType] = useState('MCQ');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

  // Form State - AI Generation (Shared with Grader)
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('Intermediate');
  
  // Smart AI Grader State
  const [graderCourseId, setGraderCourseId] = useState('');
  const [graderAssignmentsList, setGraderAssignmentsList] = useState([]);
  const [graderSelectedAssignmentId, setGraderSelectedAssignmentId] = useState('');
  const [graderSubmissionsList, setGraderSubmissionsList] = useState([]);
  const [isFetchingSubmissions, setIsFetchingSubmissions] = useState(false);
  
  const [activeSubmission, setActiveSubmission] = useState(null); 
  const [activeStudentName, setActiveStudentName] = useState('');
  const [gradingQuestion, setGradingQuestion] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  
  // MULTI-FILE STATE
  const [studentFileUrls, setStudentFileUrls] = useState([]); 
  const [studentFilesData, setStudentFilesData] = useState([]); 
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
  const [gradingResult, setGradingResult] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [isSyncingGrade, setIsSyncingGrade] = useState(false);

  // Export & Print State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [printingAssignmentId, setPrintingAssignmentId] = useState(null);

  // Dynamically load all required external libraries
  useEffect(() => {
    const xlsxScript = document.createElement('script');
    xlsxScript.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    xlsxScript.async = true;
    document.body.appendChild(xlsxScript);

    const pdfScript = document.createElement('script');
    pdfScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    pdfScript.async = true;
    pdfScript.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
    };
    document.body.appendChild(pdfScript);

    const html2pdfScript = document.createElement('script');
    html2pdfScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    html2pdfScript.async = true;
    document.body.appendChild(html2pdfScript);

    const googleScript = document.createElement('script');
    googleScript.src = "https://accounts.google.com/gsi/client";
    googleScript.async = true;
    googleScript.defer = true;
    document.body.appendChild(googleScript);

    return () => {
      document.body.removeChild(xlsxScript);
      document.body.removeChild(pdfScript);
      document.body.removeChild(html2pdfScript);
      document.body.removeChild(googleScript);
    };
  }, []);

  // --- AUTHENTICATION HANDLER ---
  const handleAppLogin = () => {
    if (!window.google) return alert("Google security script is still loading. Please try again in a few seconds.");
    
    setGoogleAuthStatus('connecting');

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/classroom.rosters.readonly https://www.googleapis.com/auth/drive.readonly',
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          setAccessToken(tokenResponse.access_token);
          setGoogleAuthStatus('connected');
          setIsAuthenticated(true);
          fetchClassroomCourses(tokenResponse.access_token);
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
      const response = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.courses && data.courses.length > 0) {
        setClassroomCourses(data.courses);
        setSelectedCourseId(data.courses[0].id);
        setRosterCourseId(data.courses[0].id);
        setGraderCourseId(data.courses[0].id);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  // --- EXPONENTIAL BACKOFF API CALL HELPER ---
  const generateWithRetry = async (model, contents) => {
    const delays = [1000, 2000, 4000, 8000, 16000]; // 1s, 2s, 4s, 8s, 16s
    let lastError;

    for (let i = 0; i < delays.length; i++) {
      try {
        return await model.generateContent(contents);
      } catch (error) {
        lastError = error;
        if (i === delays.length - 1) break;
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
    
    throw new Error(`Google AI Servers are currently overloaded. We tried 5 times but couldn't get through. Please try selecting a different model from the dropdown. (Error: ${lastError?.message})`);
  };

  // --- SMART GRADER HANDLERS ---
  const fetchClassroomAssignmentsForGrader = async () => {
    if (!graderCourseId) return;
    try {
      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${graderCourseId}/courseWork`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      if (data.courseWork && data.courseWork.length > 0) {
        setGraderAssignmentsList(data.courseWork);
        setGraderSelectedAssignmentId(data.courseWork[0].id);
        setGradingQuestion(data.courseWork[0].title + "\n\n" + (data.courseWork[0].description || ''));
      } else {
        setGraderAssignmentsList([]);
        alert("No assignments found in this course.");
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      alert("Failed to fetch assignments from Classroom.");
    }
  };

  const fetchSubmissionsForGrader = async () => {
    if (!graderCourseId || !graderSelectedAssignmentId) return alert("Select a course and assignment first.");
    setIsFetchingSubmissions(true);
    setGraderSubmissionsList([]);
    try {
      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${graderCourseId}/courseWork/${graderSelectedAssignmentId}/studentSubmissions`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      
      if (data.studentSubmissions && data.studentSubmissions.length > 0) {
        setGraderSubmissionsList(data.studentSubmissions);
      } else {
        alert("No student submissions found for this assignment yet.");
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      alert("Failed to fetch submissions.");
    } finally {
      setIsFetchingSubmissions(false);
    }
  };

  const loadStudentSubmissionFile = async (submission) => {
    let driveFiles = [];
    if (submission.assignmentSubmission && submission.assignmentSubmission.attachments) {
      driveFiles = submission.assignmentSubmission.attachments
        .filter(att => att.driveFile)
        .map(att => att.driveFile);
    }

    if (driveFiles.length === 0) {
      return alert("This student did not attach any Google Drive files (like a PDF or Image) to their submission.");
    }
    
    clearGraderFile();
    setActiveSubmission(submission); 
    
    const rosterMatch = classroomStudents.find(s => s.id === submission.userId);
    setActiveStudentName(rosterMatch ? rosterMatch.name : `Student ID: ${submission.userId}`);

    const loadedUrls = [];
    const loadedData = [];

    try {
      for (let i = 0; i < driveFiles.length; i++) {
        const driveFile = driveFiles[i];
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error(`Failed to download ${driveFile.title}.`);

        const blob = await response.blob();
        const fileUrl = URL.createObjectURL(blob);
        const mimeType = blob.type || 'application/pdf';
        
        loadedUrls.push({ url: fileUrl, type: mimeType.includes('pdf') ? 'pdf' : 'image', name: driveFile.title });

        if (mimeType.includes('pdf')) {
          if (window.pdfjsLib) {
            const pdf = await window.pdfjsLib.getDocument(new Uint8Array(await blob.arrayBuffer())).promise;
            let fullText = "";
            for (let p = 1; p <= pdf.numPages; p++) {
              const page = await pdf.getPage(p);
              const textContent = await page.getTextContent();
              fullText += textContent.items.map(item => item.str).join(' ') + "\n";
            }
            loadedData.push({ type: 'text', data: fullText });
          }
        } else if (mimeType.startsWith('image/')) {
          const reader = new FileReader();
          const base64Promise = new Promise(resolve => {
             reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          });
          reader.readAsDataURL(blob);
          const b64 = await base64Promise;
          loadedData.push({ type: 'image', inlineData: { data: b64, mimeType: mimeType } });
        }
      }

      setStudentFileUrls(loadedUrls);
      setStudentFilesData(loadedData);
      setCurrentFileIndex(0);

    } catch (error) {
      console.error(error);
      alert("Error downloading files: " + error.message);
    }
  };

  const handleGraderFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    clearGraderFile();
    setActiveStudentName('Manual Upload');
    
    const loadedUrls = [];
    const loadedData = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = URL.createObjectURL(file);
      loadedUrls.push({ url: fileUrl, type: file.type.includes('pdf') ? 'pdf' : 'image', name: file.name });

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const base64Promise = new Promise(resolve => {
           reader.onload = (evt) => resolve(evt.target.result.split(',')[1]);
        });
        reader.readAsDataURL(file);
        const b64 = await base64Promise;
        loadedData.push({ type: 'image', inlineData: { data: b64, mimeType: file.type } });
      } else if (file.type === 'application/pdf') {
        if (!window.pdfjsLib) continue;
        const reader = new FileReader();
        const textPromise = new Promise(resolve => {
          reader.onload = async (evt) => {
            try {
              const pdf = await window.pdfjsLib.getDocument(new Uint8Array(evt.target.result)).promise;
              let fullText = "";
              for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + "\n";
              }
              resolve(fullText);
            } catch (err) { resolve(""); }
          };
        });
        reader.readAsArrayBuffer(file);
        const text = await textPromise;
        loadedData.push({ type: 'text', data: text });
      }
    }

    setStudentFileUrls(loadedUrls);
    setStudentFilesData(loadedData);
    setCurrentFileIndex(0);
  };

  const clearGraderFile = () => { 
    studentFileUrls.forEach(f => URL.revokeObjectURL(f.url));
    setStudentFileUrls([]); 
    setStudentFilesData([]); 
    setActiveStudentName(''); 
    setActiveSubmission(null);
    setGradingResult(null);
    setCurrentFileIndex(0);
  };
  
  const handleGradeAnswer = async (e) => {
    e.preventDefault();
    if (!apiKey.trim() || !selectedModel || !gradingQuestion.trim()) return alert("Missing required fields (API Key, Model, or Prompt).");
    setIsGrading(true); setGradingResult(null);
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });
      
      let promptText = `You are a university professor grading a student's submission.\nQuestion/Assignment Description: "${gradingQuestion}"\nStudent's Answer (Text): "${studentAnswer || 'See attached file(s).'}"\n`;
      
      let combinedPdfText = "";
      const imageParts = [];

      studentFilesData.forEach(fileData => {
         if (fileData.type === 'text') combinedPdfText += fileData.data + "\n\n";
         if (fileData.type === 'image') imageParts.push({ inlineData: fileData.inlineData });
      });

      if (combinedPdfText) promptText += `Extracted PDF text from submission:\n"${combinedPdfText}"\n`;
      promptText += `Evaluate out of 10 points. Provide professional university-level "Sandwich Method" feedback. RETURN ONLY A JSON OBJECT: {"score": "8.5", "appreciation": "...", "correction": "...", "encouragement": "..."}`;
      
      let contents = [promptText, ...imageParts];
      
      const result = await generateWithRetry(model, contents);
      
      const rawText = result.response.text();
      const startIndex = rawText.indexOf('{');
      const endIndex = rawText.lastIndexOf('}');
      if (startIndex === -1 || endIndex === -1) throw new Error("AI failed to output a valid object. Please try again.");
      
      const cleanJsonString = rawText.substring(startIndex, endIndex + 1);
      setGradingResult(JSON.parse(cleanJsonString));
    } catch (error) {
      alert(`${error.message}`);
    } finally {
      setIsGrading(false);
    }
  };

  // --- SYNC GRADE TO CLASSROOM ---
  const handleSyncGradeToClassroom = async () => {
    if (!activeSubmission || !graderCourseId || !graderSelectedAssignmentId) {
      return alert("No active Classroom submission to sync. Are you grading a manual file upload?");
    }
    
    setIsSyncingGrade(true);
    try {
      const numericGrade = parseFloat(gradingResult.score);
      const body = { draftGrade: numericGrade }; 
      
      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${graderCourseId}/courseWork/${graderSelectedAssignmentId}/studentSubmissions/${activeSubmission.id}?updateMask=draftGrade`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Unknown API error.");
      }
      
      alert(`Success! Grade (${numericGrade}) saved as DRAFT in Google Classroom.`);
    } catch (err) {
      alert("Error syncing grade to Classroom: " + err.message + "\n\n(Hint: Make sure the assignment in Classroom actually has points assigned to it, and not set to 'Ungraded'.)");
    } finally {
      setIsSyncingGrade(false);
    }
  };

  const copyFeedbackToClipboard = () => {
    const text = `Score: ${gradingResult.score}/10\n\nAppreciation: ${gradingResult.appreciation}\n\nCorrection: ${gradingResult.correction}\n\nEncouragement: ${gradingResult.encouragement}`;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert("Feedback copied to clipboard! You can now paste this as a Private Comment in Google Classroom.");
    } catch (err) {
        alert("Failed to copy text.");
    }
    document.body.removeChild(textArea);
  };


  // --- ROSTER FETCHING HANDLER ---
  const handleFetchStudents = async () => {
    if (!rosterCourseId) return alert("Please select a course first.");
    setIsFetchingStudents(true);
    try {
      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${rosterCourseId}/students`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      
      if (data.students && data.students.length > 0) {
        const studentsList = data.students.map(s => ({
          id: s.userId,
          name: s.profile?.name?.fullName || 'Unknown Student',
          email: s.profile?.emailAddress || ''
        }));
        setClassroomStudents(studentsList);
        setNumStudents(studentsList.length);
        alert(`Successfully fetched ${studentsList.length} students! The assignment generator is now synced with your roster.`);
      } else {
        alert("No students found in this course.");
        setClassroomStudents([]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      alert(`Failed to fetch roster. Ensure you have students in this class. Error: ${error.message}`);
    } finally {
      setIsFetchingStudents(false);
    }
  };

  // --- ALL OTHER APP HANDLERS ---
  const handleFetchModels = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return alert("Please enter your API key first.");
    setIsLoadingModels(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!response.ok) throw new Error("Invalid API Key");
      const data = await response.json();
      const textModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
      setAvailableModels(textModels);
      if (textModels.length > 0) setSelectedModel(textModels[0].name.replace('models/', ''));
    } catch (error) {
      alert("Could not fetch models. Falling back to defaults.");
      setAvailableModels([
        { name: 'models/gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash (Latest)' },
        { name: 'models/gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro (Latest)' },
        { name: 'models/gemini-2.5-flash-latest', displayName: 'Gemini 2.5 Flash (Latest)' }
      ]);
      setSelectedModel('gemini-1.5-flash-latest');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleGenerateAIQuestions = async (e) => {
    e.preventDefault();
    if (!apiKey.trim() || !selectedModel || !sourceText.trim()) return alert("Missing API Key, Model, or Source Text.");
    setIsGeneratingAI(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });
      const prompt = `
        You are an expert university professor creating a question bank. Read the following text and generate EXACTLY ${aiQuestionCount} questions based on it.
        Target difficulty: ${aiDifficulty} (University level).
        CRITICAL: Follow Bloom's Taxonomy (Remember, Understand, Apply, Analyze, Evaluate, Create).
        Types needed: MCQ, Short, Long. For MCQs, provide A, B, C, D and the Correct answer.
        RETURN ONLY A VALID JSON ARRAY. Format exactly like this:
        [ { "type": "MCQ", "text": "Question? (Bloom's: Analyze)\\nA) .. | B) .. | C) .. | D) ..\\n(Correct: B)" } ]
        Text: "${sourceText}"
      `;
      
      const result = await generateWithRetry(model, prompt);
      const rawText = result.response.text();
      
      const startIndex = rawText.indexOf('[');
      const endIndex = rawText.lastIndexOf(']');
      
      if (startIndex === -1 || endIndex === -1) throw new Error("AI failed to output a valid list. Please try again.");
      
      const cleanJsonString = rawText.substring(startIndex, endIndex + 1);
      const aiQuestions = JSON.parse(cleanJsonString).map((q, i) => ({ id: `ai-${Date.now()}-${i}`, type: q.type, text: q.text }));
      setQuestions([...questions, ...aiQuestions]);
      setSourceText(''); 
      alert(`Successfully generated ${aiQuestionCount} university-level questions!`);
    } catch (error) {
      alert(`${error.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAddQuestionManually = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    let finalQuestionText = newQuestionText;
    if (newQuestionType === 'MCQ') {
      finalQuestionText = `${newQuestionText}\nA) ${mcqOptions[0]} | B) ${mcqOptions[1]} | C) ${mcqOptions[2]} | D) ${mcqOptions[3]}\n(Correct Answer: ${['A','B','C','D'][correctOptionIndex]})`;
    }
    setQuestions([...questions, { id: Date.now().toString(), type: newQuestionType, text: finalQuestionText }]);
    setNewQuestionText(''); setMcqOptions(['', '', '', '']); setCorrectOptionIndex(0);
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
          if (row.Type === 'MCQ' && row.Option1) text = `${text}\nA) ${row.Option1} | B) ${row.Option2} | C) ${row.Option3} | D) ${row.Option4}\n(Correct: ${row.CorrectOption})`;
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
    if (!window.XLSX) return alert("Excel library is still loading, please wait a second.");
    const sampleData = [
      { Type: "MCQ", Question: "What is the capital of France?", Option1: "London", Option2: "Berlin", Option3: "Paris", Option4: "Madrid", CorrectOption: "C" },
      { Type: "Short", Question: "Explain the process of photosynthesis in 3 sentences." },
      { Type: "Long", Question: "Discuss the impact of the Industrial Revolution on modern society." }
    ];
    const worksheet = window.XLSX.utils.json_to_sheet(sampleData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "QuestionBank");
    window.XLSX.writeFile(workbook, "Sample_Question_Bank_Template.xlsx");
  };

  const generateAssignments = () => {
    const mcq = questions.filter(q => q.type === 'MCQ');
    const short = questions.filter(q => q.type === 'Short');
    const long = questions.filter(q => q.type === 'Long');

    if (mcq.length < assignmentConfig.MCQ || short.length < assignmentConfig.Short || long.length < assignmentConfig.Long) {
      return alert("Not enough questions in bank to meet your configuration.");
    }

    const newAssignments = [];
    const loopCount = classroomStudents.length > 0 ? classroomStudents.length : numStudents;

    for (let i = 0; i < loopCount; i++) {
      const shuffle = (arr, num) => [...arr].sort(() => 0.5 - Math.random()).slice(0, num);
      
      let generatedStudentId = `Student_${i + 1}`;
      let generatedStudentName = "______________________";

      if (classroomStudents.length > 0) {
        const student = classroomStudents[i];
        generatedStudentName = student.name;
        generatedStudentId = student.email ? student.email.split('@')[0] : student.id.substring(0, 8);
      }

      newAssignments.push({
        studentId: generatedStudentId,
        studentName: generatedStudentName,
        questions: [...shuffle(mcq, assignmentConfig.MCQ), ...shuffle(short, assignmentConfig.Short), ...shuffle(long, assignmentConfig.Long)]
      });
    }
    setAssignments(newAssignments);
    setActiveTab('assignments');
  };

  const downloadAssignmentPDF = (studentId) => {
    setPrintingAssignmentId(studentId);
    setTimeout(() => { window.print(); setPrintingAssignmentId(null); }, 300);
  };

  const handleExportToClassroom = async () => {
    if (assignments.length === 0 || !selectedCourseId) return alert("Generate assignments and select a course first.");
    if (!window.html2pdf) return alert("PDF tool is loading.");
    
    setExportStatus('exporting');
    try {
      const materialsList = [];
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];
        setUploadProgress(`Creating PDF for ${assignment.studentName || assignment.studentId}...`);
        
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = `
          <div style="padding: 40px; font-family: sans-serif; color: #1f2937;">
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1f2937; padding-bottom: 16px;">
              <h1 style="font-size: 26px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px;">${universityName}</h1>
              <h2 style="font-size: 18px; font-weight: 600; color: #4b5563; margin-bottom: 16px;">${departmentName}</h2>
              <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;">
                <span style="font-weight: bold;">Course Instructor: ${teacherName}</span>
                <span style="font-weight: bold;">Date: ${assignmentDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #1f2937; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #d1d5db;">
                <span>Student Name: ${assignment.studentName}</span>
                <span>Roll No / ID: ${assignment.studentId}</span>
              </div>
            </div>
            <div>
              ${assignment.questions.map((q, idx) => `
                <div style="margin-bottom: 24px; font-size: 14px;">
                  <div style="display: flex;"><span style="font-weight: bold; margin-right: 8px;">${idx + 1}.</span><span style="line-height: 1.5">${q.text.replace(/\n/g, '<br/>')}</span></div>
                  ${q.type === 'Short' ? '<div style="margin-top: 8px; height: 64px; border-bottom: 1px dashed #d1d5db;"></div>' : ''}
                  ${q.type === 'Long' ? '<div style="margin-top: 8px; height: 128px; border-bottom: 1px dashed #d1d5db;"></div>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;

        const pdfBlob = await window.html2pdf().set({ margin: 0.5, filename: `${assignment.studentName}_Assignment.pdf`, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(tempContainer).output('blob');
        
        setUploadProgress(`Uploading ${assignment.studentName} to Drive...`);
        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=media', {
          method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/pdf' }, body: pdfBlob
        });
        const fileId = (await uploadRes.json()).id;

        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: 'PATCH', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `${assignment.studentName}_Assignment.pdf` })
        });
        materialsList.push({ driveFile: { driveFile: { id: fileId } } });
      }

      setUploadProgress(`Linking PDFs to Classroom...`);
      await fetch(`https://classroom.googleapis.com/v1/courses/${selectedCourseId}/courseWork`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "University Examination / Assignment", description: "Automated unique assignments. Please check attached PDFs.", state: "DRAFT", workType: "ASSIGNMENT", materials: materialsList })
      });

      setUploadProgress(''); setExportStatus('success'); setTimeout(() => setExportStatus(''), 5000);
    } catch (error) {
      alert(`Error exporting: ${error.message}`); setExportStatus(''); setUploadProgress('');
    }
  };


  // ==========================================
  // RENDER 1: THE LANDING PAGE
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white flex flex-col">
        <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center space-x-2 font-black text-xl tracking-wider">
            <BrainCircuit className="w-8 h-8 text-blue-400" />
            <span>Edu<span className="text-blue-400">Gen</span></span>
          </div>
          <div>
            <button onClick={handleAppLogin} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold py-2 px-6 rounded-full transition-all flex items-center shadow-lg hover:shadow-blue-500/20">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" className="w-4 h-4 mr-3" />
              Teacher Login
            </button>
          </div>
        </nav>

        <main className="flex-grow flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto px-6 py-12 gap-16 w-full">
          <div className="lg:w-1/2 space-y-8">
            <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full text-sm font-semibold tracking-wide uppercase">
              <Shield className="w-4 h-4" /> <span>Plagiarism-Proof Assignments</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black leading-tight">
              Turn One Syllabus into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">100 Unique Exams.</span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              Powered by Google Gemini. Instantly generate university-level question banks, randomize assignments for every student, and auto-grade responses with AI.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button onClick={handleAppLogin} className="bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold py-4 px-8 rounded-full transition-all shadow-lg shadow-blue-600/30 flex justify-center items-center group">
                {googleAuthStatus === 'connecting' ? <><RefreshCw className="w-6 h-6 mr-3 animate-spin" /> Authenticating...</> : <>Access the Workspace <Send className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </div>
          </div>

          <div className="lg:w-5/12 w-full max-w-md">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-1 mb-6 shadow-xl">
                  <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden"><GraduationCap className="w-16 h-16 text-blue-400" /></div>
                </div>
                <h3 className="text-3xl font-black mb-1">Jitendra Prajapat</h3>
                <p className="text-blue-400 font-semibold mb-4 text-lg">"Professor who Refuses to be Boring"</p>
                <div className="w-16 h-1 bg-slate-700 rounded-full mb-6"></div>
                <p className="text-slate-300 mb-6 leading-relaxed">
                  Assistant Professor @ JNU. <br/> AI Researcher (TB Diagnosis) & Cybersecurity Expert. Bridging the gap between Academia, Industry, and the Soil.
                </p>
                <div className="flex flex-wrap justify-center gap-3 w-full">
                  <a href="https://linkedin.com/in/jitsa00" target="_blank" rel="noreferrer" className="flex items-center text-sm bg-slate-700 hover:bg-blue-600 transition-colors px-4 py-2 rounded-lg font-medium text-white">LinkedIn Profile</a>
                  <a href="mailto:jitsahere@gmail.com" className="flex items-center text-sm bg-slate-700 hover:bg-slate-600 transition-colors px-4 py-2 rounded-lg font-medium text-white">Contact Developer</a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: THE MAIN APPLICATION
  // ==========================================
  const renderTabs = () => (
    <div className="flex flex-wrap md:flex-nowrap space-x-1 bg-blue-900/10 p-1 rounded-lg mb-6 print:hidden">
      <button onClick={() => setActiveTab('bank')} className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'bank' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}>
        <BookOpen className="w-4 h-4 mr-1 md:mr-2" /> <span className="hidden md:inline">Question</span> Bank
      </button>
      <button onClick={() => setActiveTab('generate')} className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'generate' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}>
        <Settings className="w-4 h-4 mr-1 md:mr-2" /> Generate
      </button>
      <button onClick={() => setActiveTab('assignments')} className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'assignments' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}>
        <Users className="w-4 h-4 mr-1 md:mr-2" /> Assignments
      </button>
      <button onClick={() => setActiveTab('grader')} className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'grader' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}>
        <ClipboardCheck className="w-4 h-4 mr-1 md:mr-2" /> AI Grader
      </button>
      <button onClick={() => setActiveTab('export')} className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'export' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}>
        <Send className="w-4 h-4 mr-1 md:mr-2" /> <span className="hidden md:inline">Google</span> Classroom
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 text-gray-800 font-sans p-6 ${printingAssignmentId ? 'print:bg-white print:p-0' : ''}`}>
      <div className="max-w-6xl mx-auto">
        <div className="print:hidden">
          <header className="mb-8 text-center relative">
            <button onClick={() => setIsAuthenticated(false)} className="absolute left-0 top-0 text-sm text-gray-500 hover:text-red-500 bg-gray-200 px-3 py-1 rounded shadow-sm">
              &larr; Logout
            </button>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">Automated Assignment Generator</h1>
            <p className="text-gray-600">Create randomized, anti-plagiarism unit assignments</p>
          </header>
          {renderTabs()}
        </div>

        <main className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${printingAssignmentId ? 'print:border-none print:shadow-none print:p-0' : ''}`}>
          
          {/* TAB 1: QUESTION BANK */}
          {activeTab === 'bank' && !printingAssignmentId && (
            <div className="space-y-8">
              <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
                <h3 className="text-lg font-bold text-purple-900 mb-2 flex items-center">
                  <BrainCircuit className="w-5 h-5 mr-2 text-purple-600"/> Setup AI & Generate Questions
                </h3>
                <p className="text-sm text-purple-700 mb-4">Paste your API key here first. This key will power both the Question Generator and the AI Grader.</p>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="md:w-1/2">
                      <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider">Gemini API Key</label>
                      <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste key here..." className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white" />
                    </div>
                    <button onClick={handleFetchModels} disabled={isLoadingModels} className="bg-purple-200 hover:bg-purple-300 text-purple-800 font-bold py-2 px-4 rounded transition-colors flex items-center h-[38px] disabled:opacity-50">
                      {isLoadingModels ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Server className="w-4 h-4 mr-2" />} Fetch Models
                    </button>
                  </div>

                  {availableModels.length > 0 && (
                    <form onSubmit={handleGenerateAIQuestions} className="space-y-4 pt-4 border-t border-purple-200">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="md:w-1/3">
                          <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider">Select AI Model</label>
                          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white" required>
                            {availableModels.map(model => <option key={model.name} value={model.name.replace('models/', '')}>{model.displayName}</option>)}
                          </select>
                        </div>
                        <div className="md:w-1/3">
                          <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider">Number of Questions</label>
                          <input type="number" min="1" max="20" value={aiQuestionCount} onChange={(e) => setAiQuestionCount(e.target.value)} className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white" required />
                        </div>
                        <div className="md:w-1/3">
                          <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider">Difficulty Level</label>
                          <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white">
                            <option value="Beginner">Beginner (First Year)</option>
                            <option value="Intermediate">Intermediate (Sophomore)</option>
                            <option value="Advanced">Advanced (Senior/Masters)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider">Syllabus / Source Text</label>
                        <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste your college syllabus topic here..." rows="3" className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white" required />
                      </div>
                      
                      <div className="flex justify-end">
                        <button type="submit" disabled={isGeneratingAI} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center disabled:opacity-50 shadow-sm">
                          {isGeneratingAI ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing Syllabus...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate College Questions</>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Plus className="w-5 h-5 mr-2 text-blue-600"/> Add Manually</h3>
                  <form onSubmit={handleAddQuestionManually} className="space-y-4">
                    <div>
                      <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                        <option value="MCQ">Multiple Choice (MCQ)</option>
                        <option value="Short">Short Answer</option>
                        <option value="Long">Long Answer / Essay</option>
                      </select>
                    </div>
                    <div>
                      <textarea value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} required rows={newQuestionType === 'MCQ' ? "2" : "3"} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Type your question here..." />
                    </div>
                    {newQuestionType === 'MCQ' && (
                      <div className="bg-white p-3 rounded border border-blue-200 space-y-3">
                        {['A', 'B', 'C', 'D'].map((label, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input type="radio" name="correctOption" checked={correctOptionIndex === index} onChange={() => setCorrectOptionIndex(index)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                            <span className="font-bold text-gray-700 w-4">{label})</span>
                            <input type="text" required value={mcqOptions[index]} onChange={(e) => updateMcqOption(index, e.target.value)} placeholder={`Option ${label}`} className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none text-sm" />
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors shadow-sm">Add Question</button>
                  </form>
                </div>

                <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 flex flex-col justify-center items-center text-center">
                  <FileSpreadsheet className="w-12 h-12 text-green-600 mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Upload Excel/CSV</h3>
                  <div className="flex flex-col space-y-3 w-full px-4">
                    <label className="cursor-pointer w-full justify-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded transition-colors inline-flex items-center shadow-sm">
                      <Upload className="w-4 h-4 mr-2" /> Browse Files
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button onClick={downloadSampleExcel} className="text-green-700 hover:text-green-800 text-sm font-medium flex items-center justify-center py-2 hover:bg-green-100 rounded transition-colors">
                      <Download className="w-4 h-4 mr-1" /> Download Sample Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERATE ASSIGNMENTS */}
          {activeTab === 'generate' && !printingAssignmentId && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Assignment Configuration</h2>
                <p className="text-gray-600">Customize your official university header and question mix.</p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center border-b border-blue-200 pb-2">
                  <UserPlus className="w-4 h-4 mr-2" /> Google Classroom Roster Sync
                </h3>
                {classroomCourses.length > 0 ? (
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="md:w-2/3">
                      <label className="block text-xs font-bold text-blue-700 mb-1 uppercase">Select Course to Sync</label>
                      <select value={rosterCourseId} onChange={(e) => setRosterCourseId(e.target.value)} className="w-full p-2 border border-blue-300 rounded text-sm outline-none focus:border-blue-500 bg-white">
                        {classroomCourses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                      </select>
                    </div>
                    <button onClick={handleFetchStudents} disabled={isFetchingStudents} className="w-full md:w-1/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center h-[38px] disabled:opacity-50">
                      {isFetchingStudents ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Fetch Students'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-blue-600 italic">Connect your Google account on the landing page to fetch your real classroom roster.</p>
                )}
                {classroomStudents.length > 0 && (
                  <div className="mt-4 p-3 bg-white border border-blue-100 rounded text-sm text-green-700 font-medium flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" /> Synced {classroomStudents.length} students.
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center border-b pb-2">
                  <Building2 className="w-4 h-4 mr-2" /> Official University Branding
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">University / College Name</label>
                    <input type="text" value={universityName} onChange={(e) => setUniversityName(e.target.value)} className="w-full p-2 border rounded text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Department Name</label>
                    <input type="text" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} className="w-full p-2 border rounded text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Teacher Name</label>
                    <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} className="w-full p-2 border rounded text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Date</label>
                    <input type="date" value={assignmentDate} onChange={(e) => setAssignmentDate(e.target.value)} className="w-full p-2 border rounded text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <button onClick={generateAssignments} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center text-lg">
                <RefreshCw className="w-5 h-5 mr-2" /> Generate Unique Exam Papers
              </button>
            </div>
          )}

          {/* TAB 3: VIEW ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div>
              {assignments.length === 0 && !printingAssignmentId ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-600">No Assignments Generated</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-0">
                  {assignments.map((assignment, idx) => (
                    <div key={idx} className={`flex flex-col border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden ${printingAssignmentId && printingAssignmentId !== assignment.studentId ? 'hidden' : ''} ${printingAssignmentId === assignment.studentId ? 'print:border-none print:shadow-none' : ''}`}>
                      <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center print:hidden">
                        <span className="font-bold text-gray-700 text-sm">Paper: {assignment.studentName !== "______________________" ? assignment.studentName : assignment.studentId}</span>
                        <button onClick={() => downloadAssignmentPDF(assignment.studentId)} className="flex items-center text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-1 px-3 rounded shadow-sm">
                          <Printer className="w-4 h-4 mr-1" /> Print / Save PDF
                        </button>
                      </div>

                      <div id={`assignment-card-${idx}`} className={`p-8 bg-white flex-1 overflow-y-auto max-h-[600px] ${printingAssignmentId === assignment.studentId ? 'print:max-h-none print:overflow-visible print:p-0' : ''}`}>
                        <div className="text-center mb-6 border-b-2 border-gray-800 pb-6">
                          <h1 className="text-2xl font-black uppercase tracking-wider mb-1 text-gray-900">{universityName}</h1>
                          <h2 className="text-lg font-bold text-gray-600 mb-4">{departmentName}</h2>
                          <div className="flex justify-between text-sm font-semibold text-gray-600 mb-2">
                            <span>Course Instructor: {teacherName}</span>
                            <span>Date: {assignmentDate}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-gray-800 mt-6 pt-4 border-t border-dashed border-gray-300">
                            <span>Student Name: {assignment.studentName}</span>
                            <span>Roll No / ID: {assignment.studentId}</span>
                          </div>
                        </div>

                        <div className="space-y-6 text-sm">
                          {assignment.questions.map((q, qIdx) => (
                            <div key={qIdx} className="text-gray-800 print:break-inside-avoid">
                              <div className="flex items-start"><span className="font-bold mr-2">{qIdx + 1}.</span><span className="whitespace-pre-line leading-relaxed">{q.text}</span></div>
                              {q.type === 'Short' && <div className="mt-2 h-16 border-b border-dashed border-gray-300"></div>}
                              {q.type === 'Long' && <div className="mt-2 h-32 border-b border-dashed border-gray-300"></div>}
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

          {/* TAB 4: ULTIMATE AI GRADER (WITH MODEL SELECTOR) */}
          {activeTab === 'grader' && !printingAssignmentId && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* SMART GOOGLE CLASSROOM GRADER HEADER */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                <h3 className="text-lg font-bold text-blue-900 flex items-center mb-4"><Inbox className="w-5 h-5 mr-2"/> Google Classroom Import</h3>
                
                {classroomCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Course Selection */}
                    <div>
                      <label className="block text-xs font-bold text-blue-800 mb-1 uppercase tracking-wider">1. Select Course</label>
                      <select 
                        value={graderCourseId} 
                        onChange={(e) => {
                          setGraderCourseId(e.target.value);
                          setGraderAssignmentsList([]);
                          setGraderSubmissionsList([]);
                        }} 
                        className="w-full p-2 border border-blue-300 rounded bg-white text-sm"
                      >
                        {classroomCourses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                      </select>
                      <button onClick={fetchClassroomAssignmentsForGrader} className="w-full mt-2 bg-blue-200 hover:bg-blue-300 text-blue-800 font-bold py-1.5 px-3 rounded text-sm transition-colors">
                        Fetch Assignments
                      </button>
                    </div>

                    {/* Assignment Selection */}
                    <div>
                      <label className="block text-xs font-bold text-blue-800 mb-1 uppercase tracking-wider">2. Select Assignment</label>
                      <select 
                        value={graderSelectedAssignmentId} 
                        onChange={(e) => {
                          setGraderSelectedAssignmentId(e.target.value);
                          const selected = graderAssignmentsList.find(a => a.id === e.target.value);
                          if(selected) setGradingQuestion(selected.title + "\n" + (selected.description || ''));
                        }} 
                        className="w-full p-2 border border-blue-300 rounded bg-white text-sm"
                        disabled={graderAssignmentsList.length === 0}
                      >
                        {graderAssignmentsList.length === 0 && <option>No assignments fetched...</option>}
                        {graderAssignmentsList.map(assignment => <option key={assignment.id} value={assignment.id}>{assignment.title}</option>)}
                      </select>
                      <button onClick={fetchSubmissionsForGrader} disabled={!graderSelectedAssignmentId || isFetchingSubmissions} className="w-full mt-2 bg-blue-200 hover:bg-blue-300 text-blue-800 font-bold py-1.5 px-3 rounded text-sm transition-colors disabled:opacity-50">
                        {isFetchingSubmissions ? 'Loading...' : 'Fetch Student Submissions'}
                      </button>
                    </div>

                    {/* Submissions List */}
                    <div>
                      <label className="block text-xs font-bold text-blue-800 mb-1 uppercase tracking-wider">3. Student Submission Queue</label>
                      <div className="bg-white border border-blue-300 rounded h-[76px] overflow-y-auto">
                        {graderSubmissionsList.length === 0 ? (
                          <p className="text-xs text-gray-400 p-2 italic">Queue empty.</p>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {graderSubmissionsList.map(sub => (
                              <li key={sub.id} className="p-2 hover:bg-blue-50 text-sm cursor-pointer flex justify-between items-center group" onClick={() => loadStudentSubmissionFile(sub)}>
                                <span className="font-medium text-gray-700">Student ID: {sub.userId}</span>
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">Load Files &rarr;</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-600">Please sign in with Google on the landing page to use this feature.</p>
                )}
              </div>

              {/* THREE COLUMN GRADING WORKSPACE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Col: The Assignment Prompt, Controls, & MODEL SELECTOR */}
                <div className="col-span-1 space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-1">The Question / Assignment Prompt</label>
                    <textarea value={gradingQuestion} onChange={(e) => setGradingQuestion(e.target.value)} required rows="4" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    
                    {/* NEW: Model Selector in the Grader tab! */}
                    <div className="mt-4 pt-4 border-t">
                      <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider flex items-center">
                        <Cpu className="w-3 h-3 mr-1" /> Active Grading AI Model
                      </label>
                      <select 
                        value={selectedModel} 
                        onChange={(e) => setSelectedModel(e.target.value)} 
                        className="w-full p-2 border border-purple-200 rounded text-sm bg-purple-50 outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={availableModels.length === 0}
                      >
                        {availableModels.length === 0 ? <option>Loading models...</option> : availableModels.map(model => <option key={model.name} value={model.name.replace('models/', '')}>{model.displayName}</option>)}
                      </select>
                      {availableModels.length === 0 && <p className="text-[10px] text-red-500 mt-1">Hint: Fetch models in the Question Bank tab first.</p>}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Manual Submission <span className="text-xs font-normal text-gray-400">(If not using Classroom)</span></label>
                      <textarea value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} placeholder="Type or paste student text answer..." rows="3" className="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                      
                      <label className="w-full cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded border flex items-center justify-center transition-colors">
                        <Upload className="w-4 h-4 mr-2 text-gray-500" /> Manual File Upload
                        <input type="file" accept=".pdf, image/*" multiple onChange={handleGraderFileUpload} className="hidden" />
                      </label>
                    </div>

                    <button onClick={handleGradeAnswer} disabled={isGrading || !apiKey || !selectedModel} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg mt-6 disabled:opacity-50 flex justify-center items-center">
                      {isGrading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin"/> Evaluating...</> : <><Sparkles className="w-4 h-4 mr-2"/> Draft AI Grade</>}
                    </button>
                  </div>
                </div>

                {/* Middle Col: The Document Previewer with Multi-File Slideshow */}
                <div className="col-span-1 bg-gray-100 rounded-xl border border-gray-200 p-2 h-[600px] flex flex-col relative overflow-hidden">
                  <div className="bg-white border-b px-3 py-2 flex items-center justify-between rounded-t-lg shadow-sm z-10">
                    <span className="text-sm font-bold text-gray-700 flex items-center"><Eye className="w-4 h-4 mr-2 text-blue-500"/> Document Preview</span>
                    {activeStudentName && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium truncate max-w-[120px]">{activeStudentName}</span>}
                  </div>
                  
                  {studentFileUrls.length > 1 && (
                    <div className="bg-gray-200 px-3 py-1.5 flex justify-between items-center text-xs font-bold border-b border-gray-300 z-10">
                      <button 
                        onClick={() => setCurrentFileIndex(Math.max(0, currentFileIndex - 1))} 
                        disabled={currentFileIndex === 0}
                        className="bg-white border px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center"
                      >
                        <ChevronLeft className="w-3 h-3 mr-1" /> Prev File
                      </button>
                      <span className="text-gray-600">File {currentFileIndex + 1} of {studentFileUrls.length}</span>
                      <button 
                        onClick={() => setCurrentFileIndex(Math.min(studentFileUrls.length - 1, currentFileIndex + 1))} 
                        disabled={currentFileIndex === studentFileUrls.length - 1}
                        className="bg-white border px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center"
                      >
                        Next File <ChevronRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex-1 bg-white rounded-b-lg border overflow-hidden flex items-center justify-center">
                    {studentFileUrls.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">No files loaded.</p>
                    ) : studentFileUrls[currentFileIndex].type === 'pdf' ? (
                      <iframe src={studentFileUrls[currentFileIndex].url} className="w-full h-full" title="Student PDF" />
                    ) : (
                      <img src={studentFileUrls[currentFileIndex].url} className="max-w-full max-h-full object-contain" alt="Student Submission" />
                    )}
                  </div>
                </div>

                {/* Right Col: The Editable Feedback & Sync */}
                <div className="col-span-1 bg-white p-5 rounded-xl border border-blue-200 shadow-sm flex flex-col h-[600px]">
                  <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2 flex items-center"><Edit3 className="w-4 h-4 mr-2 text-blue-500"/> Editable Feedback</h3>
                  
                  {!gradingResult && !isGrading && <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><ClipboardCheck className="w-12 h-12 mb-2 opacity-50" /><p className="text-sm text-center">Run AI to generate a draft,<br/>or type your own feedback.</p></div>}
                  {isGrading && <div className="flex-1 flex flex-col items-center justify-center text-blue-600"><RefreshCw className="w-8 h-8 animate-spin mb-4" /><p className="font-medium animate-pulse text-center px-4 italic">AI is processing all submitted files... this may take extra time if several images were attached.</p></div>}
                  
                  {gradingResult && !isGrading && (
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center flex flex-col items-center">
                        <p className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-2">Final Score (Edit if needed)</p>
                        <div className="flex items-center justify-center">
                          <input 
                            type="number" 
                            value={gradingResult.score} 
                            onChange={(e) => setGradingResult({...gradingResult, score: e.target.value})}
                            className="text-4xl font-black text-blue-600 w-24 text-center bg-transparent border-b-2 border-blue-300 focus:border-blue-600 outline-none" 
                          />
                          <span className="text-xl text-blue-400 ml-1">/10</span>
                        </div>
                      </div>

                      <div className="bg-green-50 p-3 rounded-lg border border-green-200 focus-within:ring-2 ring-green-400 transition-shadow">
                        <p className="text-xs font-bold text-green-800 uppercase mb-1">1. Appreciation</p>
                        <textarea 
                          value={gradingResult.appreciation} 
                          onChange={(e) => setGradingResult({...gradingResult, appreciation: e.target.value})}
                          className="w-full text-sm text-green-900 bg-transparent border-none focus:ring-0 resize-none p-0" 
                          rows="3"
                        />
                      </div>
                      
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 focus-within:ring-2 ring-orange-400 transition-shadow">
                        <p className="text-xs font-bold text-orange-800 uppercase mb-1">2. Correction</p>
                        <textarea 
                          value={gradingResult.correction} 
                          onChange={(e) => setGradingResult({...gradingResult, correction: e.target.value})}
                          className="w-full text-sm text-orange-900 bg-transparent border-none focus:ring-0 resize-none p-0" 
                          rows="3"
                        />
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 focus-within:ring-2 ring-blue-400 transition-shadow">
                        <p className="text-xs font-bold text-blue-800 uppercase mb-1">3. Encouragement</p>
                        <textarea 
                          value={gradingResult.encouragement} 
                          onChange={(e) => setGradingResult({...gradingResult, encouragement: e.target.value})}
                          className="w-full text-sm text-blue-900 bg-transparent border-none focus:ring-0 resize-none p-0" 
                          rows="2"
                        />
                      </div>
                    </div>
                  )}

                  {gradingResult && !isGrading && (
                    <div className="pt-4 mt-auto border-t space-y-2">
                      <button 
                        onClick={handleSyncGradeToClassroom}
                        disabled={isSyncingGrade || !activeSubmission}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded flex justify-center items-center disabled:opacity-50"
                      >
                        {isSyncingGrade ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <Send className="w-4 h-4 mr-2"/>}
                        {activeSubmission ? "Sync Grade to Classroom" : "Cannot Sync (Manual File)"}
                      </button>
                      <button 
                        onClick={copyFeedbackToClipboard}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded flex justify-center items-center border border-gray-300"
                      >
                        <Copy className="w-4 h-4 mr-2"/> Copy Feedback to Clipboard
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: GOOGLE CLASSROOM EXPORT */}
          {activeTab === 'export' && !printingAssignmentId && (
            <div className="max-w-lg mx-auto text-center py-8">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/59/Google_Classroom_Logo.png" alt="Google Classroom" className="w-20 h-20 mx-auto mb-6 opacity-90" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Export to Google Classroom</h2>
              
              <div className="space-y-6">
                <div className="bg-green-50 text-green-800 p-3 rounded border border-green-200 inline-flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" /> Account Connected Successfully
                </div>
                
                <div className="bg-white border rounded-lg p-6 text-left shadow-sm">
                  <h4 className="font-bold mb-4 border-b pb-2">Create Assignment Draft</h4>
                  {classroomCourses.length > 0 ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select your Classroom Course:</label>
                      <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full p-2 border bg-white rounded">
                        {classroomCourses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <p className="text-red-500 mb-4">No active courses found.</p>
                  )}

                  {exportStatus === 'exporting' ? (
                    <div className="w-full bg-blue-50 text-blue-800 py-3 rounded text-center border">{uploadProgress}</div>
                  ) : exportStatus === 'success' ? (
                    <div className="w-full bg-green-600 text-white py-3 rounded text-center">Draft Created with PDFs!</div>
                  ) : (
                    <button onClick={handleExportToClassroom} disabled={classroomCourses.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded disabled:opacity-50">
                      Upload & Create Assignment
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}