import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Layout Components
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

// Public Pages
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Register = lazy(() => import('./pages/Register'))
const JobseekerRegistration = lazy(() => import('./pages/JobseekerRegistration'))
const EmployerRegistration = lazy(() => import('./pages/EmployerRegistration'))
const HomeownerRegistration = lazy(() => import('./pages/HomeownerRegistration'))
const JobListings = lazy(() => import('./pages/JobListings'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const JobFairs = lazy(() => import('./pages/JobFairs'))
const JobFairDetail = lazy(() => import('./pages/JobFairDetail'))
const Diagnostic = lazy(() => import('./pages/Diagnostic'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Unauthorized = lazy(() => import('./pages/Unauthorized'))
const EmailVerificationPending = lazy(() => import('./pages/EmailVerificationPending'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))

// Protected Pages
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const JobseekerProfileEdit = lazy(() => import('./pages/JobseekerProfileEdit'))
const MyApplications = lazy(() => import('./pages/MyApplications'))
const SavedJobs = lazy(() => import('./pages/SavedJobs'))
const Messages = lazy(() => import('./pages/Messages'))
const Settings = lazy(() => import('./pages/Settings'))
const EmployerProfileEdit = lazy(() => import('./pages/EmployerProfileEdit'))
const HomeownerProfileEdit = lazy(() => import('./pages/HomeownerProfileEdit'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))
const RegistrationContinue = lazy(() => import('./pages/RegistrationContinue'))

// Employer Pages
const PostJob = lazy(() => import('./pages/employer/PostJob'))
const MyListings = lazy(() => import('./pages/employer/MyListings'))
const JobApplicants = lazy(() => import('./pages/employer/JobApplicants'))

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))

const PageFallback = () => (
    <div className="min-h-[40vh] flex items-center justify-center px-4 text-sm text-gray-500">
        Loading...
    </div>
)

function AppContent() {
    const location = useLocation()
    const isAdminRoute = location.pathname.startsWith('/admin')
    const hideNavbar = isAdminRoute

    return (
        <div className="min-h-screen flex flex-col">
            {!hideNavbar && <Navbar />}
            <main className="flex-1">
                <ErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
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
                        <Route path="/job-fairs" element={<ErrorBoundary><JobFairs /></ErrorBoundary>} />
                        <Route path="/job-fairs/:id" element={<ErrorBoundary><JobFairDetail /></ErrorBoundary>} />
                        <Route path="/diagnostic" element={<ErrorBoundary><Diagnostic /></ErrorBoundary>} />
                        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
                        <Route path="/verify-email" element={<ErrorBoundary><EmailVerificationPending /></ErrorBoundary>} />
                        <Route path="/auth/callback" element={<ErrorBoundary><AuthCallback /></ErrorBoundary>} />
                        <Route path="/unauthorized" element={<Unauthorized />} />

                        {/* Protected Routes (Any authenticated user) */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'employer']}>
                                    <ErrorBoundary><Dashboard /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/register/continue"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'employer']}>
                                    <ErrorBoundary><RegistrationContinue /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute allowedRoles={['user', 'employer']}>
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
                                <ProtectedRoute allowedRoles={['user', 'employer']}>
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
                                <AdminProtectedRoute>
                                    <ErrorBoundary><AdminDashboard /></ErrorBoundary>
                                </AdminProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/reverification"
                            element={
                                <AdminProtectedRoute>
                                    <ErrorBoundary><AdminDashboard initialSection="reverification" /></ErrorBoundary>
                                </AdminProtectedRoute>
                            }
                        />

                        {/* Public Profile */}
                        <Route
                            path="/profile/:userId"
                            element={<ErrorBoundary><PublicProfile /></ErrorBoundary>}
                        />

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Suspense>
                </ErrorBoundary>
            </main>
            {!hideNavbar && <Footer />}
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
