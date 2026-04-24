"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getLevels, getClassesByLevel, getSubjectsByLevel, getRandomQuestion, Level, Class, Subject, Question } from "@/lib/supabaseClient";
import { markAnswer, MarkingResult } from "@/lib/groqClient";
import { isOnline, onOnline, onOffline, queueAttempt } from "@/lib/offlineStore";

export default function QuestionPage() {
  const [step, setStep] = useState<"level" | "class" | "subject" | "question" | "result">("level");
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<MarkingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setOnline(isOnline());
    const offUnsub = onOffline(() => setOnline(false));
    const onUnsub = onOnline(() => setOnline(true));
    getLevels().then(setLevels);
    return () => { offUnsub(); onUnsub(); };
  }, []);

  const handleLevelSelect = (levelId: string) => {
    setSelectedLevel(levelId);
    setClasses([]);
    setSubjects([]);
    setSelectedClass("");
    setSelectedSubject("");
    getClassesByLevel(levelId).then(setClasses);
    setStep("class");
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    setSubjects([]);
    setSelectedSubject("");
    getSubjectsByLevel(selectedLevel).then(setSubjects);
    setStep("subject");
  };

  const handleSubjectSelect = async (subjectId: string) => {
    setSelectedSubject(subjectId);
    setLoading(true);
    setStep("question");
    const q = await getRandomQuestion(selectedClass, subjectId);
    setQuestion(q);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!question || !answer.trim()) return;
    setLoading(true);

    const userId = localStorage.getItem("user_id") || "anonymous";
    const markingScheme = question.marking_scheme || [{ point: answer, marks: question.marks }];

    if (!online) {
      await queueAttempt({ question_id: question.id, answer, user_id: userId, timestamp: Date.now() });
      setPendingCount(c => c + 1);
      setResult({
        score: 0, maxScore: markingScheme.reduce((s, m) => s + m.marks, 0),
        feedback: "Offline! Your answer has been queued for marking when you're back online.",
        correctPoints: [], missedPoints: []
      });
    } else {
      const className = classes.find(c => c.id === selectedClass)?.name || "";
      const res = await markAnswer(
        question.question_text, answer,
        markingScheme, question.answer_type,
        question.difficulty_level, className
      );
      setResult(res);
    }

    setLoading(false);
    setStep("result");
  };

  const handleNextQuestion = () => {
    setAnswer("");
    setResult(null);
    setStep("subject");
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || "";

  return (
    <div className="min-h-screen bg-slate-50">
      {!online && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
          Offline Mode — Answers will sync when connected
        </div>
      )}

      <header className="bg-primary-600 text-white p-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-white">← Back</Link>
          <h1 className="text-lg font-semibold">Practice</h1>
          <span className="text-primary-200 text-sm">{pendingCount} pending</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {step === "level" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Select Your Level</h2>
            {levels.map(level => (
              <button
                key={level.id}
                onClick={() => handleLevelSelect(level.id)}
                className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-left active:scale-98 touch-target"
              >
                <span className="font-semibold text-slate-800">{level.name}</span>
              </button>
            ))}
          </div>
        )}

        {step === "class" && (
          <div className="space-y-4">
            <button onClick={() => setStep("level")} className="text-primary-600 text-sm">← Back</button>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Select Your Class</h2>
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => handleClassSelect(cls.id)}
                className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-left active:scale-98 touch-target"
              >
                <span className="font-semibold text-slate-800">{cls.name}</span>
              </button>
            ))}
          </div>
        )}

        {step === "subject" && (
          <div className="space-y-4">
            <button onClick={() => setStep("class")} className="text-primary-600 text-sm">← Back</button>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Select Subject</h2>
            {subjects.map(subject => (
              <button
                key={subject.id}
                onClick={() => handleSubjectSelect(subject.id)}
                className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-left active:scale-98 touch-target"
              >
                <span className="font-semibold text-slate-800">{subject.name}</span>
              </button>
            ))}
          </div>
        )}

        {step === "question" && question && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-slate-800 font-medium">{question.question_text}</p>
              <div className="mt-2 text-sm text-slate-500">
                Type: {question.answer_type} • Marks: {question.marks}
              </div>
            </div>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 rounded-xl border border-slate-300 h-40 resize-none"
            />

            <button
              onClick={handleSubmit}
              disabled={loading || !answer.trim()}
              className="w-full bg-primary-600 text-white font-semibold py-4 rounded-xl disabled:opacity-50 touch-target"
            >
              {loading ? "Marking..." : "Submit Answer"}
            </button>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-2">
                {result.score === result.maxScore ? "🎉" : result.score >= result.maxScore * 0.7 ? "👍" : "📚"}
              </div>
              <div className="text-3xl font-bold text-slate-800">
                {result.score}/{result.maxScore}
              </div>
              <p className="text-slate-600 mt-2">{result.feedback}</p>
            </div>

            {result.correctPoints.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-2">Correct Points</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  {result.correctPoints.map((p, i) => <li key={i}>✓ {p}</li>)}
                </ul>
              </div>
            )}

            {result.missedPoints.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="font-semibold text-amber-800 mb-2">Missed Points</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  {result.missedPoints.map((p, i) => <li key={i}>✗ {p}</li>)}
                </ul>
              </div>
            )}

            <button
              onClick={handleNextQuestion}
              className="w-full bg-primary-600 text-white font-semibold py-4 rounded-xl touch-target"
            >
              Next Question
            </button>
          </div>
        )}
      </main>
    </div>
  );
}