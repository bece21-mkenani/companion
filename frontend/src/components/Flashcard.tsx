import axios from 'axios';
import { motion, type Variants } from 'framer-motion';
import { History, Loader2 } from 'lucide-react';
import React, { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../App';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3036';

interface Flashcard {
  id: string;
  user_id: string;
  subject: string;
  front: string;
  back: string;
  created_at: string;
}

const Flashcard: React.FC = () => {
  useContext(ThemeContext);
  const [subject, setSubject] = useState('');
  const [count, setCount] = useState(5);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

  // Load flashcards history from localStorage on mount
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('flashcard_history') || '[]');
    setFlashcards(savedHistory);
  }, []);

  // Save flashcards to localStorage when changed
  useEffect(() => {
    if (flashcards.length > 0) {
      localStorage.setItem('flashcard_history', JSON.stringify(flashcards));
    }
  }, [flashcards]);

  const handleGenerateFlashcards = async () => {
    if (!subject.trim() || count <= 0) {
      setError('Please enter a subject and count > 0');
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const userResponse = await axios.get(`${apiUrl}/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userId = userResponse.data.user.id;

      const response = await axios.post(
        `${apiUrl}/flashcard/generate`,
        { userId, subject, count },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newCards = response.data.flashcards || [];
      setFlashcards((prev) => [...newCards, ...prev]);
      setError(null);
    } catch (err: any) {
      console.error('Generate Flashcards Error:', err.response?.data || err.message);
      setError('Failed to generate flashcards');
    } finally {
      setIsGenerating(false);
    }
  };

  const flashcardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const handleClearHistory = () => {
    localStorage.removeItem('flashcard_history');
    setFlashcards([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-gray-100 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-md"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <History className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Flashcard Generator
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base max-w-md mx-auto">
          Create and review flashcards easily. Your generated cards are saved locally for quick access.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-500 dark:text-red-400 text-center mb-4 text-sm sm:text-base">{error}</p>
      )}

      {/* Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subject or Topic
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            placeholder="Enter Subject or Topic (e.g., Calculus or Statistics or Vectors)..."
          />
        </div>

        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Flashcards
          </label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 0)}
            className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            placeholder="5"
            min="1"
            max="20"
          />
        </div>
<div className="flex flex-col sm:flex-row gap-3 mt-4">
  <motion.button
    onClick={handleGenerateFlashcards}
    disabled={isGenerating || !subject.trim() || count <= 0}
    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-md text-sm sm:text-base disabled:opacity-50 flex items-center justify-center"
  >
    {isGenerating ? (
      <>
        <Loader2 size={20} className="animate-spin mr-2" /> Generating...
      </>
    ) : (
      `Generate ${count} Flashcards`
    )}
  </motion.button>

  <button
    onClick={() => setShowHistory(!showHistory)}
    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm sm:text-base hover:bg-gray-300 dark:hover:bg-gray-600 transition"
  >
    {showHistory ? 'Hide History' : 'View History'}
  </button>
</div>

      </div>

      {/* Flashcards / History */}
      {showHistory && flashcards.length > 0 && (
        <motion.div
          variants={flashcardVariants}
          initial="hidden"
          animate="visible"
          className="mt-6 p-4 bg-white dark:bg-gray-700 rounded-md shadow-inner"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Flashcards</h3>
            <button
              onClick={handleClearHistory}
              className="text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {flashcards.map((card) => (
              <motion.div
                key={card.id}
                onClick={() => setFlippedCard(flippedCard === card.id ? null : card.id)}
                className="cursor-pointer border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-800 transition-transform hover:scale-[1.02]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1 text-sm">
                  {card.subject}
                </h4>
                {flippedCard === card.id ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300">{card.back}</p>
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">{card.front}</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Flashcard;
