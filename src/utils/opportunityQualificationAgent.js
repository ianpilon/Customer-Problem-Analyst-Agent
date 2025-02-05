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

    // Extract and validate chunking results
    if (!chunkingResults || !Array.isArray(chunkingResults.chunks)) {
      console.error('Invalid chunking results:', chunkingResults);
      throw new Error('Invalid chunking results. Expected chunks array to be present.');
    }

    // Process chunks in batches
    const CHUNK_BATCH_SIZE = 5;
    const chunks = chunkingResults.chunks;
    const totalBatches = Math.ceil(chunks.length / CHUNK_BATCH_SIZE);
    let batchResults = [];

    console.log('Starting batch processing:', {
      totalChunks: chunks.length,
      batchSize: CHUNK_BATCH_SIZE,
      totalBatches
    });

    for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
      const batchNumber = Math.floor(i / CHUNK_BATCH_SIZE) + 1;
      const batchChunks = chunks.slice(i, i + CHUNK_BATCH_SIZE);
      const batchTranscript = batchChunks.join('\n\n');

      console.log(`Processing batch ${batchNumber}/${totalBatches}:`, {
        batchSize: batchChunks.length,
        transcriptLength: batchTranscript.length
      });

      // Prepare messages for this batch
      const messages = [
        {
          role: 'system',
          content: `${OPPORTUNITY_QUALIFICATION_SYSTEM_PROMPT}\n\nNOTE: You are analyzing part ${batchNumber} of ${totalBatches}. Focus on identifying qualification signals in this section, but do not make final judgments until all parts are analyzed.`
        },
        {
          role: 'user',
          content: batchTranscript
        }
      ];

      // Request analysis for this batch
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 2000
      });

      const batchResult = JSON.parse(response.choices[0].message.content);
      batchResults.push(batchResult);

      // Update progress based on batch completion
      const progressPercent = 20 + Math.floor((batchNumber / totalBatches) * 60);
      progressCallback(progressPercent);
    }

    console.log('All batches processed, generating final analysis');
    progressCallback(80);

    // Prepare a summary of batch results
    const batchSummary = batchResults.map((result, index) => ({
      section: index + 1,
      assessment: result.overallAssessment,
      scores: {
        problemExperience: result.scores.problemExperience.score,
        activeSearch: result.scores.activeSearch.score,
        problemFit: result.scores.problemFit.score
      },
      keyEvidence: [
        ...result.scores.problemExperience.evidence.slice(0, 2),
        ...result.scores.activeSearch.evidence.slice(0, 2),
        ...result.scores.problemFit.evidence.slice(0, 2)
      ]
    }));

    // Combine batch results with a final analysis
    const finalMessages = [
      {
        role: 'system',
        content: `You are analyzing the results from ${totalBatches} separate transcript sections to make a final opportunity qualification assessment. Combine the evidence and scores to provide an overall evaluation. Output your final analysis in the exact same JSON format as before.`
      },
      {
        role: 'user',
        content: `Here are the summarized analysis results from ${totalBatches} sections:\n\n${JSON.stringify(batchSummary, null, 2)}\n\nProvide a final consolidated analysis that combines all the evidence and scores from these sections. Focus on the strongest evidence and most consistent patterns across sections.`
      }
    ];

    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: finalMessages,
      temperature: 0.7,
      max_tokens: 2000
    });

    // Parse and validate the final response
    const finalResult = JSON.parse(finalResponse.choices[0].message.content);

    // Validate required fields
    if (!finalResult.overallAssessment || !finalResult.scores) {
      console.error('Invalid final result structure:', finalResult);
      throw new Error('Invalid analysis result structure');
    }

    // Complete progress
    progressCallback(100);

    return finalResult;

  } catch (error) {
    console.error('Error in Opportunity Qualification Analysis:', {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      state: {
        hasChunking: !!chunkingResults,
        chunkCount: chunkingResults?.chunks?.length
      }
    });
    throw error;
  }
};
