
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/App.css';
import KanbanBoard from './components/KanbanBoard';
import LoginPage from './pages/LoginPage';
import UserProfile from './pages/UserProfile';
import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LogoHeader from './components/LogoHeader';

const App = () => {
  return (
    <AuthProvider>
        <ThemeProvider>
            <Router>
                <div className="App">
                    <LogoHeader />
                    <main>
                      <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
                        <Route path="/unauthorized" element={<h2>Unauthorized Access</h2>} />
                      </Routes>
                    </main>
                </div>
            </Router>
        </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
