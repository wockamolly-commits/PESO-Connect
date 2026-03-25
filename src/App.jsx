import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Layout Components
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

// Public Pages
import Home from './pages/Home'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Register from './pages/Register'
import JobseekerRegistration from './pages/JobseekerRegistration'
import EmployerRegistration from './pages/EmployerRegistration'
import HomeownerRegistration from './pages/HomeownerRegistration'
import JobListings from './pages/JobListings'
import JobDetail from './pages/JobDetail'
import Diagnostic from './pages/Diagnostic'
import NotFound from './pages/NotFound'
import Unauthorized from './pages/Unauthorized'

// Protected Pages
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import JobseekerProfileEdit from './pages/JobseekerProfileEdit'
import MyApplications from './pages/MyApplications'
import SavedJobs from './pages/SavedJobs'
import Messages from './pages/Messages'
import Settings from './pages/Settings'
import EmployerProfileEdit from './pages/EmployerProfileEdit'
import HomeownerProfileEdit from './pages/HomeownerProfileEdit'
import PublicProfile from './pages/PublicProfile'
import RegistrationContinue from './pages/RegistrationContinue'

// Employer Pages
import PostJob from './pages/employer/PostJob'
import MyListings from './pages/employer/MyListings'
import JobApplicants from './pages/employer/JobApplicants'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminLogin from './pages/admin/Login'

function AppContent() {
    const location = useLocation()
    const isAdminRoute = location.pathname.startsWith('/admin')

    return (
        <div className="min-h-screen flex flex-col">
            {!isAdminRoute && <Navbar />}
            <main className="flex-1">
                <ErrorBoundary>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
                        <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
                        <Route path="/forgot-password" element={<ErrorBoundary><ForgotPassword /></ErrorBoundary>} />
                        <Route path="/register" element={<ErrorBoundary><Register /></ErrorBoundary>} />
                        <Route path="/register/jobseeker" element={<ErrorBoundary><JobseekerRegistration /></ErrorBoundary>} />
                        <Route path="/register/employer" element={<ErrorBoundary><EmployerRegistration /></ErrorBoundary>} />
                        <Route path="/register/homeowner" element={<ErrorBoundary><HomeownerRegistration /></ErrorBoundary>} />
                        {/* Redirect old URL */}
                        <Route path="/register/individual" element={<Navigate to="/register/homeowner" replace />} />
                        <Route path="/jobs" element={<ErrorBoundary><JobListings /></ErrorBoundary>} />
                        <Route path="/jobs/:id" element={<ErrorBoundary><JobDetail /></ErrorBoundary>} />
                        <Route path="/diagnostic" element={<ErrorBoundary><Diagnostic /></ErrorBoundary>} />
                        <Route path="/admin/login" element={<ErrorBoundary><AdminLogin /></ErrorBoundary>} />
                        <Route path="/unauthorized" element={<Unauthorized />} />

                        {/* Protected Routes (Any authenticated user) */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary><Dashboard /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/register/continue"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary><RegistrationContinue /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary><Profile /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile/edit"
                            element={
                                <ProtectedRoute allowedRoles={['jobseeker']}>
                                    <ErrorBoundary><JobseekerProfileEdit /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile/edit/employer"
                            element={
                                <ProtectedRoute allowedRoles={['employer']}>
                                    <ErrorBoundary><EmployerProfileEdit /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile/edit/homeowner"
                            element={
                                <ProtectedRoute allowedRoles={['homeowner']}>
                                    <ErrorBoundary><HomeownerProfileEdit /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />

                        {/* Jobseeker Routes */}
                        <Route
                            path="/my-applications"
                            element={
                                <ProtectedRoute allowedRoles={['jobseeker']}>
                                    <ErrorBoundary><MyApplications /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/saved-jobs"
                            element={
                                <ProtectedRoute allowedRoles={['jobseeker']}>
                                    <ErrorBoundary><SavedJobs /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />

                        {/* Messaging Routes */}
                        <Route
                            path="/messages"
                            element={
                                <ProtectedRoute allowedRoles={['jobseeker', 'homeowner', 'employer']}>
                                    <ErrorBoundary><Messages /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/messages/:conversationId"
                            element={
                                <ProtectedRoute allowedRoles={['jobseeker', 'homeowner', 'employer']}>
                                    <ErrorBoundary><Messages /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />

                        {/* Settings */}
                        <Route
                            path="/settings"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary><Settings /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />

                        {/* Employer Routes */}
                        <Route
                            path="/post-job"
                            element={
                                <ProtectedRoute allowedRoles={['employer']} requireVerified>
                                    <ErrorBoundary><PostJob /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/edit-job/:id"
                            element={
                                <ProtectedRoute allowedRoles={['employer']} requireVerified>
                                    <ErrorBoundary><PostJob /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/my-listings"
                            element={
                                <ProtectedRoute allowedRoles={['employer']}>
                                    <ErrorBoundary><MyListings /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/employer/jobs/:jobId/applicants"
                            element={
                                <ProtectedRoute allowedRoles={['employer']}>
                                    <ErrorBoundary><JobApplicants /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />

                        {/* Admin Routes */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <ErrorBoundary><AdminDashboard /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />

                        {/* Public Profile */}
                        <Route
                            path="/profile/:userId"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary><PublicProfile /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </ErrorBoundary>
            </main>
            {!isAdminRoute && <Footer />}
        </div>
    )
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    )
}

export default App
