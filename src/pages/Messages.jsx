import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToConversations, getOrCreateConversation } from '../services/messagingService'
import ConversationList from '../components/messaging/ConversationList'
import ChatWindow from '../components/messaging/ChatWindow'
import EmptyState from '../components/messaging/EmptyState'
import { ConversationListSkeleton } from '../components/LoadingSkeletons'
import { AlertCircle } from 'lucide-react'

const Messages = () => {
    const { conversationId: paramConvId } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { currentUser, userData } = useAuth()

    const [conversations, setConversations] = useState([])
    const [activeConversation, setActiveConversation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showChat, setShowChat] = useState(false) // mobile toggle

    // Subscribe to conversations
    useEffect(() => {
        if (!currentUser) return

        const unsubscribe = subscribeToConversations(
            currentUser.uid,
            (convs) => {
                setConversations(convs)
                setLoading(false)
                setError(null)

                // If we have a paramConvId, auto-select it
                if (paramConvId) {
                    const conv = convs.find(c => c.id === paramConvId)
                    if (conv) {
                        setActiveConversation(conv)
                        setShowChat(true)
                    }
                }
            },
            (err) => {
                setLoading(false)
                setError(err.message || 'Failed to load conversations')
            }
        )

        return () => unsubscribe()
    }, [currentUser, paramConvId])

    // Handle deep-linking via query params (?startWith=uid&jobId=...&jobTitle=...)
    useEffect(() => {
        const startWith = searchParams.get('startWith')
        if (!startWith || !currentUser || !userData) return

        const jobId = searchParams.get('jobId')
        const jobTitle = searchParams.get('jobTitle')

        const initConversation = async () => {
            try {
                // Fetch the other user's info
                const userDoc = await getDoc(doc(db, 'users', startWith))
                const otherUserData = userDoc.exists() ? userDoc.data() : null

                const conversation = await getOrCreateConversation(
                    { uid: currentUser.uid, name: userData.name, role: userData.role },
                    {
                        uid: startWith,
                        name: otherUserData?.name || 'User',
                        role: otherUserData?.role || 'unknown'
                    },
                    jobId ? { jobId, jobTitle: jobTitle || '' } : null
                )

                setActiveConversation(conversation)
                setShowChat(true)

                // Clean up URL params
                navigate('/messages', { replace: true })
            } catch (err) {
                console.error('Error initializing conversation:', err)
                setError(err.message || 'Failed to start conversation')
            }
        }

        initConversation()
    }, [searchParams, currentUser, userData, navigate])

    // Keep active conversation in sync with live data
    useEffect(() => {
        if (!activeConversation) return
        const updated = conversations.find(c => c.id === activeConversation.id)
        if (updated) {
            setActiveConversation(updated)
        }
    }, [conversations])

    const handleSelectConversation = (conv) => {
        setActiveConversation(conv)
        setShowChat(true)
    }

    const handleBack = () => {
        setShowChat(false)
    }

    if (!currentUser) return null

    if (error) {
        return (
            <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Could not load messages</h3>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
                    <button
                        onClick={() => { setError(null); setLoading(true) }}
                        className="btn-primary"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex bg-white">
            {/* Conversation List - hidden on mobile when chat is open */}
            <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${showChat ? 'hidden md:flex' : 'flex'} flex-col`}>
                {loading ? (
                    <ConversationListSkeleton />
                ) : (
                    <ConversationList
                        conversations={conversations}
                        currentUserId={currentUser.uid}
                        activeConversationId={activeConversation?.id}
                        onSelect={handleSelectConversation}
                    />
                )}
            </div>

            {/* Chat Window or Empty State */}
            <div className={`flex-1 ${showChat ? 'flex' : 'hidden md:flex'} flex-col min-w-0`}>
                {activeConversation ? (
                    <ChatWindow
                        conversation={activeConversation}
                        currentUserId={currentUser.uid}
                        onBack={handleBack}
                    />
                ) : (
                    <EmptyState />
                )}
            </div>
        </div>
    )
}

export default Messages
