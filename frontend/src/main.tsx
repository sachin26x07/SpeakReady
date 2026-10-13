import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import DailyPractice from './pages/DailyPractice';
import ReadingAloud from './pages/ReadingAloud';
import ListeningComprehension from './pages/ListeningComprehension';
import ListenAndRepeat from './pages/ListenAndRepeat';
import GrammarPractice from './pages/GrammarPractice';
import SpeakingPractice from './pages/SpeakingPractice';
import ResumeInterview from './pages/ResumeInterview';
import MockAssessment from './pages/MockAssessment';
import VocabularyBuilder from './pages/VocabularyBuilder';
import ProgressHistory from './pages/ProgressHistory';
import AISettings from './pages/AISettings';
import PrivacyData from './pages/PrivacyData';

import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/daily" element={<DailyPractice />} />
            <Route path="/reading" element={<ReadingAloud />} />
            <Route path="/listening" element={<ListeningComprehension />} />
            <Route path="/repeat" element={<ListenAndRepeat />} />
            <Route path="/grammar" element={<GrammarPractice />} />
            <Route path="/speaking" element={<SpeakingPractice />} />
            <Route path="/interview" element={<ResumeInterview />} />
            <Route path="/mock" element={<MockAssessment />} />
            <Route path="/vocabulary" element={<VocabularyBuilder />} />
            <Route path="/progress" element={<ProgressHistory />} />
            <Route path="/settings" element={<AISettings />} />
            <Route path="/privacy" element={<PrivacyData />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </SettingsProvider>
  </React.StrictMode>
);
