import { useState, useRef, useCallback, useEffect } from 'react'
import {
    ZoomIn, ZoomOut, Download, X, Maximize2, Minimize2, RotateCcw, FileText,
    Loader2, XCircle
} from 'lucide-react'

const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5]

const getDocumentPath = (src = '') => {
    if (!src) return ''
    const withoutQuery = src.split('?')[0] || ''
    return withoutQuery.toLowerCase()
}

const isImageDocument = (src = '') => {
    if (!src) return false
    if (src.startsWith('data:image')) return true
    const path = getDocumentPath(src)
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some((ext) => path.endsWith(ext))
}

const isPdfDocument = (src = '') => {
    if (!src) return false
    const normalized = src.toLowerCase()
    return normalized.includes('application/pdf') || getDocumentPath(src).endsWith('.pdf')
}

const DocumentViewer = ({ documentViewer, onClose }) => {
    const [viewerZoom, setViewerZoom] = useState(1)
    const [imageLoading, setImageLoading] = useState(true)
    const [imageError, setImageError] = useState(false)
    const viewerContainerRef = useRef(null)
    const viewerImageRef = useRef(null)

    // Reset states when a new document is opened
    useEffect(() => {
        if (documentViewer) {
            setViewerZoom(1)
            setImageLoading(true)
            setImageError(false)
        }
    }, [documentViewer?.src])

    const zoomToNextPreset = useCallback((direction) => {
        setViewerZoom(current => {
            if (direction > 0) {
                const next = ZOOM_PRESETS.find(p => p > current + 0.01)
                return next || current
            } else {
                const prev = [...ZOOM_PRESETS].reverse().find(p => p < current - 0.01)
                return prev || current
            }
        })
    }, [])

    const handleViewerWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const delta = e.deltaY > 0 ? -0.1 : 0.1
            setViewerZoom(z => Math.min(5, Math.max(0.1, z + delta)))
        }
    }, [])

    const handleFitWidth = useCallback(() => {
        if (!viewerContainerRef.current || !viewerImageRef.current) return
        const containerWidth = viewerContainerRef.current.clientWidth - 64
        const imageWidth = viewerImageRef.current.naturalWidth
        if (imageWidth > 0) setViewerZoom(containerWidth / imageWidth)
    }, [])

    const handleFitHeight = useCallback(() => {
        if (!viewerContainerRef.current || !viewerImageRef.current) return
        const containerHeight = viewerContainerRef.current.clientHeight - 64
        const imageHeight = viewerImageRef.current.naturalHeight
        if (imageHeight > 0) setViewerZoom(containerHeight / imageHeight)
    }, [])

    // Keyboard shortcuts
    useEffect(() => {
        if (!documentViewer) return
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape':
                    onClose()
                    break
                case '+':
                case '=':
                    e.preventDefault()
                    zoomToNextPreset(1)
                    break
                case '-':
                    e.preventDefault()
                    zoomToNextPreset(-1)
                    break
                case '0':
                    e.preventDefault()
                    setViewerZoom(1)
                    break
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [documentViewer, zoomToNextPreset, onClose])

    if (!documentViewer) return null

    return (
        <div
            className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50"
            onClick={onClose}
        >
            {/* Toolbar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10">
                <h3 className="text-white font-semibold text-lg truncate pr-4">{documentViewer.title}</h3>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Zoom controls */}
                    <button
                        onClick={(e) => { e.stopPropagation(); zoomToNextPreset(-1) }}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Zoom Out (-)"
                    >
                        <ZoomOut className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-white/80 text-sm font-medium min-w-[3rem] text-center">
                        {Math.round(viewerZoom * 100)}%
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); zoomToNextPreset(1) }}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Zoom In (+)"
                    >
                        <ZoomIn className="w-5 h-5 text-white" />
                    </button>

                    <div className="w-px h-6 bg-white/20 mx-1" />

                    {/* Fit controls */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleFitWidth() }}
                        className="px-2.5 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs text-white font-medium"
                        title="Fit to Width"
                    >
                        <Maximize2 className="w-4 h-4 text-white" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleFitHeight() }}
                        className="px-2.5 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs text-white font-medium"
                        title="Fit to Height"
                    >
                        <Minimize2 className="w-4 h-4 text-white" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setViewerZoom(1) }}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="Reset Zoom (0)"
                    >
                        <RotateCcw className="w-4 h-4 text-white" />
                    </button>

                    <div className="w-px h-6 bg-white/20 mx-1" />

                    {/* Download & Close */}
                    <a
                        href={documentViewer.src}
                        download={documentViewer.title.replace(/\s/g, '_')}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Download"
                    >
                        <Download className="w-5 h-5 text-white" />
                    </a>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Close (Esc)"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>

            <div
                ref={viewerContainerRef}
                className="flex-1 w-full overflow-auto flex items-center justify-center p-8 pt-20"
                onClick={(e) => e.stopPropagation()}
                onWheel={handleViewerWheel}
                onTouchStart={(e) => {
                    if (e.touches.length === 2) {
                        const dist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        )
                        viewerContainerRef.current._pinchStart = dist
                        viewerContainerRef.current._pinchZoomStart = viewerZoom
                    }
                }}
                onTouchMove={(e) => {
                    if (e.touches.length === 2 && viewerContainerRef.current._pinchStart) {
                        e.preventDefault()
                        const dist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        )
                        const scale = dist / viewerContainerRef.current._pinchStart
                        setViewerZoom(Math.min(5, Math.max(0.1, viewerContainerRef.current._pinchZoomStart * scale)))
                    }
                }}
                onTouchEnd={() => {
                    if (viewerContainerRef.current) {
                        viewerContainerRef.current._pinchStart = null
                        viewerContainerRef.current._pinchZoomStart = null
                    }
                }}
            >
                {isImageDocument(documentViewer.src) ? (
                    <>
                        {imageLoading && (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                <p className="text-sm text-slate-400">Loading document...</p>
                            </div>
                        )}
                        {imageError ? (
                            <div className="bg-slate-900 rounded-2xl p-8 text-center shadow-2xl max-w-sm border border-slate-800">
                                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                <h4 className="text-lg font-semibold text-white mb-2">Failed to load image</h4>
                                <p className="text-sm text-slate-400 mb-4">The document could not be displayed.</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setImageError(false)
                                        setImageLoading(true)
                                    }}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-medium"
                                >
                                    <RotateCcw className="w-4 h-4" /> Retry
                                </button>
                            </div>
                        ) : (
                            <img
                                ref={viewerImageRef}
                                src={documentViewer.src}
                                alt={documentViewer.title}
                                className={`max-w-none rounded-lg shadow-2xl transition-transform duration-200 select-none ${imageLoading ? 'hidden' : ''}`}
                                style={{ transform: `scale(${viewerZoom})`, transformOrigin: 'center center' }}
                                draggable={false}
                                onLoad={() => setImageLoading(false)}
                                onError={() => { setImageLoading(false); setImageError(true) }}
                            />
                        )}
                    </>
                ) : isPdfDocument(documentViewer.src) ? (
                    <div className="w-full h-full max-w-6xl bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
                        <iframe
                            src={documentViewer.src}
                            title={documentViewer.title}
                            className="w-full h-full min-h-[80vh]"
                        />
                    </div>
                ) : (
                    <div className="bg-slate-900 rounded-2xl p-8 text-center shadow-2xl max-w-sm border border-slate-800">
                        <FileText className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-white mb-2">{documentViewer.title}</h4>
                        <p className="text-sm text-slate-400 mb-4">This document cannot be previewed inline.</p>
                        <a
                            href={documentViewer.src}
                            download={documentViewer.title.replace(/\s/g, '_')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors font-medium"
                        >
                            <Download className="w-4 h-4" /> Download File
                        </a>
                    </div>
                )}
            </div>

            {/* Keyboard hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">
                Ctrl+Scroll to zoom  |  +/- keys to zoom  |  0 to reset  |  Esc to close
            </div>
        </div>
    )
}

export { DocumentViewer }
export default DocumentViewer
