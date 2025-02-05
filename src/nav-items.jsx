import { FileTextIcon, BarChartIcon, LightbulbIcon, CheckSquareIcon, SettingsIcon } from "lucide-react";
import AIAgentAnalysis from "./pages/AIAgentAnalysis.jsx";
import Reports from "./pages/Reports.jsx";
import ProblemHypothesis from "./pages/ProblemHypothesis.jsx";
import GradeTranscripts from "./pages/GradeTranscripts.jsx";
import Settings from "./pages/Settings.jsx";

export const navItems = [
  {
    title: "Customer Problem Analyst",
    to: "/ai-agent-analysis",
    icon: <FileTextIcon className="h-4 w-4" />,
    page: <AIAgentAnalysis />,
  },
  {
    title: "Assumptions & Hypothesis",
    to: "/problem-hypothesis",
    icon: <LightbulbIcon className="h-4 w-4" />,
    page: <ProblemHypothesis />,
  },
  {
    title: "Grade Transcripts",
    to: "/grade-transcripts",
    icon: <CheckSquareIcon className="h-4 w-4" />,
    page: <GradeTranscripts />,
  },
  {
    title: "Reports",
    to: "/reports",
    icon: <BarChartIcon className="h-4 w-4" />,
    page: <Reports />,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <Settings />,
  },
];