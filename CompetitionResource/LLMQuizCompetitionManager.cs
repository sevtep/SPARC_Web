using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Simple data container for one quiz question.
/// </summary>
[Serializable]
public class QuizQuestion
{
    public string id;
    [TextArea(2, 5)] public string questionText;
    [Tooltip("Reference answer for the judge (optional but helpful).")]
    public string correctAnswer;
    public string category;
    [Tooltip("Base points for a fully correct answer.")]
    public int basePoints = 100;
    [Tooltip("Optional per-question time limit. If <= 0, default time will be used.")]
    public float timeLimitSeconds = 30f;
    
    [Header("Audio")]
    [Tooltip("Audio clip to play when the question is shown")]
    public AudioClip questionAudio;
    [Tooltip("Audio clip to play when the answer is revealed")]
    public AudioClip answerAudio;
    [Tooltip("Optional background audio for this question")]
    public AudioClip backgroundAudio;
    [Tooltip("Delay before playing question audio")]
    public float audioDelay = 0.5f;
}

/// <summary>
/// Basic player state.
/// </summary>
[Serializable]
public class PlayerState
{
    public string playerName = "Player";
    public int score;
    public int correctCount;
    public int incorrectCount;
    public int timeoutCount;
    public int streak;
    [HideInInspector] public string lastAnswer;
}

public enum QuizGameState
{
    Idle,
    PreRoundCountdown,
    QuestionActive,
    WaitingForOpponent, // New state: Player answered, waiting for Cap
    Evaluating,        // Waiting for Judge
    RoundResult,       // Showing feedback
    GameOver,
    Paused
}

public class LLMQuizCompetitionManager : MonoBehaviour
{
    [Header("Quiz Setup - ScriptableObject")]
    [Tooltip("Assign a Question Bank ScriptableObject for easy question management")]
    public QuizQuestionBank questionBank;

    [Header("Quiz Setup - Legacy/Fallback")]
    [Tooltip("Fallback questions if no Question Bank is assigned")]
    public List<QuizQuestion> questions = new List<QuizQuestion>();
    
    [Header("Quiz Options")]
    public bool randomizeQuestionOrder = true;
    public int totalRounds = 0;
    public bool autoStartOnPlay = true;

    [Header("Competitors")]
    public PlayerState player = new PlayerState { playerName = "Player" };
    public PlayerState capAgent = new PlayerState { playerName = "Cap" };

    [Header("Timing")]
    public float preRoundCountdownSeconds = 3f;
    public float defaultQuestionTimeLimitSeconds = 30f;
    public bool useAnswerTimer = true;
    
    [Tooltip("How long CAP 'thinks' before sending request to LLM (simulates thinking time)")]
    [Range(0f, 10f)]
    public float capThinkingSeconds = 2f;
    
    [Tooltip("Probability that CAP gives a wrong answer (0 = always correct, 1 = always wrong)")]
    [Range(0f, 1f)]
    public float capWrongAnswerRate = 0.3f;

    [Header("Text Animation Speed")]
    [Tooltip("RBC Judge feedback text speed (characters per second). Higher = faster.")]
    [Range(10f, 100f)]
    public float judgeFeedbackSpeed = 40f;
    
    [Tooltip("Question text transition speed (characters per second).")]
    [Range(20f, 120f)]
    public float questionTextSpeed = 50f;

    [Header("UI References")]
    public TMP_Text questionText;
    public TMP_Text categoryText;
    public TMP_Text countdownText;
    public TMP_Text timerText;
    public Slider timerSlider;
    public TMP_InputField answerInput;
    public TMP_Text roundsText;
    public TMP_Text playerScoreText;
    public TMP_Text headerScoreText;

    [Header("Cap / Opponent UI")]
    public TMP_Text capScoreText;
    public TMP_Text capAnswerText; // Shows Cap's answer
    public GameObject capThinkingVisual; // Active while Cap is generating

    [Header("Judge / Results UI")]
    public TMP_Text judgeFeedbackText; // The main feedback box
    public GameObject resultsPanel;
    public TMP_Text resultsSummaryText;

    [Header("Audio")]
    public AudioSource sfxAudioSource;
    [Tooltip("Separate AudioSource for question narration/audio (allows independent volume control)")]
    public AudioSource questionAudioSource;
    [Tooltip("Separate AudioSource for background music/ambience per question")]
    public AudioSource backgroundAudioSource;
    public AudioClip sfxCountdownTick;
    public AudioClip sfxCountdownGo;
    public AudioClip sfxCorrect;
    public AudioClip sfxIncorrect;
    public AudioClip sfxTimeUp;
    

    [Header("Avatar Animation Controllers")]
    public SpriteAnimationController rbcAvatarAnimator;
    public SpriteAnimationController capAvatarAnimator;

    [Header("UI Animation Targets")]
    public RectTransform questionCardRect;
    public RectTransform playerAreaRect;
    public RectTransform capBubbleRect;
    
    [Header("Judge Panel (Full-screen overlay)")]
    public GameObject judgePanel;
    public CanvasGroup judgePanelCanvasGroup;
    public GameObject mainContentPanel;
    public Image judgeRBCAvatarImage;
    public TMP_Text judgePlayerScoreText;
    public TMP_Text judgeCapScoreText;
    
    [Header("Button References")]
    public GameObject submitButton;
    public GameObject skipButton;
    public GameObject nextRoundButton;
    public Image timerFillImage;
    public Image playerAvatarImage;

    // Internal state
    public QuizGameState GameState { get; private set; } = QuizGameState.Idle;

    private int _currentRoundIndex = -1;
    private int _currentQuestionIndex = -1;
    private List<int> _questionOrder = new List<int>();

    private float _timeRemaining;
    private float _timeMax;
    
    private bool _capHasAnswered;
    private bool _playerHasAnswered;
    private bool _isPaused;
    private bool _waitingForNextRound;

    // Cap Persona Prompt
    private string _capSystemPrompt = "You are 'Cap', a funny, slightly silly, but competitive robot quiz contestant. " +
                                      "You give thoughtful but sometimes incorrect, sometimes brilliant answers. " +
                                      "Keep your answer between 50-70 words. Explain your reasoning briefly. If you don't know, guess creatively. " +
                                      "IMPORTANT: Do NOT use any emojis in your response.";

    // Judge Persona Prompt
    private string _judgeSystemPrompt = "You are the 'Golden Steering Wheel' Judge. " +
                                        "Evaluate the answers from the Player and Cap based on the Question and Correct Answer. " +
                                        "Award points (0-100) based on correctness. " +
                                        "Format your response EXACTLY as:\n" +
                                        "PlayerScore: [0-100]\n" +
                                        "CapScore: [0-100]\n" +
                                        "Feedback: [Short commentary on who won the round and why]\n" +
                                        "IMPORTANT: Do NOT use any emojis in your response.";

    private QuizUIAnimator _uiAnimator;

    private void Start()
    {
        // Get or create UI animator
        _uiAnimator = GetComponent<QuizUIAnimator>();
        if (_uiAnimator == null) _uiAnimator = gameObject.AddComponent<QuizUIAnimator>();

        if (autoStartOnPlay)
        {
            InitializeGame();
            StartGame();
        }
    }

    private void Update()
    {
        if (!_isPaused && GameState == QuizGameState.QuestionActive && useAnswerTimer)
        {
            TickTimer();
        }
    }

    #region Public UI Hooks

    public void StartGameButton() => StartGame();
    
    public void SubmitAnswerFromUI()
    {
        if (answerInput == null) return;
        FadeOutButtons();
        SubmitPlayerAnswer(answerInput.text);
    }

    public void SkipQuestionFromUI()
    {
        if (GameState != QuizGameState.QuestionActive) return;
        FadeOutButtons();
        SubmitPlayerAnswer("Skip"); // Treat skip as an answer "Skip"
    }

    private void FadeOutButtons()
    {
        if (_uiAnimator != null)
        {
            if (submitButton != null)
            {
                _uiAnimator.Fade(submitButton, 1f, 0f, 0.3f, () => {
                    submitButton.SetActive(false);
                });
            }
            if (skipButton != null)
            {
                _uiAnimator.Fade(skipButton, 1f, 0f, 0.3f, () => {
                    skipButton.SetActive(false);
                });
            }
        }
        else
        {
            // Fallback: just hide immediately
            if (submitButton != null) submitButton.SetActive(false);
            if (skipButton != null) skipButton.SetActive(false);
        }
    }

    private void FadeInButtons()
    {
        if (submitButton != null)
        {
            submitButton.SetActive(true);
            if (_uiAnimator != null)
            {
                _uiAnimator.Fade(submitButton, 0f, 1f, 0.3f);
            }
        }
        if (skipButton != null)
        {
            skipButton.SetActive(true);
            if (_uiAnimator != null)
            {
                _uiAnimator.Fade(skipButton, 0f, 1f, 0.3f);
            }
        }
    }

    public void PauseGame()
    {
        _isPaused = true;
        Time.timeScale = 0f; // Simple pause
    }

    public void ResumeGame()
    {
        _isPaused = false;
        Time.timeScale = 1f;
    }

    public void RestartGame()
    {
        InitializeGame();
        StartGame();
    }

    public void NextRoundFromUI()
    {
        if (GameState != QuizGameState.RoundResult || !_waitingForNextRound) return;
        
        _waitingForNextRound = false;
        HideNextRoundButton();
        
        // Hide Judge Panel with animation, then start next round
        StartCoroutine(HideJudgePanelAndStartNextRound());
    }

    private IEnumerator HideJudgePanelAndStartNextRound()
    {
        // Hide judge panel
        if (judgePanel != null)
        {
            RectTransform judgePanelRT = judgePanel.GetComponent<RectTransform>();
            
            if (_uiAnimator != null && judgePanelCanvasGroup != null)
            {
                // Animate fade out
                _uiAnimator.Fade(judgePanel, 1f, 0f, 0.3f);
                if (judgePanelRT != null)
                {
                    _uiAnimator.ScaleTo(judgePanelRT, 0.85f, 0.3f);
                }
            }
            
            // Restore main content - MUST re-enable first!
            if (mainContentPanel != null)
            {
                // Re-enable the panel first (it was set to inactive)
                mainContentPanel.SetActive(true);
                
                CanvasGroup mainCG = mainContentPanel.GetComponent<CanvasGroup>();
                RectTransform mainRT = mainContentPanel.GetComponent<RectTransform>();
                
                // Set initial state before animating
                if (mainCG != null) mainCG.alpha = 0f;
                if (mainRT != null) mainRT.localScale = new Vector3(0.9f, 0.9f, 1f);
                
                if (_uiAnimator != null)
                {
                    if (mainCG != null) _uiAnimator.Fade(mainContentPanel, 0f, 1f, 0.4f);
                    if (mainRT != null) _uiAnimator.ScaleTo(mainRT, 1f, 0.4f);
                }
                else
                {
                    if (mainCG != null) mainCG.alpha = 1f;
                    if (mainRT != null) mainRT.localScale = Vector3.one;
                }
            }
            
            // Wait for animation to complete
            yield return new WaitForSecondsRealtime(0.4f);
            
            // Force hide and reset
            judgePanel.SetActive(false);
            if (judgePanelRT != null) judgePanelRT.localScale = Vector3.one;
            if (judgePanelCanvasGroup != null) judgePanelCanvasGroup.alpha = 0f;
        }
        
        // Ensure main content is fully visible
        if (mainContentPanel != null)
        {
            mainContentPanel.SetActive(true);
            CanvasGroup mainCG = mainContentPanel.GetComponent<CanvasGroup>();
            RectTransform mainRT = mainContentPanel.GetComponent<RectTransform>();
            if (mainCG != null) mainCG.alpha = 1f;
            if (mainRT != null) mainRT.localScale = Vector3.one;
        }
        
        // Start next round
        StartNextRound();
    }

    private IEnumerator DelayedStartNextRound(float delay)
    {
        yield return new WaitForSecondsRealtime(delay);
        StartNextRound();
    }

    private void ShowNextRoundButton()
    {
        if (nextRoundButton != null)
        {
            nextRoundButton.SetActive(true);
            if (_uiAnimator != null)
            {
                _uiAnimator.Fade(nextRoundButton, 0f, 1f, 0.3f);
            }
        }
    }

    private void HideNextRoundButton()
    {
        if (nextRoundButton != null)
        {
            if (_uiAnimator != null)
            {
                _uiAnimator.Fade(nextRoundButton, 1f, 0f, 0.3f, () => {
                    nextRoundButton.SetActive(false);
                });
            }
            else
            {
                nextRoundButton.SetActive(false);
            }
        }
    }

    #endregion

    #region Game Flow

    private void InitializeGame()
    {
        GameState = QuizGameState.Idle;
        _currentRoundIndex = -1;
        _currentQuestionIndex = -1;
        _isPaused = false;

        // Load questions from ScriptableObject if available
        LoadQuestionsFromBank();

        _questionOrder.Clear();
        if (questions != null)
        {
            for (int i = 0; i < questions.Count; i++) _questionOrder.Add(i);
        }

        if (resultsPanel != null) resultsPanel.SetActive(false);
        if (nextRoundButton != null) nextRoundButton.SetActive(false);
        
        // Hide Judge Panel and ensure main content is visible
        if (judgePanel != null) judgePanel.SetActive(false);
        if (mainContentPanel != null)
        {
            CanvasGroup mainCG = mainContentPanel.GetComponent<CanvasGroup>();
            if (mainCG != null) mainCG.alpha = 1f;
            RectTransform mainRT = mainContentPanel.GetComponent<RectTransform>();
            if (mainRT != null) mainRT.localScale = Vector3.one;
        }

        ResetPlayer(player);
        ResetPlayer(capAgent);

        UpdateScoreUI();
        UpdateRoundsUI();
        ShowQuestion(null);
        SetCountdownText("");
        UpdateTimerUI(0f, 0f);
        if (judgeFeedbackText) judgeFeedbackText.text = "Welcome to the Golden Steering Wheel Finale!";
        if (capAnswerText) capAnswerText.text = "";
        if (capThinkingVisual) capThinkingVisual.SetActive(false);
    }

    private void ResetPlayer(PlayerState p)
    {
        if (p == null) return;
        p.score = 0;
        p.correctCount = 0;
        p.incorrectCount = 0;
        p.streak = 0;
        p.lastAnswer = "";
    }

    public void StartGame()
    {
        if (questions == null || questions.Count == 0) return;

        if (randomizeQuestionOrder) Shuffle(_questionOrder);

        _currentRoundIndex = -1;
        ResetPlayer(player);
        ResetPlayer(capAgent);
        
        if (resultsPanel != null) resultsPanel.SetActive(false);

        StartNextRound();
    }

    private void StartNextRound()
    {
        _currentRoundIndex++;

        int maxRounds = totalRounds > 0 ? Mathf.Min(totalRounds, _questionOrder.Count) : _questionOrder.Count;

        if (_currentRoundIndex >= maxRounds || _questionOrder.Count == 0)
        {
            EndGame();
            return;
        }

        _currentQuestionIndex = _questionOrder[_currentRoundIndex];
        QuizQuestion q = questions[_currentQuestionIndex];

        StartCoroutine(PreRoundCountdownRoutine(q));
        UpdateRoundsUI();
    }

    private IEnumerator PreRoundCountdownRoutine(QuizQuestion question)
    {
        GameState = QuizGameState.PreRoundCountdown;
        
        if (answerInput != null)
        {
            answerInput.text = "";
            answerInput.interactable = false;
        }
        
        if (judgeFeedbackText) judgeFeedbackText.text = "";
        if (capAnswerText) capAnswerText.text = "";
        if (capThinkingVisual) capThinkingVisual.SetActive(false);

        float countdown = Mathf.Max(0f, preRoundCountdownSeconds);
        while (countdown > 0f)
        {
            SetCountdownText(Mathf.CeilToInt(countdown).ToString());
            PlaySfx(sfxCountdownTick);
            
            // Animate each countdown number with pop effect
            if (countdownText != null && _uiAnimator != null)
            {
                _uiAnimator.PopIn(countdownText.rectTransform, 0.3f);
            }
            
            yield return new WaitForSeconds(0.8f);
            
            // Pop out before next number
            if (countdownText != null && _uiAnimator != null)
            {
                _uiAnimator.PopOut(countdownText.rectTransform, 0.15f);
            }
            yield return new WaitForSeconds(0.2f);
            
            countdown -= 1f;
        }

        SetCountdownText("GO!");
        PlaySfx(sfxCountdownGo);
        
        // Animate "GO!" text with big pop
        if (countdownText != null && _uiAnimator != null)
        {
            countdownText.rectTransform.localScale = Vector3.zero;
            _uiAnimator.PopIn(countdownText.rectTransform, 0.4f);
        }
        
        yield return new WaitForSeconds(0.6f);
        
        // Fade out GO text
        if (countdownText != null && _uiAnimator != null)
        {
            _uiAnimator.Fade(countdownText.gameObject, 1f, 0f, 0.3f, () => {
                SetCountdownText("");
                countdownText.color = new Color(countdownText.color.r, countdownText.color.g, countdownText.color.b, 1f);
                countdownText.rectTransform.localScale = Vector3.one;
            });
        }
        else
        {
            SetCountdownText("");
        }

        BeginQuestion(question);
    }

    private void BeginQuestion(QuizQuestion question)
    {
        GameState = QuizGameState.QuestionActive;
        _playerHasAnswered = false;
        _capHasAnswered = false;

        _timeMax = GetQuestionTimeLimit(question);
        _timeRemaining = _timeMax;
        UpdateTimerUI(_timeRemaining, 1f);

        if (answerInput != null)
        {
            answerInput.text = "";
            answerInput.interactable = true;
            answerInput.ActivateInputField();
        }

        // Fade in buttons for the new round
        FadeInButtons();

        // Play question audio if available
        if (question != null)
        {
            PlayQuestionAudio(question);
        }

        // Smooth animated question transition
        if (_uiAnimator != null)
        {
            // Cross-fade question text for smooth transition
            if (questionText != null)
            {
                _uiAnimator.CrossFadeText(questionText, question != null ? question.questionText : "", 0.5f);
            }
            
            // Cross-fade category text
            if (categoryText != null)
            {
                _uiAnimator.CrossFadeText(categoryText, question != null ? question.category : "", 0.4f);
            }

            // Pop in the question card with bounce
            if (questionCardRect != null)
            {
                _uiAnimator.ScalePunch(questionCardRect, 1.03f, 0.5f);
            }
        }
        else
        {
            // Fallback: direct set
            ShowQuestion(question);
        }

        // RBC Judge goes to idle/watching state
        if (rbcAvatarAnimator != null)
        {
            rbcAvatarAnimator.PlayIdle();
        }

        // Cap returns to idle before starting to think
        if (capAvatarAnimator != null)
        {
            capAvatarAnimator.PlayIdle();
        }

        // Trigger Cap's Answer Logic (will switch to Thinking animation)
        GenerateCapAnswer(question);
    }

    private void GenerateCapAnswer(QuizQuestion question)
    {
        if (capThinkingVisual) capThinkingVisual.SetActive(true);
        if (capAnswerText) capAnswerText.text = "Thinking...";

        // Cap avatar starts thinking animation
        if (capAvatarAnimator != null)
        {
            capAvatarAnimator.PlayThinking();
        }

        // Pulse Cap's bubble while thinking
        if (capBubbleRect != null && _uiAnimator != null)
        {
            _uiAnimator.StartPulse(capBubbleRect, 0.98f, 1.02f, 0.8f);
        }

        // Start coroutine to delay LLM request by capThinkingSeconds
        StartCoroutine(DelayedCapLLMRequest(question));
    }

    private IEnumerator DelayedCapLLMRequest(QuizQuestion question)
    {
        // Wait for the configurable thinking time before sending to LLM
        yield return new WaitForSecondsRealtime(capThinkingSeconds);

        // Determine if CAP should give a wrong answer this round
        bool shouldBeWrong = UnityEngine.Random.value < capWrongAnswerRate;
        
        string prompt = $"Question: {question.questionText}\nCategory: {question.category}";
        
        // Modify prompt to request wrong answer if needed
        if (shouldBeWrong)
        {
            prompt += "\n\nIMPORTANT: For this question, give a WRONG but plausible-sounding answer. " +
                      "Make it sound confident but be incorrect. Do not reveal that you are intentionally wrong.";
        }
        
        // Use internal sender to bypass LLM_Manager's rigid prompt structure
        SendCustomLLMRequest(_capSystemPrompt, prompt, (response) =>
        {
            // Clean up quotes if any
            string ans = response.Trim();
            if (ans.StartsWith("\"") && ans.EndsWith("\"")) ans = ans.Substring(1, ans.Length - 2);
            
            capAgent.lastAnswer = ans;
            _capHasAnswered = true;
            
            if (capThinkingVisual) capThinkingVisual.SetActive(false);
            if (capAnswerText) capAnswerText.text = "Answered!";

            // Stop pulse and return Cap to idle
            if (capBubbleRect != null && _uiAnimator != null)
            {
                _uiAnimator.StopAnimation(capBubbleRect.gameObject);
                capBubbleRect.localScale = Vector3.one;
            }
            if (capAvatarAnimator != null)
            {
                capAvatarAnimator.PlayIdle();
            }
            
            CheckForRoundEnd();
        });
    }

    private void SubmitPlayerAnswer(string answer)
    {
        if (GameState != QuizGameState.QuestionActive) return;
        if (_playerHasAnswered) return;

        _playerHasAnswered = true;
        player.lastAnswer = answer;
        
        if (answerInput != null) answerInput.interactable = false;

        CheckForRoundEnd();
    }

    private void TickTimer()
    {
        _timeRemaining -= Time.deltaTime;

        if (_timeRemaining <= 0f)
        {
            _timeRemaining = 0f;
            UpdateTimerUI(_timeRemaining, 0f);
            TimeRanOut();
        }
        else
        {
            float normalized = _timeMax > 0f ? _timeRemaining / _timeMax : 0f;
            UpdateTimerUI(_timeRemaining, normalized);
        }
    }

    private void TimeRanOut()
    {
        PlaySfx(sfxTimeUp);
        
        // Flash timer red
        if (timerFillImage != null && _uiAnimator != null)
        {
            _uiAnimator.ColorFlash(timerFillImage, Color.red, 0.4f);
        }
        
        // Shake player area on timeout
        if (playerAreaRect != null && _uiAnimator != null)
        {
            _uiAnimator.Shake(playerAreaRect, 12f, 0.4f);
        }
        
        if (!_playerHasAnswered)
        {
            _playerHasAnswered = true;
            player.lastAnswer = "(Time Out)";
            if (answerInput != null) answerInput.interactable = false;
        }
        
        CheckForRoundEnd();
    }

    private void CheckForRoundEnd()
    {
        if (_playerHasAnswered && _capHasAnswered)
        {
            StartCoroutine(JudgeRoundRoutine());
        }
        else if (_playerHasAnswered)
        {
            GameState = QuizGameState.WaitingForOpponent;
            if (judgeFeedbackText) judgeFeedbackText.text = "Waiting for Cap...";
        }
    }

    private IEnumerator JudgeRoundRoutine()
    {
        GameState = QuizGameState.Evaluating;
        if (judgeFeedbackText) judgeFeedbackText.text = "Judging...";
        
        // RBC Judge starts "thinking/talking" animation
        if (rbcAvatarAnimator != null)
        {
            rbcAvatarAnimator.PlayThinking();
        }
        
        // Reveal Cap's answer now that round is over
        if (capAnswerText) capAnswerText.text = $"\"{capAgent.lastAnswer}\"";
        
        // Cap starts talking animation when revealing answer
        if (capAvatarAnimator != null)
        {
            capAvatarAnimator.PlayTalking();
        }

        QuizQuestion q = questions[_currentQuestionIndex];
        string correctInfo = string.IsNullOrEmpty(q.correctAnswer) ? "" : $"(Correct Answer: {q.correctAnswer})";
        
        string judgeInput = $"Question: {q.questionText} {correctInfo}\n" +
                            $"Player Answer: {player.lastAnswer}\n" +
                            $"Cap Answer: {capAgent.lastAnswer}";

        bool judgeDone = false;
        string judgeResponse = "";

        SendCustomLLMRequest(_judgeSystemPrompt, judgeInput, (resp) =>
        {
            judgeResponse = resp;
            judgeDone = true;
        });

        // Wait for callback or timeout
        float waitTime = 0f;
        while (!judgeDone && waitTime < 20f)
        {
            waitTime += Time.deltaTime;
            yield return null;
        }

        if (!judgeDone)
        {
            judgeResponse = "PlayerScore: 0\nCapScore: 0\nFeedback: Judge timed out.";
        }

        ApplyJudgeResults(judgeResponse);
        
        GameState = QuizGameState.RoundResult;
        
        // Wait for player to click Next Round button (now inside Judge Panel)
        _waitingForNextRound = true;
        ShowNextRoundButton();
        
        if (countdownText != null)
        {
            countdownText.text = "";
        }
    }

    private void ApplyJudgeResults(string rawResponse)
    {
        int pScore = 0;
        int cScore = 0;
        string feedback = rawResponse;

        try
        {
            var lines = rawResponse.Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                if (line.StartsWith("PlayerScore:", StringComparison.OrdinalIgnoreCase))
                {
                    string s = line.Split(':')[1].Trim();
                    // Remove non-digits if needed
                    int.TryParse(s, out pScore);
                }
                else if (line.StartsWith("CapScore:", StringComparison.OrdinalIgnoreCase))
                {
                    string s = line.Split(':')[1].Trim();
                    int.TryParse(s, out cScore);
                }
                else if (line.StartsWith("Feedback:", StringComparison.OrdinalIgnoreCase))
                {
                    int idx = rawResponse.IndexOf("Feedback:", StringComparison.OrdinalIgnoreCase);
                    if (idx >= 0) feedback = rawResponse.Substring(idx + 9).Trim();
                }
            }
        }
        catch { }

        int oldPlayerScore = player.score;
        int oldCapScore = capAgent.score;
        
        player.score += pScore;
        capAgent.score += cScore;

        // Stop question audio and play answer audio if available
        StopQuestionAudio();
        if (_currentQuestionIndex >= 0 && _currentQuestionIndex < questions.Count)
        {
            PlayAnswerAudio(questions[_currentQuestionIndex]);
        }

        // Update scores in header
        UpdateScoreUI();

        // Show Judge Panel with squeeze animation
        ShowJudgePanelWithAnimation(pScore, cScore, feedback);

        // Cap avatar reactions based on who won (Cap reacts immediately)
        if (pScore > cScore)
        {
            // Player won - Cap is sad
            if (capAvatarAnimator != null) capAvatarAnimator.PlaySad();
            PlaySfx(sfxCorrect);
        }
        else if (cScore > pScore)
        {
            // Cap won - Cap is happy
            if (capAvatarAnimator != null) capAvatarAnimator.PlayHappy();
            PlaySfx(sfxIncorrect);
        }
        else
        {
            // Draw - Cap is idle
            if (capAvatarAnimator != null) capAvatarAnimator.PlayIdle();
        }

        // RBC Judge starts TALKING animation while delivering feedback
        if (rbcAvatarAnimator != null)
        {
            rbcAvatarAnimator.PlayTalking();
        }
    }

    /// <summary>
    /// Shows the Judge Panel overlay with squeeze animation that pushes out other panels.
    /// </summary>
    private void ShowJudgePanelWithAnimation(int playerPoints, int capPoints, string feedback)
    {
        if (judgePanel == null) return;

        // Set initial content
        if (judgePlayerScoreText != null)
        {
            judgePlayerScoreText.text = $"You: +{playerPoints}";
        }
        if (judgeCapScoreText != null)
        {
            judgeCapScoreText.text = $"Cap: +{capPoints}";
        }

        // Get references
        RectTransform judgePanelRT = judgePanel.GetComponent<RectTransform>();
        
        // Set initial state - start from scale 0 and invisible
        if (judgePanelRT != null)
        {
            judgePanelRT.localScale = Vector3.zero;
        }
        if (judgePanelCanvasGroup != null)
        {
            judgePanelCanvasGroup.alpha = 0f;
        }

        // Show the panel (invisible at first due to alpha=0 and scale=0)
        judgePanel.SetActive(true);
        
        // Hide main content immediately or animate
        if (mainContentPanel != null)
        {
            CanvasGroup mainCG = mainContentPanel.GetComponent<CanvasGroup>();
            RectTransform mainRT = mainContentPanel.GetComponent<RectTransform>();
            
            if (_uiAnimator != null)
            {
                if (mainCG != null) _uiAnimator.Fade(mainContentPanel, 1f, 0f, 0.3f);
                if (mainRT != null) _uiAnimator.ScaleTo(mainRT, 0.9f, 0.3f);
            }
            else
            {
                if (mainCG != null) mainCG.alpha = 0f;
                if (mainRT != null) mainRT.localScale = new Vector3(0.9f, 0.9f, 1f);
            }
        }

        // Animate Judge Panel expanding from center
        StartCoroutine(AnimateJudgePanelIn(judgePanelRT, feedback, playerPoints, capPoints));
    }

    private IEnumerator AnimateJudgePanelIn(RectTransform judgePanelRT, string feedback, int playerPoints, int capPoints)
    {
        // Small delay for the main content to start fading
        yield return new WaitForSecondsRealtime(0.15f);

        // Hide main content completely after fade
        if (mainContentPanel != null)
        {
            mainContentPanel.SetActive(false);
        }

        // Animate scale and fade together
        float duration = 0.35f;
        float elapsed = 0f;
        float startAlpha = 0f;
        float endAlpha = 1f;
        Vector3 startScale = Vector3.zero;
        Vector3 endScale = Vector3.one;

        while (elapsed < duration)
        {
            elapsed += Time.unscaledDeltaTime;
            float t = Mathf.SmoothStep(0f, 1f, elapsed / duration);
            
            if (judgePanelRT != null)
            {
                judgePanelRT.localScale = Vector3.Lerp(startScale, endScale, t);
            }
            if (judgePanelCanvasGroup != null)
            {
                judgePanelCanvasGroup.alpha = Mathf.Lerp(startAlpha, endAlpha, t);
            }
            yield return null;
        }

        // Ensure final state
        if (judgePanelRT != null)
        {
            judgePanelRT.localScale = Vector3.one;
        }
        if (judgePanelCanvasGroup != null)
        {
            judgePanelCanvasGroup.alpha = 1f;
        }

        // Wait a moment before starting text animation
        yield return new WaitForSecondsRealtime(0.1f);

        // Typewriter effect for judge feedback
        if (judgeFeedbackText != null)
        {
            string fullFeedback = $"{feedback}\n\nYour answer: \"{player.lastAnswer}\"\nCap's answer: \"{capAgent.lastAnswer}\"";
            if (_uiAnimator != null)
            {
                _uiAnimator.TypewriterText(judgeFeedbackText, fullFeedback, judgeFeedbackSpeed);
            }
            else
            {
                judgeFeedbackText.text = fullFeedback;
            }
        }

        // Punch animation on scores
        yield return new WaitForSecondsRealtime(0.3f);
        
        if (_uiAnimator != null)
        {
            if (judgePlayerScoreText != null && playerPoints != 0)
            {
                _uiAnimator.ScalePunch(judgePlayerScoreText.rectTransform, 1.3f, 0.4f);
            }
        }

        yield return new WaitForSecondsRealtime(0.2f);

        if (_uiAnimator != null)
        {
            if (judgeCapScoreText != null && capPoints != 0)
            {
                _uiAnimator.ScalePunch(judgeCapScoreText.rectTransform, 1.3f, 0.4f);
            }
        }
    }

    /// <summary>
    /// Hides the Judge Panel and restores the main content.
    /// </summary>
    private void HideJudgePanelWithAnimation()
    {
        if (judgePanel == null) return;

        RectTransform judgePanelRT = judgePanel.GetComponent<RectTransform>();

        if (_uiAnimator != null && judgePanelCanvasGroup != null)
        {
            // Fade out and scale down judge panel
            _uiAnimator.Fade(judgePanel, 1f, 0f, 0.3f, () =>
            {
                judgePanel.SetActive(false);
                // Reset scale and alpha for next time
                if (judgePanelRT != null) judgePanelRT.localScale = Vector3.one;
                if (judgePanelCanvasGroup != null) judgePanelCanvasGroup.alpha = 0f;
            });
            
            if (judgePanelRT != null)
            {
                _uiAnimator.ScaleTo(judgePanelRT, 0.85f, 0.3f);
            }

            // Restore main content panel
            if (mainContentPanel != null)
            {
                CanvasGroup mainCG = mainContentPanel.GetComponent<CanvasGroup>();
                RectTransform mainRT = mainContentPanel.GetComponent<RectTransform>();
                
                if (mainCG != null)
                {
                    _uiAnimator.Fade(mainContentPanel, mainCG.alpha, 1f, 0.4f);
                }
                if (mainRT != null)
                {
                    _uiAnimator.ScaleTo(mainRT, 1f, 0.4f);
                }
            }
        }
        else
        {
            // Fallback: immediate hide without animation
            judgePanel.SetActive(false);
            if (judgePanelRT != null) judgePanelRT.localScale = Vector3.one;
            if (judgePanelCanvasGroup != null) judgePanelCanvasGroup.alpha = 0f;
            
            // Restore main content immediately
            if (mainContentPanel != null)
            {
                CanvasGroup mainCG = mainContentPanel.GetComponent<CanvasGroup>();
                RectTransform mainRT = mainContentPanel.GetComponent<RectTransform>();
                if (mainCG != null) mainCG.alpha = 1f;
                if (mainRT != null) mainRT.localScale = Vector3.one;
            }
        }
    }

    private void EndGame()
    {
        GameState = QuizGameState.GameOver;
        if (resultsPanel != null)
        {
            resultsPanel.SetActive(true);
            
            // Fade in results panel
            if (_uiAnimator != null)
            {
                _uiAnimator.Fade(resultsPanel, 0f, 1f, 0.5f);
            }
        }
        
        if (resultsSummaryText != null)
        {
            string winner = player.score > capAgent.score ? "You Win!" : (player.score < capAgent.score ? "Cap Wins!" : "Draw!");
            string summaryText = $"{winner}\n\nFinal Score:\nPlayer: {player.score}\nCap: {capAgent.score}";
            
            if (_uiAnimator != null)
            {
                _uiAnimator.TypewriterText(resultsSummaryText, summaryText, judgeFeedbackSpeed * 0.6f);
            }
            else
            {
                resultsSummaryText.text = summaryText;
            }
        }

        // Final avatar reactions
        if (player.score > capAgent.score)
        {
            if (rbcAvatarAnimator != null) rbcAvatarAnimator.PlayHappy();
            if (capAvatarAnimator != null) capAvatarAnimator.PlaySad();
        }
        else if (capAgent.score > player.score)
        {
            if (rbcAvatarAnimator != null) rbcAvatarAnimator.PlaySad();
            if (capAvatarAnimator != null) capAvatarAnimator.PlayHappy();
        }
    }

    #endregion

    #region LLM Internals

    /// <summary>
    /// Internal helper to send requests similar to LLM_Manager but with custom prompts.
    /// Uses config from LLM_Manager.Instance if available, else defaults.
    /// </summary>
    private void SendCustomLLMRequest(string systemPrompt, string userMessage, Action<string> callback)
    {
        StartCoroutine(SendCustomAPIRequest(systemPrompt, userMessage, callback));
    }

    private IEnumerator SendCustomAPIRequest(string systemPrompt, string userMessage, Action<string> callback)
    {
        // Try to get config from singleton
        string url = "http://173.61.35.162:25565/v1/chat/completions";
        string key = "sk-local-abc";
        string model = "qwen3-30b-a3b-instruct";

        if (LLM_Manager.Instance != null)
        {
            url = LLM_Manager.Instance.apiBaseUrl.TrimEnd('/') + "/chat/completions";
            key = LLM_Manager.Instance.apiKey;
            model = LLM_Manager.Instance.modelName;
        }

        var messages = new List<Dictionary<string, string>>();
        if (!string.IsNullOrWhiteSpace(systemPrompt))
        {
            messages.Add(new Dictionary<string, string> { { "role", "system" }, { "content", systemPrompt.Trim() } });
        }
        messages.Add(new Dictionary<string, string> { { "role", "user" }, { "content", userMessage } });

        var payload = new Dictionary<string, object>
        {
            {"model", model},
            {"messages", messages},
            {"max_tokens", 200}, // Limit length
            {"temperature", 0.7f}
        };

        string jsonPayload = SerializeJson(payload);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonPayload);

        using (UnityWebRequest www = new UnityWebRequest(url, "POST"))
        {
            www.uploadHandler = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();
            www.SetRequestHeader("Content-Type", "application/json");
            www.SetRequestHeader("Authorization", "Bearer " + key);
            www.timeout = 30;

            yield return www.SendWebRequest();

            if (www.result == UnityWebRequest.Result.Success)
            {
                string responseText = www.downloadHandler.text;
                string content = ParseContentFromResponse(responseText);
                if (!string.IsNullOrEmpty(content))
                {
                    callback?.Invoke(content);
                }
                else
                {
                    callback?.Invoke("[Error] Failed to parse.");
                }
            }
            else
            {
                callback?.Invoke($"[Error] {www.error}");
            }
        }
    }

    // Minimal JSON helpers since we can't use Newtonsoft (usually) and JsonUtility is limited for Dictionaries
    private string SerializeJson(Dictionary<string, object> dict)
    {
        // Very basic manual serialization for this specific structure
        StringBuilder sb = new StringBuilder();
        sb.Append("{");
        bool first = true;
        foreach(var kv in dict)
        {
            if (!first) sb.Append(",");
            first = false;
            sb.Append($"\"{kv.Key}\":");
            if (kv.Value is string s) sb.Append($"\"{EscapeJson(s)}\"");
            else if (kv.Value is float f) sb.Append(f.ToString(System.Globalization.CultureInfo.InvariantCulture));
            else if (kv.Value is int i) sb.Append(i);
            else if (kv.Value is List<Dictionary<string, string>> list)
            {
                sb.Append("[");
                bool firstItem = true;
                foreach(var d in list)
                {
                    if (!firstItem) sb.Append(",");
                    firstItem = false;
                    sb.Append("{");
                    bool firstPair = true;
                    foreach(var pair in d)
                    {
                        if (!firstPair) sb.Append(",");
                        firstPair = false;
                        sb.Append($"\"{pair.Key}\":\"{EscapeJson(pair.Value)}\"");
                    }
                    sb.Append("}");
                }
                sb.Append("]");
            }
        }
        sb.Append("}");
        return sb.ToString();
    }

    private string EscapeJson(string s)
    {
        if (s == null) return "";
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r");
    }

    private string ParseContentFromResponse(string json)
    {
        // Quick hacky parser for "content": "..."
        // Should rely on a proper library if available, but this works for standard OpenAI format
        int idx = json.IndexOf("\"content\"");
        if (idx == -1) return null;
        
        int startQuote = json.IndexOf("\"", idx + 9);
        if (startQuote == -1) return null;
        
        // Find end quote handling escapes
        int endQuote = startQuote + 1;
        while (endQuote < json.Length)
        {
            if (json[endQuote] == '"' && json[endQuote-1] != '\\') break;
            endQuote++;
        }
        
        if (endQuote >= json.Length) return null;
        
        string content = json.Substring(startQuote + 1, endQuote - startQuote - 1);
        return UnescapeJson(content);
    }

    private string UnescapeJson(string s)
    {
        return s.Replace("\\n", "\n").Replace("\\r", "\r").Replace("\\\"", "\"").Replace("\\\\", "\\");
    }

    #endregion

    #region Helpers

    private void ShowQuestion(QuizQuestion question)
    {
        if (questionText != null) questionText.text = question != null ? question.questionText : "";
        if (categoryText != null) categoryText.text = question != null ? question.category : "";
    }

    private void SetCountdownText(string text)
    {
        if (countdownText != null) countdownText.text = text;
    }

    private void UpdateTimerUI(float secondsRemaining, float normalized)
    {
        if (timerText != null) timerText.text = useAnswerTimer ? $"{Mathf.CeilToInt(secondsRemaining)}s" : "";
        if (timerSlider != null) timerSlider.value = normalized;
    }

    private void UpdateScoreUI()
    {
        if (playerScoreText != null) playerScoreText.text = $"You: {player.score}";
        if (headerScoreText != null) headerScoreText.text = $"Score: {player.score}";
        if (capScoreText != null) capScoreText.text = $"Cap: {capAgent.score}";
    }

    private void UpdateRoundsUI()
    {
        if (roundsText == null) return;
        int maxRounds = totalRounds > 0 ? Mathf.Min(totalRounds, _questionOrder.Count) : _questionOrder.Count;
        roundsText.text = _currentRoundIndex < 0 ? $"Round 0 / {maxRounds}" : $"Round {_currentRoundIndex + 1} / {maxRounds}";
    }

    private void PlaySfx(AudioClip clip)
    {
        if (sfxAudioSource && clip) sfxAudioSource.PlayOneShot(clip);
    }

    /// <summary>
    /// Play question-specific audio (narration, background, etc.)
    /// </summary>
    private void PlayQuestionAudio(QuizQuestion question)
    {
        if (question == null) return;

        // Stop any currently playing question audio
        StopQuestionAudio();

        // Play question narration audio with optional delay
        if (question.questionAudio != null)
        {
            if (question.audioDelay > 0f)
            {
                StartCoroutine(PlayQuestionAudioDelayed(question.questionAudio, question.audioDelay));
            }
            else
            {
                PlayQuestionNarration(question.questionAudio);
            }
        }

        // Play background audio if available (loops)
        if (question.backgroundAudio != null && backgroundAudioSource != null)
        {
            backgroundAudioSource.clip = question.backgroundAudio;
            backgroundAudioSource.loop = true;
            backgroundAudioSource.Play();
        }
    }

    private IEnumerator PlayQuestionAudioDelayed(AudioClip clip, float delay)
    {
        yield return new WaitForSecondsRealtime(delay);
        PlayQuestionNarration(clip);
    }

    private void PlayQuestionNarration(AudioClip clip)
    {
        if (questionAudioSource != null && clip != null)
        {
            questionAudioSource.clip = clip;
            questionAudioSource.loop = false;
            questionAudioSource.Play();
        }
        else if (sfxAudioSource != null && clip != null)
        {
            // Fallback to SFX source if no dedicated question audio source
            sfxAudioSource.PlayOneShot(clip);
        }
    }

    /// <summary>
    /// Play the answer reveal audio for the current question
    /// </summary>
    private void PlayAnswerAudio(QuizQuestion question)
    {
        if (question == null || question.answerAudio == null) return;

        if (questionAudioSource != null)
        {
            questionAudioSource.clip = question.answerAudio;
            questionAudioSource.loop = false;
            questionAudioSource.Play();
        }
        else if (sfxAudioSource != null)
        {
            sfxAudioSource.PlayOneShot(question.answerAudio);
        }
    }

    /// <summary>
    /// Stop all question-related audio
    /// </summary>
    public void StopQuestionAudio()
    {
        if (questionAudioSource != null && questionAudioSource.isPlaying)
        {
            questionAudioSource.Stop();
        }
        if (backgroundAudioSource != null && backgroundAudioSource.isPlaying)
        {
            backgroundAudioSource.Stop();
        }
    }

    /// <summary>
    /// Check if question narration audio is currently playing
    /// </summary>
    public bool IsQuestionAudioPlaying()
    {
        return questionAudioSource != null && questionAudioSource.isPlaying;
    }

    private float GetQuestionTimeLimit(QuizQuestion question)
    {
        if (!useAnswerTimer) return 0f;
        if (question != null && question.timeLimitSeconds > 0f) return question.timeLimitSeconds;
        return defaultQuestionTimeLimitSeconds;
    }

    private void Shuffle<T>(IList<T> list)
    {
        System.Random rng = new System.Random();
        int n = list.Count;
        while (n > 1)
        {
            int k = rng.Next(n--);
            T temp = list[n];
            list[n] = list[k];
            list[k] = temp;
        }
    }

    /// <summary>
    /// Load questions from the assigned QuestionBank ScriptableObject.
    /// If a bank is assigned, its questions will replace the legacy questions list.
    /// </summary>
    private void LoadQuestionsFromBank()
    {
        if (questionBank != null)
        {
            List<QuizQuestion> bankQuestions = questionBank.GetAllQuestions();
            if (bankQuestions.Count > 0)
            {
                questions = bankQuestions;
                Debug.Log($"[Quiz] Loaded {questions.Count} questions from '{questionBank.bankName}'");
            }
            else
            {
                Debug.LogWarning($"[Quiz] Question bank '{questionBank.bankName}' is empty, using fallback questions.");
            }
        }
        else if (questions.Count == 0)
        {
            Debug.LogWarning("[Quiz] No question bank assigned and no fallback questions. Please assign a QuizQuestionBank or add questions manually.");
        }
    }

    /// <summary>
    /// Dynamically load a different question bank at runtime.
    /// </summary>
    public void SetQuestionBank(QuizQuestionBank newBank)
    {
        questionBank = newBank;
        LoadQuestionsFromBank();
    }

    /// <summary>
    /// Get the current question count.
    /// </summary>
    public int QuestionCount => questions?.Count ?? 0;

    #endregion
}
