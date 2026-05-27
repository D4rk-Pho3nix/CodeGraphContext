import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right" | "center";
  beforeAction?: () => void;
}

interface OnboardingTourProps {
  steps: TourStep[];
  onComplete: () => void;
}

const TOUR_STORAGE_KEY = "cgc_onboarding_completed";

export const hasSeenWalkthrough = (): boolean => {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
  } catch (e) {
    console.warn("Storage access denied (Incognito/Guest Mode). Defaulting to false.", e);
    return false;
  }
};

export const setSeenWalkthrough = (completed: boolean): void => {
  try {
    if (completed) {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(TOUR_STORAGE_KEY);
    }
  } catch (e) {
    console.warn("Could not save tour state to localStorage.", e);
  }
};

export function OnboardingTour({ steps, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Update spotlight coordinates to match target DOM element
  useEffect(() => {
    const step = steps[currentStep];
    if (step.beforeAction) {
      try {
        step.beforeAction();
      } catch (e) {
        console.warn("Failed executing step beforeAction:", e);
      }
    }

    const updateCoords = () => {
      if (step.targetId === "viewport-canvas") {
        setCoords({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          width: 0,
          height: 0,
        });
        return;
      }
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Check if coords actually changed to avoid infinite re-renders
        setCoords({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      } else {
        // Fallback to center if element is not found/not visible
        setCoords({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          width: 0,
          height: 0,
        });
      }
    };

    // Delay slightly to allow any collapsible panels/sidebars to complete their CSS open animations
    const timer = setTimeout(updateCoords, 300);

    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [currentStep, steps]);

  const activeStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Calculate dynamic style for the tooltip placement
  const getTooltipStyles = () => {
    const GAP = 16;
    const TOOLTIP_WIDTH = 320;
    const TOOLTIP_HEIGHT = 190;

    if (coords.width === 0 && coords.height === 0) {
      // Center placement (Welcome Step)
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    let top = coords.y;
    let left = coords.x;

    switch (activeStep.position) {
      case "right":
        left = coords.x + coords.width + GAP;
        top = coords.y + coords.height / 2 - TOOLTIP_HEIGHT / 2;
        // Clamp to prevent bleeding off right edge
        if (left + TOOLTIP_WIDTH > window.innerWidth - GAP) {
          left = coords.x - TOOLTIP_WIDTH - GAP; // Flip to left
        }
        break;
      case "left":
        left = coords.x - TOOLTIP_WIDTH - GAP;
        top = coords.y + coords.height / 2 - TOOLTIP_HEIGHT / 2;
        // Clamp to prevent bleeding off left edge
        if (left < GAP) {
          left = coords.x + coords.width + GAP; // Flip to right
        }
        break;
      case "bottom":
        left = coords.x + coords.width / 2 - TOOLTIP_WIDTH / 2;
        top = coords.y + coords.height + GAP;
        // Clamp to prevent bleeding off bottom edge
        if (top + TOOLTIP_HEIGHT > window.innerHeight - GAP) {
          top = coords.y - TOOLTIP_HEIGHT - GAP; // Flip to top
        }
        break;
      case "top":
        left = coords.x + coords.width / 2 - TOOLTIP_WIDTH / 2;
        top = coords.y - TOOLTIP_HEIGHT - GAP;
        // Clamp to prevent bleeding off top edge
        if (top < GAP) {
          top = coords.y + coords.height + GAP; // Flip to bottom
        }
        break;
      default:
        // Center
        return {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
    }

    // Secondary bounds checking to ensure visual stability
    left = Math.max(GAP, Math.min(window.innerWidth - TOOLTIP_WIDTH - GAP, left));
    top = Math.max(GAP, Math.min(window.innerHeight - TOOLTIP_HEIGHT - GAP, top));

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  const tooltipStyle = getTooltipStyles();

  // Dynamic Clip Path Spotlight formula
  const getSpotlightClipPath = () => {
    if (activeStep.targetId === "viewport-canvas" || (coords.width === 0 && coords.height === 0)) {
      return "none";
    }

    const { x, y, width: w, height: h } = coords;
    const pad = 6; // Add margin around element inside cutout
    const left = x - pad;
    const top = y - pad;
    const right = x + w + pad;
    const bottom = y + h + pad;

    return `polygon(
      0% 0%, 
      0% 100%, 
      ${left}px 100%, 
      ${left}px ${top}px, 
      ${right}px ${top}px, 
      ${right}px ${bottom}px, 
      ${left}px ${bottom}px, 
      ${left}px 100%, 
      100% 100%, 
      100% 0%
    )`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none select-none">
        {/* Backdrop Overlay */}
        <div
          className="absolute inset-0 bg-black/75 transition-all duration-300 pointer-events-auto cursor-default"
          style={{
            clipPath: getSpotlightClipPath(),
            WebkitClipPath: getSpotlightClipPath(),
          }}
        />

        {/* Glow Active Border Highlight */}
        {activeStep.targetId !== "viewport-canvas" && coords.width > 0 && (
          <motion.div
            initial={false}
            animate={{
              x: coords.x - 6,
              y: coords.y - 6,
              width: coords.width + 12,
              height: coords.height + 12,
              opacity: 1,
            }}
            transition={{ type: "spring", stiffness: 150, damping: 22 }}
            className="absolute border-2 border-blue-500 rounded-xl pointer-events-none shadow-[0_0_20px_rgba(59,130,246,0.6)] z-[10000]"
          />
        )}

        {/* Floating Glassmorphic Tooltip bubble */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="absolute pointer-events-auto w-[330px] min-h-[190px] bg-black/90 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-5 flex flex-col justify-between z-[10001]"
          style={tooltipStyle}
        >
          {/* Header & Step count */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={onComplete}
                className="text-gray-500 hover:text-white transition-colors"
                title="Skip Tour"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step Content */}
            <h3 className="text-sm font-bold text-white tracking-wide mb-1.5 leading-snug">
              {activeStep.title}
            </h3>
            <p className="text-[11.5px] text-gray-400 leading-relaxed font-normal">
              {activeStep.description}
            </p>
          </div>

          {/* Controls Footer */}
          <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between">
            {/* Progress bar visualizer */}
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "w-4 bg-blue-500" : "w-1 bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* Nav Buttons */}
            <div className="flex gap-2 items-center">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="p-1 px-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-[11px] font-bold text-gray-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" />
                  Back
                </button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (isLastStep) {
                    onComplete();
                  } else {
                    setCurrentStep((prev) => prev + 1);
                  }
                }}
                className="h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1 cursor-pointer"
              >
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
