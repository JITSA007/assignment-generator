import React, { useState, useEffect } from 'react';
import { 
  Upload, Plus, RefreshCw, Send, FileSpreadsheet, 
  Trash2, CheckCircle, Settings, Users, BookOpen, Download, Sparkles, Server, ClipboardCheck, FileImage, FileText, X
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';

// Point the PDF tool to its required background worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function App() {
  const [activeTab, setActiveTab] = useState('bank');
  
  // App State
  const [questions, setQuestions] = useState([]);
  const [numStudents, setNumStudents] = useState(10);
  const [assignmentConfig, setAssignmentConfig] = useState({ MCQ: 4, Short: 4, Long: 2 });
  const [assignments, setAssignments] = useState([]);
  
  // Form State - Manual Add
  const [newQuestionType, setNewQuestionType] = useState('MCQ');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

  // Form State - AI Generation
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Form State - AI Grader
  const [gradingQuestion, setGradingQuestion] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [studentFile, setStudentFile] = useState(null);
  const [studentFileData, setStudentFileData] = useState(null);
  const [studentFileType, setStudentFileType] = useState(null);
  const [gradingResult, setGradingResult] = useState(null);
  const [isGrading, setIsGrading] = useState(false);

  // Google Classroom Simulation State
  const [googleAuthStatus, setGoogleAuthStatus] = useState('disconnected');
  const [exportStatus, setExportStatus] = useState('');

  // Dynamically load the SheetJS (xlsx) library for reading/writing Excel files
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // --- Handlers for AI Models & Generation ---

  const handleFetchModels = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return alert("Please enter your API key first.");
    
    setIsLoadingModels(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      if (!response.ok) {
        let errMsg = "Invalid API Key or Google server issue.";
        try {
          const errData = await response.json();
          if (errData.error && errData.error.message) {
            errMsg = errData.error.message;
          }
        } catch (parseErr) {}
        throw new Error(errMsg);
      }
      
      const data = await response.json();
      const textModels = data.models.filter(model => 
        model.supportedGenerationMethods.includes('generateContent')
      );
      
      setAvailableModels(textModels);
      
      if (textModels.length > 0) {
        setSelectedModel(textModels[0].name.replace('models/', ''));
      }
      
    } catch (error) {
      console.error("Error fetching models:", error);
      alert(`Could not fetch models: ${error.message}\n\nFalling back to a default list of models.`);
      const fallbackModels = [
        { name: 'models/gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash (Latest)' },
        { name: 'models/gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro (Latest)' },
        { name: 'models/gemini-2.5-flash-preview-09-2025', displayName: 'Gemini 2.5 Flash Preview' }
      ];
      setAvailableModels(fallbackModels);
      setSelectedModel('gemini-1.5-flash-latest');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleGenerateAIQuestions = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return alert("Please enter your Gemini API Key.");
    if (!selectedModel) return alert("Please fetch and select an AI model first.");
    if (!sourceText.trim()) return alert("Please enter some text or a topic for the AI to read.");

    setIsGeneratingAI(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });

      const prompt = `
        You are an expert teacher creating a question bank. Read the following text and generate exactly 5 questions based on it: 2 MCQs, 2 Short Answers, and 1 Long Answer.
        
        You MUST return ONLY a valid JSON array. Do not include markdown formatting like \`\`\`json. 
        Format your response EXACTLY like this example:
        [
          { "type": "MCQ", "text": "What is the main concept? \nA) Concept 1 | B) Concept 2 | C) Concept 3 | D) Concept 4\n(Correct: B)" },
          { "type": "Short", "text": "Explain the process in two sentences." },
          { "type": "Long", "text": "Discuss the implications of this theory in detail." }
        ]

        Here is the source text to read:
        "${sourceText}"
      `;

      const result = await model.generateContent(prompt);
      let responseText = result.response.text();
      
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const aiQuestions = JSON.parse(responseText);
      
      const formattedAiQuestions = aiQuestions.map((q, index) => ({
        id: `ai-${Date.now()}-${index}`,
        type: q.type,
        text: q.text
      }));

      setQuestions([...questions, ...formattedAiQuestions]);
      setSourceText(''); 
      alert(`AI successfully generated 5 questions using ${selectedModel}!`);

    } catch (error) {
      console.error(error);
      alert(`Error generating questions: ${error.message}\n\nPlease ensure the selected model works and try again.`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // --- Handlers for AI Auto-Grader ---

  const handleGraderFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStudentFile(file);

    if (file.type.startsWith('image/')) {
      setStudentFileType('image');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64Data = evt.target.result.split(',')[1];
        setStudentFileData({
          inlineData: { data: base64Data, mimeType: file.type }
        });
      };
      reader.readAsDataURL(file);
    } 
    else if (file.type === 'application/pdf') {
      setStudentFileType('pdf');
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const typedarray = new Uint8Array(evt.target.result);
        try {
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + "\n";
          }
          setStudentFileData(fullText);
        } catch (err) {
          alert("Error reading PDF: " + err.message);
          clearGraderFile();
        }
      };
      reader.readAsArrayBuffer(file);
    } 
    else {
      alert("Please upload an image (JPG/PNG) or a PDF file.");
      clearGraderFile();
    }
  };

  const clearGraderFile = () => {
    setStudentFile(null);
    setStudentFileData(null);
    setStudentFileType(null);
  };
  
  const handleGradeAnswer = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return alert("Please enter your Gemini API Key in the Question Bank tab first.");
    if (!selectedModel) return alert("Please fetch and select an AI model in the Question Bank tab first.");
    if (!gradingQuestion.trim()) return alert("Please enter the question you asked the student.");
    if (!studentAnswer.trim() && !studentFile) return alert("Please enter text or upload a file for the student's answer.");

    setIsGrading(true);
    setGradingResult(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });

      let promptText = `
        You are a supportive, expert teacher grading a student's answer.
        
        Question asked: "${gradingQuestion}"
        Student's Answer (Text provided): "${studentAnswer || 'See uploaded file.'}"
      `;

      if (studentFileType === 'pdf' && studentFileData) {
        promptText += `\n\nStudent's Answer (Extracted from uploaded PDF):\n"${studentFileData}"`;
      }

      promptText += `\n\nEvaluate the student's complete answer out of 10 points based on the question. Provide feedback using the "Sandwich Method" (Appreciation, Correction, Encouragement).
        
        You MUST return ONLY a valid JSON object. Do not include markdown formatting like \`\`\`json.
        Format your response EXACTLY like this example:
        {
          "score": "8.5",
          "appreciation": "I really like how you clearly identified the main theme.",
          "correction": "However, you missed mentioning the second key factor which is crucial.",
          "encouragement": "Great effort overall, keep up the good work and focus on including all details next time!"
        }
      `;

      let contents = [];
      if (studentFileType === 'image' && studentFileData) {
        contents = [promptText, studentFileData];
      } else {
        contents = [promptText];
      }

      const result = await model.generateContent(contents);
      let responseText = result.response.text();
      
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const feedback = JSON.parse(responseText);
      setGradingResult(feedback);

    } catch (error) {
      console.error(error);
      alert(`Error grading answer: ${error.message}\n\nPlease check your API key, ensure the model supports images if you uploaded one, and try again.`);
    } finally {
      setIsGrading(false);
    }
  };

  // --- Handlers for Question Bank ---

  const handleAddQuestionManually = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    
    let finalQuestionText = newQuestionText;
    
    if (newQuestionType === 'MCQ') {
      const labels = ['A', 'B', 'C', 'D'];
      finalQuestionText = `${newQuestionText}\n` + 
        `${labels[0]}) ${mcqOptions[0]} | ` +
        `${labels[1]}) ${mcqOptions[1]} | ` +
        `${labels[2]}) ${mcqOptions[2]} | ` +
        `${labels[3]}) ${mcqOptions[3]}\n` +
        `(Correct Answer: ${labels[correctOptionIndex]})`;
    }
    
    const newQ = {
      id: Date.now().toString(),
      type: newQuestionType,
      text: finalQuestionText
    };
    
    setQuestions([...questions, newQ]);
    
    setNewQuestionText('');
    setMcqOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
  };

  const updateMcqOption = (index, value) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
  };

  const handleDeleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = window.XLSX.utils.sheet_to_json(worksheet);
        
        const importedQuestions = json.map((row, index) => {
          let text = row.Question || row.Text || row.text || "Missing Question Text";
          
          if (row.Type === 'MCQ' && row.Option1) {
            text = `${text}\nA) ${row.Option1} | B) ${row.Option2} | C) ${row.Option3} | D) ${row.Option4}\n(Correct: ${row.CorrectOption})`;
          }

          return {
            id: `imported-${Date.now()}-${index}`,
            type: row.Type || 'Short',
            text: text
          };
        });
        
        setQuestions([...questions, ...importedQuestions]);
        alert(`Successfully imported ${importedQuestions.length} questions!`);
      } catch (error) {
        alert("Error reading file. Please make sure it's a valid Excel format.");
        console.error(error);
      }
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

  // --- Handlers for Assignment Generation ---

  const generateAssignments = () => {
    const mcqQuestions = questions.filter(q => q.type === 'MCQ');
    const shortQuestions = questions.filter(q => q.type === 'Short');
    const longQuestions = questions.filter(q => q.type === 'Long');

    if (mcqQuestions.length < assignmentConfig.MCQ) return alert(`Not enough MCQs in bank. Need ${assignmentConfig.MCQ}, have ${mcqQuestions.length}`);
    if (shortQuestions.length < assignmentConfig.Short) return alert(`Not enough Short answers in bank. Need ${assignmentConfig.Short}, have ${shortQuestions.length}`);
    if (longQuestions.length < assignmentConfig.Long) return alert(`Not enough Long answers in bank. Need ${assignmentConfig.Long}, have ${longQuestions.length}`);

    const newAssignments = [];

    for (let i = 0; i < numStudents; i++) {
      const shuffleAndSlice = (array, num) => {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, num);
      };

      const studentSet = [
        ...shuffleAndSlice(mcqQuestions, assignmentConfig.MCQ),
        ...shuffleAndSlice(shortQuestions, assignmentConfig.Short),
        ...shuffleAndSlice(longQuestions, assignmentConfig.Long)
      ];

      newAssignments.push({
        studentId: `Student_${i + 1}`,
        questions: studentSet
      });
    }

    setAssignments(newAssignments);
    setActiveTab('assignments');
  };

  // --- Handlers for Google Classroom Simulation ---

  const handleGoogleConnect = () => {
    setGoogleAuthStatus('connecting');
    setTimeout(() => {
      setGoogleAuthStatus('connected');
    }, 1500);
  };

  const handleExportToClassroom = () => {
    if (assignments.length === 0) return alert("Please generate assignments first.");
    setExportStatus('exporting');
    
    setTimeout(() => {
      setExportStatus('success');
      setTimeout(() => setExportStatus(''), 4000);
    }, 2000);
  };

  // --- UI Renderers ---

  const renderTabs = () => (
    <div className="flex flex-wrap md:flex-nowrap space-x-1 bg-blue-900/10 p-1 rounded-lg mb-6">
      <button 
        onClick={() => setActiveTab('bank')}
        className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'bank' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <BookOpen className="w-4 h-4 mr-1 md:mr-2" />
        <span className="hidden md:inline">Question</span> Bank ({questions.length})
      </button>
      <button 
        onClick={() => setActiveTab('generate')}
        className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'generate' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <Settings className="w-4 h-4 mr-1 md:mr-2" />
        Generate
      </button>
      <button 
        onClick={() => setActiveTab('assignments')}
        className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'assignments' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <Users className="w-4 h-4 mr-1 md:mr-2" />
        Assignments ({assignments.length})
      </button>
      <button 
        onClick={() => setActiveTab('grader')}
        className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'grader' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <ClipboardCheck className="w-4 h-4 mr-1 md:mr-2" />
        AI Grader
      </button>
      <button 
        onClick={() => setActiveTab('export')}
        className={`flex-1 flex items-center justify-center py-2 px-2 md:px-4 rounded-md text-xs md:text-sm font-medium transition-colors ${activeTab === 'export' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <Send className="w-4 h-4 mr-1 md:mr-2" />
        <span className="hidden md:inline">Google</span> Classroom
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Automated Assignment Generator</h1>
          <p className="text-gray-600">Create randomized, anti-plagiarism unit assignments</p>
        </header>

        {renderTabs()}

        <main className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          
          {/* TAB 1: QUESTION BANK */}
          {activeTab === 'bank' && (
            <div className="space-y-8">
              
              {/* AI Generation Form */}
              <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
                <h3 className="text-lg font-bold text-purple-900 mb-2 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600"/> Setup AI & Generate Questions
                </h3>
                <p className="text-sm text-purple-700 mb-4">Paste your API key here first. This key will power both the Question Generator and the AI Grader.</p>
                
                <div className="space-y-4">
                  {/* API Key and Fetch Row */}
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="md:w-1/2">
                      <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider">Gemini API Key</label>
                      <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste key here..."
                        className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white"
                      />
                    </div>
                    <button 
                      onClick={handleFetchModels}
                      disabled={isLoadingModels}
                      className="bg-purple-200 hover:bg-purple-300 text-purple-800 font-bold py-2 px-4 rounded transition-colors flex items-center h-[38px] disabled:opacity-50"
                    >
                      {isLoadingModels ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Server className="w-4 h-4 mr-2" />}
                      Fetch Models
                    </button>
                  </div>

                  {/* AI Model Dropdown (Only shows if models are loaded) */}
                  {availableModels.length > 0 && (
                    <form onSubmit={handleGenerateAIQuestions} className="space-y-4 pt-4 border-t border-purple-200">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="md:w-1/3">
                          <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider">Select AI Model</label>
                          <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white"
                            required
                          >
                            {availableModels.map(model => {
                              const cleanName = model.name.replace('models/', '');
                              return (
                                <option key={cleanName} value={cleanName}>
                                  {model.displayName} ({cleanName})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="md:w-2/3">
                          <label className="block text-xs font-bold text-purple-800 mb-1 uppercase tracking-wider">Topic / Source Text</label>
                          <textarea 
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            placeholder="E.g., The water cycle describes how water evaporates..."
                            rows="2"
                            className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button 
                          type="submit" 
                          disabled={isGeneratingAI}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center disabled:opacity-50 shadow-sm"
                        >
                          {isGeneratingAI ? (
                            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Thinking...</>
                          ) : (
                            <><Sparkles className="w-4 h-4 mr-2" /> Create 5 Questions</>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Add Manually and Excel Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Manual Entry Form */}
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-lg font-semibold mb-4 flex items-center"><Plus className="w-5 h-5 mr-2 text-blue-600"/> Add Manually</h3>
                  <form onSubmit={handleAddQuestionManually} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                      <select 
                        value={newQuestionType}
                        onChange={(e) => setNewQuestionType(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="MCQ">Multiple Choice (MCQ)</option>
                        <option value="Short">Short Answer</option>
                        <option value="Long">Long Answer / Essay</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                      <textarea 
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        required
                        rows={newQuestionType === 'MCQ' ? "2" : "3"}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Type your question here..."
                      />
                    </div>

                    {newQuestionType === 'MCQ' && (
                      <div className="bg-white p-3 rounded border border-blue-200 space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Options (Select correct answer)</label>
                        {['A', 'B', 'C', 'D'].map((label, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input 
                              type="radio" 
                              name="correctOption" 
                              checked={correctOptionIndex === index}
                              onChange={() => setCorrectOptionIndex(index)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-gray-700 w-4">{label})</span>
                            <input 
                              type="text" 
                              required
                              value={mcqOptions[index]}
                              onChange={(e) => updateMcqOption(index, e.target.value)}
                              placeholder={`Option ${label}`}
                              className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors shadow-sm">
                      Add Question
                    </button>
                  </form>
                </div>

                {/* Excel Upload Form */}
                <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 flex flex-col justify-center items-center text-center">
                  <FileSpreadsheet className="w-12 h-12 text-green-600 mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Upload Excel/CSV</h3>
                  <p className="text-sm text-gray-600 mb-4">Ensure your file has two columns named <strong>Type</strong> (MCQ, Short, Long) and <strong>Question</strong>.</p>
                  
                  <div className="flex flex-col space-y-3 w-full px-4">
                    <label className="cursor-pointer w-full justify-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded transition-colors inline-flex items-center shadow-sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    
                    <button 
                      onClick={downloadSampleExcel}
                      className="text-green-700 hover:text-green-800 text-sm font-medium flex items-center justify-center py-2 hover:bg-green-100 rounded transition-colors"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download Sample Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Question List */}
              <div>
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">Current Question Bank ({questions.length})</h3>
                {questions.length === 0 ? (
                  <p className="text-gray-500 italic text-center py-6">No questions added yet. Start by typing above or uploading a file.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {questions.map((q, index) => (
                      <div key={q.id} className="flex justify-between items-start p-3 bg-gray-50 border rounded group hover:border-blue-300 transition-colors">
                        <div className="w-full">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mr-3 mb-2 
                            ${q.type === 'MCQ' ? 'bg-purple-100 text-purple-700' : q.type === 'Short' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {q.type}
                          </span>
                          <span className="text-gray-800 text-sm whitespace-pre-line block mt-1">{q.text}</span>
                        </div>
                        <button onClick={() => handleDeleteQuestion(q.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GENERATE ASSIGNMENTS */}
          {activeTab === 'generate' && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Assignment Configuration</h2>
                <p className="text-gray-600">Define the unique mix of questions for each student.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border">
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Total Number of Students</label>
                  <input 
                    type="number" 
                    min="1"
                    value={numStudents}
                    onChange={(e) => setNumStudents(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-lg bg-white"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-700">Questions per Student Assignment:</h4>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span> MCQs
                    </span>
                    <input type="number" min="0" value={assignmentConfig.MCQ} onChange={(e) => setAssignmentConfig({...assignmentConfig, MCQ: parseInt(e.target.value) || 0})} className="w-20 p-1 border rounded text-center bg-white" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span> Short Answers
                    </span>
                    <input type="number" min="0" value={assignmentConfig.Short} onChange={(e) => setAssignmentConfig({...assignmentConfig, Short: parseInt(e.target.value) || 0})} className="w-20 p-1 border rounded text-center bg-white" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span> Long Answers
                    </span>
                    <input type="number" min="0" value={assignmentConfig.Long} onChange={(e) => setAssignmentConfig({...assignmentConfig, Long: parseInt(e.target.value) || 0})} className="w-20 p-1 border rounded text-center bg-white" />
                  </div>
                </div>
              </div>

              <button 
                onClick={generateAssignments}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform active:scale-95 flex justify-center items-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Generate {numStudents} Unique Assignments
              </button>
            </div>
          )}

          {/* TAB 3: VIEW ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div>
              {assignments.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-600">No Assignments Generated</h3>
                  <p className="text-gray-500 mt-2 mb-6">Go to the Generate tab to create unique assignments for your students.</p>
                  <button onClick={() => setActiveTab('generate')} className="bg-blue-100 text-blue-700 px-4 py-2 rounded font-medium hover:bg-blue-200">Go to Generate</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignments.map((assignment, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center border-b pb-2 mb-3">
                        <h4 className="font-bold text-gray-800">{assignment.studentId}</h4>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          {assignment.questions.length} Questions
                        </span>
                      </div>
                      <div className="space-y-4 max-h-64 overflow-y-auto text-sm pr-2">
                        {assignment.questions.map((q, qIdx) => (
                          <div key={qIdx} className="text-gray-600 border-l-2 border-blue-200 pl-2">
                            <span className="font-semibold text-gray-800 text-xs block mb-1">{q.type}</span>
                            <span className="whitespace-pre-line">{q.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI GRADER */}
          {activeTab === 'grader' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <ClipboardCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Auto-Grader</h2>
                <p className="text-gray-600">Paste text, or upload an image/PDF of a student's answer to get instant "Sandwich Method" feedback.</p>
                {(!apiKey || !selectedModel) && (
                  <p className="text-red-500 text-sm mt-2 font-medium">⚠️ Please connect your API Key and load an AI Model in the "Question Bank" tab first.</p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Column */}
                <form onSubmit={handleGradeAnswer} className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">The Question</label>
                    <textarea 
                      value={gradingQuestion}
                      onChange={(e) => setGradingQuestion(e.target.value)}
                      placeholder="What was the original question?"
                      rows="2"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Student's Answer</label>
                    
                    {/* Text Input */}
                    <textarea 
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      placeholder="Type or paste student answer here..."
                      rows="4"
                      className="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />

                    {/* File Upload Area */}
                    <div className="flex items-center space-x-3">
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded transition-colors inline-flex items-center border">
                        <Upload className="w-4 h-4 mr-2 text-gray-500" />
                        {studentFile ? 'Change File' : 'Upload Image or PDF'}
                        <input 
                          type="file" 
                          accept=".pdf, image/png, image/jpeg, image/jpg" 
                          onChange={handleGraderFileUpload} 
                          className="hidden" 
                        />
                      </label>
                      
                      {studentFile && (
                        <div className="flex items-center text-sm text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                          {studentFileType === 'pdf' ? <FileText className="w-4 h-4 mr-1"/> : <FileImage className="w-4 h-4 mr-1"/>}
                          <span className="truncate max-w-[120px] mr-2">{studentFile.name}</span>
                          <button type="button" onClick={clearGraderFile} className="hover:text-red-500">
                            <X className="w-4 h-4"/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isGrading || !apiKey || !selectedModel}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition-colors flex justify-center items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGrading ? (
                      <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Evaluating Answer...</>
                    ) : (
                      <><Sparkles className="w-5 h-5 mr-2" /> Generate Feedback</>
                    )}
                  </button>
                </form>

                {/* Output Column */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col h-full">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Grading Result</h3>
                  
                  {!gradingResult && !isGrading && (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <ClipboardCheck className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">Feedback will appear here.</p>
                    </div>
                  )}

                  {isGrading && (
                    <div className="flex-1 flex flex-col items-center justify-center text-blue-600">
                      <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                      <p className="font-medium animate-pulse">AI is reading the answer...</p>
                    </div>
                  )}

                  {gradingResult && !isGrading && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Suggested Score</p>
                        <p className="text-4xl font-black text-blue-600">{gradingResult.score}<span className="text-xl text-gray-400">/10</span></p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                          <p className="text-xs font-bold text-green-800 uppercase mb-1">1. Appreciation (What went well)</p>
                          <p className="text-sm text-green-900">{gradingResult.appreciation}</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                          <p className="text-xs font-bold text-orange-800 uppercase mb-1">2. Correction (Needs improvement)</p>
                          <p className="text-sm text-orange-900">{gradingResult.correction}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <p className="text-xs font-bold text-blue-800 uppercase mb-1">3. Encouragement (Moving forward)</p>
                          <p className="text-sm text-blue-900">{gradingResult.encouragement}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GOOGLE CLASSROOM EXPORT */}
          {activeTab === 'export' && (
            <div className="max-w-lg mx-auto text-center py-8">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/59/Google_Classroom_Logo.png" alt="Google Classroom" className="w-20 h-20 mx-auto mb-6 opacity-90" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Export to Google Classroom</h2>
              
              {googleAuthStatus === 'disconnected' && (
                <>
                  <p className="text-gray-600 mb-8">Connect your Google account to automatically distribute these unique assignments to your students via Classroom.</p>
                  <button onClick={handleGoogleConnect} className="bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="G" className="w-5 h-5 mr-3" />
                    Sign in with Google
                  </button>
                  <p className="mt-6 text-xs text-gray-400 bg-gray-50 p-3 rounded text-left">
                    <strong>Developer Note:</strong> For GitHub deployment, you will need to create a project in Google Cloud Console, enable the Google Classroom API, and insert your Client ID into the code.
                  </p>
                </>
              )}

              {googleAuthStatus === 'connecting' && (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Authenticating securely with Google...</p>
                </div>
              )}

              {googleAuthStatus === 'connected' && (
                <div className="space-y-6">
                  <div className="bg-green-50 text-green-800 p-3 rounded border border-green-200 inline-flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" /> Account Connected Successfully
                  </div>
                  
                  <div className="bg-white border rounded-lg p-6 text-left shadow-sm">
                    <h4 className="font-bold mb-2">Ready to Export:</h4>
                    <p className="text-sm text-gray-600 mb-4">You are about to create <strong>{assignments.length} unique assignments</strong> as Drafts in Google Classroom.</p>
                    
                    {exportStatus === 'exporting' ? (
                      <button disabled className="w-full bg-blue-400 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center">
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Uploading to Classroom...
                      </button>
                    ) : exportStatus === 'success' ? (
                      <div className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center">
                        <CheckCircle className="w-5 h-5 mr-2" /> Upload Complete!
                      </div>
                    ) : (
                      <button onClick={handleExportToClassroom} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors flex justify-center items-center">
                        <Send className="w-5 h-5 mr-2" /> Create Assignments in Classroom
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}