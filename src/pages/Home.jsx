import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    Briefcase,
    Users,
    Search,
    Shield,
    CheckCircle,
    ArrowRight,
    Zap,
    Building2,
    UserCheck
} from 'lucide-react'

const Home = () => {
    const { currentUser } = useAuth()

    const features = [
        {
            icon: Search,
            title: 'Smart Job Matching',
            description: 'Our AI powered system matches your skills with the perfect job opportunities in San Carlos City.'
        },
        {
            icon: UserCheck,
            title: 'Verified Workers',
            description: 'All workers and employers are verified by PESO for security and trust in every transaction.'
        },
        {
            icon: Zap,
            title: 'AI Diagnostic',
            description: 'Describe your problem and let our system find the right skilled worker for you.'
        },
        {
            icon: Shield,
            title: 'Secure Platform',
            description: 'Your data is protected with enterprise grade security and PESO oversight.'
        }
    ]

    const stats = [
        { value: '500+', label: 'Registered Workers' },
        { value: '200+', label: 'Active Jobs' },
        { value: '95%', label: 'Success Rate' },
        { value: '24/7', label: 'Support' }
    ]

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-20"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-6">
                                <Building2 className="w-4 h-4" />
                                <span>San Carlos City, Negros Occidental</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                                Find Your Perfect
                                <span className="block text-accent-400">Job Match</span>
                            </h1>

                            <p className="text-lg text-primary-100 mb-8 max-w-lg">
                                Connect with verified employers and skilled workers through the official
                                Public Employment Service Office platform.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                {currentUser ? (
                                    <>
                                        <Link to="/jobs" className="btn-accent flex items-center gap-2">
                                            Browse Jobs <ArrowRight className="w-5 h-5" />
                                        </Link>
                                        <Link to="/dashboard" className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all">
                                            Go to Dashboard
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/register" className="btn-accent flex items-center gap-2">
                                            Get Started <ArrowRight className="w-5 h-5" />
                                        </Link>
                                        <Link to="/jobs" className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-all">
                                            Browse Jobs
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Stats Card with Logo */}
                        <div className="animate-slide-up">
                            {/* Floating Logo */}
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                                    <img
                                        src="/peso-logo.png"
                                        alt="PESO Connect"
                                        className="relative w-28 h-28 md:w-36 md:h-36 drop-shadow-2xl transform hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                                <div className="grid grid-cols-2 gap-6">
                                    {stats.map((stat, index) => (
                                        <div key={index} className="text-center">
                                            <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                                            <p className="text-primary-200 text-sm">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wave Divider */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc" />
                    </svg>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-gradient-to-b from-primary-50 to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Why Choose PESO Connect?</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Our platform provides a secure and efficient way to connect job seekers
                            with employers in San Carlos City.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="card card-hover text-center group"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25 group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white p-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                        <p className="text-primary-100 mb-8 max-w-lg mx-auto">
                            Join thousands of verified workers and employers on PESO Connect.
                            Your next opportunity awaits.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to="/register" className="bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">
                                Create Account
                            </Link>
                            <Link to="/diagnostic" className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all">
                                Find a Worker
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default Home
