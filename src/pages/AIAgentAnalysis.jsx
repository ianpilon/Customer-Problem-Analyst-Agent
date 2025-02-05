import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from "sonner";
import { agents } from '../data/agents';
import TranscriptInput from '../components/TranscriptInput';
import AgentSelection from '../components/AgentSelection';
import AnalysisResults from '../components/AnalysisResults';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UploadIcon } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { processWithLongContextChunking } from '../utils/longContextChunkingAgent';
import { analyzeJTBDPrimaryGoal } from '../utils/jtbdPrimaryGoalAgent';
import { analyzeJTBDGains } from '../utils/jtbdGainsAnalysisAgent';
import { analyzePainPoints } from '../utils/jtbdPainExtractorAgent';
import { analyzeProblemAwareness } from '../utils/problemAwarenessMatrixAgent';
import { analyzeNeeds } from '../utils/needsAnalysisAgent';
import { analyzeDemand } from '../utils/demandAnalystAgent';
import { analyzeOpportunityQualification } from '../utils/opportunityQualificationAgent';
import { generateFinalReport } from '../utils/finalReportAgent';
import OpenAI from 'openai';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
const SUPPORTED_AUDIO_FORMATS = ['.mp3', '.wav', '.m4a', '.ogg'];
const SUPPORTED_TEXT_FORMATS = ['.txt'];

const AIAgentAnalysis = () => {
  const [transcript, setTranscript] = useState('');
  const [file, setFile] = useState(null);
  const [analyzingAgents, setAnalyzingAgents] = useState(new Set());
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [localAnalysisResults, setLocalAnalysisResults] = useLocalStorage('analysisResults', {});
  const [agentProgress, setAgentProgress] = useLocalStorage('agentProgress', {});
  const [showResult, setShowResult] = useState(null);
  const [apiKey] = useLocalStorage('llmApiKey', '');
  // Using sonner toast directly
  const agentListRef = useRef(null);
  const localResultsRef = useRef(localAnalysisResults);
  const [currentAgent, setCurrentAgent] = useState(null);

  const hasData = useMemo(() => {
    return Boolean(transcript?.trim() || file);
  }, [transcript, file]);

  useEffect(() => {
    // Clear any stale analysis state when component mounts
    setAnalyzingAgents(new Set());
    setAgentProgress({});
    setLocalAnalysisResults({});
    setCurrentAgent(null);
  }, []);

  useEffect(() => {
    localResultsRef.current = localAnalysisResults;
    console.log('Updated localResultsRef:', localResultsRef.current);
  }, [localAnalysisResults]);

  useEffect(() => {
    console.log('State updated - localAnalysisResults:', localAnalysisResults);
    console.log('State updated - agentProgress:', agentProgress);
  }, [localAnalysisResults, agentProgress]);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('llmApiKey');
    if (storedApiKey) {
      // setApiKey(storedApiKey);
    }
  }, []);

  useEffect(() => {
    // Debug state changes
    console.log('🔄 State Change Debug:', {
      analyzingAgents: Array.from(analyzingAgents),
      localAnalysisResults,
      agentProgress,
      currentAgent,
      hasData
    });
    
    // Verify localStorage state
    const storedResults = JSON.parse(localStorage.getItem('analysisResults') || '{}');
    const storedProgress = JSON.parse(localStorage.getItem('agentProgress') || '{}');
    
    console.log('📦 LocalStorage State:', {
      storedResults,
      storedProgress,
      matchesState: JSON.stringify(storedResults) === JSON.stringify(localAnalysisResults)
    });
    
    // Update ref to match current state
    localResultsRef.current = localAnalysisResults;
  }, [analyzingAgents, localAnalysisResults, agentProgress, currentAgent, hasData]);

  useEffect(() => {
    console.log('🔍 DEBUG - LocalStorage State:', {
      analysisResults: JSON.parse(localStorage.getItem('analysisResults') || '{}'),
      progress: JSON.parse(localStorage.getItem('agentProgress') || '{}'),
      apiKey: !!localStorage.getItem('llmApiKey')
    });
  }, [localAnalysisResults, agentProgress]);

  useEffect(() => {
    console.log('🔄 DEBUG - Component State:', {
      analyzingAgents: Array.from(analyzingAgents),
      showResult,
      currentAgent,
      hasData,
      hasAnalyzed,
      resultsKeys: Object.keys(localAnalysisResults)
    });
  }, [analyzingAgents, showResult, currentAgent, hasData, hasAnalyzed, localAnalysisResults]);

  const processAudioFile = async (audioFile) => {
    try {
      setAnalyzingAgents(prev => new Set(prev).add('speakerDiarization'));
      setAgentProgress(prev => ({ ...prev, speakerDiarization: 0 }));
      
      const diarizedTranscript = await processSpeakerDiarization(audioFile, (progress) => {
        setAgentProgress(prev => ({ ...prev, speakerDiarization: progress }));
      });
      
      if (diarizedTranscript) {
        setTranscript(diarizedTranscript);
        setAgentProgress(prev => ({ ...prev, speakerDiarization: 100 }));
        toast.success("Audio file transcribed successfully");
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setAgentProgress(prev => ({ ...prev, speakerDiarization: 0 }));
      toast.error(error.message || "Error processing audio file");
      setFile(null);
    } finally {
      setAnalyzingAgents(prev => {
        const next = new Set(prev);
        next.delete('speakerDiarization');
        return next;
      });
    }
  };

  const handleFileUpload = useCallback(async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    // Clear any previous analysis state when uploading a new file
    setAnalyzingAgents(new Set());
    setAgentProgress({});
    setLocalAnalysisResults({});
    setCurrentAgent(null);
    setHasAnalyzed(false);

    if (uploadedFile.size > MAX_FILE_SIZE) {
      toast.error(`Please upload a file smaller than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    const fileExtension = '.' + uploadedFile.name.split('.').pop().toLowerCase();
    const isAudioFile = SUPPORTED_AUDIO_FORMATS.includes(fileExtension);
    const isTextFile = SUPPORTED_TEXT_FORMATS.includes(fileExtension);

    if (!isAudioFile && !isTextFile) {
      toast.error(`Please upload a supported file format: ${[...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_TEXT_FORMATS].join(', ')}`);
      return;
    }

    try {
      setFile(uploadedFile);
      
      if (isAudioFile) {
        setTranscript('');
        await processAudioFile(uploadedFile);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          setTranscript(e.target.result);
          console.log('Transcript loaded:', e.target.result.substring(0, 100) + '...');
        };
        reader.readAsText(uploadedFile);
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error(error.message || "An error occurred while processing the file.");
      setFile(null);
    }
  }, []);

  /**
   * Handles the completion of an agent's analysis and updates the application state.
   * This function ensures atomic updates of both results and progress state.
   */
  const handleAnalysisComplete = useCallback(async (agentId, results) => {
    console.log(`Analysis complete for ${agentId}:`, {
      hasResults: !!results,
      resultKeys: Object.keys(results || {})
    });
    
    try {
      // Get latest state
      const latestStored = JSON.parse(localStorage.getItem('analysisResults') || '{}');
      
      // Create new results object
      const newResults = { ...latestStored };
      newResults[agentId] = results;
      
      // Update localStorage first
      localStorage.setItem('analysisResults', JSON.stringify(newResults));
      
      // Then update React state
      setLocalAnalysisResults(newResults);
      
      // Update progress
      const newProgress = { ...agentProgress };
      newProgress[agentId] = 100;
      
      // Update prerequisite chain progress
      const agent = agents.find(a => a.id === agentId);
      if (agent?.requiresPreviousAgent) {
        let currentAgent = agent;
        while (currentAgent?.requiresPreviousAgent) {
          const prerequisiteId = currentAgent.requiresPreviousAgent;
          newProgress[prerequisiteId] = 100;
          currentAgent = agents.find(a => a.id === prerequisiteId);
        }
      }
      
      // Update progress state
      localStorage.setItem('agentProgress', JSON.stringify(newProgress));
      setAgentProgress(newProgress);
      
      // Clear analyzing state
      setAnalyzingAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
      
      setShowResult(agentId);
      
      // Verify state
      console.log('Final State:', {
        results: newResults,
        progress: newProgress,
        agent: agentId
      });
      
      // Show success toast
      toast.success(`${agents.find(a => a.id === agentId)?.name} has finished processing`);
      
    } catch (error) {
      console.error('Failed to update state:', error);
      toast.error("Failed to save analysis results. Please try again.");
      
      // Reset progress on error
      const newProgress = { ...agentProgress };
      newProgress[agentId] = 0;
      setAgentProgress(newProgress);
      localStorage.setItem('agentProgress', JSON.stringify(newProgress));
    }
  }, [agents, agentProgress, setLocalAnalysisResults, setAgentProgress, toast]);

  const isDone = useCallback((agentId) => {
    const debugState = {
      agentId,
      hasDirectResults: !!localAnalysisResults[agentId],
      progress: agentProgress[agentId],
      allResults: { ...localAnalysisResults },
      allProgress: { ...agentProgress }
    };
    
    console.log(`🔍 isDone Check for ${agentId}:`, debugState);
    
    // Direct completion check
    if (localAnalysisResults[agentId]) {
      console.log(`✅ ${agentId} has direct results`);
      return true;
    }
    if (agentProgress[agentId] === 100) {
      console.log(`✅ ${agentId} has 100% progress`);
      return true;
    }
    
    // Check if any dependent agent is complete (backward inference)
    const dependentAgents = agents.filter(agent => agent.requiresPreviousAgent === agentId);
    console.log(`🔄 Checking dependent agents for ${agentId}:`, dependentAgents);
    
    const hasCompletedDependentAgent = dependentAgents.some(agent => {
      const isDependentAgent = agent.requiresPreviousAgent === agentId;
      const isComplete = localAnalysisResults[agent.id] || agentProgress[agent.id] === 100;
      
      console.log(`📋 Dependent agent check for ${agent.id}:`, {
        isDependentAgent,
        isComplete,
        hasResults: !!localAnalysisResults[agent.id],
        progress: agentProgress[agent.id]
      });
      
      return isDependentAgent && isComplete;
    });

    console.log(`${hasCompletedDependentAgent ? '✅' : '❌'} ${agentId} completion by dependent agents:`, hasCompletedDependentAgent);
    return hasCompletedDependentAgent;
  }, [localAnalysisResults, agentProgress, agents]);

  // Add state verification before running agent
  const verifyStateBeforeRun = (agentId) => {
    console.log('🔍 Pre-run State Verification:', {
      agentId,
      stateResults: localAnalysisResults,
      storedResults: JSON.parse(localStorage.getItem('analysisResults') || '{}'),
      stateProgress: agentProgress,
      storedProgress: JSON.parse(localStorage.getItem('agentProgress') || '{}'),
      analyzingAgents: Array.from(analyzingAgents)
    });
    
    // Force sync state with localStorage
    const storedResults = JSON.parse(localStorage.getItem('analysisResults') || '{}');
    if (JSON.stringify(storedResults) !== JSON.stringify(localAnalysisResults)) {
      console.warn('⚠️ State sync mismatch detected, forcing sync');
      setLocalAnalysisResults(storedResults);
      return false;
    }
    return true;
  };

  const handleRunAgent = useCallback(async (agentId) => {
    // Add state verification
    if (!verifyStateBeforeRun(agentId)) {
      console.error('State verification failed, retrying...');
      setTimeout(() => handleRunAgent(agentId), 100);
      return;
    }

    console.log('handleRunAgent called for:', agentId);
    console.log('Current transcript:', transcript?.substring(0, 100) + '...');
    console.log('API Key exists:', !!apiKey);
    console.log('Current analyzing agents:', Array.from(analyzingAgents));
    console.log('Current analysis results:', localAnalysisResults);
    
    if (!transcript?.trim()) {
      console.warn('No transcript available');
      toast.error("Please provide a transcript to analyze");
      return;
    }

    const storedApiKey = localStorage.getItem('llmApiKey');
    if (!storedApiKey) {
      console.warn('No API key available');
      toast.error("Please set your OpenAI API key in Settings");
      return;
    }

    if (analyzingAgents.has(agentId)) {
      console.warn(`Agent ${agentId} is already running`);
      return;
    }

    try {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Enhanced prerequisite checking
      if (agent.requiresPreviousAgent) {
        const prerequisiteResults = localAnalysisResults[agent.requiresPreviousAgent];
        const prerequisiteAgent = agents.find(a => a.id === agent.requiresPreviousAgent);
        
        console.log(`Checking prerequisites for ${agentId}:`, {
          prerequisiteAgent: prerequisiteAgent?.id,
          hasPrerequisiteResults: !!prerequisiteResults
        });
        
        if (!prerequisiteResults) {
          const error = new Error(`Missing required analysis from ${prerequisiteAgent?.name}`);
          error.code = 'MISSING_PREREQUISITE';
          throw error;
        }
      }

      // Check if any agent is running
      if (analyzingAgents.size > 0) {
        const error = new Error("Another analysis is currently in progress");
        error.code = 'AGENT_RUNNING';
        throw error;
      }

      console.log('Starting analysis for agent:', agentId);
      setAnalyzingAgents(prev => new Set(prev).add(agentId));
      setCurrentAgent(agentId);
      
      setAgentProgress(prev => ({
        ...prev,
        [agentId]: 0
      }));

      let results;
      const updateProgress = (progress) => {
        console.log(`Progress update for ${agentId}:`, progress);
        setAgentProgress(prev => ({
          ...prev,
          [agentId]: progress
        }));
      };

      switch (agentId) {
        case 'longContextChunking':
          console.log('Starting Long Context Chunking analysis...');
          results = await processWithLongContextChunking(
            transcript,
            updateProgress,
            storedApiKey
          );
          break;

        case 'jtbd':
          if (!localAnalysisResults.longContextChunking) {
            throw new Error('Long Context Chunking results required');
          }
          results = await analyzeJTBDPrimaryGoal(
            localAnalysisResults.longContextChunking,
            updateProgress,
            storedApiKey
          );
          break;

        case 'jtbdGains':
          if (!localAnalysisResults.longContextChunking || !localAnalysisResults.jtbd) {
            console.error('Missing prerequisites for JTBD Gains:', {
              hasChunking: !!localAnalysisResults.longContextChunking,
              hasJTBD: !!localAnalysisResults.jtbd,
              allResults: localAnalysisResults
            });
            throw new Error('Both Long Context Chunking and JTBD Primary Goal results required');
          }
          console.log('Starting JTBD Gains analysis with prerequisites:', {
            chunking: localAnalysisResults.longContextChunking,
            jtbd: localAnalysisResults.jtbd,
            apiKey: !!storedApiKey
          });
          
          // Restructure the data to match expected format
          const gainsInput = {
            ...localAnalysisResults.longContextChunking,
            jtbdResults: localAnalysisResults.jtbd // Pass as child property
          };

          console.log('Structured input for JTBD Gains analysis:', gainsInput);
          
          try {
            results = await analyzeJTBDGains(
              gainsInput,
              updateProgress,
              storedApiKey
            );
          } catch (error) {
            console.error('JTBD Gains Analysis failed:', error);
            toast.error(error.message || "Error in JTBD Gains Analysis");
            setAgentProgress(prev => ({ ...prev, [agentId]: 0 }));
            throw error;
          }
          break;

        case 'painExtractor':
          if (!localAnalysisResults.longContextChunking || !localAnalysisResults.jtbdGains) {
            console.error('Missing prerequisites for Pain Analysis:', {
              hasChunking: !!localAnalysisResults.longContextChunking,
              hasGains: !!localAnalysisResults.jtbdGains,
              allResults: localAnalysisResults
            });
            throw new Error('Both Long Context Chunking and JTBD Gains Analysis results required');
          }
          console.log('Starting Pain Analysis with prerequisites:', {
            chunking: localAnalysisResults.longContextChunking,
            gains: localAnalysisResults.jtbdGains,
            apiKey: !!storedApiKey
          });
          
          try {
            results = await analyzePainPoints(
              {
                ...localAnalysisResults.longContextChunking,
                gainsAnalysis: localAnalysisResults.jtbdGains
              },
              updateProgress,
              storedApiKey
            );
          } catch (error) {
            console.error('Pain Analysis failed:', error);
            toast({
              title: "Pain Analysis Error",
              description: error.message,
              variant: "destructive"
            });
            setAgentProgress(prev => ({ ...prev, [agentId]: 0 }));
            throw error;
          }
          break;

        case 'problemAwareness':
          if (!localAnalysisResults.longContextChunking) {
            throw new Error('Long Context Chunking results required');
          }
          results = await analyzeProblemAwareness(
            localAnalysisResults.longContextChunking,
            updateProgress,
            storedApiKey
          );
          break;

        case 'needsAnalysis':
          // Validate prerequisites
          if (!localAnalysisResults.longContextChunking) {
            console.error('Missing prerequisites for Needs Analysis:', {
              hasChunking: !!localAnalysisResults.longContextChunking,
              allResults: localAnalysisResults
            });
            throw new Error('Long Context Chunking results required');
          }

          // Log analysis start with prerequisites
          console.log('Starting Needs Analysis with prerequisites:', {
            results: localAnalysisResults,
            apiKey: !!storedApiKey
          });

          try {
            // Run needs analysis with proper error handling
            results = await analyzeNeeds(
              localAnalysisResults,  // Pass the full results object
              updateProgress,
              storedApiKey
            );
          } catch (error) {
            console.error('Needs Analysis failed:', error);
            toast.error(error.message || "Needs Analysis failed");
            // Reset progress on error
            setAgentProgress(prev => ({ ...prev, [agentId]: 0 }));
            throw error;
          }
          break;

        case 'demandAnalyst':
          try {
            console.log('🎯 DEBUG - Starting Demand Analysis:', {
              timestamp: new Date().toISOString(),
              environment: process.env.NODE_ENV,
              localStorage: {
                analysisResults: JSON.stringify(localStorage.getItem('analysisResults')),
                progress: localStorage.getItem('agentProgress')
              },
              state: {
                localResults: localAnalysisResults,
                currentAgent,
                analyzingAgents: Array.from(analyzingAgents)
              }
            });

            // Validate prerequisites are available
            if (!localAnalysisResults.longContextChunking) {
              console.warn('⚠️ DEBUG - Missing prerequisites:', {
                hasChunking: !!localAnalysisResults.longContextChunking,
                chunkingKeys: Object.keys(localAnalysisResults.longContextChunking || {})
              });
              console.error('❌ DEBUG - Critical prerequisites missing');
              throw new Error('Required prerequisite is missing. Please run Long Context Chunking first.');
            }
          
            console.log('📊 DEBUG - Preparing demand analysis input:', {
              chunking: {
                hasFinalSummary: !!localAnalysisResults.longContextChunking?.finalSummary,
                summaryLength: localAnalysisResults.longContextChunking?.finalSummary?.length
              },
              needs: {
                hasImmediate: !!localAnalysisResults.needsAnalysis?.immediateNeeds,
                hasLatent: !!localAnalysisResults.needsAnalysis?.latentNeeds,
                immediateCount: localAnalysisResults.needsAnalysis?.immediateNeeds?.length,
                latentCount: localAnalysisResults.needsAnalysis?.latentNeeds?.length
              }
            });

            // Structure input data for demand analysis
            const demandInput = {
              ...localAnalysisResults.longContextChunking
            };

            console.log('🚀 DEBUG - Sending to demand analysis:', {
              inputKeys: Object.keys(demandInput),
              hasNeedsResults: !!demandInput.needsAnalysisResults,
              needsResultsKeys: Object.keys(demandInput.needsAnalysisResults || {})
            });
          
            // Attempt demand analysis
            try {
              results = await analyzeDemand(
                demandInput,
                updateProgress,
                storedApiKey
              );
              
              console.log('✅ DEBUG - Demand Analysis succeeded:', {
                demandLevel: results.demandLevel,
                confidenceScore: results.confidenceScore,
                hasAnalysis: !!results.analysis
              });
              
            } catch (error) {
              console.error('❌ DEBUG - Demand Analysis failed:', {
                error: {
                  message: error.message,
                  stack: error.stack
                },
                inputStructure: {
                  hasChunking: !!demandInput.finalSummary,
                  hasNeeds: !!demandInput.needsAnalysisResults,
                  needsStructure: demandInput.needsAnalysisResults
                }
              });
              
              toast.error(`${error.message}. Please try running the analysis again.`);
              
              setAgentProgress(prev => ({ ...prev, [agentId]: 0 }));
              throw error;
            }
          } catch (error) {
            console.error('❌ DEBUG - Demand Analysis preparation failed:', {
              error: {
                message: error.message,
                stack: error.stack
              },
              state: {
                localResults: Object.keys(localAnalysisResults),
                currentAgent,
                progress: agentProgress[agentId]
              }
            });
            
            toast.error(error.message);
            setAgentProgress(prev => ({ ...prev, [agentId]: 0 }));
            throw error;
          }
          break;

        case 'opportunityQualification':
          if (!localAnalysisResults.longContextChunking) {
            throw new Error('Long Context Chunking results required');
          }
          results = await analyzeOpportunityQualification(
            localAnalysisResults.longContextChunking,
            updateProgress,
            storedApiKey
          );
          break;

        case 'finalReport':
          if (!localAnalysisResults.longContextChunking) {
            throw new Error('Previous analysis results required');
          }
          results = await generateFinalReport(
            localAnalysisResults,
            updateProgress,
            storedApiKey
          );
          break;

        default:
          throw new Error(`Unknown agent: ${agentId}`);
      }

      // Handle successful completion
      await handleAnalysisComplete(agentId, results);
      console.log(`Analysis completed successfully for ${agentId}`);

    } catch (error) {
      console.error(`Error running agent ${agentId}:`, error);
      
      // Clear analyzing state
      setAnalyzingAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
      
      // Reset progress
      setAgentProgress(prev => ({
        ...prev,
        [agentId]: 0
      }));
      
      // Show appropriate error message
      let errorMessage = "An unexpected error occurred";
      if (error.code === 'MISSING_PREREQUISITE') {
        errorMessage = error.message;
      } else if (error.code === 'AGENT_RUNNING') {
        errorMessage = "Please wait for the current analysis to complete";
      } else {
        errorMessage = error.message || "Failed to run analysis";
      }
      
      toast.error(errorMessage);
    }
  }, [transcript, apiKey, analyzingAgents, localAnalysisResults, handleAnalysisComplete]);

  const clearAllState = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('analysisResults');
    localStorage.removeItem('agentProgress');
    
    // Clear all state
    setLocalAnalysisResults({});
    setAgentProgress({});
    setTranscript('');
    setFile(null);
    setAnalyzingAgents(new Set());
    setHasAnalyzed(false);
    setShowResult(null);
    setCurrentAgent(null);
    
    // Clear ref
    if (localResultsRef.current) {
      localResultsRef.current = {};
    }
  }, []);

  const handleClearData = useCallback(() => {
    clearAllState();
    toast.success("All analysis data has been reset.");
  }, [clearAllState, toast]);

  const handleAnalyze = useCallback(async () => {
    if (!transcript) {
      toast.error("Please enter a transcript or upload a file.");
      return;
    }

    if (!apiKey) {
      toast.error("Please set your OpenAI API key in the settings page.");
      return;
    }

    // Clear all state before starting new analysis
    clearAllState();
    setAnalyzingAgents(new Set());

    try {
      console.log('Starting analysis with Long Context Chunking agent...');
      
      setAgentProgress(prev => ({ 
        ...prev, 
        longContextChunking: 0 
      }));

      const results = await processWithLongContextChunking(
        transcript,
        (progress) => {
          console.log('Progress update for longContextChunking:', progress);
          setAgentProgress(prev => ({ 
            ...prev, 
            longContextChunking: progress 
          }));
        },
        apiKey
      );

      console.log('Analysis complete, setting results:', results);
      
      setLocalAnalysisResults(prev => ({
        ...prev,
        longContextChunking: {
          chunks: results.chunks,
          chunkSummaries: results.chunkSummaries,
          sectionSummaries: results.sectionSummaries,
          finalSummary: results.finalSummary,
          metadata: results.metadata
        }
      }));
      
      setAgentProgress(prev => ({ 
        ...prev, 
        longContextChunking: 100 
      }));
      
      setShowResult('longContextChunking');
      setHasAnalyzed(true);

      toast({
        title: "Analysis Complete",
        description: "Long Context Chunking analysis completed successfully.",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      
      setAgentProgress(prev => ({ 
        ...prev, 
        longContextChunking: 0 
      }));
      
      toast.error(error.message || "An error occurred during analysis. Please check the console for details.");
    } finally {
      setAnalyzingAgents(new Set());
    }
  }, [transcript, apiKey, toast]);

  const handleViewResults = useCallback((agentId) => {
    setShowResult(agentId);
  }, []);

  return (
    <div className="flex h-screen">
      <div className="w-1/3 p-4 border-r overflow-y-auto">
        <AgentSelection
          onRunAgent={handleRunAgent}
          onViewResults={handleViewResults}
          agentProgress={agentProgress}
          analyzingAgents={analyzingAgents}
          localAnalysisResults={localAnalysisResults}
          hasData={hasData}
          isDone={isDone}
        />
      </div>
      <div className="w-2/3 p-4 overflow-y-auto">
        <Card 
          className="p-6"
        >
          {showResult ? (
            <AnalysisResults 
              showResult={showResult}
              localAnalysisResults={localAnalysisResults}
              setShowResult={setShowResult}
              longContextResults={localAnalysisResults.longContextChunking}
              gainAnalysis={localAnalysisResults.gainExtractor}
              jtbdAnalysis={localAnalysisResults.jtbdAnalysis}
              apiKey={apiKey}
            />
          ) : (
            <TranscriptInput
              transcript={transcript}
              setTranscript={setTranscript}
              onFileUpload={handleFileUpload}
              onAnalyze={handleAnalyze}
              isAnalyzing={analyzingAgents.size > 0}
              hasAnalyzed={hasAnalyzed}
              placeholder="Upload a customer interview transcript to receive a detailed pain point analysis and problem-solution fit score."
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default AIAgentAnalysis;