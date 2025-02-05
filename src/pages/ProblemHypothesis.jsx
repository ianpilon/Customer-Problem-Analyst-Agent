import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import OpenAI from 'openai';

const ProblemHypothesis = () => {
  const [assumptions, setAssumptions] = useState({
    targetCustomers: '',
    problem: '',
    goal: '',
    rootCause: '',
    potentialImpact: '',
  });
  const [generatedHypothesis, setGeneratedHypothesis] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAssumptions(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const generateAIHypothesis = async () => {
    setIsLoading(true);
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    const openai = new OpenAI({
      apiKey: localStorage.getItem('llmApiKey'),
      dangerouslyAllowBrowser: true
    });

    const prompt = `
As an expert Hypothesis Statement Generator, your task is to transform the following set of structured assumptions into a coherent and professional hypothesis statement. This statement will serve as the foundation for a series of discovery interviews in a research project involving five participants. The goal is to maintain consistency across all interviews by focusing on this specific hypothesis.

Instructions:
- Craft a clear and concise hypothesis statement.
- Ensure the statement is directly derived from the provided assumptions.
- Use professional and formal language suitable for a research setting.

Structured Assumptions:
- Target customers: ${assumptions.targetCustomers}
- Problem: ${assumptions.problem}
- Goal: ${assumptions.goal}
- Root cause: ${assumptions.rootCause}
- Potential impact: ${assumptions.potentialImpact}

Please generate a hypothesis statement based on these assumptions.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert Hypothesis Statement Generator for research projects."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      });

      setGeneratedHypothesis(response.choices[0].message.content.trim());
    } catch (error) {
      console.error('Error generating AI hypothesis:', error);
      setError('Failed to generate AI hypothesis. Please check your API key and try again.');
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (Object.values(assumptions).some(value => value.trim() === '')) {
      setError('Please fill out all fields before generating a hypothesis.');
      return;
    }
    generateAIHypothesis();
  };

  const RequiredLabel = ({ htmlFor, children }) => (
    <Label htmlFor={htmlFor} className="flex items-center mb-2">
      {children}
      <span className="text-red-500 ml-1">*</span>
    </Label>
  );

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Problem Hypothesis Statement</h1>
      <Card>
        <CardHeader>
          <CardTitle>Explicitly State Your Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <RequiredLabel htmlFor="targetCustomers">Who is the target role for our discovery research?</RequiredLabel>
              <Input
                id="targetCustomers"
                name="targetCustomers"
                value={assumptions.targetCustomers}
                onChange={handleInputChange}
                placeholder="e.g., Product Managers"
                required
              />
            </div>
            <div>
              <RequiredLabel htmlFor="problem">What problem do we assume they are experiencing?</RequiredLabel>
              <Input
                id="problem"
                name="problem"
                value={assumptions.problem}
                onChange={handleInputChange}
                placeholder="e.g., difficulty finding real time market intelligence"
                required
              />
            </div>
            <div>
              <RequiredLabel htmlFor="goal">What do we assume they are trying to achieve?</RequiredLabel>
              <Input
                id="goal"
                name="goal"
                value={assumptions.goal}
                onChange={handleInputChange}
                placeholder="e.g., grow their business"
                required
              />
            </div>
            <div>
              <RequiredLabel htmlFor="rootCause">What do we assume is the root cause of their problem?</RequiredLabel>
              <Input
                id="rootCause"
                name="rootCause"
                value={assumptions.rootCause}
                onChange={handleInputChange}
                placeholder="e.g., lack of real time market data for emerging markets"
                required
              />
            </div>
            <div>
              <RequiredLabel htmlFor="potentialImpact">What do we assume would be the potential impact of solving their problem?</RequiredLabel>
              <Input
                id="potentialImpact"
                name="potentialImpact"
                value={assumptions.potentialImpact}
                onChange={handleInputChange}
                placeholder="e.g., increase their business units' profitability"
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Hypothesis'}
            </Button>
            {isLoading && (
              <Progress value={progress} className="w-full mt-4" />
            )}
          </form>
          {generatedHypothesis && (
            <div className="mt-6">
              <Label htmlFor="generatedHypothesis" className="mb-2 block">Generated Problem Hypothesis Statement:</Label>
              <Textarea
                id="generatedHypothesis"
                value={generatedHypothesis}
                readOnly
                className="mt-2"
                rows={6}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProblemHypothesis;