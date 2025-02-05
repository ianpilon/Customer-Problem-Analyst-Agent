import OpenAI from 'openai';

export const OPPORTUNITY_QUALIFICATION_SYSTEM_PROMPT = `You are an expert Opportunity Qualification Analyst, specializing in evaluating whether an interviewee represents a qualified opportunity based on three key dimensions: Problem Experience, Active Search, and Problem Fit. Your analysis should be evidence-based and drawn solely from the transcript content.

Evaluate each dimension on a scale of 1-5 and provide a confidence score (0-100%) for each rating:

1. Problem Experience (1-5):
   - Understanding of their current challenges
   - Ability to articulate specific pain points
   - Examples of how problems impact their work
   - Quantifiable metrics or impacts
   - History with the problem

2. Active Search (1-5):
   - Current solution exploration status
   - Previous solution attempts
   - Research into alternatives
   - Timeline for finding a solution
   - Resources allocated to search

3. Problem Fit (1-5):
   - Alignment with their priorities
   - Authority to implement solutions
   - Budget availability/considerations
   - Technical/operational compatibility
   - Organizational readiness

Based on these scores, provide an overall qualification assessment:
- Fully Qualified (12-15 points)
- Partially Qualified (8-11 points)
- Not Qualified (0-7 points)

Output your analysis in the following JSON format:

{
  "overallAssessment": "Fully Qualified" | "Partially Qualified" | "Not Qualified",
  "summary": "string",
  "scores": {
    "problemExperience": {
      "score": number,
      "confidence": number,
      "analysis": "string",
      "evidence": ["string"]
    },
    "activeSearch": {
      "score": number,
      "confidence": number,
      "analysis": "string",
      "evidence": ["string"]
    },
    "problemFit": {
      "score": number,
      "confidence": number,
      "analysis": "string",
      "evidence": ["string"]
    }
  },
  "recommendations": ["string"],
  "redFlags": ["string"],
  "limitations": ["string"]
}`;

export const analyzeOpportunityQualification = async (chunkingResults, progressCallback) => {
  if (!localStorage.getItem('llmApiKey')) {
    throw new Error('OpenAI API key is required. Please set your API key first.');
  }

  const openai = new OpenAI({
    apiKey: localStorage.getItem('llmApiKey'),
    dangerouslyAllowBrowser: true
  });

  try {
    // Start progress
    progressCallback(10);

    // Extract the complete transcript from chunking results
    if (!chunkingResults || !Array.isArray(chunkingResults.chunks)) {
      console.error('Invalid chunking results:', chunkingResults);
      throw new Error('Invalid chunking results. Expected chunks array to be present.');
    }

    // Get the complete transcript from the chunks
    const completeTranscript = chunkingResults.chunks.join('\n\n');
    
    if (!completeTranscript) {
      throw new Error('No transcript content found in chunking results.');
    }

    // Update progress
    progressCallback(30);

    // Prepare messages for the analysis
    const messages = [
      {
        role: 'system',
        content: OPPORTUNITY_QUALIFICATION_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: completeTranscript
      }
    ];

    // Update progress before API call
    progressCallback(50);

    // Request analysis
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 2500
    });

    // Update progress after receiving response
    progressCallback(80);

    // Parse and validate the response
    const analysisResult = JSON.parse(response.choices[0].message.content);

    // Validate required fields
    if (!analysisResult.overallAssessment || !analysisResult.scores) {
      throw new Error('Invalid analysis result structure');
    }

    // Complete progress
    progressCallback(100);

    return analysisResult;

  } catch (error) {
    console.error('Error in Opportunity Qualification Analysis:', error);
    throw error;
  }
};
