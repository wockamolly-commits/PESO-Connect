const Footer = () => {
    return (
        <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <img src="/peso-logo.png" alt="PESO Connect" className="w-10 h-10 object-contain" />
                            <span className="text-xl font-bold gradient-text">PESO Connect</span>
                        </div>
                        <p className="text-gray-600 text-sm max-w-md">
                            A unified local employment and job matching platform for San Carlos City, Negros Occidental.
                            Connecting skilled workers with opportunities.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><a href="/jobs" className="hover:text-primary-600 transition-colors">Browse Jobs</a></li>
                            <li><a href="/diagnostic" className="hover:text-primary-600 transition-colors">Find Workers</a></li>
                            <li><a href="/register" className="hover:text-primary-600 transition-colors">Register</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Contact PESO</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>San Carlos City Hall</li>
                            <li>Negros Occidental, Philippines</li>
                            <li>peso@sancarloscity.gov.ph</li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} PESO Connect. All rights reserved.</p>
                    <p className="mt-1">Public Employment Service Office | San Carlos City, Negros Occidental</p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
