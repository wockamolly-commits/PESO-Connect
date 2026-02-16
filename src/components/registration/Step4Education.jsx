import { GraduationCap, Calendar } from 'lucide-react'

const EDUCATION_LEVELS = [
    'Elementary Graduate',
    'High School Graduate',
    'Senior High School Graduate',
    'Vocational/Technical Graduate',
    'College Undergraduate',
    'College Graduate',
    'Masteral Degree',
    'Doctoral Degree'
]

const Step4Education = ({ formData, handleChange }) => {
    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Educational Background</h2>
                <p className="text-gray-600">Your academic qualifications</p>
            </div>

            {/* Highest Educational Attainment */}
            <div>
                <label className="label">Highest Educational Attainment *</label>
                <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                        name="highest_education"
                        value={formData.highest_education}
                        onChange={handleChange}
                        className="input-select pl-12"
                        required
                    >
                        <option value="">Select education level</option>
                        {EDUCATION_LEVELS.map((level) => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* School Name */}
            <div>
                <label className="label">School or Institution Attended *</label>
                <input
                    type="text"
                    name="school_name"
                    value={formData.school_name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Enter school name"
                    required
                />
            </div>

            {/* Course or Field */}
            <div>
                <label className="label">Course or Field of Study</label>
                <input
                    type="text"
                    name="course_or_field"
                    value={formData.course_or_field}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., Bachelor of Science in Computer Science"
                />
            </div>

            {/* Year Graduated */}
            <div>
                <label className="label">Year Graduated (if applicable)</label>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="number"
                        name="year_graduated"
                        value={formData.year_graduated}
                        onChange={handleChange}
                        className="input-field pl-12"
                        placeholder="e.g., 2023"
                        min="1950"
                        max={new Date().getFullYear()}
                    />
                </div>
            </div>
        </div>
    )
}

export { Step4Education, EDUCATION_LEVELS }
export default Step4Education
