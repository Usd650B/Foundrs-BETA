import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Users, ListChecks, Bell } from "lucide-react";

interface OnboardingGuideProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const steps = [
  {
    title: "Drop today's goal",
    icon: ListChecks,
    summary: "Add a focused intention with success metrics so partners know how to support you.",
    bullets: [
      "Go to My Goals → Add New Goal",
      "Pick a due time, priority, and what success looks like",
      "Share blockers + motivation to add context",
    ],
  },
  {
    title: "Find accountability partners",
    icon: Users,
    summary: "Browse the Discover founders grid and reserve a slot on work that excites you.",
    bullets: [
      "Open Partners → Discover",
      "Search by founder stage or bio",
      "Send a friendly note when you request a slot",
    ],
  },
  {
    title: "Check-in & grow your streak",
    icon: CheckCircle,
    summary: "Update your goal status each evening to log progress and protect your streak.",
    bullets: [
      "Mark goals complete from My Goals → Recent",
      "Share proof or reflections in partner chats",
      "Watch your streak + longest streak climb",
    ],
  },
  {
    title: "Tune notifications & profile",
    icon: Bell,
    summary: "Finish your bio, stage, and alerts so we can curate better matches for you.",
    bullets: [
      "Visit Settings in the sidebar",
      "Upload an avatar + short bio",
      "Enable push/email alerts for DMs and milestones",
    ],
  },
] as const;

const OnboardingGuide = ({ open, onClose, onComplete }: OnboardingGuideProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];
  const progressValue = ((stepIndex + 1) / steps.length) * 100;

  const handlePrevious = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (stepIndex === steps.length - 1) {
      onComplete();
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const Icon = currentStep.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Welcome to Foundrs</DialogTitle>
          <DialogDescription>
            Here's how to get value in your first 24 hours. Step {stepIndex + 1} of {steps.length}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progressValue} className="h-2" />

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full text-xs uppercase tracking-wide">
                Step {stepIndex + 1}
              </Badge>
              <h3 className="text-xl font-semibold">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground">{currentStep.summary}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <ul className="space-y-2 text-sm text-foreground">
              {currentStep.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={onComplete} className="text-muted-foreground">
            Skip tour
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrevious} disabled={stepIndex === 0}>
              Back
            </Button>
            <Button onClick={handleNext}>
              {stepIndex === steps.length - 1 ? "Finish" : "Next step"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingGuide;
