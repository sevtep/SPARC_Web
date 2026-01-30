import React, { useState, useEffect, useRef, useCallback } from 'react';
import './QuizCompetition.css';

// Game states
const GameState = {
  IDLE: 'idle',
  PRE_ROUND_COUNTDOWN: 'preRoundCountdown',
  QUESTION_ACTIVE: 'questionActive',
  WAITING_FOR_OPPONENT: 'waitingForOpponent',
  EVALUATING: 'evaluating',
  ROUND_RESULT: 'roundResult',
  GAME_OVER: 'gameOver'
};

// Sample questions (can be expanded)
const sampleQuestions = [
  {
    id: 1,
    questionText: "What is the capital of France?",
    correctAnswer: "Paris",
    category: "Geography",
    basePoints: 100,
    timeLimitSeconds: 30
  },
  {
    id: 2,
    questionText: "What is 15 × 8?",
    correctAnswer: "120",
    category: "Math",
    basePoints: 100,
    timeLimitSeconds: 25
  },
  {
    id: 3,
    questionText: "Who wrote 'Romeo and Juliet'?",
    correctAnswer: "William Shakespeare",
    category: "Literature",
    basePoints: 100,
    timeLimitSeconds: 30
  },
  {
    id: 4,
    questionText: "What is the chemical symbol for water?",
    correctAnswer: "H2O",
    category: "Science",
    basePoints: 100,
    timeLimitSeconds: 20
  },
  {
    id: 5,
    questionText: "In which year did World War II end?",
    correctAnswer: "1945",
    category: "History",
    basePoints: 100,
    timeLimitSeconds: 30
  }
];

// Cap system prompt for generating answers
const CAP_SYSTEM_PROMPT = `You are Cap, a funny and slightly silly robot contestant in a quiz competition.
You're competitive but lovable. Give your answer directly and concisely.
Do NOT explain your reasoning. Just give the answer in 1-5 words maximum.
Be confident even if you might be wrong sometimes.`;

// Judge system prompt for evaluating answers
const JUDGE_SYSTEM_PROMPT = `You are the Golden Steering Wheel Judge (RBC), a fair and witty quiz judge.
Evaluate the answers given by the Player and Cap.
Award points from 0 to 100 based on correctness and how close the answer is.
Respond EXACTLY in this format (3 lines only):
PlayerScore: [0-100]
CapScore: [0-100]
Feedback: [One brief witty sentence about the round]`;

const QuizCompetition = ({ isOpen, onClose }) => {
  // Game state
  const [gameState, setGameState] = useState(GameState.IDLE);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  
  // Player state
  const [playerScore, setPlayerScore] = useState(0);
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [playerHasAnswered, setPlayerHasAnswered] = useState(false);
  
  // Cap state
  const [capScore, setCapScore] = useState(0);
  const [capAnswer, setCapAnswer] = useState('');
  const [capHasAnswered, setCapHasAnswered] = useState(false);
  const [capThinking, setCapThinking] = useState(false);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [maxTime, setMaxTime] = useState(30);
  
  // UI state
  const [countdown, setCountdown] = useState(3);
  const [judgeFeedback, setJudgeFeedback] = useState('');
  const [roundPlayerPoints, setRoundPlayerPoints] = useState(0);
  const [roundCapPoints, setRoundCapPoints] = useState(0);
  const [showingResult, setShowingResult] = useState(false);
  
  // Refs
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  
  // CAP wrong answer rate (30% chance of intentionally wrong answer)
  const capWrongAnswerRate = 0.3;
  const capThinkingSeconds = 2;

  // Initialize game
  const initializeGame = useCallback(() => {
    // Shuffle and select questions
    const shuffled = [...sampleQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, totalRounds);
    setQuestions(selected);
    
    // Reset state
    setCurrentRound(0);
    setPlayerScore(0);
    setCapScore(0);
    setPlayerAnswer('');
    setCapAnswer('');
    setPlayerHasAnswered(false);
    setCapHasAnswered(false);
    setJudgeFeedback('');
    setShowingResult(false);
    setGameState(GameState.IDLE);
  }, [totalRounds]);

  // Start game
  const startGame = useCallback(() => {
    initializeGame();
    setTimeout(() => {
      startNextRound();
    }, 100);
  }, [initializeGame]);

  // Start next round
  const startNextRound = useCallback(() => {
    if (currentRound >= questions.length && questions.length > 0) {
      setGameState(GameState.GAME_OVER);
      return;
    }
    
    const question = questions[currentRound] || sampleQuestions[currentRound % sampleQuestions.length];
    setCurrentQuestion(question);
    setPlayerAnswer('');
    setCapAnswer('');
    setPlayerHasAnswered(false);
    setCapHasAnswered(false);
    setJudgeFeedback('');
    setShowingResult(false);
    
    // Start countdown
    setGameState(GameState.PRE_ROUND_COUNTDOWN);
    setCountdown(3);
    
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        beginQuestion(question);
      }
    }, 1000);
  }, [currentRound, questions]);

  // Begin question phase
  const beginQuestion = useCallback((question) => {
    setGameState(GameState.QUESTION_ACTIVE);
    const timeLimit = question?.timeLimitSeconds || 30;
    setTimeRemaining(timeLimit);
    setMaxTime(timeLimit);
    
    // Focus input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    
    // Generate Cap's answer
    generateCapAnswer(question);
    
    // Start timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Generate Cap's answer using Ollama with timeout
  const generateCapAnswer = useCallback(async (question) => {
    setCapThinking(true);
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, capThinkingSeconds * 1000));
    
    // Determine if Cap should give a wrong answer
    const shouldBeWrong = Math.random() < capWrongAnswerRate;
    
    let prompt = `Question: ${question.questionText}\nCategory: ${question.category}`;
    
    if (shouldBeWrong) {
      prompt += "\n\nIMPORTANT: For this question, give a WRONG but plausible-sounding answer. Make it sound confident but be incorrect.";
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch('/llm/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:8b',
          messages: [
            { role: 'system', content: CAP_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        let answer = data.message?.content || data.choices?.[0]?.message?.content || "I don't know";
        
        // Remove <think> tags from qwen3
        answer = answer.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        // Clean up quotes
        if (answer.startsWith('"') && answer.endsWith('"')) {
          answer = answer.slice(1, -1);
        }
        
        setCapAnswer(answer);
        setCapHasAnswered(true);
        setCapThinking(false);
      } else {
        // Fallback if API fails
        setCapAnswer("Hmm... let me guess...");
        setCapHasAnswered(true);
        setCapThinking(false);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Cap answer error:', error);
      // Fallback answer on error or timeout
      const fallbackAnswers = ["I think it's...", "My guess is...", "Hmm, tricky!", "Let me say..."];
      setCapAnswer(fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)]);
      setCapHasAnswered(true);
      setCapThinking(false);
    }
  }, []);

  // Handle player answer submission
  const submitPlayerAnswer = useCallback(() => {
    if (gameState !== GameState.QUESTION_ACTIVE || playerHasAnswered) return;
    
    setPlayerHasAnswered(true);
    
    // Disable further input
    if (inputRef.current) {
      inputRef.current.disabled = true;
    }
    
    checkForRoundEnd();
  }, [gameState, playerHasAnswered]);

  // Handle time out
  const handleTimeOut = useCallback(() => {
    if (!playerHasAnswered) {
      setPlayerAnswer('(Time Out)');
      setPlayerHasAnswered(true);
    }
    checkForRoundEnd();
  }, [playerHasAnswered]);

  // Check if round should end
  const checkForRoundEnd = useCallback(() => {
    // This will be called after state updates, so we need to check in useEffect
  }, []);

  // Effect to check for round end
  useEffect(() => {
    // Check if both have answered (works in both QUESTION_ACTIVE and WAITING_FOR_OPPONENT states)
    if ((gameState === GameState.QUESTION_ACTIVE || gameState === GameState.WAITING_FOR_OPPONENT) 
        && playerHasAnswered && capHasAnswered) {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      judgeRound();
    } else if (gameState === GameState.QUESTION_ACTIVE && playerHasAnswered && !capHasAnswered) {
      setGameState(GameState.WAITING_FOR_OPPONENT);
    }
  }, [playerHasAnswered, capHasAnswered, gameState]);

  // Judge the round
  const judgeRound = useCallback(async () => {
    setGameState(GameState.EVALUATING);
    setJudgeFeedback('Judging...');
    
    const correctInfo = currentQuestion?.correctAnswer 
      ? `(Correct Answer: ${currentQuestion.correctAnswer})`
      : '';
    
    const judgeInput = `Question: ${currentQuestion?.questionText} ${correctInfo}
Player Answer: ${playerAnswer || '(No answer)'}
Cap Answer: ${capAnswer}`;
    
    try {
      const response = await fetch('/llm/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:8b',
          messages: [
            { role: 'system', content: JUDGE_SYSTEM_PROMPT },
            { role: 'user', content: judgeInput }
          ],
          stream: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        let judgeResponse = data.message?.content || data.choices?.[0]?.message?.content || 'PlayerScore: 0\nCapScore: 0\nFeedback: Unable to judge.';
        
        // Remove <think> tags
        judgeResponse = judgeResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        applyJudgeResults(judgeResponse);
      } else {
        applyJudgeResults('PlayerScore: 50\nCapScore: 50\nFeedback: Technical difficulties! Both get points.');
      }
    } catch (error) {
      console.error('Judge error:', error);
      applyJudgeResults('PlayerScore: 50\nCapScore: 50\nFeedback: Judge malfunction! Fair play points.');
    }
  }, [currentQuestion, playerAnswer, capAnswer]);

  // Apply judge results
  const applyJudgeResults = useCallback((rawResponse) => {
    let pScore = 0;
    let cScore = 0;
    let feedback = rawResponse;
    
    try {
      const lines = rawResponse.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().startsWith('playerscore:')) {
          const match = line.match(/\d+/);
          if (match) pScore = parseInt(match[0], 10);
        } else if (line.toLowerCase().startsWith('capscore:')) {
          const match = line.match(/\d+/);
          if (match) cScore = parseInt(match[0], 10);
        } else if (line.toLowerCase().startsWith('feedback:')) {
          feedback = line.substring(9).trim();
        }
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
    
    // Cap scores at 100
    pScore = Math.min(100, Math.max(0, pScore));
    cScore = Math.min(100, Math.max(0, cScore));
    
    setRoundPlayerPoints(pScore);
    setRoundCapPoints(cScore);
    setPlayerScore(prev => prev + pScore);
    setCapScore(prev => prev + cScore);
    setJudgeFeedback(feedback);
    setShowingResult(true);
    setGameState(GameState.ROUND_RESULT);
  }, []);

  // Handle next round
  const handleNextRound = useCallback(() => {
    setShowingResult(false);
    setCurrentRound(prev => prev + 1);
  }, []);

  // Effect to start next round after incrementing
  useEffect(() => {
    if (currentRound > 0 && !showingResult && gameState === GameState.ROUND_RESULT) {
      if (currentRound >= questions.length) {
        setGameState(GameState.GAME_OVER);
      } else {
        startNextRound();
      }
    }
  }, [currentRound, showingResult, gameState, questions.length, startNextRound]);

  // Handle key press for answer submission
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && gameState === GameState.QUESTION_ACTIVE && !playerHasAnswered) {
      submitPlayerAnswer();
    }
  }, [gameState, playerHasAnswered, submitPlayerAnswer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Initialize when opened
  useEffect(() => {
    if (isOpen && gameState === GameState.IDLE) {
      initializeGame();
    }
  }, [isOpen, gameState, initializeGame]);

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState(GameState.IDLE);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  // Calculate timer percentage
  const timerPercentage = (timeRemaining / maxTime) * 100;
  const timerColor = timerPercentage > 50 ? '#4CAF50' : timerPercentage > 25 ? '#FFC107' : '#f44336';

  return (
    <div className="quiz-competition-overlay">
      <div className="quiz-competition-panel">
        {/* Close button */}
        <button className="quiz-close-btn" onClick={handleClose} data-agent-id="quiz_close">
          ✕
        </button>

        {/* Header with scores */}
        <div className="quiz-header">
          <div className="quiz-title">🏆 Quiz Competition</div>
          <div className="quiz-round-info">
            Round {Math.min(currentRound + 1, questions.length || totalRounds)} / {questions.length || totalRounds}
          </div>
        </div>

        {/* Score board */}
        <div className="quiz-scoreboard">
          <div className="score-item player-score">
            <img src="/Player.png" alt="Player" className="score-avatar" />
            <span className="score-label">You</span>
            <span className="score-value">{playerScore}</span>
          </div>
          <div className="score-vs">VS</div>
          <div className="score-item cap-score">
            <img src="/Cap.png" alt="Cap" className="score-avatar" />
            <span className="score-label">Cap</span>
            <span className="score-value">{capScore}</span>
          </div>
        </div>

        {/* Game content */}
        <div className="quiz-content">
          {/* Idle / Start screen */}
          {gameState === GameState.IDLE && (
            <div className="quiz-start-screen">
              <div className="start-avatars">
                <img src="/Player.png" alt="Player" className="start-avatar" />
                <span className="vs-text">VS</span>
                <img src="/Cap.png" alt="Cap" className="start-avatar" />
              </div>
              <h2>Ready to Challenge Cap?</h2>
              <p>Answer questions faster and more accurately than Cap to win!</p>
              <button className="quiz-start-btn" onClick={startGame} data-agent-id="quiz_start">
                Start Competition
              </button>
            </div>
          )}

          {/* Countdown */}
          {gameState === GameState.PRE_ROUND_COUNTDOWN && (
            <div className="quiz-countdown">
              <div className="countdown-number">{countdown > 0 ? countdown : 'GO!'}</div>
            </div>
          )}

          {/* Question active / Waiting */}
          {(gameState === GameState.QUESTION_ACTIVE || gameState === GameState.WAITING_FOR_OPPONENT) && currentQuestion && (
            <div className="quiz-question-area">
              {/* Timer */}
              <div className="quiz-timer">
                <div 
                  className="timer-bar" 
                  style={{ 
                    width: `${timerPercentage}%`,
                    backgroundColor: timerColor
                  }}
                />
                <span className="timer-text">{timeRemaining}s</span>
              </div>

              {/* Category */}
              <div className="question-category">{currentQuestion.category}</div>

              {/* Question */}
              <div className="question-text">{currentQuestion.questionText}</div>

              {/* Player answer area */}
              <div className="player-answer-area">
                <div className="answer-avatar-row">
                  <img src="/Player.png" alt="You" className="answer-avatar" />
                  <div className="answer-input-wrapper">
                    <input
                      ref={inputRef}
                      type="text"
                      className="answer-input"
                      placeholder="Type your answer..."
                      value={playerAnswer}
                      onChange={(e) => setPlayerAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={playerHasAnswered}
                      data-agent-id="quiz_answer_input"
                    />
                    <button 
                      className="submit-btn"
                      onClick={submitPlayerAnswer}
                      disabled={playerHasAnswered}
                      data-agent-id="quiz_submit"
                    >
                      {playerHasAnswered ? '✓ Submitted' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Cap status */}
              <div className="cap-status-area">
                <div className="cap-avatar-row">
                  <img src="/Cap.png" alt="Cap" className={`answer-avatar ${capThinking ? 'thinking' : ''}`} />
                  <div className="cap-status">
                    {capThinking ? (
                      <span className="cap-thinking">🤔 Thinking...</span>
                    ) : capHasAnswered ? (
                      <span className="cap-answered">✓ Cap has answered!</span>
                    ) : (
                      <span className="cap-waiting">Waiting...</span>
                    )}
                  </div>
                </div>
              </div>

              {gameState === GameState.WAITING_FOR_OPPONENT && (
                <div className="waiting-message">Waiting for Cap to finish...</div>
              )}
            </div>
          )}

          {/* Evaluating */}
          {gameState === GameState.EVALUATING && (
            <div className="quiz-evaluating">
              <img src="/RBC.png" alt="Judge RBC" className="judge-avatar thinking" />
              <div className="evaluating-text">🎯 RBC is judging...</div>
            </div>
          )}

          {/* Round result */}
          {gameState === GameState.ROUND_RESULT && showingResult && (
            <div className="quiz-result">
              <div className="result-judge">
                <img src="/RBC.png" alt="Judge RBC" className="judge-avatar" />
                <div className="judge-name">Judge RBC</div>
              </div>

              <div className="result-scores">
                <div className={`result-score player ${roundPlayerPoints > roundCapPoints ? 'winner' : ''}`}>
                  <img src="/Player.png" alt="You" className="result-avatar" />
                  <span className="result-label">You</span>
                  <span className="result-points">+{roundPlayerPoints}</span>
                  <div className="result-answer">"{playerAnswer || '(No answer)'}"</div>
                </div>
                <div className={`result-score cap ${roundCapPoints > roundPlayerPoints ? 'winner' : ''}`}>
                  <img src="/Cap.png" alt="Cap" className="result-avatar" />
                  <span className="result-label">Cap</span>
                  <span className="result-points">+{roundCapPoints}</span>
                  <div className="result-answer">"{capAnswer}"</div>
                </div>
              </div>

              <div className="judge-feedback">
                <div className="correct-answer">
                  Correct Answer: <strong>{currentQuestion?.correctAnswer}</strong>
                </div>
                <div className="feedback-text">"{judgeFeedback}"</div>
              </div>

              <button className="next-round-btn" onClick={handleNextRound} data-agent-id="quiz_next">
                {currentRound + 1 >= questions.length ? 'See Results' : 'Next Round →'}
              </button>
            </div>
          )}

          {/* Game over */}
          {gameState === GameState.GAME_OVER && (
            <div className="quiz-game-over">
              <div className="game-over-title">
                {playerScore > capScore ? '🎉 You Win!' : playerScore < capScore ? '😅 Cap Wins!' : '🤝 It\'s a Draw!'}
              </div>
              
              <div className="final-scores">
                <div className={`final-score player ${playerScore > capScore ? 'winner' : ''}`}>
                  <img src="/Player.png" alt="You" className="final-avatar" />
                  <span className="final-label">You</span>
                  <span className="final-points">{playerScore}</span>
                </div>
                <div className="final-vs">VS</div>
                <div className={`final-score cap ${capScore > playerScore ? 'winner' : ''}`}>
                  <img src="/Cap.png" alt="Cap" className="final-avatar" />
                  <span className="final-label">Cap</span>
                  <span className="final-points">{capScore}</span>
                </div>
              </div>

              <div className="game-over-actions">
                <button className="play-again-btn" onClick={startGame} data-agent-id="quiz_play_again">
                  Play Again
                </button>
                <button className="close-btn" onClick={handleClose} data-agent-id="quiz_close_final">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizCompetition;
