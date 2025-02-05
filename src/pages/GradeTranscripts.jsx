import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FileUploadSection from '../components/FileUploadSection';
import { toast } from "sonner";
import analyzeInterview from '../utils/interviewAnalysis';

const GradeTranscripts = () => {
  const [transcript, setTranscript] = useState('');
  const [file, setFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);


  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = (e) => setTranscript(e.target.result);
      reader.readAsText(uploadedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!transcript) {
      toast.error("Please provide a transcript to analyze.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeInterview(transcript);
      setAnalysisResult(result);
      setShowResult(true);
    } catch (error) {
      toast.error("An error occurred during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStopAnalysis = () => {
    setIsAnalyzing(false);
    toast.info("Analysis has been stopped.");
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Grade Transcripts</h1>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Label htmlFor="transcript" className="mb-2 block">Paste your transcript here:</Label>
          <Textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your interview transcript here..."
            className="mb-4"
            rows={6}
          />
          <FileUploadSection
            onFileUpload={handleFileUpload}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            onStopAnalysis={handleStopAnalysis}
          />
        </CardContent>
      </Card>
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Interview Analysis Results</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {analysisResult && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Overall Score: {analysisResult.overallScore}/10</h3>
                  <p>{analysisResult.overallFeedback}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">JTBD Analysis</h3>
                  <p>Score: {analysisResult.jtbdAnalysis.score}/10</p>
                  <h4 className="font-semibold">Strengths:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.jtbdAnalysis.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                  <h4 className="font-semibold">Weaknesses:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.jtbdAnalysis.weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                  <h4 className="font-semibold">Missed Opportunities:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.jtbdAnalysis.missedOpportunities.map((opportunity, index) => (
                      <li key={index}>{opportunity}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">CURSE Analysis</h3>
                  <p>Score: {analysisResult.curseAnalysis.score}/10</p>
                  <h4 className="font-semibold">Strengths:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.curseAnalysis.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                  <h4 className="font-semibold">Weaknesses:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.curseAnalysis.weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                  <h4 className="font-semibold">Missed Opportunities:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.curseAnalysis.missedOpportunities.map((opportunity, index) => (
                      <li key={index}>{opportunity}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Problem Fit Matrix Analysis</h3>
                  <p>Score: {analysisResult.problemFitMatrixAnalysis.score}/10</p>
                  <h4 className="font-semibold">Strengths:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.problemFitMatrixAnalysis.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                  <h4 className="font-semibold">Weaknesses:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.problemFitMatrixAnalysis.weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                  <h4 className="font-semibold">Missed Opportunities:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.problemFitMatrixAnalysis.missedOpportunities.map((opportunity, index) => (
                      <li key={index}>{opportunity}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Priming Analysis</h3>
                  <p>Score: {analysisResult.primingAnalysis.score}/10</p>
                  <h4 className="font-semibold">Instances of Priming:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.primingAnalysis.instances.map((instance, index) => (
                      <li key={index}>{instance}</li>
                    ))}
                  </ul>
                  <h4 className="font-semibold">Impact:</h4>
                  <p>{analysisResult.primingAnalysis.impact}</p>
                  <h4 className="font-semibold">Recommendations:</h4>
                  <ul className="list-disc pl-5">
                    {analysisResult.primingAnalysis.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Actionable Recommendations</h3>
                  <ul className="list-disc pl-5">
                    {analysisResult.actionableRecommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GradeTranscripts;