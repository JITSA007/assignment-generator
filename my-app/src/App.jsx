import React, { useState, useEffect } from 'react';
import { 
  Upload, Plus, RefreshCw, Send, FileSpreadsheet, 
  Trash2, CheckCircle, Settings, Users, BookOpen, Download
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('bank');
  
  // App State
  const [questions, setQuestions] = useState([]);
  const [numStudents, setNumStudents] = useState(10);
  const [assignmentConfig, setAssignmentConfig] = useState({ MCQ: 4, Short: 4, Long: 2 });
  const [assignments, setAssignments] = useState([]);
  
  // Form State
  const [newQuestionType, setNewQuestionType] = useState('MCQ');
  const [newQuestionText, setNewQuestionText] = useState('');
  
  // New State for MCQ Options
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  
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

  // --- Handlers for Question Bank ---

  const handleAddQuestionManually = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    
    let finalQuestionText = newQuestionText;
    
    // If it's an MCQ, format the text to include the options nicely
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
    
    // Reset form
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
          
          // Format imported MCQs if options are provided in columns like Option1, Option2...
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
    e.target.value = null; // reset file input
  };

  const downloadSampleExcel = () => {
    if (!window.XLSX) return alert("Excel library is still loading, please wait a second.");
    
    // Create some dummy data that matches our required format
    const sampleData = [
      { Type: "MCQ", Question: "What is the capital of France?", Option1: "London", Option2: "Berlin", Option3: "Paris", Option4: "Madrid", CorrectOption: "C" },
      { Type: "Short", Question: "Explain the process of photosynthesis in 3 sentences." },
      { Type: "Long", Question: "Discuss the impact of the Industrial Revolution on modern society." }
    ];

    const worksheet = window.XLSX.utils.json_to_sheet(sampleData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "QuestionBank");
    
    // Trigger the download
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
    <div className="flex space-x-1 bg-blue-900/10 p-1 rounded-lg mb-6">
      <button 
        onClick={() => setActiveTab('bank')}
        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'bank' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <BookOpen className="w-4 h-4 mr-2" />
        Question Bank ({questions.length})
      </button>
      <button 
        onClick={() => setActiveTab('generate')}
        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'generate' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <Settings className="w-4 h-4 mr-2" />
        Generate
      </button>
      <button 
        onClick={() => setActiveTab('assignments')}
        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'assignments' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <Users className="w-4 h-4 mr-2" />
        Assignments ({assignments.length})
      </button>
      <button 
        onClick={() => setActiveTab('export')}
        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'export' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-900'}`}
      >
        <Send className="w-4 h-4 mr-2" />
        Google Classroom
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-6">
      <div className="max-w-4xl mx-auto">
        
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
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
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

                    {/* NEW: Dynamic MCQ Options Form */}
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

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors">
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
                    <label className="cursor-pointer w-full justify-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded transition-colors inline-flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                      <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    
                    {/* NEW: Download Sample Button */}
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
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-700">Questions per Student Assignment:</h4>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span> MCQs
                    </span>
                    <input type="number" min="0" value={assignmentConfig.MCQ} onChange={(e) => setAssignmentConfig({...assignmentConfig, MCQ: parseInt(e.target.value) || 0})} className="w-20 p-1 border rounded text-center" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span> Short Answers
                    </span>
                    <input type="number" min="0" value={assignmentConfig.Short} onChange={(e) => setAssignmentConfig({...assignmentConfig, Short: parseInt(e.target.value) || 0})} className="w-20 p-1 border rounded text-center" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span> Long Answers
                    </span>
                    <input type="number" min="0" value={assignmentConfig.Long} onChange={(e) => setAssignmentConfig({...assignmentConfig, Long: parseInt(e.target.value) || 0})} className="w-20 p-1 border rounded text-center" />
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

          {/* TAB 4: GOOGLE CLASSROOM EXPORT */}
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