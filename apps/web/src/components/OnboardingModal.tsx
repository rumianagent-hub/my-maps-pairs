'use client';

import { useMemo, useState } from 'react';

type OnboardingModalProps = {
  isOpen: boolean;
  onDone: () => void;
};

type OnboardingStep = {
  title: string;
  body: string;
  emoji: string;
};

const STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to MyMaps Pairs!',
    body: '🎉 Find restaurants you both love and decide together without the back-and-forth.',
    emoji: '🍽️',
  },
  {
    title: 'Add restaurants',
    body: 'Tap ➕ to add restaurants to your shared list. Search by name or discover nearby spots.',
    emoji: '➕',
  },
  {
    title: 'Vote in secret',
    body: 'Use 😍 Love it, 👍 Like it, or 👎 Pass — your partner cannot see your votes until both vote.',
    emoji: '🗳️',
  },
  {
    title: 'Get matched',
    body: 'When you both vote the same on a restaurant, it becomes a 💕 Match. Use Decide to pick a winner.',
    emoji: '💕',
  },
  {
    title: 'Explore nearby',
    body: 'Head to the Explore tab 🧭 to find restaurants near you and add them in one tap.',
    emoji: '🧭',
  },
];

export default function OnboardingModal({ isOpen, onDone }: OnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const isLastStep = useMemo(() => stepIndex === STEPS.length - 1, [stepIndex]);

  if (!isOpen) return null;

  const step = STEPS[stepIndex];

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-[var(--bg-elevated)] border border-white/10 rounded-2xl p-5 animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl mb-2" aria-hidden>{step.emoji}</div>
            <h2 className="text-[var(--text-primary)] font-bold text-lg">{step.title}</h2>
          </div>
          <button
            onClick={onDone}
            className="text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)]"
          >
            Skip
          </button>
        </div>

        <p className="text-[var(--text-secondary)] mt-3 text-sm leading-relaxed">{step.body}</p>

        <div className="mt-5 flex items-center justify-center gap-2" aria-label="Onboarding progress">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`w-2 h-2 rounded-full ${index === stepIndex ? 'bg-[var(--accent)]' : 'bg-white/20'}`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={onDone}
            className="text-[var(--text-secondary)] text-sm px-1"
          >
            Skip
          </button>

          <button
            onClick={() => {
              if (isLastStep) {
                onDone();
              } else {
                setStepIndex((prev) => prev + 1);
              }
            }}
            className="btn-primary !w-auto px-6"
          >
            {isLastStep ? "Let's go!" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
