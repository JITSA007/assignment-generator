# OmniGrade AI 🎓🤖
**Engineered by Jitendra Prajapat**

OmniGrade AI is a full-stack educational automation platform designed for university professors to bridge the gap between curriculum design and digital classroom management. It utilizes the **Google Gemini Pro 1.5** model to generate intelligent, randomized examinations and integrates seamlessly with the **Google Classroom API** for roster synchronization and automated grading.

## 🚀 Live Demo
Access the live application here: [https://omnigradeai.surge.sh](https://omnigradeai.surge.sh)

## ✨ Core Features

### 1. AI-Powered Syllabus Engine
* **Contextual Question Generation:** Converts raw lecture notes or PDF text into academic questions.
* **Bloom's Taxonomy Alignment:** Generates MCQs, Short Answers, and Long Essays based on difficulty levels.
* **Manual & Bulk Import:** Add questions manually or upload entire banks via Excel (`.xlsx`).

### 2. Intelligent Exam Assembly
* **Mass Personalization:** Automatically pulls student rosters from Google Classroom.
* **Anti-Cheating Randomization:** Every student receives a unique combination of questions.
* **Professional PDF Engine:** Generates individualized, branded PDFs with logical page breaks (no split questions).

### 3. Smart AI Grader
* **Multimodal Analysis:** Grades student submissions (PDFs and Images) using professor-level logic.
* **Google Classroom Sync:** Pushes AI-drafted scores and professional feedback directly to the official Classroom gradebook.
* **Analytics Dashboard:** Visualizes class performance, averages, and grading history.

## 🛠️ Technical Stack
* **Frontend:** React.js, Tailwind CSS, Lucide Icons
* **AI Layer:** Google Generative AI (Gemini Pro API)
* **Security:** Google OAuth 2.0 (Identity Platform)
* **Integrations:** Google Classroom API, Google Drive API
* **Build Tool:** Vite
* **Deployment:** Surge.sh

## ⚙️ Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/omnigrade-ai.git](https://github.com/YOUR_USERNAME/omnigrade-ai.git)
    cd omnigrade-ai
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Google Cloud Configuration:**
    * Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
    * Enable Classroom and Drive APIs.
    * Setup OAuth Consent Screen and add your `surge.sh` link to Authorized Origins.
    * Update `GOOGLE_CLIENT_ID` in `src/App.jsx`.

4.  **Run Locally:**
    ```bash
    npm run dev
    ```

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Developed with ❤️ for the Academic Community.*
