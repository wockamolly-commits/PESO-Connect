import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function AnimatedSection({ show, children }) {
  const [isAnimating, setIsAnimating] = useState(false)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ overflow: isAnimating ? 'hidden' : 'visible' }}
          onAnimationStart={() => setIsAnimating(true)}
          onAnimationComplete={() => setIsAnimating(false)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { AnimatedSection }
