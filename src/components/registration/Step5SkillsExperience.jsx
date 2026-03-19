import { Plus, X, Upload, CheckCircle, FileText, Award, Link as LinkIcon } from 'lucide-react'
import { TagInput } from '../forms'
import ResumeUpload from '../common/ResumeUpload'

const Step5SkillsExperience = ({
    formData,
    handleChange,
    skillInput,
    setSkillInput,
    addSkill,
    removeSkill,
    workExpInput,
    setWorkExpInput,
    addWorkExperience,
    removeWorkExp,
    certInput,
    setCertInput,
    addCertification,
    removeCertification,
    userId,
    resumeUrl,
    onResumeUploaded,
    onResumeRemoved,
    certificateFiles,
    handleCertificateChange,
    removeCertificateFile
}) => {
    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Skills & Work Experience</h2>
                <p className="text-gray-600">Showcase your abilities and experience</p>
            </div>

            {/* Skills */}
            <TagInput
                label="Skills and Competencies *"
                value={skillInput}
                onChange={setSkillInput}
                tags={formData.skills}
                onAdd={(val) => {
                    if (!formData.skills.includes(val)) {
                        addSkill()
                    }
                }}
                onRemove={removeSkill}
                placeholder="Type a skill and press Enter"
                tagClassName="bg-primary-100 text-primary-700"
                removeClassName="hover:text-primary-900"
            />

            {/* Work Experience */}
            <div>
                <label className="label">Work Experience (Optional)</label>
                <div className="space-y-3 mb-3">
                    <input
                        type="text"
                        value={workExpInput.company}
                        onChange={(e) => setWorkExpInput(prev => ({ ...prev, company: e.target.value }))}
                        className="input-field"
                        placeholder="Company name"
                    />
                    <input
                        type="text"
                        value={workExpInput.position}
                        onChange={(e) => setWorkExpInput(prev => ({ ...prev, position: e.target.value }))}
                        className="input-field"
                        placeholder="Position/Role"
                    />
                    <input
                        type="text"
                        value={workExpInput.duration}
                        onChange={(e) => setWorkExpInput(prev => ({ ...prev, duration: e.target.value }))}
                        className="input-field"
                        placeholder="Duration (e.g., Jan 2020 - Dec 2022)"
                    />
                    <button
                        type="button"
                        onClick={addWorkExperience}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Experience
                    </button>
                </div>
                {formData.work_experiences.length > 0 && (
                    <div className="space-y-2">
                        {formData.work_experiences.map((exp, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-900">{exp.position} at {exp.company}</p>
                                    <p className="text-sm text-gray-600">{exp.duration}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeWorkExp(index)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Certifications */}
            <TagInput
                label="Certifications or Licenses (Optional)"
                value={certInput}
                onChange={setCertInput}
                tags={formData.certifications}
                onAdd={(val) => {
                    if (!formData.certifications.includes(val)) {
                        addCertification()
                    }
                }}
                onRemove={removeCertification}
                placeholder="Type certification name"
                tagClassName="bg-green-100 text-green-700"
                removeClassName="hover:text-green-900"
                icon={Award}
            />

            {/* Portfolio URL */}
            <div>
                <label className="label">Portfolio URL (Optional)</label>
                <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="url"
                        name="portfolio_url"
                        value={formData.portfolio_url}
                        onChange={handleChange}
                        className="input-field pl-12"
                        placeholder="https://yourportfolio.com or GitHub/LinkedIn URL"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    Share your portfolio, GitHub profile, LinkedIn, or personal website
                </p>
            </div>

            {/* Resume Upload */}
            {userId ? (
                <ResumeUpload
                    userId={userId}
                    storagePath={`${userId}/resume.pdf`}
                    currentUrl={resumeUrl}
                    onUploaded={onResumeUploaded}
                    onRemoved={onResumeRemoved}
                    label="Resume or CV (PDF, max 5MB) *"
                    optional={false}
                />
            ) : (
                <div>
                    <label className="label">Resume or CV *</label>
                    <p className="text-sm text-gray-500 italic">Complete Step 1 first to enable resume upload.</p>
                </div>
            )}

            {/* Optional Certificate Files */}
            <div>
                <label className="label">Supporting Documents (Optional certificates, max 2MB each)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleCertificateChange}
                        className="hidden"
                        id="cert-upload"
                    />
                    <label htmlFor="cert-upload" className="cursor-pointer">
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 font-medium">Click to upload documents</p>
                        <p className="text-sm text-gray-500 mt-1">PDF, JPG, or PNG format</p>
                    </label>
                </div>
                {certificateFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {certificateFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    {file.name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeCertificateFile(index)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export { Step5SkillsExperience }
export default Step5SkillsExperience
