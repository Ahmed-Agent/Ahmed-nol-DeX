import { useState, useEffect } from 'react';
import { ArrowRight, X, Zap, RefreshCw, MessageCircle, AlertTriangle } from 'lucide-react';

interface GuideStep {
  title: string;
  content: string;
  icon: JSX.Element;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    title: 'Welcome to NOLA Exchange',
    content: 'Swap and bridge tokens seamlessly across Ethereum and Polygon networks. Professional aggregation for the best rates.',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    title: 'Switch Between Chains',
    content: 'Use the chain switch button to toggle between POL (Polygon), ETH (Ethereum), and BRG (Bridge mode) for cross-chain transfers.',
    icon: <RefreshCw className="w-5 h-5" />,
  },
  {
    title: 'Chat & Quick Market Overview',
    content: 'Join the public chat to connect with other traders. Use the SNAP button for quick market insights and token analysis.',
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    title: 'Important Information',
    content: '75% of exchange fees support $NOL liquidity. You are responsible for your trades - we are professional aggregators. Estimates may vary; get quotes for accurate pricing.',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
];

const STORAGE_KEY = 'nola_onboarding_complete';

export function OnboardingGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = GUIDE_STEPS[currentStep];
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        padding: '16px',
      }}
      data-testid="onboarding-overlay"
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(30,10,45,0.98), rgba(15,5,25,0.98))',
          borderRadius: '16px',
          border: '1px solid rgba(180,68,255,0.2)',
          padding: '24px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(100,0,200,0.3)',
        }}
        data-testid="onboarding-card"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--accent-1)',
            }}
          >
            {step.icon}
            <span style={{ fontSize: '10px', opacity: 0.7, color: '#fff' }}>
              {currentStep + 1} / {GUIDE_STEPS.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
            data-testid="button-skip-onboarding"
          >
            Skip <X className="w-4 h-4" />
          </button>
        </div>

        <h3
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '12px',
          }}
        >
          {step.title}
        </h3>

        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          {step.content}
        </p>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {GUIDE_STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '100%',
                height: '3px',
                borderRadius: '2px',
                background: idx <= currentStep
                  ? 'linear-gradient(90deg, var(--accent-1), var(--accent-2))'
                  : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(90deg, var(--accent-1), var(--accent-2))',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(180,68,255,0.3)',
          }}
          data-testid="button-next-onboarding"
        >
          {isLastStep ? 'Get Started' : 'Next'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
